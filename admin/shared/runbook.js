'use strict';
/**
 * runbook.js — Runbook automation module
 *
 * Features:
 *  - Create, update, delete and list runbooks with categorisation and tags
 *  - Execute runbooks step-by-step (shell, http, notify, admin-cli)
 *  - Per-step timeout enforcement and continueOnError support
 *  - Full execution history with per-step output and duration
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const https = require('https');
const http = require('http');

class RunbookManager {
    constructor(storeDir) {
        this.storeDir = storeDir;
        this.runbooksFile = path.join(storeDir, 'runbooks.json');
        this.executionsFile = path.join(storeDir, 'runbook-executions.json');
        this._ensureDir();
    }

    _ensureDir() {
        if (!fs.existsSync(this.storeDir)) {
            fs.mkdirSync(this.storeDir, { recursive: true });
        }
    }

    _readJSON(file, defaultVal) {
        if (!fs.existsSync(file)) return defaultVal;
        try {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (_) {
            return defaultVal;
        }
    }

    _writeJSON(file, data) {
        this._ensureDir();
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    }

    createRunbook({ name, description, category, steps, tags, triggerConditions }) {
        const runbooks = this._readJSON(this.runbooksFile, []);
        const now = new Date().toISOString();
        const runbook = {
            id: 'rb_' + crypto.randomBytes(8).toString('hex'),
            name,
            description,
            category: category || 'general',
            steps: steps || [],
            tags: tags || [],
            triggerConditions: triggerConditions || [],
            created: now,
            updated: now,
            lastExecuted: null,
        };
        runbooks.push(runbook);
        this._writeJSON(this.runbooksFile, runbooks);
        return runbook;
    }

    updateRunbook(id, changes) {
        const runbooks = this._readJSON(this.runbooksFile, []);
        const idx = runbooks.findIndex(r => r.id === id);
        if (idx === -1) throw new Error(`Runbook ${id} not found`);
        Object.assign(runbooks[idx], changes, { updated: new Date().toISOString() });
        this._writeJSON(this.runbooksFile, runbooks);
        return runbooks[idx];
    }

    deleteRunbook(id) {
        const runbooks = this._readJSON(this.runbooksFile, []);
        const idx = runbooks.findIndex(r => r.id === id);
        if (idx === -1) return false;
        runbooks.splice(idx, 1);
        this._writeJSON(this.runbooksFile, runbooks);
        return true;
    }

    listRunbooks(filter = {}) {
        let runbooks = this._readJSON(this.runbooksFile, []);
        if (filter.category) runbooks = runbooks.filter(r => r.category === filter.category);
        if (filter.tags && filter.tags.length) {
            runbooks = runbooks.filter(r =>
                filter.tags.some(t => (r.tags || []).includes(t))
            );
        }
        return runbooks;
    }

    getRunbook(id) {
        return this._readJSON(this.runbooksFile, []).find(r => r.id === id) || null;
    }

    async executeRunbook(id, params = {}, executedBy = 'admin') {
        const runbook = this.getRunbook(id);
        if (!runbook) throw new Error(`Runbook ${id} not found`);

        const execution = {
            executionId: 'exec_' + crypto.randomBytes(8).toString('hex'),
            runbookId: id,
            executedBy,
            params,
            status: 'running',
            startTime: new Date().toISOString(),
            endTime: null,
            steps: [],
        };

        let overallStatus = 'completed';

        for (const step of runbook.steps) {
            const stepStart = Date.now();
            let stepResult = { name: step.name, status: 'success', output: '', duration: 0, error: null };

            try {
                const timeout = step.timeout || 30000;

                if (step.type === 'shell') {
                    // NOTE: command strings are split on whitespace only; quoted
                    // arguments with internal spaces are not supported.
                    const parts = (step.command || '').split(/\s+/).filter(Boolean);
                    if (!parts.length) throw new Error('Empty shell command');
                    const cmd = parts[0];
                    const args = parts.slice(1);
                    const output = await new Promise((resolve, reject) => {
                        execFile(cmd, args, { timeout }, (err, stdout, stderr) => {
                            if (err) return reject(err);
                            resolve(stdout || stderr || '');
                        });
                    });
                    stepResult.output = output;

                } else if (step.type === 'http') {
                    const result = await new Promise((resolve, reject) => {
                        const timer = setTimeout(() => reject(new Error('HTTP step timed out')), timeout);
                        let url;
                        try { url = new URL(step.url); } catch (e) { clearTimeout(timer); return reject(e); }
                        const mod = url.protocol === 'https:' ? https : http;
                        const method = (step.method || 'GET').toUpperCase();
                        const body = step.body ? JSON.stringify(step.body) : null;
                        const options = {
                            hostname: url.hostname,
                            port: url.port || (url.protocol === 'https:' ? 443 : 80),
                            path: url.pathname + (url.search || ''),
                            method,
                            headers: Object.assign(
                                { 'Content-Type': 'application/json' },
                                body ? { 'Content-Length': Buffer.byteLength(body) } : {},
                                step.headers || {}
                            ),
                        };
                        const req = mod.request(options, (res) => {
                            let data = '';
                            res.on('data', chunk => { data += chunk; });
                            res.on('end', () => { clearTimeout(timer); resolve(`${res.statusCode}: ${data.slice(0, 500)}`); });
                        });
                        req.on('error', (e) => { clearTimeout(timer); reject(e); });
                        if (body) req.write(body);
                        req.end();
                    });
                    stepResult.output = result;

                } else if (step.type === 'notify') {
                    stepResult.output = `[simulated] Notification sent: ${step.message || step.name}`;

                } else if (step.type === 'admin-cli') {
                    stepResult.output = `[simulated] admin-cli executed: ${step.command || step.name}`;

                } else {
                    stepResult.output = `[skipped] Unknown step type: ${step.type}`;
                    stepResult.status = 'skipped';
                }

            } catch (err) {
                stepResult.status = 'failed';
                stepResult.error = err.message;
                if (!step.continueOnError) {
                    stepResult.duration = Date.now() - stepStart;
                    execution.steps.push(stepResult);
                    overallStatus = 'failed';
                    break;
                }
            }

            stepResult.duration = Date.now() - stepStart;
            execution.steps.push(stepResult);
        }

        execution.status = overallStatus;
        execution.endTime = new Date().toISOString();

        const executions = this._readJSON(this.executionsFile, []);
        executions.push(execution);
        this._writeJSON(this.executionsFile, executions);

        const runbooks = this._readJSON(this.runbooksFile, []);
        const idx = runbooks.findIndex(r => r.id === id);
        if (idx !== -1) {
            runbooks[idx].lastExecuted = execution.endTime;
            this._writeJSON(this.runbooksFile, runbooks);
        }

        return execution;
    }

    getExecutionHistory(runbookId, limit = 50) {
        let executions = this._readJSON(this.executionsFile, []);
        if (runbookId) executions = executions.filter(e => e.runbookId === runbookId);
        return executions.slice(-limit);
    }

    getExecution(executionId) {
        return this._readJSON(this.executionsFile, []).find(e => e.executionId === executionId) || null;
    }
}

module.exports = { RunbookManager };
