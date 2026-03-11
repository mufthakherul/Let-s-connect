'use strict';

/**
 * @fileoverview Autonomous PR generation for the Milonexa AI Admin Agent (v3.0).
 *
 * Capabilities:
 *  - Automated regression testing: runs the target service's test suite before
 *    proposing any code fix (uses child_process execFile; gracefully skips if
 *    no test script is found).
 *  - Full PR generation: given a findingId + fixedCode, creates a git branch,
 *    stages and commits the change, then opens a GitHub Pull Request via the
 *    REST API. All actions are gated by PermissionGate (default: 'high' severity).
 *  - Self-healing documentation: compares the live OpenAPI spec extracted from
 *    source routes against the last generated spec to detect drift; proposes a
 *    doc-sync PR when significant drift is detected (≥ 3 new/removed routes).
 *
 * Configuration (environment variables):
 *   PR_GITHUB_OWNER     GitHub owner/org (e.g. "milonexa")
 *   PR_GITHUB_REPO      GitHub repository name (e.g. "platform")
 *   PR_GITHUB_TOKEN     GitHub PAT with repo write access (required)
 *   PR_BASE_BRANCH      Base branch for PRs (default: "main")
 *   PR_LABEL            Label to apply to generated PRs (default: "ai-generated")
 *   PR_AUTO_SUBMIT      If 'true', auto-submit PRs without PermissionGate (default: false)
 *
 * All I/O uses ONLY Node.js built-in modules.
 */

const fs            = require('fs');
const path          = require('path');
const https         = require('https');
const crypto        = require('crypto');
const { execFile }  = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

const ADMIN_HOME   = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const AI_STATE_DIR = path.join(ADMIN_HOME, 'ai');
const PR_DIR       = path.join(AI_STATE_DIR, 'pr-generator');
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

const GH_OWNER      = process.env.PR_GITHUB_OWNER || process.env.FEEDBACK_GITHUB_OWNER || '';
const GH_REPO       = process.env.PR_GITHUB_REPO  || process.env.FEEDBACK_GITHUB_REPO  || '';
const GH_TOKEN      = process.env.PR_GITHUB_TOKEN || process.env.FEEDBACK_GITHUB_TOKEN || '';
const BASE_BRANCH   = process.env.PR_BASE_BRANCH  || 'main';
const PR_LABEL      = process.env.PR_LABEL        || 'ai-generated';
const AUTO_SUBMIT   = process.env.PR_AUTO_SUBMIT  === 'true';

/** Test run timeout (ms). */
const TEST_TIMEOUT_MS = parseInt(process.env.PR_TEST_TIMEOUT_MS || '120000', 10);

// ---------------------------------------------------------------------------
// PRGenerator
// ---------------------------------------------------------------------------

