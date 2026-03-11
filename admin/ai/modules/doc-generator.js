'use strict';

/**
 * @fileoverview AI-powered documentation generator for the Milonexa admin agent.
 *
 * Capabilities:
 *  - Walks every service's server.js to extract API routes (Express patterns).
 *  - Uses the local LLM to write user-facing documentation for each route/feature.
 *  - Generates a comprehensive USER_GUIDE.md per service.
 *  - Writes a combined PLATFORM_GUIDE.md to docs/generated/.
 *  - All output is saved to both .admin-cli/ai/generated-docs/ and optionally
 *    written to the docs/ tree (gated by admin approval for the latter).
 *
 * All I/O uses ONLY Node.js built-in modules.
 */

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

const ADMIN_HOME     = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const AI_STATE_DIR   = path.join(ADMIN_HOME, 'ai');
const DOCS_STATE_DIR = path.join(AI_STATE_DIR, 'generated-docs');
const PROJECT_ROOT   = path.resolve(__dirname, '..', '..', '..');
const SERVICES_DIR   = path.join(PROJECT_ROOT, 'services');

/** Route extraction regex — matches Express route definitions. */
const ROUTE_REGEX = /app\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

/** Feature section header regex (markdown-style block comments). */
const SECTION_REGEX = /\/\/\s*={3,}\s*\n\/\/\s*(.+)\n\/\/\s*={3,}/g;

/** Max content size per service file to read (512 KB). */
const MAX_FILE_BYTES = 512 * 1024;

/** @returns {string} Today's date as YYYY-MM-DD. */
const today = () => new Date().toISOString().split('T')[0];

// ---------------------------------------------------------------------------
// DocGenerator
// ---------------------------------------------------------------------------

