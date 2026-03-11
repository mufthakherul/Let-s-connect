'use strict';

/**
 * @fileoverview AI-powered test generator for the Milonexa admin agent.
 *
 * Capabilities:
 *  - Walks every service's server.js and extracts Express route handlers.
 *  - Discovers existing test files to avoid duplicate stubs.
 *  - Uses the local LLM to generate:
 *      • Jest test stubs for untested API routes.
 *      • Edge-case test scenarios for each endpoint.
 *      • Integration test skeletons for service-to-service calls.
 *  - Generated test files are submitted to PermissionGate for admin approval
 *    before being written to disk.
 *  - Writes generated stubs to .admin-cli/ai/generated-tests/ (staging area).
 *
 * All I/O uses ONLY Node.js built-in modules.
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

const ADMIN_HOME       = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const AI_STATE_DIR     = path.join(ADMIN_HOME, 'ai');
const TESTS_STATE_DIR  = path.join(AI_STATE_DIR, 'generated-tests');
const PROJECT_ROOT     = path.resolve(__dirname, '..', '..', '..');
const SERVICES_DIR     = path.join(PROJECT_ROOT, 'services');

/** Route extraction regex. */
const ROUTE_REGEX = /app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

/** Existing test file patterns. */
const TEST_PATTERNS = [/\.test\.js$/, /\.spec\.js$/, /test\//];

// ---------------------------------------------------------------------------
// TestGenerator
// ---------------------------------------------------------------------------

class TestGenerator {
    constructor() {
        this._ensureDirs();
        /** @type {object[]} Generated test stubs. */
        this._generatedStubs = [];
        this._lastRunAt = null;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Scan services and generate test stubs for untested routes.
     *
     * @param {Function} [llmFn]   Optional async (prompt:string)=>string.
     * @param {object}   [permGate] PermissionGate to request approval for writing tests.
     * @returns {Promise<{stubsGenerated: number, stubs: object[]}>}
     */
    async generateTests(llmFn, permGate) {
        console.log('[test-generator] Scanning for untested routes…');
        this._lastRunAt = new Date().toISOString();
        const stubs = [];

        const services = this._discoverServices();

        for (const svc of services) {
            try {
                const svcStubs = await this._generateServiceTests(svc, llmFn, permGate);
                stubs.push(...svcStubs);
                if (svcStubs.length > 0) {
                    console.log(`[test-generator] ${svc.name}: ${svcStubs.length} test stub(s) generated`);
                }
            } catch (e) {
                console.error(`[test-generator] Error for ${svc.name}:`, e.message);
            }
        }

        this._generatedStubs = stubs;
        console.log(`[test-generator] Total: ${stubs.length} test stubs generated`);
        return { stubsGenerated: stubs.length, stubs };
    }

    /**
     * Execute an admin-approved test write.
     * @param {object} permRecord
     * @returns {Promise<object>}
     */
    async executeApprovedTestWrite(permRecord) {
        const { data } = permRecord;
        if (!data || !data.targetPath || !data.content) {
            return { status: 'skipped', reason: 'Missing targetPath or content' };
        }

        const absPath = path.resolve(PROJECT_ROOT, data.targetPath);
        // Safety: only write inside project root (not to root itself).
        if (!absPath.startsWith(PROJECT_ROOT + path.sep)) {
            return { status: 'refused', reason: 'Path outside project root' };
        }

        // Don't overwrite existing tests.
        if (fs.existsSync(absPath)) {
            return { status: 'skipped', reason: 'Test file already exists' };
        }

        const dir = path.dirname(absPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(absPath, data.content, 'utf8');
        console.log(`[test-generator] Wrote test stub: ${data.targetPath}`);

        return { status: 'written', targetPath: data.targetPath };
    }

    getLastRunSummary() {
        return {
            lastRunAt: this._lastRunAt,
            stubsGenerated: this._generatedStubs.length,
            services: [...new Set(this._generatedStubs.map(s => s.service))],
        };
    }

    getGeneratedStubs(limit = 50) {
        return this._generatedStubs.slice(-limit);
    }

    // -----------------------------------------------------------------------
    // Per-service generation
    // -----------------------------------------------------------------------

    /** @private */
    async _generateServiceTests(svc, llmFn, permGate) {
        const content     = fs.readFileSync(svc.serverFile, 'utf8');
        const routes      = this._extractRoutes(content);
        const untestedRoutes = routes.filter(r => !this._hasTest(svc.name, r.path));

        if (untestedRoutes.length === 0) return [];

        const stubs = [];
        const routeSample = untestedRoutes.slice(0, 15); // cap per service

        if (llmFn) {
            const routeList = routeSample.map(r => `  ${r.method.toUpperCase()} ${r.path}`).join('\n');
            const prompt = [
                `You are a senior Node.js test engineer for the Let's Connect / Milonexa platform.`,
                `Write Jest test stubs for the following untested API routes in ${svc.name}.`,
                ``,
                `Routes:`,
                routeList,
                ``,
                `Requirements:`,
                `- Use Jest + supertest pattern (import style: const request = require('supertest'))`,
                `- Each test should cover: success case, missing fields (400), and unauthorized (401)`,
                `- Use descriptive test names`,
                `- Include TODO comments where real assertions need to be filled in`,
                `- Export nothing (just describe blocks)`,
                ``,
                `Return only the JavaScript test code, no explanations.`,
            ].join('\n');

            try {
                const testCode = await llmFn(prompt);
                if (testCode) {
                    const targetPath = `services/${svc.name}/tests/ai-generated.test.js`;
                    const stub = {
                        stubId:      crypto.randomUUID(),
                        service:     svc.name,
                        targetPath,
                        routesCovered: routeSample.map(r => `${r.method.toUpperCase()} ${r.path}`),
                        content:     this._wrapTestContent(svc.name, testCode),
                        generatedAt: new Date().toISOString(),
                        llmEnhanced: true,
                    };
                    stubs.push(stub);
                    this._saveStub(stub);

                    // Gate writing to the actual test directory.
                    if (permGate) {
                        await permGate.requestPermission(
                            'write_generated_tests',
                            `Write AI-generated tests for ${svc.name} (${routeSample.length} routes covered)`,
                            { targetPath, content: stub.content, service: svc.name },
                            'low'
                        ).catch(() => {});
                    }
                }
            } catch (_) {
                stubs.push(this._buildFallbackStub(svc.name, routeSample));
            }
        } else {
            stubs.push(this._buildFallbackStub(svc.name, routeSample));
        }

        return stubs;
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /** @private */
    _discoverServices() {
        const services = [];
        try {
            const entries = fs.readdirSync(SERVICES_DIR, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory()) continue;
                const serverFile = path.join(SERVICES_DIR, entry.name, 'server.js');
                if (fs.existsSync(serverFile)) {
                    services.push({ name: entry.name, serverFile });
                }
            }
        } catch (_) {}
        return services;
    }

    /** @private */
    _extractRoutes(content) {
        const routes = [];
        let match;
        const regex = new RegExp(ROUTE_REGEX.source, 'gi');
        while ((match = regex.exec(content)) !== null) {
            routes.push({ method: match[1].toLowerCase(), path: match[2] });
        }
        return routes;
    }

    /** @private */
    _hasTest(serviceName, routePath) {
        const svcDir  = path.join(SERVICES_DIR, serviceName);
        const testsDir = path.join(svcDir, 'tests');
        if (!fs.existsSync(testsDir)) return false;
        try {
            const testFiles = fs.readdirSync(testsDir);
            return testFiles.some(f => TEST_PATTERNS.some(p => p.test(f)));
        } catch (_) { return false; }
    }

    /** @private */
    _buildFallbackStub(serviceName, routes) {
        const lines = [
            `'use strict';`,
            ``,
            `/**`,
            ` * AI-generated test stubs for ${serviceName}.`,
            ` * Generated: ${new Date().toISOString()}`,
            ` * TODO: Fill in assertions and test data.`,
            ` */`,
            ``,
            `const request = require('supertest');`,
            `const app     = require('../server');`,
            ``,
        ];

        for (const r of routes) {
            const testName = `${r.method.toUpperCase()} ${r.path}`;
            lines.push(
                `describe('${testName}', () => {`,
                `  it('should return 2xx for a valid request', async () => {`,
                `    // TODO: add auth header and request body`,
                `    const res = await request(app).${r.method}('${r.path}');`,
                `    expect(res.status).toBeLessThan(500);`,
                `  });`,
                ``,
                `  it('should return 400 for missing required fields', async () => {`,
                `    // TODO: customize`,
                `    const res = await request(app).${r.method}('${r.path}').send({});`,
                `    expect([400, 401, 422]).toContain(res.status);`,
                `  });`,
                `});`,
                ``
            );
        }

        const content = lines.join('\n');
        const targetPath = `services/${serviceName}/tests/ai-generated.test.js`;
        const stub = {
            stubId:      crypto.randomUUID(),
            service:     serviceName,
            targetPath,
            routesCovered: routes.map(r => `${r.method.toUpperCase()} ${r.path}`),
            content,
            generatedAt: new Date().toISOString(),
            llmEnhanced: false,
        };
        this._saveStub(stub);
        return stub;
    }

    /** @private */
    _wrapTestContent(serviceName, code) {
        const header = [
            `'use strict';`,
            `/**`,
            ` * AI-generated test stubs for ${serviceName}.`,
            ` * Generated: ${new Date().toISOString()}`,
            ` * Review carefully before running in production.`,
            ` */`,
            ``,
        ].join('\n');
        return header + (code.startsWith("'use strict'") ? code.slice("'use strict';".length) : code);
    }

    /** @private */
    _saveStub(stub) {
        const filePath = path.join(TESTS_STATE_DIR, `${stub.service}.test.js`);
        try { fs.writeFileSync(filePath, stub.content, 'utf8'); } catch (_) {}
    }

    /** @private */
    _ensureDirs() {
        [AI_STATE_DIR, TESTS_STATE_DIR].forEach(d => {
            if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        });
    }
}

module.exports = { TestGenerator };