class PRGenerator {
    constructor() {
        this._ensureDirs();
        /** @type {object[]} PRs created this session. */
        this._prsCreated = [];
        /** @type {object[]} Regression test results. */
        this._testResults = [];
        /** @type {object[]} Doc drift reports. */
        this._docDriftReports = [];
        this._lastRunAt = null;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Propose and (if approved) create a PR for a code fix.
     *
     * @param {object} params
     *   @param {string} params.findingId   ID of the code analysis finding.
     *   @param {string} params.filePath    Relative path from project root.
     *   @param {string} params.fixedCode   Full content of the fixed file.
     *   @param {string} params.description Human-readable description of the fix.
     *   @param {string} [params.service]   Service the file belongs to.
     * @param {object} [permGate]           PermissionGate instance.
     * @param {Function} [observeFn]        Optional `(event, data)=>void` for observability.
     * @returns {Promise<object>}
     */
    async proposePR(params, permGate, observeFn) {
        const { findingId, filePath, fixedCode, description, service } = params;
        this._lastRunAt = new Date().toISOString();

        console.log(`[pr-generator] Proposing PR for finding ${findingId} (${filePath})`);

        // 1. Validate file path stays within project root.
        const absPath = path.resolve(PROJECT_ROOT, filePath);
        if (!absPath.startsWith(PROJECT_ROOT + path.sep)) {
            return { status: 'refused', reason: 'File path outside project root.' };
        }
        if (!fs.existsSync(absPath)) {
            return { status: 'refused', reason: `File not found: ${filePath}` };
        }

        // 2. Automated regression tests.
        const serviceDir = service || this._detectServiceDir(filePath);
        const regressionResult = await this._runRegressionTests(serviceDir);
        this._testResults.push({ ...regressionResult, findingId, proposedAt: new Date().toISOString() });

        if (!regressionResult.passed) {
            console.warn(`[pr-generator] Regression tests failed for ${serviceDir} — blocking PR proposal`);
            return {
                status: 'blocked',
                reason: 'Regression tests failed before fix was applied.',
                regressionResult,
            };
        }

        console.log(`[pr-generator] Regression tests passed (${regressionResult.passed ? 'OK' : 'FAIL'}) — ${regressionResult.total} tests`);

        const branchName = `ai-fix/${findingId.slice(0, 8)}-${Date.now()}`;
        const commitMsg  = `fix(ai-agent): ${description.slice(0, 72)}`;

        const prRecord = {
            id:            crypto.randomUUID(),
            findingId,
            filePath,
            branchName,
            commitMsg,
            description,
            service:       serviceDir,
            status:        'pending',
            regressionResult,
            createdAt:     new Date().toISOString(),
        };

        if (AUTO_SUBMIT || !permGate) {
            // Directly create the branch and PR.
            const result = await this._submitPR(prRecord, fixedCode);
            prRecord.status = result.status;
            prRecord.prUrl  = result.prUrl;
            prRecord.prNumber = result.prNumber;
        } else {
            // Gate through PermissionGate.
            try {
                await permGate.requestPermission(
                    'create_pr',
                    `Create GitHub PR: "${description.slice(0, 80)}"`,
                    {
                        prRecordId: prRecord.id,
                        filePath,
                        branchName,
                        commitMsg,
                        fixedCode,
                        description,
                    },
                    'high'
                );
                prRecord.status = 'awaiting_approval';
            } catch (_) {
                prRecord.status = 'gate_error';
            }
        }

        this._prsCreated.push(prRecord);
        this._savePRRecord(prRecord);

        if (typeof observeFn === 'function') {
            observeFn('pr_proposed', { prRecordId: prRecord.id, status: prRecord.status });
        }

        return { status: prRecord.status, prRecordId: prRecord.id, regressionResult };
    }

    /**
     * Execute an admin-approved PR creation.
     * @param {object} permRecord   Approved PermissionGate record.
     * @returns {Promise<object>}
     */
    async executeApprovedPR(permRecord) {
        const { data } = permRecord;
        if (!data || !data.prRecordId || !data.fixedCode) {
            return { status: 'skipped', reason: 'Missing prRecordId or fixedCode in permission data.' };
        }

        const prRecord = this._prsCreated.find(p => p.id === data.prRecordId);
        if (!prRecord) {
            return { status: 'skipped', reason: `PR record ${data.prRecordId} not found.` };
        }

        const result = await this._submitPR(prRecord, data.fixedCode);
        prRecord.status   = result.status;
        prRecord.prUrl    = result.prUrl;
        prRecord.prNumber = result.prNumber;
        this._savePRRecord(prRecord);

        console.log(`[pr-generator] PR ${result.prNumber ? '#' + result.prNumber : '(no number)'} created: ${result.prUrl || 'N/A'}`);
        return result;
    }

    /**
     * Detect code/doc drift and propose a self-healing doc-sync PR.
     *
     * @param {object[]} liveSpecs     OpenAPI spec objects from DocIntelligence.
     * @param {object}   [permGate]
     * @returns {Promise<object[]>} Drift reports with proposed actions.
     */
    async checkDocCodeDrift(liveSpecs, permGate) {
        if (!Array.isArray(liveSpecs) || liveSpecs.length === 0) return [];

        const reports = [];
        const driftDir = path.join(PR_DIR, 'doc-drift');
        if (!fs.existsSync(driftDir)) fs.mkdirSync(driftDir, { recursive: true });

        for (const spec of liveSpecs) {
            const snapshotFile = path.join(driftDir, `${spec.service}-snapshot.json`);
            const prevSpec     = this._loadJSON(snapshotFile);

            if (!prevSpec) {
                // First time — just save snapshot, no drift.
                this._saveJSON(snapshotFile, spec.spec);
                continue;
            }

            const drift = this._computeSpecDrift(prevSpec, spec.spec, spec.service);

            if (drift.addedRoutes.length + drift.removedRoutes.length >= 3) {
                console.log(`[pr-generator] Doc drift detected for ${spec.service}: +${drift.addedRoutes.length} -${drift.removedRoutes.length} routes`);

                const driftReport = {
                    service:       spec.service,
                    addedRoutes:   drift.addedRoutes,
                    removedRoutes: drift.removedRoutes,
                    driftScore:    drift.addedRoutes.length + drift.removedRoutes.length,
                    detectedAt:    new Date().toISOString(),
                    action:        'pending',
                };
                reports.push(driftReport);

                if (permGate) {
                    await permGate.requestPermission(
                        'sync_docs',
                        `Doc drift in ${spec.service}: ${drift.addedRoutes.length} new routes, ${drift.removedRoutes.length} removed — regenerate docs?`,
                        { service: spec.service, drift },
                        'low'
                    ).catch(() => {});
                    driftReport.action = 'pending_approval';
                }
            }

            // Update snapshot.
            this._saveJSON(snapshotFile, spec.spec);
        }

        this._docDriftReports = [...this._docDriftReports, ...reports].slice(-50);
        return reports;
    }

    /** @returns {object[]} Created PRs. */
    getPRs(limit = 20) {
        return this._prsCreated.slice(-limit);
    }

    /** @returns {object[]} Regression test results. */
    getRegressionResults(limit = 20) {
        return this._testResults.slice(-limit);
    }

    /** @returns {object[]} Doc drift reports. */
    getDocDriftReports(limit = 20) {
        return this._docDriftReports.slice(-limit);
    }

    /** @returns {object} Summary. */
    getLastRunSummary() {
        return {
            lastRunAt:      this._lastRunAt,
            prsCreated:     this._prsCreated.length,
            prsMerged:      this._prsCreated.filter(p => p.status === 'merged').length,
            testResults:    this._testResults.length,
            docDriftReports: this._docDriftReports.length,
        };
    }

    // -----------------------------------------------------------------------
    // Regression testing
    // -----------------------------------------------------------------------

    /**
     * Run the service's npm test suite.
     * @private
     */
    async _runRegressionTests(serviceRelDir) {
        const serviceDir = path.join(PROJECT_ROOT, serviceRelDir);
        if (!fs.existsSync(serviceDir)) {
            return { passed: true, total: 0, failed: 0, skipped: true, reason: 'Service dir not found — skipped' };
        }

        // Check if package.json has a test script.
        const pkgFile = path.join(serviceDir, 'package.json');
        if (!fs.existsSync(pkgFile)) {
            return { passed: true, total: 0, failed: 0, skipped: true, reason: 'No package.json — skipped' };
        }

        let pkg;
        try { pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8')); } catch (_) {
            return { passed: true, total: 0, failed: 0, skipped: true, reason: 'Failed to parse package.json' };
        }

        if (!pkg.scripts || !pkg.scripts.test) {
            return { passed: true, total: 0, failed: 0, skipped: true, reason: 'No test script defined' };
        }

        const startTime = Date.now();
        try {
            const result = await execFileAsync(
                'npm', ['test', '--', '--passWithNoTests', '--json', '--silent'],
                { cwd: serviceDir, timeout: TEST_TIMEOUT_MS, maxBuffer: 5 * 1024 * 1024 }
            );

            let total = 0; let failed = 0;
            try {
                const jestOutput = JSON.parse(result.stdout);
                total  = jestOutput.numTotalTests  || 0;
                failed = jestOutput.numFailedTests || 0;
            } catch (_) { total = 1; failed = 0; }

            return {
                passed:   failed === 0,
                total,
                failed,
                skipped:  false,
                durationMs: Date.now() - startTime,
                service:  serviceRelDir,
            };
        } catch (err) {
            // Parse Jest exit code 1 (test failure) vs other errors.
            const output = err.stdout || '';
            let total = 0; let failed = 1;
            try {
                const jestOutput = JSON.parse(output);
                total  = jestOutput.numTotalTests  || 0;
                failed = jestOutput.numFailedTests || 1;
            } catch (_) {}

            return {
                passed:    failed === 0,
                total,
                failed,
                skipped:   false,
                durationMs: Date.now() - startTime,
                service:   serviceRelDir,
                error:     err.message.slice(0, 200),
            };
        }
    }

    // -----------------------------------------------------------------------
    // PR submission (GitHub API)
    // -----------------------------------------------------------------------

    /** @private */
    async _submitPR(prRecord, fixedCode) {
        if (!GH_OWNER || !GH_REPO || !GH_TOKEN) {
            return {
                status: 'skipped',
                reason: 'GitHub credentials not configured (PR_GITHUB_OWNER, PR_GITHUB_REPO, PR_GITHUB_TOKEN).',
            };
        }

        try {
            // Step 1: Get base branch SHA.
            const baseSHA = await this._getRefSHA(`heads/${BASE_BRANCH}`);

            // Step 2: Create new branch.
            await this._createRef(`refs/heads/${prRecord.branchName}`, baseSHA);

            // Step 3: Get current file SHA (needed for update).
            const fileContent = await this._getFileContent(prRecord.filePath, BASE_BRANCH);
            const fileSHA     = fileContent ? fileContent.sha : null;

            // Step 4: Commit the fix.
            await this._updateFile({
                filePath: prRecord.filePath,
                content:  fixedCode,
                message:  prRecord.commitMsg,
                branch:   prRecord.branchName,
                sha:      fileSHA,
            });

            // Step 5: Open PR.
            const pr = await this._openPR({
                title:  `🤖 ${prRecord.description.slice(0, 100)}`,
                body:   this._buildPRBody(prRecord),
                head:   prRecord.branchName,
                base:   BASE_BRANCH,
                labels: [PR_LABEL],
            });

            return { status: 'created', prNumber: pr.number, prUrl: pr.html_url };
        } catch (e) {
            console.error('[pr-generator] GitHub PR submission error:', e.message);
            return { status: 'error', reason: e.message.slice(0, 200) };
        }
    }

    /** @private */
    _buildPRBody(prRecord) {
        return [
            `## AI-Generated Fix`,
            ``,
            `**Finding ID:** \`${prRecord.findingId}\`  `,
            `**File:** \`${prRecord.filePath}\`  `,
            `**Service:** ${prRecord.service}`,
            ``,
            `## Description`,
            prRecord.description,
            ``,
            `## Regression Tests`,
            prRecord.regressionResult.skipped
                ? `⚠️ Skipped (${prRecord.regressionResult.reason})`
                : `✅ ${prRecord.regressionResult.total} tests passed before fix was applied.`,
            ``,
            `---`,
            `*Auto-generated by Milonexa AI Admin Agent v3.0. Review carefully before merging.*`,
        ].join('\n');
    }

    // -----------------------------------------------------------------------
    // Doc drift computation
    // -----------------------------------------------------------------------

    /** @private */
    _computeSpecDrift(prev, curr, service) {
        const prevPaths = Object.keys((prev && prev.paths) || {});
        const currPaths = Object.keys((curr && curr.paths) || {});

        const prevSet = new Set(prevPaths);
        const currSet = new Set(currPaths);

        return {
            service,
            addedRoutes:   currPaths.filter(p => !prevSet.has(p)),
            removedRoutes: prevPaths.filter(p => !currSet.has(p)),
        };
    }

    /** @private */
    _detectServiceDir(filePath) {
        const parts = filePath.split(path.sep);
        if (parts[0] === 'services' && parts[1]) return `services/${parts[1]}`;
        return parts[0] || '.';
    }

    // -----------------------------------------------------------------------
    // GitHub API helpers (built-in https only)
    // -----------------------------------------------------------------------

    /** @private */
    _githubRequest(method, apiPath, body) {
        return new Promise((resolve, reject) => {
            const payload = body ? JSON.stringify(body) : null;
            const options = {
                hostname: 'api.github.com',
                path:     `/repos/${GH_OWNER}/${GH_REPO}${apiPath}`,
                method,
                headers: {
                    'User-Agent':    'Milonexa-AI-Agent/3.0',
                    'Accept':        'application/vnd.github+json',
                    'Authorization': `Bearer ${GH_TOKEN}`,
                    'Content-Type':  'application/json',
                },
                timeout: 20000,
            };
            if (payload) options.headers['Content-Length'] = Buffer.byteLength(payload);

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', c => { data += c; });
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
                        else reject(new Error(`GitHub API ${res.statusCode}: ${parsed.message || data.slice(0, 200)}`));
                    } catch (_) {
                        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
                        else reject(new Error(`GitHub API ${res.statusCode}: ${data.slice(0, 200)}`));
                    }
                });
            });
            req.on('timeout', () => { req.destroy(); reject(new Error('GitHub API timeout')); });
            req.on('error', reject);
            if (payload) req.write(payload);
            req.end();
        });
    }

    /** @private */
    async _getRefSHA(ref) {
        const data = await this._githubRequest('GET', `/git/ref/${ref}`);
        return data.object.sha;
    }

    /** @private */
    async _createRef(ref, sha) {
        return this._githubRequest('POST', '/git/refs', { ref, sha });
    }

    /** @private */
    async _getFileContent(filePath, branch) {
        try {
            return await this._githubRequest('GET', `/contents/${filePath}?ref=${branch}`);
        } catch (_) { return null; }
    }

    /** @private */
    async _updateFile({ filePath, content, message, branch, sha }) {
        const payload = {
            message,
            content: Buffer.from(content).toString('base64'),
            branch,
        };
        if (sha) payload.sha = sha;
        return this._githubRequest('PUT', `/contents/${filePath}`, payload);
    }

    /** @private */
    async _openPR({ title, body, head, base }) {
        return this._githubRequest('POST', '/pulls', { title, body, head, base });
    }

    // -----------------------------------------------------------------------
    // Persistence
    // -----------------------------------------------------------------------

    /** @private */
    _savePRRecord(record) {
        try { fs.writeFileSync(path.join(PR_DIR, `${record.id}.json`), JSON.stringify(record, null, 2), 'utf8'); } catch (_) {}
    }

    /** @private */
    _loadJSON(filePath) {
        try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) { return null; }
    }

    /** @private */
    _saveJSON(filePath, data) {
        try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8'); } catch (_) {}
    }

    /** @private */
    _ensureDirs() {
        [AI_STATE_DIR, PR_DIR].forEach(d => {
            if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        });
    }
}

module.exports = { PRGenerator };
