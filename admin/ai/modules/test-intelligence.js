'use strict';

/**
 * @fileoverview Test intelligence module for the Milonexa AI Admin Agent.
 *
 * Capabilities (v2.2):
 *  - Coverage gap analysis: parses Jest/Istanbul JSON coverage reports to find
 *    uncovered branches, statements, and functions.
 *  - Property-based test generation: generates fast-check–based property tests
 *    stubs for discovered pure functions.
 *  - Mutation testing integration: runs Stryker (if installed) and sends the
 *    survival report to the LLM for interpretation.
 *  - Auto-fix test failures: reads Jest JSON output and asks the LLM to propose
 *    a corrected assertion or fixture.
 *  - Flaky test detection and quarantine: tracks per-test pass/fail history
 *    across runs and flags tests that fail non-deterministically.
 *
 * All I/O uses ONLY Node.js built-in modules (Stryker/fast-check invoked as
 * child processes; fallback gracefully if not installed).
 */

const fs            = require('fs');
const path          = require('path');
const crypto        = require('crypto');
const { execFile }  = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

const ADMIN_HOME     = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const AI_STATE_DIR   = path.join(ADMIN_HOME, 'ai');
const TEST_INTEL_DIR = path.join(AI_STATE_DIR, 'test-intelligence');
const PROJECT_ROOT   = path.resolve(__dirname, '..', '..', '..');

/** Service directories to check for coverage and tests. */
const SERVICE_DIRS = [
    'services/api-gateway',
    'services/user-service',
    'services/content-service',
    'services/media-service',
    'services/messaging-service',
    'services/collaboration-service',
    'services/streaming-service',
    'services/shop-service',
];

/** Default Istanbul/Jest coverage output locations. */
const COVERAGE_PATTERNS = [
    'coverage/coverage-summary.json',
    'coverage/coverage-final.json',
];

/** Flaky threshold: a test is considered flaky if it fails >= 2 times out of last 10 runs. */
const FLAKY_THRESHOLD_FAILURES = 2;
const FLAKY_WINDOW_SIZE        = 10;

// ---------------------------------------------------------------------------
// TestIntelligence
// ---------------------------------------------------------------------------

