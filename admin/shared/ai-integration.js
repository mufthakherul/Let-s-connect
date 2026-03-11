'use strict';
/**
 * ai-integration.js — AI ↔ All Admin Panels Integration Bridge
 *
 * Features:
 *  - Event bus for AI agent ↔ admin panel communication
 *  - Workflow lifecycle: create, approve/deny, execute
 *  - Multi-channel status reporting (CLI, SSH, API, webhook, dashboard)
 *  - Pending approval tracking and execution statistics
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AIIntegrationBridge {
    constructor(storeDir) {
        this.storeDir = storeDir;
        this.workflowsFile  = path.join(storeDir, 'ai-workflows.json');
        this.eventsFile     = path.join(storeDir, 'ai-events.json');
        this.approvalsFile  = path.join(storeDir, 'ai-approvals.json');
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

    // ---- Event Bus ----

    publishEvent({ source, type, data, severity, aiAgentId }) {
        const events = this._readJSON(this.eventsFile, []);
        const event = {
            eventId: 'evt_' + crypto.randomBytes(8).toString('hex'),
            source: source || 'unknown',
            type,
            data: data || {},
            severity: severity || 'info',
            aiAgentId: aiAgentId || null,
            timestamp: new Date().toISOString(),
        };
        events.push(event);
        this._writeJSON(this.eventsFile, events);
        return event;
    }

    subscribeEvents(filter = {}) {
        let events = this._readJSON(this.eventsFile, []);
        if (filter.source)   events = events.filter(e => e.source === filter.source);
        if (filter.type)     events = events.filter(e => e.type === filter.type);
        if (filter.severity) events = events.filter(e => e.severity === filter.severity);
        if (filter.dateFrom) events = events.filter(e => new Date(e.timestamp) >= new Date(filter.dateFrom));
        return events.slice(-100);
    }

    // ---- Workflow Management ----

    createWorkflow({ agentId, name, description, steps, channel, requiresApproval }) {
        const workflows = this._readJSON(this.workflowsFile, []);
        const workflow = {
            workflowId: 'wf_' + crypto.randomBytes(8).toString('hex'),
            agentId: agentId || null,
            name,
            description: description || '',
            steps: (steps || []).map((s, i) => ({
                index: i,
                name: s.name || `Step ${i + 1}`,
                action: s.action || '',
                params: s.params || {},
                status: 'pending',
            })),
            channel: channel || 'api',
            requiresApproval: !!requiresApproval,
            status: requiresApproval ? 'pending_approval' : 'ready',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        workflows.push(workflow);
        this._writeJSON(this.workflowsFile, workflows);
        return workflow;
    }

    listWorkflows(filter = {}) {
        let workflows = this._readJSON(this.workflowsFile, []);
        if (filter.status)  workflows = workflows.filter(w => w.status === filter.status);
        if (filter.channel) workflows = workflows.filter(w => w.channel === filter.channel);
        if (filter.agentId) workflows = workflows.filter(w => w.agentId === filter.agentId);
        return workflows;
    }

    getWorkflow(id) {
        return this._readJSON(this.workflowsFile, []).find(w => w.workflowId === id) || null;
    }

    approveWorkflow(workflowId, approvedBy, comment) {
        const workflows = this._readJSON(this.workflowsFile, []);
        const idx = workflows.findIndex(w => w.workflowId === workflowId);
        if (idx === -1) throw new Error(`Workflow ${workflowId} not found`);
        if (workflows[idx].status !== 'pending_approval') {
            throw new Error(`Workflow ${workflowId} is not pending approval`);
        }

        workflows[idx].status = 'approved_executing';
        workflows[idx].updatedAt = new Date().toISOString();
        this._writeJSON(this.workflowsFile, workflows);

        const approvals = this._readJSON(this.approvalsFile, []);
        approvals.push({
            approvalId: 'appr_' + crypto.randomBytes(8).toString('hex'),
            workflowId,
            approvedBy,
            comment: comment || '',
            timestamp: new Date().toISOString(),
        });
        this._writeJSON(this.approvalsFile, approvals);

        return this.executeApprovedWorkflow(workflowId);
    }

    denyWorkflow(workflowId, deniedBy, reason) {
        const workflows = this._readJSON(this.workflowsFile, []);
        const idx = workflows.findIndex(w => w.workflowId === workflowId);
        if (idx === -1) throw new Error(`Workflow ${workflowId} not found`);
        workflows[idx].status = 'denied';
        workflows[idx].deniedBy = deniedBy || null;
        workflows[idx].denialReason = reason || '';
        workflows[idx].updatedAt = new Date().toISOString();
        this._writeJSON(this.workflowsFile, workflows);
        return workflows[idx];
    }

    executeApprovedWorkflow(workflowId) {
        // STUB: Step execution is simulated — each step is immediately marked completed.
        // This is intentional for the admin panel bridge layer, which coordinates
        // approval flow rather than running steps directly. To execute real work,
        // integrate with RunbookManager (admin/shared/runbook.js) or call the
        // appropriate service APIs per step.channel before shipping to production.
        const workflows = this._readJSON(this.workflowsFile, []);
        const idx = workflows.findIndex(w => w.workflowId === workflowId);
        if (idx === -1) throw new Error(`Workflow ${workflowId} not found`);

        workflows[idx].status = 'executing';
        workflows[idx].updatedAt = new Date().toISOString();

        for (const step of workflows[idx].steps) {
            step.status = 'completed';
            step.completedAt = new Date().toISOString();
        }

        workflows[idx].status = 'completed';
        workflows[idx].completedAt = new Date().toISOString();
        workflows[idx].updatedAt = new Date().toISOString();
        this._writeJSON(this.workflowsFile, workflows);
        return workflows[idx];
    }

    // ---- Statistics & Channels ----

    getStats() {
        const workflows = this._readJSON(this.workflowsFile, []);
        const approvals = this._readJSON(this.approvalsFile, []);

        const byChannel = {};
        for (const w of workflows) {
            byChannel[w.channel] = (byChannel[w.channel] || 0) + 1;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const executedToday = workflows.filter(
            w => w.completedAt && new Date(w.completedAt) >= today
        ).length;

        const pendingApprovals = workflows.filter(w => w.status === 'pending_approval').length;

        let avgApprovalTimeMs = 0;
        if (approvals.length) {
            const times = approvals.map(a => {
                const wf = workflows.find(w => w.workflowId === a.workflowId);
                if (!wf || !wf.createdAt) return 0;
                return new Date(a.timestamp) - new Date(wf.createdAt);
            }).filter(t => t > 0);
            avgApprovalTimeMs = times.length
                ? Math.round(times.reduce((s, t) => s + t, 0) / times.length)
                : 0;
        }

        return {
            totalWorkflows: workflows.length,
            byChannel,
            pendingApprovals,
            executedToday,
            avgApprovalTimeMs,
        };
    }

    getChannelStatus() {
        return {
            cli:       { enabled: true, connected: true },
            ssh:       { enabled: true, connected: true },
            api:       { enabled: true, connected: true },
            webhook:   { enabled: true, connected: true },
            dashboard: { enabled: true, connected: true },
        };
    }
}

module.exports = { AIIntegrationBridge };