class DocGenerator {
    constructor() {
        this._ensureDirs();
        /** @type {object[]} Generated doc manifests. */
        this._generatedDocs = [];
        this._lastRunAt = null;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Generate documentation for all services.
     *
     * @param {Function} [llmFn]  Optional async (prompt:string)=>string.
     * @param {object}   [permGate] PermissionGate for writing to docs/ tree.
     * @returns {Promise<object[]>} Array of generated doc objects.
     */
    async generateAll(llmFn, permGate) {
        console.log('[doc-generator] Starting documentation generation…');
        this._lastRunAt = new Date().toISOString();
        const results = [];

        const services = this._discoverServices();
        console.log(`[doc-generator] Discovered ${services.length} services`);

        for (const svc of services) {
            try {
                const doc = await this._generateServiceDoc(svc, llmFn);
                if (doc) {
                    this._saveDoc(svc.name, doc);
                    results.push({ service: svc.name, path: doc.outputPath, routeCount: doc.routes.length });
                    console.log(`[doc-generator] Generated docs for ${svc.name} (${doc.routes.length} routes)`);
                }
            } catch (e) {
                console.error(`[doc-generator] Failed for ${svc.name}:`, e.message);
            }
        }

        // Combine into platform guide.
        const platformGuide = this._buildPlatformGuide(results);
        const platformPath  = path.join(DOCS_STATE_DIR, 'PLATFORM_GUIDE.md');
        try { fs.writeFileSync(platformPath, platformGuide, 'utf8'); } catch (_) {}

        // Request approval to write into actual docs/ tree.
        if (permGate && results.length > 0) {
            await permGate.requestPermission(
                'write_generated_docs',
                `Write AI-generated platform documentation to docs/generated/ (${results.length} services)`,
                { outputDir: 'docs/generated', serviceCount: results.length },
                'low'
            ).catch(() => {});
        }

        this._generatedDocs = results;
        console.log(`[doc-generator] Documentation complete: ${results.length} services documented`);
        return results;
    }

    /**
     * Execute an admin-approved doc write.
     * @param {object} permRecord
     * @returns {Promise<object>}
     */
    async executeApprovedDocWrite(permRecord) {
        const { data } = permRecord;
        if (!data || !data.outputDir) {
            return { status: 'skipped', reason: 'No outputDir specified' };
        }

        // Validate that outputDir stays within the project root (prevent path traversal).
        const targetDir = path.resolve(PROJECT_ROOT, data.outputDir);
        const rootWithSep = PROJECT_ROOT.endsWith(path.sep) ? PROJECT_ROOT : PROJECT_ROOT + path.sep;
        if (targetDir !== PROJECT_ROOT && !targetDir.startsWith(rootWithSep)) {
            return { status: 'failed', reason: 'Invalid outputDir: must be inside the project root' };
        }
        try {
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            // Copy everything from DOCS_STATE_DIR into the target.
            const files = fs.readdirSync(DOCS_STATE_DIR);
            let copied = 0;
            for (const file of files) {
                if (file.endsWith('.md') || file.endsWith('.json')) {
                    fs.copyFileSync(
                        path.join(DOCS_STATE_DIR, file),
                        path.join(targetDir, file)
                    );
                    copied += 1;
                }
            }
            return { status: 'written', targetDir: data.outputDir, filesCopied: copied };
        } catch (e) {
            return { status: 'failed', error: e.message };
        }
    }

    getLastRunSummary() {
        return {
            lastRunAt: this._lastRunAt,
            docsGenerated: this._generatedDocs.length,
            services: this._generatedDocs.map(d => d.service),
        };
    }

    getGeneratedDocs() {
        return this._generatedDocs;
    }

    // -----------------------------------------------------------------------
    // Discovery
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

    // -----------------------------------------------------------------------
    // Per-service documentation
    // -----------------------------------------------------------------------

    /** @private */
    async _generateServiceDoc(svc, llmFn) {
        const stat = fs.statSync(svc.serverFile);
        if (stat.size > MAX_FILE_BYTES) {
            return this._buildBasicDoc(svc, []);
        }

        const content = fs.readFileSync(svc.serverFile, 'utf8');
        const routes  = this._extractRoutes(content);
        const sections = this._extractSections(content);

        if (!llmFn) {
            return this._buildBasicDoc(svc, routes, sections);
        }

        // Use LLM to write friendly user-facing docs for each route group.
        const routeGroups = this._groupRoutes(routes);
        const docs = [];

        for (const [group, groupRoutes] of Object.entries(routeGroups)) {
            const routeList = groupRoutes
                .map(r => `  ${r.method.toUpperCase()} ${r.path}`)
                .join('\n');

            const prompt = [
                `You are a technical writer for the Let's Connect / Milonexa social platform.`,
                `Write clear, user-friendly documentation for the following API feature group.`,
                ``,
                `Service: ${svc.name}`,
                `Feature group: ${group}`,
                `Endpoints:`,
                routeList,
                ``,
                `Write a markdown section with:`,
                `1. A brief description of what this feature does for end users`,
                `2. Example use cases (2-3 bullet points)`,
                `3. API usage table (Method | Path | Description)`,
                ``,
                `Be concise and helpful. Use plain language, not jargon.`,
            ].join('\n');

            try {
                const llmDoc = await llmFn(prompt);
                if (llmDoc) docs.push({ group, content: llmDoc });
            } catch (_) {
                docs.push({ group, content: this._buildFallbackGroupDoc(group, groupRoutes) });
            }
        }

        const markdown = this._assembleDocs(svc.name, routes, docs, sections);
        const outputPath = path.join(DOCS_STATE_DIR, `${svc.name}.md`);

        return { service: svc.name, routes, docs, outputPath, markdown };
    }

    // -----------------------------------------------------------------------
    // Extraction helpers
    // -----------------------------------------------------------------------

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
    _extractSections(content) {
        const sections = [];
        let match;
        const regex = new RegExp(SECTION_REGEX.source, 'g');
        while ((match = regex.exec(content)) !== null) {
            sections.push(match[1].trim());
        }
        return sections;
    }

    /** @private */
    _groupRoutes(routes) {
        const groups = {};
        for (const r of routes) {
            const parts  = r.path.split('/').filter(Boolean);
            const group  = parts[0] || 'root';
            if (!groups[group]) groups[group] = [];
            groups[group].push(r);
        }
        return groups;
    }

    // -----------------------------------------------------------------------
    // Doc assembly helpers
    // -----------------------------------------------------------------------

    /** @private */
    _buildBasicDoc(svc, routes, sections = []) {
        const lines = [
            `# ${svc.name}`,
            '',
            `*Auto-generated by Milonexa AI Admin Agent — ${today()}*`,
            '',
            `## Endpoints (${routes.length})`,
            '',
        ];

        if (routes.length === 0) {
            lines.push('*No routes detected.*');
        } else {
            lines.push('| Method | Path |', '|--------|------|');
            for (const r of routes) {
                lines.push(`| ${r.method.toUpperCase()} | \`${r.path}\` |`);
            }
        }

        if (sections.length > 0) {
            lines.push('', '## Feature Sections', '');
            sections.forEach(s => lines.push(`- ${s}`));
        }

        const markdown  = lines.join('\n');
        const outputPath = path.join(DOCS_STATE_DIR, `${svc.name}.md`);
        return { service: svc.name, routes, docs: [], outputPath, markdown };
    }

    /** @private */
    _buildFallbackGroupDoc(group, routes) {
        const lines = [
            `### ${group}`,
            '',
            '| Method | Path | Description |',
            '|--------|------|-------------|',
        ];
        for (const r of routes) {
            lines.push(`| ${r.method.toUpperCase()} | \`${r.path}\` | — |`);
        }
        return lines.join('\n');
    }

    /** @private */
    _assembleDocs(serviceName, routes, docs, sections) {
        const lines = [
            `# ${serviceName} — User Guide`,
            '',
            `*AI-generated documentation — ${today()}*`,
            '',
        ];

        if (sections.length > 0) {
            lines.push('## Feature Overview', '');
            sections.forEach(s => lines.push(`- ${s}`));
            lines.push('');
        }

        for (const d of docs) {
            lines.push(d.content, '');
        }

        lines.push('---', `*${routes.length} endpoints documented.*`);
        return lines.join('\n');
    }

    /** @private */
    _buildPlatformGuide(serviceResults) {
        const lines = [
            '# Let\'s Connect Platform — Complete Feature Guide',
            '',
            `*Auto-generated by Milonexa AI Admin Agent — ${today()}*`,
            '',
            '## Services',
            '',
        ];

        for (const r of serviceResults) {
            lines.push(`- **${r.service}** — ${r.routeCount} API endpoints → [${r.service}.md](./${r.service}.md)`);
        }

        lines.push('');
        lines.push('---');
        lines.push('*This guide is automatically maintained by the AI Admin Agent.*');

        return lines.join('\n');
    }

    // -----------------------------------------------------------------------
    // Persistence
    // -----------------------------------------------------------------------

    /** @private */
    _saveDoc(serviceName, doc) {
        try {
            fs.writeFileSync(doc.outputPath, doc.markdown, 'utf8');
        } catch (_) {}
    }

    /** @private */
    _ensureDirs() {
        [AI_STATE_DIR, DOCS_STATE_DIR].forEach(d => {
            if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        });
    }
}

module.exports = { DocGenerator };