class TestIntelligence {
    constructor() {
        this._ensureDirs();
        /** @type {object} Last coverage gap analysis. */
        this._lastCoverageReport = null;
        /** @type {object[]} Property-based test stubs generated. */
        this._propertyStubs = [];
        /** @type {object[]} Auto-fix proposals for failing tests. */
        this._testFixProposals = [];
        /** @type {Map<string, number[]>} testName → recent pass(1)/fail(0) history */
        this._flakyHistory = this._loadFlakyHistory();
        /** @type {string[]} Currently quarantined test names */
        this._quarantined = this._loadQuarantined();
        this._lastRunAt = null;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Run all test intelligence tasks.
     *
     * @param {Function} [llmFn]   Optional async (prompt:string)=>string.
     * @param {object}   [permGate] PermissionGate instance.
     * @returns {Promise<object>}
     */
    async analyze(llmFn, permGate) {
        console.log('[test-intelligence] Starting test intelligence analysis…');
        this._lastRunAt = new Date().toISOString();

        // 1. Coverage gap analysis.
        const coverageReport = this._analyzeCoverageGaps();
        this._lastCoverageReport = coverageReport;
        console.log(`[test-intelligence] Coverage: ${coverageReport.totalUncoveredBranches} uncovered branches across ${coverageReport.services.length} service(s)`);

        // 2. Property-based test stubs for pure functions.
        const propertyStubs = this._generatePropertyStubs(coverageReport);
        this._propertyStubs = [...this._propertyStubs, ...propertyStubs].slice(-50);

        // 3. Mutation testing (Stryker — optional).
        let mutationReport = null;
        try {
            mutationReport = await this._runMutationTest(llmFn);
        } catch (_) { /* Stryker not installed or no config */ }

        // 4. Auto-fix failing tests.
        const failingTests = this._loadFailingTests();
        if (failingTests.length > 0 && typeof llmFn === 'function') {
            for (const test of failingTests.slice(0, 5)) {
                try {
                    const fix = await this._proposeTestFix(test, llmFn);
                    if (fix) {
                        this._testFixProposals.push(fix);
                        if (permGate && typeof permGate.requestPermission === 'function') {
                            await permGate.requestPermission(
                                'apply_test_fix',
                                `Apply AI-proposed fix for failing test: ${test.testName}`,
                                { fixId: fix.fixId, filePath: fix.filePath, fixedCode: fix.fixedCode },
                                'medium'
                            );
                            fix.status = 'awaiting_approval';
                        }
                    }
                } catch (_) {}
            }
        }

        // 5. Update flaky history from Jest output.
        const jestResults = this._loadJestResults();
        this._updateFlakyHistory(jestResults);
        const flaky = this._detectFlaky();
        if (flaky.length > 0) {
            console.log(`[test-intelligence] Flaky tests detected: ${flaky.map(f => f.testName).join(', ')}`);
        }

        // Save report.
        this._saveReport({ coverageReport, propertyStubs, mutationReport, flaky });

        return {
            uncoveredBranches: coverageReport.totalUncoveredBranches,
            propertyStubs:     propertyStubs.length,
            mutationReport:    mutationReport ? mutationReport.survived : null,
            testFixProposals:  this._testFixProposals.length,
            flakyTests:        flaky.length,
            quarantined:       this._quarantined.length,
        };
    }

    /**
     * Execute an admin-approved test fix.
     * @param {object} permRecord
     * @returns {Promise<object>}
     */
    async executeApprovedTestFix(permRecord) {
        const { data } = permRecord;
        if (!data || !data.filePath || !data.fixedCode) {
            return { status: 'skipped', reason: 'Missing filePath or fixedCode' };
        }

        const absPath = path.resolve(PROJECT_ROOT, data.filePath);
        if (!absPath.startsWith(PROJECT_ROOT + path.sep)) {
            return { status: 'refused', reason: 'Path outside project root' };
        }

        const backupPath = absPath + '.ai-backup.' + Date.now();
        try { fs.copyFileSync(absPath, backupPath); } catch (_) {}

        fs.writeFileSync(absPath, data.fixedCode, 'utf8');
        console.log(`[test-intelligence] Applied test fix to ${data.filePath}`);

        return { status: 'applied', filePath: data.filePath, backupPath: path.relative(PROJECT_ROOT, backupPath) };
    }

    /** @returns {object} Last run summary. */
    getLastRunSummary() {
        return {
            lastRunAt:        this._lastRunAt,
            uncoveredBranches: this._lastCoverageReport ? this._lastCoverageReport.totalUncoveredBranches : null,
            propertyStubs:    this._propertyStubs.length,
            testFixProposals: this._testFixProposals.length,
            quarantined:      this._quarantined.length,
        };
    }

    /** @returns {object|null} Last coverage report. */
    getCoverageReport() {
        return this._lastCoverageReport;
    }

    /** @returns {object[]} Property-based test stubs. */
    getPropertyStubs(limit = 20) {
        return this._propertyStubs.slice(-limit);
    }

    /** @returns {object[]} Test fix proposals. */
    getTestFixProposals(limit = 20) {
        return this._testFixProposals.slice(-limit);
    }

    /** @returns {string[]} Quarantined flaky test names. */
    getQuarantined() {
        return [...this._quarantined];
    }

    // -----------------------------------------------------------------------
    // 1. Coverage gap analysis
    // -----------------------------------------------------------------------

    /** @private */
    _analyzeCoverageGaps() {
        const services = [];
        let totalUncoveredBranches = 0;
        let totalUncoveredFunctions = 0;

        for (const relDir of SERVICE_DIRS) {
            const absDir = path.join(PROJECT_ROOT, relDir);
            if (!fs.existsSync(absDir)) continue;

            let coverageData = null;

            for (const pattern of COVERAGE_PATTERNS) {
                const covFile = path.join(absDir, pattern);
                if (fs.existsSync(covFile)) {
                    try { coverageData = JSON.parse(fs.readFileSync(covFile, 'utf8')); break; } catch (_) {}
                }
            }

            if (!coverageData) continue;

            const svcReport = this._parseCoverageData(coverageData, relDir);
            services.push(svcReport);
            totalUncoveredBranches  += svcReport.uncoveredBranches;
            totalUncoveredFunctions += svcReport.uncoveredFunctions;
        }

        return {
            generatedAt:           new Date().toISOString(),
            services,
            totalUncoveredBranches,
            totalUncoveredFunctions,
        };
    }

    /**
     * Parse Istanbul coverage-summary.json or coverage-final.json.
     * @private
     */
    _parseCoverageData(data, relDir) {
        const files = [];
        let uncoveredBranches  = 0;
        let uncoveredFunctions = 0;
        let totalBranches      = 0;
        let totalFunctions     = 0;

        // Handle coverage-summary format: { total: {...}, "path/file.js": {...} }
        // Handle coverage-final format:  { "path/file.js": { fnMap, branchMap, s, f, b } }
        for (const [filePath, stats] of Object.entries(data)) {
            if (filePath === 'total') continue;

            let branchPct   = 100;
            let functionPct = 100;
            let uncovBr     = 0;
            let uncovFn     = 0;
            let totBr       = 0;
            let totFn       = 0;

            if (stats.branches && typeof stats.branches.pct === 'number') {
                // coverage-summary format
                branchPct   = stats.branches.pct;
                functionPct = stats.functions ? stats.functions.pct : 100;
                totBr       = stats.branches.total || 0;
                totFn       = stats.functions ? stats.functions.total : 0;
                uncovBr     = Math.round(totBr * (1 - branchPct / 100));
                uncovFn     = Math.round(totFn * (1 - functionPct / 100));
            } else if (stats.b && stats.f) {
                // coverage-final format
                for (const counts of Object.values(stats.b || {})) {
                    if (Array.isArray(counts)) {
                        totBr += counts.length;
                        uncovBr += counts.filter(c => c === 0).length;
                    }
                }
                for (const count of Object.values(stats.f || {})) {
                    totFn++;
                    if (count === 0) uncovFn++;
                }
                branchPct   = totBr > 0 ? Math.round(((totBr - uncovBr) / totBr) * 100) : 100;
                functionPct = totFn > 0 ? Math.round(((totFn - uncovFn) / totFn) * 100) : 100;
            }

            if (uncovBr > 0 || uncovFn > 0) {
                files.push({
                    file:              path.relative(PROJECT_ROOT, filePath),
                    branchCoverage:    branchPct,
                    functionCoverage:  functionPct,
                    uncoveredBranches: uncovBr,
                    uncoveredFunctions: uncovFn,
                });
            }

            uncoveredBranches  += uncovBr;
            uncoveredFunctions += uncovFn;
            totalBranches      += totBr;
            totalFunctions     += totFn;
        }

        // Sort by most uncovered first.
        files.sort((a, b) => (b.uncoveredBranches + b.uncoveredFunctions) - (a.uncoveredBranches + a.uncoveredFunctions));

        return {
            service:            relDir,
            files:              files.slice(0, 20),
            uncoveredBranches,
            uncoveredFunctions,
            totalBranches,
            totalFunctions,
            branchCoverage:     totalBranches > 0 ? Math.round(((totalBranches - uncoveredBranches) / totalBranches) * 100) : null,
        };
    }

    // -----------------------------------------------------------------------
    // 2. Property-based test stub generation
    // -----------------------------------------------------------------------

    /**
     * Generate fast-check–style property test stubs for uncovered pure functions.
     * These are written as commented stubs — the developer activates them after review.
     * @private
     */
    _generatePropertyStubs(coverageReport) {
        const stubs = [];

        for (const svc of coverageReport.services) {
            for (const fileInfo of svc.files.slice(0, 5)) {
                if (fileInfo.uncoveredFunctions < 1) continue;

                const stub = this._buildPropertyStub(fileInfo, svc.service);
                if (stub) stubs.push(stub);
            }
        }

        return stubs;
    }

    /** @private */
    _buildPropertyStub(fileInfo, service) {
        const relFile  = fileInfo.file;
        const baseName = path.basename(relFile, path.extname(relFile));

        const stubCode = [
            `/**`,
            ` * @fileoverview Property-based tests for ${relFile}`,
            ` * Auto-generated by Milonexa AI Admin Agent v2.2 — test-intelligence module.`,
            ` * Requires: npm install --save-dev fast-check`,
            ` * Uncovered branches: ${fileInfo.uncoveredBranches}, uncovered functions: ${fileInfo.uncoveredFunctions}`,
            ` */`,
            ``,
            `// const fc = require('fast-check');`,
            `// const { /* exported functions */ } = require('../${relFile.replace(/^.*\//, '')}');`,
            ``,
            `describe('Property-based tests — ${baseName}', () => {`,
            `  // TODO: Activate by installing fast-check and importing actual functions.`,
            ``,
            `  test.skip('pure function preserves type invariants', () => {`,
            `    // fc.assert(`,
            `    //   fc.property(fc.string(), fc.integer(), (str, num) => {`,
            `    //     const result = processInput(str, num);`,
            `    //     expect(typeof result).toBe('object');`,
            `    //   })`,
            `    // );`,
            `  });`,
            ``,
            `  test.skip('idempotent operations return consistent results', () => {`,
            `    // fc.assert(`,
            `    //   fc.property(fc.anything(), (input) => {`,
            `    //     expect(transform(transform(input))).toEqual(transform(input));`,
            `    //   })`,
            `    // );`,
            `  });`,
            `});`,
        ].join('\n');

        return {
            id:           crypto.randomUUID(),
            service,
            file:         relFile,
            stubCode,
            generatedAt:  new Date().toISOString(),
        };
    }

    // -----------------------------------------------------------------------
    // 3. Mutation testing integration (Stryker)
    // -----------------------------------------------------------------------

    /** @private */
    async _runMutationTest(llmFn) {
        // Check if Stryker config exists in any service.
        let strykerConfig = null;
        for (const relDir of SERVICE_DIRS) {
            const cfg = path.join(PROJECT_ROOT, relDir, 'stryker.conf.js');
            const cfgJson = path.join(PROJECT_ROOT, relDir, 'stryker.conf.json');
            if (fs.existsSync(cfg)) { strykerConfig = { dir: relDir, file: cfg }; break; }
            if (fs.existsSync(cfgJson)) { strykerConfig = { dir: relDir, file: cfgJson }; break; }
        }

        if (!strykerConfig) {
            // No Stryker config found — generate a setup guide instead.
            return this._generateStrykerGuide();
        }

        // Try to run Stryker.
        let stdout = '';
        try {
            const result = await execFileAsync(
                'npx', ['stryker', 'run', '--reporters', 'json'],
                { cwd: path.join(PROJECT_ROOT, strykerConfig.dir), timeout: 300000, maxBuffer: 10 * 1024 * 1024 }
            );
            stdout = result.stdout;
        } catch (err) {
            stdout = err.stdout || '';
            if (!stdout) return null;
        }

        // Try to parse JSON report.
        const reportPath = path.join(PROJECT_ROOT, strykerConfig.dir, 'reports', 'mutation', 'mutation.json');
        let mutationData = null;
        if (fs.existsSync(reportPath)) {
            try { mutationData = JSON.parse(fs.readFileSync(reportPath, 'utf8')); } catch (_) {}
        }

        if (!mutationData) return null;

        // Summarise: count killed vs survived.
        const mutants  = mutationData.mutants || [];
        const survived = mutants.filter(m => m.status === 'Survived');
        const killed   = mutants.filter(m => m.status === 'Killed');
        const score    = mutants.length > 0 ? Math.round((killed.length / mutants.length) * 100) : 0;

        // LLM interpretation of survival report.
        let interpretation = null;
        if (typeof llmFn === 'function' && survived.length > 0) {
            const prompt = [
                `You are a testing expert. The following code mutants survived Stryker mutation testing`,
                `(they indicate missing test coverage or weak assertions):`,
                ``,
                survived.slice(0, 10).map(m => `- ${m.mutatorName} in ${m.fileName}:${m.location && m.location.start ? m.location.start.line : '?'} — "${m.description || ''}"`).join('\n'),
                ``,
                `Mutation score: ${score}%`,
                `Killed: ${killed.length}, Survived: ${survived.length}`,
                ``,
                `Provide 3 specific, actionable recommendations to improve the test suite.`,
                `Return JSON: { "score": ${score}, "topIssues": ["issue1", "issue2", "issue3"], "recommendations": ["rec1", "rec2", "rec3"] }`,
            ].join('\n');

            try {
                const r = await llmFn(prompt);
                const m = r && r.match(/\{[\s\S]*\}/);
                if (m) interpretation = JSON.parse(m[0]);
            } catch (_) {}
        }

        return {
            score,
            total:   mutants.length,
            killed:  killed.length,
            survived: survived.length,
            interpretation,
            reportPath: path.relative(PROJECT_ROOT, reportPath),
            generatedAt: new Date().toISOString(),
        };
    }

    /** @private — generate a Stryker setup guide when not installed. */
    _generateStrykerGuide() {
        return {
            score:    null,
            setupGuide: [
                'Install Stryker: npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner',
                'Create stryker.conf.json in your service directory with jest runner config.',
                'Run: npx stryker run',
                'The AI agent will pick up the results automatically on the next analysis cycle.',
            ],
            generatedAt: new Date().toISOString(),
        };
    }

    // -----------------------------------------------------------------------
    // 4. Auto-fix failing tests
    // -----------------------------------------------------------------------

    /** @private */
    _loadFailingTests() {
        const results = [];

        for (const relDir of SERVICE_DIRS) {
            const absDir = path.join(PROJECT_ROOT, relDir);
            const jestOutput = [
                path.join(absDir, 'jest-results.json'),
                path.join(absDir, 'test-results.json'),
            ].find(f => fs.existsSync(f));

            if (!jestOutput) continue;

            try {
                const data = JSON.parse(fs.readFileSync(jestOutput, 'utf8'));
                const suites = data.testResults || [];
                for (const suite of suites) {
                    for (const test of (suite.testResults || [])) {
                        if (test.status === 'failed') {
                            results.push({
                                service:   relDir,
                                file:      path.relative(PROJECT_ROOT, suite.testFilePath || ''),
                                testName:  test.fullName || test.title || 'unknown',
                                message:   (test.failureMessages || []).join('\n').slice(0, 1000),
                            });
                        }
                    }
                }
            } catch (_) {}
        }

        return results;
    }

    /** @private */
    async _proposeTestFix(test, llmFn) {
        // Read the test file for context.
        let fileContent = '';
        if (test.file) {
            const abs = path.resolve(PROJECT_ROOT, test.file);
            try { fileContent = fs.readFileSync(abs, 'utf8').slice(0, 3000); } catch (_) {}
        }

        const prompt = [
            `You are a JavaScript testing expert. The following Jest test is failing:`,
            ``,
            `Test: "${test.testName}"`,
            `File: ${test.file}`,
            `Service: ${test.service}`,
            ``,
            `Error message:`,
            test.message,
            ``,
            `Test file content (truncated):`,
            '```javascript',
            fileContent,
            '```',
            ``,
            `Propose a minimal fix for the failing test. Return JSON:`,
            `{ "explanation": "why it fails", "fix": "what to change", "fixedCode": "the corrected test code", "confidence": 0-1 }`,
        ].join('\n');

        let parsed = null;
        try {
            const response = await llmFn(prompt);
            const match = response && response.match(/\{[\s\S]*\}/);
            if (match) parsed = JSON.parse(match[0]);
        } catch (_) {}

        if (!parsed || !parsed.fixedCode) return null;

        return {
            fixId:       crypto.randomUUID(),
            service:     test.service,
            filePath:    test.file,
            testName:    test.testName,
            explanation: parsed.explanation || '',
            fix:         parsed.fix || '',
            fixedCode:   parsed.fixedCode,
            confidence:  typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
            proposedAt:  new Date().toISOString(),
            status:      'pending',
        };
    }

    // -----------------------------------------------------------------------
    // 5. Flaky test detection and quarantine
    // -----------------------------------------------------------------------

    /** @private */
    _loadJestResults() {
        const allResults = [];
        for (const relDir of SERVICE_DIRS) {
            const absDir = path.join(PROJECT_ROOT, relDir);
            const jestOutput = [
                path.join(absDir, 'jest-results.json'),
                path.join(absDir, 'test-results.json'),
            ].find(f => fs.existsSync(f));

            if (!jestOutput) continue;
            try {
                const data = JSON.parse(fs.readFileSync(jestOutput, 'utf8'));
                for (const suite of (data.testResults || [])) {
                    for (const test of (suite.testResults || [])) {
                        allResults.push({
                            name:   test.fullName || test.title || 'unknown',
                            passed: test.status === 'passed' ? 1 : 0,
                        });
                    }
                }
            } catch (_) {}
        }
        return allResults;
    }

    /** @private */
    _updateFlakyHistory(jestResults) {
        for (const { name, passed } of jestResults) {
            if (!this._flakyHistory.has(name)) this._flakyHistory.set(name, []);
            const history = this._flakyHistory.get(name);
            history.push(passed);
            if (history.length > FLAKY_WINDOW_SIZE) history.splice(0, history.length - FLAKY_WINDOW_SIZE);
        }
        this._saveFlakyHistory();
    }

    /** @private */
    _detectFlaky() {
        const flaky = [];

        for (const [testName, history] of this._flakyHistory) {
            if (history.length < 3) continue; // Need at least 3 data points.
            const failures = history.filter(r => r === 0).length;
            const passes   = history.filter(r => r === 1).length;

            // A test is flaky if it has both passes and failures (non-deterministic).
            if (failures >= FLAKY_THRESHOLD_FAILURES && passes >= 1) {
                flaky.push({ testName, failures, passes, totalRuns: history.length });

                // Quarantine: add to quarantine list if not already there.
                if (!this._quarantined.includes(testName)) {
                    this._quarantined.push(testName);
                    this._saveQuarantined();
                    console.log(`[test-intelligence] Quarantining flaky test: "${testName}"`);
                }
            }
        }

        // Un-quarantine tests that have recovered (10 consecutive passes).
        this._quarantined = this._quarantined.filter(name => {
            const history = this._flakyHistory.get(name) || [];
            if (history.length >= FLAKY_WINDOW_SIZE && history.every(r => r === 1)) {
                console.log(`[test-intelligence] Test recovered, removing from quarantine: "${name}"`);
                return false;
            }
            return true;
        });
        this._saveQuarantined();

        return flaky;
    }

    // -----------------------------------------------------------------------
    // Persistence
    // -----------------------------------------------------------------------

    /** @private */
    _loadFlakyHistory() {
        const file = path.join(TEST_INTEL_DIR, 'flaky-history.json');
        try {
            const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
            return new Map(Object.entries(raw));
        } catch (_) { return new Map(); }
    }

    /** @private */
    _saveFlakyHistory() {
        const obj = {};
        for (const [k, v] of this._flakyHistory) obj[k] = v;
        try { fs.writeFileSync(path.join(TEST_INTEL_DIR, 'flaky-history.json'), JSON.stringify(obj, null, 2), 'utf8'); } catch (_) {}
    }

    /** @private */
    _loadQuarantined() {
        const file = path.join(TEST_INTEL_DIR, 'quarantined.json');
        try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return []; }
    }

    /** @private */
    _saveQuarantined() {
        try { fs.writeFileSync(path.join(TEST_INTEL_DIR, 'quarantined.json'), JSON.stringify(this._quarantined, null, 2), 'utf8'); } catch (_) {}
    }

    /** @private */
    _saveReport(data) {
        const date = new Date().toISOString().split('T')[0];
        try { fs.writeFileSync(path.join(TEST_INTEL_DIR, `${date}-report.json`), JSON.stringify(data, null, 2), 'utf8'); } catch (_) {}
    }

    /** @private */
    _ensureDirs() {
        [AI_STATE_DIR, TEST_INTEL_DIR].forEach(d => {
            if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        });
    }
}

module.exports = { TestIntelligence };
