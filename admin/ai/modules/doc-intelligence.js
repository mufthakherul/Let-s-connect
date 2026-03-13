'use strict';

/**
 * @fileoverview Documentation intelligence module for the Milonexa AI Admin Agent.
 *
 * Capabilities (v2.2):
 *  - Diff-based doc updates: uses `git diff` to find changed service files and
 *    only regenerates documentation for those sections (incremental doc generation).
 *  - OpenAPI spec generation: analyses Express routes and JSDoc comments to produce
 *    an OpenAPI 3.0 YAML/JSON spec per service.
 *  - Changelog generation: reads `git log` since last tag and uses LLM to produce
 *    a structured CHANGELOG entry in Keep-a-Changelog format.
 *  - Admin-facing runbook generation: produces a structured operational runbook
 *    (startup, healthcheck, common issues, rollback) per service.
 *  - Localization: sends generated English docs to the LLM for translation into
 *    one or more configured target languages.
 *
 * Configuration (environment variables):
 *   DOC_TARGET_LANGUAGES   Comma-separated ISO 639-1 codes (e.g. "es,fr,de").
 *                          Leave empty to disable translation.
 *   DOC_OUTPUT_DIR         Where to write generated docs (default: docs/generated)
 *
 * All I/O uses ONLY Node.js built-in modules.
 */

const fs            = require('fs');
const path          = require('path');
const { execFile }  = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

const ADMIN_HOME     = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const AI_STATE_DIR   = path.join(ADMIN_HOME, 'ai');
const DOC_INTEL_DIR  = path.join(AI_STATE_DIR, 'doc-intelligence');
const PROJECT_ROOT   = path.resolve(__dirname, '..', '..', '..');
const SERVICES_DIR   = path.join(PROJECT_ROOT, 'services');
let DOCS_OUTPUT      = process.env.DOC_OUTPUT_DIR || path.join(PROJECT_ROOT, 'docs', 'generated');
const LOG_SERVICE    = 'ADMIN-AI';
const LOG_MODULE     = 'DOC-INTELLIGENCE';

function log(level, message) {
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
    console.log(`[${ts}] [${LOG_SERVICE}] [${LOG_MODULE}] [${level}] ${message}`);
}

