'use strict';

/**
 * @fileoverview AI-powered code analyzer for the Milonexa admin agent.
 *
 * Capabilities:
 *  - Walks the project source tree and reads JS/TS/JSON files.
 *  - Applies deterministic static-analysis rules to detect:
 *      • Security vulnerabilities (hardcoded secrets, eval, SQL injection patterns,
 *        prototype pollution, path traversal, weak crypto, etc.)
 *      • Code quality issues (TODO/FIXME/HACK, empty catch blocks, etc.)
 *      • Missing error handling patterns.
 *  - For each suspicious finding, optionally uses the local Ollama LLM to:
 *      • Explain the issue clearly.
 *      • Propose a concrete code fix.
 *  - Proposed fixes are submitted to PermissionGate for admin approval before
 *    being written to disk.
 *  - Writes analysis reports to: .admin-cli/ai/code-analysis/YYYY-MM-DD.json
 *
 * All I/O uses ONLY Node.js built-in modules.
 */

const fs            = require('fs');
const path          = require('path');
const http          = require('http');
const crypto        = require('crypto');
const { execFile }  = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

const ADMIN_HOME    = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const AI_STATE_DIR  = path.join(ADMIN_HOME, 'ai');
const ANALYSIS_DIR  = path.join(AI_STATE_DIR, 'code-analysis');
const PROJECT_ROOT  = path.resolve(__dirname, '..', '..', '..');

/** Current agent version. */
const AGENT_VERSION = '2.0.0';

/** Extensions we scan. */
const SCAN_EXTENSIONS = new Set(['.js', '.mjs', '.ts', '.json']);

/** Directories we skip entirely. */
const SKIP_DIRS = new Set([
    'node_modules', '.git', 'dist', 'build', '.admin-cli',
    'coverage', '.nyc_output', 'archive_code', 'Archives',
]);

/** Max file size to read (256 KB). */
const MAX_FILE_BYTES = 256 * 1024;

/** How many lines of context to send to the LLM around a finding. */
const CONTEXT_LINES = 10;

// ---------------------------------------------------------------------------
// Static analysis rule patterns
// ---------------------------------------------------------------------------