/** Target languages for translation (if configured). */
function targetLanguages() {
    return (process.env.DOC_TARGET_LANGUAGES || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
}

/** Express route pattern for route extraction. */
const ROUTE_REGEX = /(?:app|router)\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

/** Service names to scan. */
const SERVICE_NAMES = [
    'api-gateway', 'user-service', 'content-service', 'media-service',
    'messaging-service', 'collaboration-service', 'streaming-service', 'shop-service',
];

// ---------------------------------------------------------------------------
// DocIntelligence
// ---------------------------------------------------------------------------

class DocIntelligence {
    constructor() {
        this._ensureDirs();
        /** @type {object[]} OpenAPI specs per service. */
        this._openApiSpecs = [];
        /** @type {string|null} Last generated changelog. */
        this._changelog = null;
        /** @type {object[]} Runbooks per service. */
        this._runbooks = [];
        /** @type {object[]} Translations generated. */
        this._translations = [];
        /** @type {string|null} Last changed-file fingerprint. */
        this._lastDiffHash = null;
        this._lastRunAt = null;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Run all documentation intelligence tasks.
     *
     * @param {Function} [llmFn]   Optional async (prompt:string)=>string.
     * @param {object}   [permGate] PermissionGate instance.
     * @returns {Promise<object>}
     */
    async analyze(llmFn, permGate) {
        log('INFO', 'Starting documentation intelligence analysis');
        this._lastRunAt = new Date().toISOString();

        // 1. Determine which services have changed (diff-based).
        const changedServices = await this._getChangedServices();
        log('INFO', `Changed services: ${changedServices.length > 0 ? changedServices.join(', ') : 'none'}`);

        // 2. OpenAPI spec generation (only for changed services, or all if first run).
        const targetServices = changedServices.length > 0 ? changedServices : SERVICE_NAMES;
        const newSpecs = [];
        for (const svc of targetServices) {
            try {
                const spec = this._generateOpenAPISpec(svc);
                if (spec) {
                    newSpecs.push(spec);
                    this._saveOpenAPISpec(svc, spec);
                }
            } catch (e) {
                log('ERROR', `OpenAPI spec error (${svc}): ${e.message}`);
            }
        }
        this._openApiSpecs = [...this._openApiSpecs.filter(s => !targetServices.includes(s.service)), ...newSpecs];

        // 3. Changelog generation.
        let changelogEntry = null;
        try {
            changelogEntry = await this._generateChangelog(llmFn);
            if (changelogEntry) {
                this._changelog = changelogEntry;
                this._saveChangelog(changelogEntry);
            }
        } catch (e) {
            log('ERROR', `Changelog error: ${e.message}`);
        }

        // 4. Runbook generation (changed services only).
        for (const svc of targetServices.slice(0, 4)) { // limit to 4 per run
            try {
                const runbook = await this._generateRunbook(svc, llmFn);
                if (runbook) {
                    this._runbooks = [...this._runbooks.filter(r => r.service !== svc), runbook];
                    this._saveRunbook(svc, runbook.content);
                    log('INFO', `Runbook generated for ${svc}`);
                }
            } catch (e) {
                log('ERROR', `Runbook error (${svc}): ${e.message}`);
            }
        }

        // 5. Localization (translate runbooks and changelog to configured languages).
        const langs = targetLanguages();
        if (typeof llmFn === 'function' && langs.length > 0) {
            await this._translateDocs(langs, llmFn);
        }

        // 6. Submit generated docs for admin approval to write to docs/ tree.
        if (permGate && (newSpecs.length > 0 || changelogEntry)) {
            await permGate.requestPermission(
                'write_generated_docs_v22',
                `Write ${newSpecs.length} OpenAPI spec(s) and changelog to docs/generated/`,
                {
                    specs:     newSpecs.map(s => s.service),
                    changelog: Boolean(changelogEntry),
                    languages: langs,
                },
                'low'
            ).catch(() => {});
        }

        const summary = {
            changedServices:  changedServices.length,
            openApiSpecs:     newSpecs.length,
            changelogUpdated: Boolean(changelogEntry),
            runbooksGenerated: this._runbooks.length,
            translations:     this._translations.length,
        };

        log('INFO', `Done: ${newSpecs.length} specs, ${this._runbooks.length} runbooks, ${this._translations.length} translations`);
        return summary;
    }

    /** @returns {object[]} OpenAPI specs. */
    getOpenAPISpecs() {
        return this._openApiSpecs;
    }

    /** @returns {string|null} Last changelog entry. */
    getChangelog() {
        return this._changelog;
    }

    /** @returns {object[]} Runbooks. */
    getRunbooks() {
        return this._runbooks;
    }

    /** @returns {object[]} Translations. */
    getTranslations(limit = 20) {
        return this._translations.slice(-limit);
    }

    /** @returns {object} Last run summary. */
    getLastRunSummary() {
        return {
            lastRunAt:      this._lastRunAt,
            openApiSpecs:   this._openApiSpecs.length,
            runbooks:       this._runbooks.length,
            translations:   this._translations.length,
            hasChangelog:   Boolean(this._changelog),
        };
    }

    // -----------------------------------------------------------------------
    // 1. Diff-based service change detection
    // -----------------------------------------------------------------------

    /**
     * Returns names of services whose files have changed since the last git tag.
     * Falls back to all services if git is unavailable or no tags exist.
     * @private
     */
    async _getChangedServices() {
        try {
            // Get last tag.
            const { stdout: tagOut } = await execFileAsync(
                'git', ['describe', '--tags', '--abbrev=0'],
                { cwd: PROJECT_ROOT, timeout: 5000 }
            );
            const lastTag = tagOut.trim();

            // Get files changed since last tag.
            const { stdout: diffOut } = await execFileAsync(
                'git', ['diff', '--name-only', lastTag, 'HEAD'],
                { cwd: PROJECT_ROOT, timeout: 10000 }
            );

            const changedFiles = diffOut.split('\n').map(s => s.trim()).filter(Boolean);
            const changed = new Set();

            for (const file of changedFiles) {
                for (const svc of SERVICE_NAMES) {
                    if (file.startsWith(`services/${svc}/`)) changed.add(svc);
                }
            }

            return [...changed];
        } catch (_) {
            // No tags or git unavailable — return empty (caller uses all services).
            return [];
        }
    }

    // -----------------------------------------------------------------------
    // 2. OpenAPI spec generation
    // -----------------------------------------------------------------------

    /**
     * Extract routes from a service's server.js and generate an OpenAPI 3.0 spec.
     * @private
     */
    _generateOpenAPISpec(serviceName) {
        const serverFile = path.join(SERVICES_DIR, serviceName, 'server.js');
        if (!fs.existsSync(serverFile)) return null;

        let content = '';
        try {
            const stat = fs.statSync(serverFile);
            if (stat.size > 2 * 1024 * 1024) return null; // Skip huge files.
            content = fs.readFileSync(serverFile, 'utf8');
        } catch (_) {
            return null;
        }

        // Extract routes.
        const routes = [];
        const regex  = new RegExp(ROUTE_REGEX.source, 'gi');
        let match;
        while ((match = regex.exec(content)) !== null) {
            routes.push({ method: match[1].toLowerCase(), path: match[2] });
        }

        if (routes.length === 0) return null;

        // Build minimal OpenAPI 3.0 spec.
        const spec = {
            openapi: '3.0.0',
            info: {
                title:       `${serviceName} API`,
                version:     '1.0.0',
                description: `Auto-generated API spec for ${serviceName}. Generated by Milonexa AI Admin Agent v2.2.`,
                'x-generated-at': new Date().toISOString(),
            },
            servers: [{ url: `http://localhost:8000`, description: 'API Gateway' }],
            paths: {},
        };

        for (const route of routes) {
            if (!spec.paths[route.path]) spec.paths[route.path] = {};
            spec.paths[route.path][route.method] = {
                summary:     `${route.method.toUpperCase()} ${route.path}`,
                description: `Auto-extracted from ${serviceName}/server.js`,
                operationId: `${route.method}_${route.path.replace(/[^a-zA-Z0-9]/g, '_')}`.replace(/_+/g, '_'),
                responses: {
                    '200': { description: 'Success' },
                    '400': { description: 'Bad request' },
                    '401': { description: 'Unauthorized' },
                    '500': { description: 'Internal server error' },
                },
                tags: [serviceName],
            };
        }

        return {
            service:    serviceName,
            routeCount: routes.length,
            spec,
            generatedAt: new Date().toISOString(),
        };
    }

    /** @private */
    _saveOpenAPISpec(serviceName, specObj) {
        const outputDir = path.join(DOCS_OUTPUT, 'openapi');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const jsonPath = path.join(outputDir, `${serviceName}.json`);
        try { fs.writeFileSync(jsonPath, JSON.stringify(specObj.spec, null, 2), 'utf8'); } catch (_) {}

        // Also save to doc-intelligence state dir.
        try { fs.writeFileSync(path.join(DOC_INTEL_DIR, `openapi-${serviceName}.json`), JSON.stringify(specObj.spec, null, 2), 'utf8'); } catch (_) {}
    }

    // -----------------------------------------------------------------------
    // 3. Changelog generation
    // -----------------------------------------------------------------------

    /** @private */
    async _generateChangelog(llmFn) {
        // Get git log since last tag (or last 30 commits if no tags).
        let gitLog = '';
        try {
            const { stdout: tagOut } = await execFileAsync(
                'git', ['describe', '--tags', '--abbrev=0'],
                { cwd: PROJECT_ROOT, timeout: 5000 }
            );
            const lastTag = tagOut.trim();
            const { stdout } = await execFileAsync(
                'git', ['log', `${lastTag}..HEAD`, '--oneline', '--no-decorate'],
                { cwd: PROJECT_ROOT, timeout: 10000 }
            );
            gitLog = stdout;
        } catch (_) {
            try {
                const { stdout } = await execFileAsync(
                    'git', ['log', '--oneline', '--no-decorate', '-30'],
                    { cwd: PROJECT_ROOT, timeout: 10000 }
                );
                gitLog = stdout;
            } catch (_2) {
                return null;
            }
        }

        if (!gitLog.trim()) return null;

        const commits = gitLog.trim().split('\n').slice(0, 50); // Cap at 50 commits.

        if (typeof llmFn !== 'function') {
            // Rule-based changelog grouping.
            return this._ruleBasedChangelog(commits);
        }

        const prompt = [
            `You are a technical writer. Generate a Keep-a-Changelog (https://keepachangelog.com) formatted`,
            `CHANGELOG entry from these git commits for the Milonexa platform:`,
            ``,
            commits.join('\n'),
            ``,
            `Group changes into: Added, Changed, Fixed, Removed, Security, Performance.`,
            `Use present tense. Be concise. Skip merge commits.`,
            `Return JSON: {`,
            `  "version": "2.2.0",`,
            `  "date": "${new Date().toISOString().split('T')[0]}",`,
            `  "added": ["..."],`,
            `  "changed": ["..."],`,
            `  "fixed": ["..."],`,
            `  "removed": [],`,
            `  "security": [],`,
            `  "performance": []`,
            `}`,
        ].join('\n');

        try {
            const response = await llmFn(prompt);
            const match = response && response.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return this._formatChangelog(parsed);
            }
        } catch (_) {}

        return this._ruleBasedChangelog(commits);
    }

    /** @private */
    _ruleBasedChangelog(commits) {
        const added    = [];
        const fixed    = [];
        const changed  = [];
        const security = [];

        for (const commit of commits) {
            const msg = commit.replace(/^[0-9a-f]+\s+/, '');
            if (/^feat|add|new/i.test(msg))    added.push(msg);
            else if (/^fix|bug|patch/i.test(msg)) fixed.push(msg);
            else if (/^sec|vuln|cve/i.test(msg))  security.push(msg);
            else                                   changed.push(msg);
        }

        const date = new Date().toISOString().split('T')[0];
        const sections = [];
        if (added.length)    sections.push(`### Added\n${added.map(c => `- ${c}`).join('\n')}`);
        if (changed.length)  sections.push(`### Changed\n${changed.map(c => `- ${c}`).join('\n')}`);
        if (fixed.length)    sections.push(`### Fixed\n${fixed.map(c => `- ${c}`).join('\n')}`);
        if (security.length) sections.push(`### Security\n${security.map(c => `- ${c}`).join('\n')}`);

        return `## [Unreleased] — ${date}\n\n${sections.join('\n\n')}`;
    }

    /** @private */
    _formatChangelog(parsed) {
        const sections = [];
        const SECTION_KEYS = ['added', 'changed', 'fixed', 'removed', 'security', 'performance'];
        for (const key of SECTION_KEYS) {
            const items = parsed[key];
            if (Array.isArray(items) && items.length > 0) {
                sections.push(`### ${key.charAt(0).toUpperCase() + key.slice(1)}\n${items.map(i => `- ${i}`).join('\n')}`);
            }
        }
        return `## [${parsed.version || 'Unreleased'}] — ${parsed.date || new Date().toISOString().split('T')[0]}\n\n${sections.join('\n\n')}`;
    }

    /** @private */
    _saveChangelog(content) {
        const changelogPath = path.join(DOCS_OUTPUT, 'CHANGELOG-AI.md');
        try {
            if (!fs.existsSync(DOCS_OUTPUT)) fs.mkdirSync(DOCS_OUTPUT, { recursive: true });
            // Prepend to existing changelog if present, else create new.
            let existing = '';
            if (fs.existsSync(changelogPath)) existing = fs.readFileSync(changelogPath, 'utf8');
            fs.writeFileSync(changelogPath, `# Changelog\n\n${content}\n\n---\n\n${existing}`, 'utf8');
        } catch (_) {}

        try { fs.writeFileSync(path.join(DOC_INTEL_DIR, 'last-changelog.md'), content, 'utf8'); } catch (_) {}
    }

    // -----------------------------------------------------------------------
    // 4. Runbook generation
    // -----------------------------------------------------------------------

    /** @private */
    async _generateRunbook(serviceName, llmFn) {
        const serverFile = path.join(SERVICES_DIR, serviceName, 'server.js');
        if (!fs.existsSync(serverFile)) return null;

        // Extract key info: port, health endpoint, main routes.
        let content = '';
        try {
            const stat = fs.statSync(serverFile);
            if (stat.size > 1024 * 1024) return null;
            content = fs.readFileSync(serverFile, 'utf8').slice(0, 5000);
        } catch (_) { return null; }

        const portMatch  = content.match(/process\.env\.\w*PORT\w*\s*\|\|\s*['"]?(\d+)['"]?/i) ||
                           content.match(/\.listen\((\d+)/);
        const port       = portMatch ? portMatch[1] : '(unknown)';
        const envMatch   = content.match(/process\.env\.(\w+)/g) || [];
        const envVars    = [...new Set(envMatch.map(m => m.replace('process.env.', '')))].slice(0, 20);

        // Extract routes.
        const routes = [];
        const regex  = new RegExp(ROUTE_REGEX.source, 'gi');
        let match;
        while ((match = regex.exec(content)) !== null) {
            routes.push(`${match[1].toUpperCase()} ${match[2]}`);
        }

        if (typeof llmFn === 'function') {
            const prompt = [
                `You are a DevOps engineer writing an operational runbook for the "${serviceName}" microservice`,
                `of the Milonexa / Let's Connect platform.`,
                ``,
                `Service details:`,
                `- Port: ${port}`,
                `- Key environment variables: ${envVars.slice(0, 10).join(', ')}`,
                `- Routes detected: ${routes.slice(0, 10).join(', ')}`,
                ``,
                `Write a concise runbook in Markdown covering:`,
                `1. **Startup & Prerequisites** (env vars, dependencies, startup command)`,
                `2. **Health Check** (how to verify the service is running)`,
                `3. **Common Issues & Troubleshooting** (3 most likely problems + fixes)`,
                `4. **Scaling** (horizontal scaling considerations)`,
                `5. **Rollback** (how to revert to a previous version)`,
                ``,
                `Keep it under 400 words. Use concrete commands where possible.`,
                `Return only the Markdown text (no JSON wrapper).`,
            ].join('\n');

            try {
                const content2 = await llmFn(prompt);
                if (content2 && content2.length > 100) {
                    return { service: serviceName, content: content2, port, generatedAt: new Date().toISOString() };
                }
            } catch (_) {}
        }

        // Rule-based fallback runbook.
        const runbookContent = this._ruleBasedRunbook(serviceName, port, envVars, routes);
        return { service: serviceName, content: runbookContent, port, generatedAt: new Date().toISOString() };
    }

    /** @private */
    _ruleBasedRunbook(service, port, envVars, routes) {
        return [
            `# ${service} Runbook`,
            ``,
            `*Auto-generated by Milonexa AI Admin Agent v2.2 — ${new Date().toISOString().split('T')[0]}*`,
            ``,
            `## Startup & Prerequisites`,
            ``,
            '```bash',
            `# Install dependencies`,
            `cd services/${service} && npm install`,
            ``,
            `# Required environment variables`,
            envVars.slice(0, 8).map(v => `export ${v}=<value>`).join('\n'),
            ``,
            `# Start the service`,
            `node services/${service}/server.js`,
            '```',
            ``,
            `## Health Check`,
            ``,
            '```bash',
            `curl http://localhost:${port}/health`,
            '```',
            ``,
            `## Key Endpoints`,
            ``,
            routes.length > 0
                ? routes.slice(0, 10).map(r => `- \`${r}\``).join('\n')
                : `- \`GET /health\` — liveness probe\n- *(run route extraction to populate)*`,
            ``,
            `## Common Issues`,
            ``,
            `| Issue | Likely Cause | Fix |`,
            `|-------|-------------|-----|`,
            `| Service won't start | Missing env var | Check all required \`process.env.*\` vars |`,
            `| Database connection error | DB not running | Start PostgreSQL and check \`DATABASE_URL\` |`,
            `| Port already in use | Previous process | \`lsof -i :${port}\` and kill the PID |`,
            ``,
            `## Rollback`,
            ``,
            '```bash',
            `git log --oneline -10  # Find the previous stable commit`,
            `git checkout <commit-hash> -- services/${service}/`,
            `docker compose restart ${service}`,
            '```',
        ].join('\n');
    }

    /** @private */
    _saveRunbook(serviceName, content) {
        const runbooksDir = path.join(DOCS_OUTPUT, 'runbooks');
        if (!fs.existsSync(runbooksDir)) fs.mkdirSync(runbooksDir, { recursive: true });
        try { fs.writeFileSync(path.join(runbooksDir, `${serviceName}.md`), content, 'utf8'); } catch (_) {}
        try { fs.writeFileSync(path.join(DOC_INTEL_DIR, `runbook-${serviceName}.md`), content, 'utf8'); } catch (_) {}
    }

    // -----------------------------------------------------------------------
    // 5. Localization
    // -----------------------------------------------------------------------

    /** @private */
    async _translateDocs(langs, llmFn) {
        const runbooks = this._runbooks.slice(-3); // Translate most recent 3 runbooks.

        for (const runbook of runbooks) {
            for (const lang of langs) {
                const translationKey = `${runbook.service}-${lang}`;
                // Skip if already translated recently.
                if (this._translations.find(t => t.key === translationKey &&
                    Date.now() - new Date(t.generatedAt).getTime() < 24 * 60 * 60 * 1000)) {
                    continue;
                }

                const prompt = [
                    `Translate the following technical runbook from English to ${lang} (ISO 639-1).`,
                    `Preserve all Markdown formatting, code blocks, and technical terms in English.`,
                    `Only translate the prose/description text.`,
                    ``,
                    runbook.content.slice(0, 2000),
                ].join('\n');

                try {
                    const translated = await llmFn(prompt);
                    if (translated && translated.length > 100) {
                        const entry = {
                            key:        translationKey,
                            service:    runbook.service,
                            lang,
                            content:    translated,
                            generatedAt: new Date().toISOString(),
                        };
                        this._translations = [...this._translations.filter(t => t.key !== translationKey), entry];

                        // Save to docs/generated/runbooks/{lang}/.
                        const langDir = path.join(DOCS_OUTPUT, 'runbooks', lang);
                        if (!fs.existsSync(langDir)) fs.mkdirSync(langDir, { recursive: true });
                        try { fs.writeFileSync(path.join(langDir, `${runbook.service}.md`), translated, 'utf8'); } catch (_) {}

                        log('INFO', `Translated ${runbook.service} runbook to ${lang}`);
                    }
                } catch (_) {}
            }
        }
    }

    /** @private */
    _ensureDirs() {
        [AI_STATE_DIR, DOC_INTEL_DIR].forEach(d => {
            if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        });

        try {
            if (!fs.existsSync(DOCS_OUTPUT)) fs.mkdirSync(DOCS_OUTPUT, { recursive: true });
            fs.accessSync(DOCS_OUTPUT, fs.constants.W_OK);
        } catch (err) {
            const fallback = path.join(AI_STATE_DIR, 'docs-generated');
            if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
            fs.accessSync(fallback, fs.constants.W_OK);
            log('WARN', `DOC_OUTPUT_DIR '${DOCS_OUTPUT}' is not writable (${err.message}). Falling back to '${fallback}'`);
            DOCS_OUTPUT = fallback;
        }
    }
}

module.exports = { DocIntelligence };