const SECURITY_RULES = [
    {
        id:       'hardcoded-secret',
        severity: 'critical',
        // Exclude obvious placeholders: 'YOUR_KEY_HERE', 'replace-me', 'xxx', '***', '<...>'
        pattern:  /(?:password|passwd|secret|api_?key|apikey|token|auth)\s*[:=]\s*['"](?!your_|replace|<|xxx|\*{3}|changeme|example|placeholder|demo)[^'"]{8,}['"]/i,
        message:  'Possible hardcoded secret/credential',
    },
    {
        id:       'eval-usage',
        severity: 'high',
        pattern:  /\beval\s*\(/,
        message:  'eval() usage is dangerous — enables code injection',
    },
    {
        id:       'sql-injection-risk',
        severity: 'high',
        pattern:  /(?:query|execute|raw)\s*\(\s*[`'"].*\$\{/,
        message:  'Possible SQL injection: template literal in query',
    },
    {
        id:       'prototype-pollution',
        severity: 'high',
        pattern:  /\[['"]__proto__['"]\]|\.__proto__\s*=/,
        message:  'Prototype pollution risk',
    },
    {
        id:       'path-traversal',
        severity: 'high',
        pattern:  /(?:readFile|readFileSync|createReadStream)\s*\([^)]*(?:req\.|params\.|query\.)/,
        message:  'Possible path traversal: user input used in file path',
    },
    {
        id:       'weak-crypto',
        severity: 'medium',
        pattern:  /(?:createCipher|createDecipher|md5|sha1)\s*\(/i,
        message:  'Weak or deprecated cryptographic function',
    },
    {
        id:       'xss-risk',
        severity: 'medium',
        pattern:  /innerHTML\s*=|dangerouslySetInnerHTML/,
        message:  'Potential XSS via innerHTML / dangerouslySetInnerHTML',
    },
    {
        id:       'unvalidated-redirect',
        severity: 'medium',
        pattern:  /res\.redirect\s*\([^)]*(?:req\.|params\.|query\.)/,
        message:  'Possible open redirect using user-supplied URL',
    },
    {
        id:       'insecure-random',
        severity: 'low',
        pattern:  /Math\.random\(\)/,
        message:  'Math.random() is not cryptographically secure — use crypto.randomBytes()',
    },
];

const QUALITY_RULES = [
    {
        id:       'empty-catch',
        severity: 'low',
        pattern:  /catch\s*\([^)]*\)\s*\{\s*\}/,
        message:  'Empty catch block silently swallows errors',
    },
    {
        id:       'todo-comment',
        severity: 'low',
        pattern:  /\/\/\s*(?:TODO|FIXME|HACK|XXX):/i,
        message:  'Technical debt marker found',
    },
    {
        id:       'console-log-sensitive',
        severity: 'low',
        pattern:  /console\.(?:log|error|warn)\s*\([^)]*(?:password|token|secret|key)/i,
        message:  'Possible sensitive data logged to console',
    },
];

const ALL_RULES = [...SECURITY_RULES, ...QUALITY_RULES];

// ---------------------------------------------------------------------------
// CodeAnalyzer
// ---------------------------------------------------------------------------

class CodeAnalyzer {
    constructor() {
        this._ensureDirs();
        /** @type {object[]} Findings from the last analysis run. */
        this._lastFindings = [];
        /** @type {object[]} Proposed fixes pending admin approval. */
        this._proposedFixes = [];
        this._lastRunAt = null;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Run a full project code analysis.
     *
     * @param {Function} [llmFn]  Optional async (prompt:string)=>string for LLM-enhanced analysis.
     * @param {object}   [permGate] PermissionGate instance to submit fix proposals.
     * @returns {Promise<{findings: object[], summary: object}>}
     */
    async analyzeProject(llmFn, permGate) {
        console.log('[code-analyzer] Starting project code analysis…');
        this._lastRunAt = new Date().toISOString();
        const findings = [];

        const files = this._walkProject(PROJECT_ROOT);
        console.log(`[code-analyzer] Scanning ${files.length} source files…`);

        for (const filePath of files) {
            try {
                const fileFindings = this._analyzeFile(filePath);
                findings.push(...fileFindings);
            } catch (e) {
                // skip unreadable files
            }
        }

        // Deduplicate by id+file+line.
        const deduped = this._deduplicate(findings);

        // Sort by severity.
        const SRANK = { critical: 4, high: 3, medium: 2, low: 1 };
        deduped.sort((a, b) => (SRANK[b.severity] || 0) - (SRANK[a.severity] || 0));

        this._lastFindings = deduped;

        console.log(`[code-analyzer] Found ${deduped.length} findings (${deduped.filter(f => f.severity === 'critical').length} critical, ${deduped.filter(f => f.severity === 'high').length} high)`);

        // LLM-enhanced fix proposals for critical/high severity only.
        if (typeof llmFn === 'function') {
            const important = deduped.filter(f => f.severity === 'critical' || f.severity === 'high').slice(0, 10);
            for (const finding of important) {
                try {
                    const fix = await this._generateFix(finding, llmFn, permGate);
                    if (fix) {
                        this._proposedFixes.push(fix);
                        console.log(`[code-analyzer] Fix proposed for ${finding.id} in ${path.relative(PROJECT_ROOT, finding.file)}`);
                    }
                } catch (e) {
                    console.error(`[code-analyzer] Fix generation failed for ${finding.id}:`, e.message);
                }
            }
        }

        const summary = this._buildSummary(deduped);
        this._saveReport(deduped, summary);

        return { findings: deduped, summary };
    }

    /**
     * Execute an admin-approved code fix.
     * @param {object} permRecord
     * @returns {Promise<object>}
     */
    async executeApprovedFix(permRecord) {
        const { data } = permRecord;
        if (!data || !data.filePath || !data.newContent) {
            return { status: 'skipped', reason: 'Missing filePath or newContent in permission data' };
        }

        const absPath = path.resolve(PROJECT_ROOT, data.filePath);
        // Safety: only write inside the project root (not to root itself).
        if (!absPath.startsWith(PROJECT_ROOT + path.sep)) {
            return { status: 'refused', reason: 'Path outside project root' };
        }

        // Backup original.
        const backupPath = absPath + '.ai-backup.' + Date.now();
        try {
            fs.copyFileSync(absPath, backupPath);
        } catch (_) { /* no backup if file doesn't exist yet */ }

        fs.writeFileSync(absPath, data.newContent, 'utf8');
        console.log(`[code-analyzer] Applied fix to ${data.filePath} (backup: ${path.basename(backupPath)})`);

        return {
            status:     'applied',
            filePath:   data.filePath,
            backupPath: path.relative(PROJECT_ROOT, backupPath),
            fixId:      data.fixId,
        };
    }

    /** Return findings from last run. */
    getLastFindings(limit = 100) {
        return this._lastFindings.slice(0, limit);
    }

    /** Return pending fix proposals. */
    getProposedFixes(limit = 50) {
        return this._proposedFixes.slice(-limit);
    }

    /** Get summary of last analysis. */
    getLastRunSummary() {
        return {
            lastRunAt: this._lastRunAt,
            totalFindings: this._lastFindings.length,
            critical: this._lastFindings.filter(f => f.severity === 'critical').length,
            high:     this._lastFindings.filter(f => f.severity === 'high').length,
            medium:   this._lastFindings.filter(f => f.severity === 'medium').length,
            low:      this._lastFindings.filter(f => f.severity === 'low').length,
            proposedFixes: this._proposedFixes.length,
        };
    }

    // -----------------------------------------------------------------------
    // File walking
    // -----------------------------------------------------------------------

    /** @private */
    _walkProject(rootDir) {
        const result = [];
        const walk = (dir) => {
            let entries;
            try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }

            for (const entry of entries) {
                if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (!SKIP_DIRS.has(entry.name)) walk(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (SCAN_EXTENSIONS.has(ext)) result.push(fullPath);
                }
            }
        };
        walk(rootDir);
        return result;
    }

    // -----------------------------------------------------------------------
    // Per-file analysis
    // -----------------------------------------------------------------------

    /** @private */
    _analyzeFile(filePath) {
        const stat = fs.statSync(filePath);
        if (stat.size > MAX_FILE_BYTES) return [];

        const content = fs.readFileSync(filePath, 'utf8');
        const lines   = content.split('\n');
        const relPath = path.relative(PROJECT_ROOT, filePath);
        const findings = [];

        for (const rule of ALL_RULES) {
            lines.forEach((line, idx) => {
                if (rule.pattern.test(line)) {
                    const lineNo = idx + 1;
                    const contextStart = Math.max(0, idx - CONTEXT_LINES);
                    const contextEnd   = Math.min(lines.length, idx + CONTEXT_LINES + 1);
                    findings.push({
                        id:          rule.id,
                        severity:    rule.severity,
                        message:     rule.message,
                        file:        filePath,
                        relPath,
                        line:        lineNo,
                        code:        line.trim().slice(0, 200),
                        context:     lines.slice(contextStart, contextEnd).join('\n'),
                        detectedAt:  new Date().toISOString(),
                    });
                }
            });
        }

        return findings;
    }

    // -----------------------------------------------------------------------
    // LLM fix generation
    // -----------------------------------------------------------------------

    /** @private */
    async _generateFix(finding, llmFn, permGate) {
        const prompt = [
            `You are a security-focused code reviewer for the Milonexa platform.`,
            `Analyze this code finding and propose a minimal, safe fix.`,
            ``,
            `Finding: ${finding.message} (${finding.severity})`,
            `Rule: ${finding.id}`,
            `File: ${finding.relPath}`,
            `Line: ${finding.line}`,
            `Code context:`,
            '```javascript',
            finding.context,
            '```',
            ``,
            `Return JSON only with these keys:`,
            `{ "explanation": "why this is a problem", "fix": "what to change", "fixedCode": "the corrected code snippet", "confidence": 0-1 }`,
        ].join('\n');

        let response;
        try {
            response = await llmFn(prompt);
        } catch (e) {
            return null;
        }

        if (!response) return null;

        let parsed = null;
        try {
            const match = response.match(/\{[\s\S]*\}/);
            if (match) parsed = JSON.parse(match[0]);
        } catch (_) { /* could not parse */ }

        if (!parsed || !parsed.fixedCode) return null;

        const fixId = crypto.randomUUID();
        const proposedFix = {
            fixId,
            findingId:    finding.id,
            severity:     finding.severity,
            file:         finding.relPath,
            line:         finding.line,
            issue:        finding.message,
            explanation:  parsed.explanation || '',
            fix:          parsed.fix || '',
            fixedCode:    parsed.fixedCode,
            confidence:   typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
            proposedAt:   new Date().toISOString(),
            status:       'pending',
        };

        // Submit to permission gate for admin approval before applying.
        if (permGate && typeof permGate.requestPermission === 'function') {
            await permGate.requestPermission(
                'apply_code_fix',
                `Apply AI-proposed fix for ${finding.id} in ${finding.relPath}:${finding.line}`,
                { fixId, filePath: finding.relPath, fixedCode: parsed.fixedCode },
                finding.severity === 'critical' ? 'critical' : 'high'
            );
            proposedFix.status = 'awaiting_approval';
        }

        return proposedFix;
    }

    // -----------------------------------------------------------------------
    // Utilities
    // -----------------------------------------------------------------------

    /** @private */
    _deduplicate(findings) {
        const seen = new Set();
        return findings.filter(f => {
            const key = `${f.id}:${f.file}:${f.line}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /** @private */
    _buildSummary(findings) {
        const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
        const byRule     = {};
        const byFile     = {};

        for (const f of findings) {
            bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
            byRule[f.id]           = (byRule[f.id] || 0) + 1;
            byFile[f.relPath]      = (byFile[f.relPath] || 0) + 1;
        }

        const topFiles = Object.entries(byFile)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([file, count]) => ({ file, count }));

        return { total: findings.length, bySeverity, byRule, topFiles, generatedAt: new Date().toISOString() };
    }

    /** @private */
    _saveReport(findings, summary) {
        const date     = new Date().toISOString().split('T')[0];
        const filePath = path.join(ANALYSIS_DIR, `${date}.json`);
        try {
            fs.writeFileSync(filePath, JSON.stringify({ summary, findings }, null, 2), 'utf8');
        } catch (_) {}
    }

    /** @private */
    _ensureDirs() {
        [AI_STATE_DIR, ANALYSIS_DIR].forEach(d => {
            if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        });
    }
}

module.exports = { CodeAnalyzer };
