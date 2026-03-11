'use strict';

/**
 * @fileoverview AI-powered code analyzer for the Milonexa admin agent.
 *
 * Capabilities (v2.0 + v2.1):
 *  - Walks the project source tree and reads JS/TS/JSON files.
 *  - Applies deterministic static-analysis rules to detect:
 *      • Security vulnerabilities (hardcoded secrets, eval, SQL injection patterns,
 *        prototype pollution, path traversal, weak crypto, etc.)
 *      • Code quality issues (TODO/FIXME/HACK, empty catch blocks, etc.)
 *      • Missing error handling patterns.
 *  - v2.1 — AST-based analysis (acorn) for deeper control-flow checks.
 *  - v2.1 — Cyclomatic complexity scoring per function.
 *  - v2.1 — Dead code detection (unused exported symbols).
 *  - v2.1 — Duplicate code detection (content-hash of function bodies).
 *  - v2.1 — Incremental analysis: only re-scan git-diff changed files.
 *  - v2.1 — Auto-fix dry-run mode: returns unified diff without writing to disk.
 *  - v2.1 — Multi-turn LLM context for code fix proposals (explain → propose → refine).
 *  - v2.1 — LLM confidence scoring surfaced in each finding.
 *  - v2.1 — Custom prompt templates per rule ID via PromptTemplates.
 *  - Proposed fixes are submitted to PermissionGate for admin approval before
 *    being written to disk.
 *  - Writes analysis reports to: .admin-cli/ai/code-analysis/YYYY-MM-DD.json
 *
 * All I/O uses ONLY Node.js built-in modules (acorn loaded dynamically if present).
 */

const fs            = require('fs');
const path          = require('path');
const http          = require('http');
const crypto        = require('crypto');
const { execFile }  = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// Optional: acorn for AST-based analysis. Loaded lazily; falls back gracefully.
let acorn = null;
try { acorn = require('acorn'); } catch (_) {}

// Prompt templates (v2.1).
const { promptTemplates } = require('./prompt-templates.js');

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

const ADMIN_HOME    = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const AI_STATE_DIR  = path.join(ADMIN_HOME, 'ai');
const ANALYSIS_DIR  = path.join(AI_STATE_DIR, 'code-analysis');
const PROJECT_ROOT  = path.resolve(__dirname, '..', '..', '..');

const AGENT_VERSION = '2.1.0';

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
        /** @type {object} Complexity report from last run. */
        this._complexityReport = [];
        /** @type {object[]} Duplicate code groups from last run. */
        this._duplicates = [];
        /** @type {object[]} Dead code findings from last run. */
        this._deadCode = [];
        /** v2.1: Incremental — mtime fingerprint cache */
        this._fileHashes = new Map();
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

        // v2.1 enhancements.
        const astFindings    = this._runASTAnalysis(files);
        const complexity     = this._computeComplexityAll(files);
        const duplicates     = this._detectDuplicates(files);
        const deadCode       = this._detectDeadCode(files);

        findings.push(...astFindings);

        this._complexityReport = complexity;
        this._duplicates       = duplicates;
        this._deadCode         = deadCode;

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
                    const fix = await this._generateFixMultiTurn(finding, llmFn, permGate);
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
     * v2.1 — Incremental analysis: only re-scan files changed since last run
     * (based on `git diff --name-only HEAD` in the project root).
     *
     * @param {Function} [llmFn]
     * @param {object}   [permGate]
     * @returns {Promise<{findings: object[], summary: object, changedFiles: string[]}>}
     */
    async analyzeIncremental(llmFn, permGate) {
        console.log('[code-analyzer] Starting incremental analysis (git diff)…');
        this._lastRunAt = new Date().toISOString();

        const changedFiles = await this._getChangedFiles();
        if (changedFiles.length === 0) {
            console.log('[code-analyzer] No changed files detected — skipping incremental scan.');
            return { findings: this._lastFindings, summary: this._buildSummary(this._lastFindings), changedFiles: [] };
        }

        console.log(`[code-analyzer] Incremental scan: ${changedFiles.length} changed file(s)…`);
        const findings = [];

        for (const filePath of changedFiles) {
            if (!fs.existsSync(filePath)) continue;
            const ext = path.extname(filePath);
            if (!SCAN_EXTENSIONS.has(ext)) continue;
            try {
                const fileFindings = this._analyzeFile(filePath);
                findings.push(...fileFindings);
                const astFindings = this._runASTAnalysis([filePath]);
                findings.push(...astFindings);
            } catch (_) {}
        }

        // Merge with existing findings: remove old findings for changed files,
        // then add new ones.
        const changedSet = new Set(changedFiles);
        const retained   = this._lastFindings.filter(f => !changedSet.has(f.file));
        const merged     = this._deduplicate([...retained, ...findings]);

        const SRANK = { critical: 4, high: 3, medium: 2, low: 1 };
        merged.sort((a, b) => (SRANK[b.severity] || 0) - (SRANK[a.severity] || 0));
        this._lastFindings = merged;

        if (typeof llmFn === 'function') {
            const newCritical = findings.filter(f => f.severity === 'critical' || f.severity === 'high').slice(0, 5);
            for (const finding of newCritical) {
                try {
                    const fix = await this._generateFixMultiTurn(finding, llmFn, permGate);
                    if (fix) this._proposedFixes.push(fix);
                } catch (_) {}
            }
        }

        const summary = this._buildSummary(merged);
        this._saveReport(merged, summary);

        return { findings: merged, summary, changedFiles };
    }

    /**
     * v2.1 — Auto-fix dry-run mode: returns a unified-style diff preview for
     * a proposed fix without writing anything to disk.
     *
     * @param {object} fix   Object with `filePath` and `fixedCode` fields.
     * @returns {{ diff: string, linesAdded: number, linesRemoved: number }}
     */
    dryRunFix(fix) {
        if (!fix || !fix.filePath || !fix.fixedCode) {
            return { diff: '', linesAdded: 0, linesRemoved: 0, error: 'Missing filePath or fixedCode' };
        }
        const absPath = path.resolve(PROJECT_ROOT, fix.filePath);
        let original = '';
        try { original = fs.readFileSync(absPath, 'utf8'); } catch (_) {}

        return this._unifiedDiff(fix.filePath, original, fix.fixedCode);
    }

    /**
     * Execute an admin-approved code fix.
     * @param {object} permRecord
     * @returns {Promise<object>}
     */
    async executeApprovedFix(permRecord) {
        const { data } = permRecord;
        // Support both `fixedCode` (generated by _generateFixMultiTurn) and legacy `newContent`.
        const newContent = data && (data.fixedCode || data.newContent);
        if (!data || !data.filePath || !newContent) {
            return { status: 'skipped', reason: 'Missing filePath or fix content in permission data' };
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

        fs.writeFileSync(absPath, newContent, 'utf8');
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
            // v2.1 additions.
            highComplexityFunctions: this._complexityReport.filter(c => c.complexity >= 10).length,
            duplicateGroups:  this._duplicates.length,
            deadCodeSymbols:  this._deadCode.length,
        };
    }

    /** v2.1 — Return cyclomatic complexity report. */
    getComplexityReport(limit = 50) {
        return [...this._complexityReport]
            .sort((a, b) => b.complexity - a.complexity)
            .slice(0, limit);
    }

    /** v2.1 — Return duplicate code groups. */
    getDuplicates(limit = 20) {
        return this._duplicates.slice(0, limit);
    }

    /** v2.1 — Return dead code findings. */
    getDeadCode(limit = 50) {
        return this._deadCode.slice(0, limit);
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
    // Per-file analysis (regex-based)
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
                        source:      'regex',
                        confidence:  null,
                    });
                }
            });
        }

        return findings;
    }

    // -----------------------------------------------------------------------
    // v2.1 — AST-based analysis
    // -----------------------------------------------------------------------

    /**
     * Run AST-based analysis across all provided files (only .js/.mjs).
     * Falls back gracefully if acorn is not installed.
     * @private
     */
    _runASTAnalysis(files) {
        if (!acorn) return [];
        const findings = [];
        for (const filePath of files) {
            const ext = path.extname(filePath);
            if (ext !== '.js' && ext !== '.mjs') continue;
            try {
                findings.push(...this._analyzeFileAST(filePath));
            } catch (_) {}
        }
        return findings;
    }

    /** @private */
    _analyzeFileAST(filePath) {
        const stat = fs.statSync(filePath);
        if (stat.size > MAX_FILE_BYTES) return [];

        const content = fs.readFileSync(filePath, 'utf8');
        const relPath = path.relative(PROJECT_ROOT, filePath);
        const findings = [];

        let ast;
        try {
            ast = acorn.parse(content, {
                ecmaVersion: 'latest',
                sourceType:  'script',
                locations:   true,
                allowHashBang: true,
                allowReserved: true,
            });
        } catch (_) {
            // Fallback: try module mode.
            try {
                ast = acorn.parse(content, {
                    ecmaVersion: 'latest',
                    sourceType:  'module',
                    locations:   true,
                    allowHashBang: true,
                    allowReserved: true,
                });
            } catch (_2) {
                return [];
            }
        }

        // Walk the AST for deeper control-flow checks.
        this._walkAST(ast, (node) => {
            if (node.type === 'WithStatement') {
                findings.push({
                    id:         'with-statement',
                    severity:   'high',
                    message:    '`with` statement creates ambiguous scope and is disallowed in strict mode',
                    file:       filePath,
                    relPath,
                    line:       node.loc ? node.loc.start.line : 0,
                    code:       'with (...)',
                    context:    '',
                    detectedAt: new Date().toISOString(),
                    source:     'ast',
                    confidence: 0.95,
                });
            }

            // Detect `new Function(...)` — runtime code generation.
            if (
                node.type === 'NewExpression' &&
                node.callee && node.callee.name === 'Function' &&
                node.arguments && node.arguments.length > 0
            ) {
                findings.push({
                    id:         'new-function',
                    severity:   'high',
                    message:    '`new Function(...)` is equivalent to eval — enables code injection',
                    file:       filePath,
                    relPath,
                    line:       node.loc ? node.loc.start.line : 0,
                    code:       'new Function(...)',
                    context:    '',
                    detectedAt: new Date().toISOString(),
                    source:     'ast',
                    confidence: 0.95,
                });
            }

            // Detect `setTimeout(string, ...)` — string-based timers behave like eval.
            if (
                node.type === 'CallExpression' &&
                node.callee && node.callee.name === 'setTimeout' &&
                node.arguments && node.arguments[0] &&
                node.arguments[0].type === 'Literal' &&
                typeof node.arguments[0].value === 'string'
            ) {
                findings.push({
                    id:         'settimeout-string',
                    severity:   'medium',
                    message:    'setTimeout with string argument behaves like eval — use a function reference',
                    file:       filePath,
                    relPath,
                    line:       node.loc ? node.loc.start.line : 0,
                    code:       'setTimeout("...")',
                    context:    '',
                    detectedAt: new Date().toISOString(),
                    source:     'ast',
                    confidence: 0.90,
                });
            }

            // Detect unreachable code after `return` / `throw` at statement level.
            if (
                node.type === 'BlockStatement' &&
                Array.isArray(node.body)
            ) {
                let terminated = false;
                for (const stmt of node.body) {
                    if (terminated && stmt.type !== 'EmptyStatement') {
                        findings.push({
                            id:         'unreachable-code',
                            severity:   'low',
                            message:    'Unreachable code detected after return/throw/break/continue',
                            file:       filePath,
                            relPath,
                            line:       stmt.loc ? stmt.loc.start.line : 0,
                            code:       '',
                            context:    '',
                            detectedAt: new Date().toISOString(),
                            source:     'ast',
                            confidence: 0.85,
                        });
                        break; // Report first unreachable only.
                    }
                    if (
                        stmt.type === 'ReturnStatement' ||
                        stmt.type === 'ThrowStatement' ||
                        stmt.type === 'BreakStatement' ||
                        stmt.type === 'ContinueStatement'
                    ) {
                        terminated = true;
                    }
                }
            }
        });

        return findings;
    }

    /**
     * Depth-first AST walker.
     * @private
     */
    _walkAST(node, visitor) {
        if (!node || typeof node !== 'object') return;
        visitor(node);
        for (const key of Object.keys(node)) {
            const child = node[key];
            if (Array.isArray(child)) {
                child.forEach(c => this._walkAST(c, visitor));
            } else if (child && typeof child === 'object' && child.type) {
                this._walkAST(child, visitor);
            }
        }
    }

    // -----------------------------------------------------------------------
    // v2.1 — Cyclomatic complexity
    // -----------------------------------------------------------------------

    /**
     * Compute cyclomatic complexity for all functions in the given files.
     * Uses regex to extract function blocks and count decision points.
     * @private
     */
    _computeComplexityAll(files) {
        const report = [];
        for (const filePath of files) {
            const ext = path.extname(filePath);
            if (ext !== '.js' && ext !== '.mjs') continue;
            try {
                const stat = fs.statSync(filePath);
                if (stat.size > MAX_FILE_BYTES) continue;
                const content = fs.readFileSync(filePath, 'utf8');
                const relPath = path.relative(PROJECT_ROOT, filePath);
                const functions = this._extractFunctions(content, relPath);
                report.push(...functions);
            } catch (_) {}
        }
        return report;
    }

    /**
     * Extract named functions and compute their cyclomatic complexity.
     * Complexity = 1 + number of branching points (if, else if, while, for, case, &&, ||, ?:, catch).
     *
     * Note: The regex covers common JS function patterns (declarations, `const fn = function`,
     * `const fn = (args) =>`). It does not cover class methods, generator functions, or
     * single-arg arrow functions without parens. For these, complexity is still computed if
     * an enclosing named function is found. AST-level function extraction could be added
     * in a future pass to improve coverage.
     * @private
     */
    _extractFunctions(content, relPath) {
        const results = [];
        const lines   = content.split('\n');

        // Regex for function declarations and expressions with identifiers.
        const fnPattern = /(?:function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>)/g;

        let match;
        while ((match = fnPattern.exec(content)) !== null) {
            const fnName = match[1] || match[2] || match[3] || '<anonymous>';
            const startIdx = match.index;
            const startLine = content.slice(0, startIdx).split('\n').length;

            // Extract function body by counting braces.
            const bodyStart = content.indexOf('{', startIdx);
            if (bodyStart === -1) continue;

            let depth = 0;
            let bodyEnd = bodyStart;
            for (let i = bodyStart; i < content.length; i++) {
                if (content[i] === '{') depth++;
                else if (content[i] === '}') {
                    depth--;
                    if (depth === 0) { bodyEnd = i; break; }
                }
            }

            const body = content.slice(bodyStart, bodyEnd + 1);
            const complexity = this._cyclomaticComplexity(body);
            const linesOfCode = body.split('\n').length;

            results.push({
                fn:         fnName,
                file:       relPath,
                line:       startLine,
                complexity,
                linesOfCode,
                risk:       complexity >= 20 ? 'critical' : complexity >= 10 ? 'high' : complexity >= 5 ? 'medium' : 'low',
            });
        }

        return results;
    }

    /**
     * Count decision points in a function body to compute cyclomatic complexity.
     * @private
     */
    _cyclomaticComplexity(body) {
        let cc = 1; // Base complexity.
        // Each of these adds a branch.
        const patterns = [
            /\bif\s*\(/g,
            /\belse\s+if\s*\(/g,
            /\bwhile\s*\(/g,
            /\bfor\s*\(/g,
            /\bcase\s+[^:]+:/g,
            /\bcatch\s*\(/g,
            /\?\s*/g,        // ternary
            /&&/g,
            /\|\|/g,
            /\?\?/g,         // nullish coalescing
        ];
        for (const pat of patterns) {
            const m = body.match(pat);
            if (m) cc += m.length;
        }
        return cc;
    }

    // -----------------------------------------------------------------------
    // v2.1 — Duplicate code detection
    // -----------------------------------------------------------------------

    /**
     * Detect duplicate function bodies by normalising whitespace and hashing.
     * @private
     */
    _detectDuplicates(files) {
        /** @type {Map<string, Array<{file: string, fn: string, line: number}>>} */
        const hashMap = new Map();

        for (const filePath of files) {
            const ext = path.extname(filePath);
            if (ext !== '.js' && ext !== '.mjs') continue;
            try {
                const stat = fs.statSync(filePath);
                if (stat.size > MAX_FILE_BYTES) continue;
                const content = fs.readFileSync(filePath, 'utf8');
                const relPath = path.relative(PROJECT_ROOT, filePath);

                const fnPattern = /(?:function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>)/g;
                let match;
                while ((match = fnPattern.exec(content)) !== null) {
                    const fnName   = match[1] || match[2] || match[3] || '<anonymous>';
                    const startIdx = match.index;
                    const startLine = content.slice(0, startIdx).split('\n').length;

                    const bodyStart = content.indexOf('{', startIdx);
                    if (bodyStart === -1) continue;

                    let depth = 0, bodyEnd = bodyStart;
                    for (let i = bodyStart; i < content.length; i++) {
                        if (content[i] === '{') depth++;
                        else if (content[i] === '}') { depth--; if (depth === 0) { bodyEnd = i; break; } }
                    }

                    const body = content.slice(bodyStart, bodyEnd + 1);
                    // Use normalised character count as the minimum-complexity threshold
                    // rather than line count, since a 3-line function with complex logic
                    // is still worth dedup-checking.
                    const roughSize = body.replace(/\s+/g, '').length;
                    if (roughSize < 120) continue; // Skip truly trivial functions.

                    // Normalise: collapse whitespace and strip comments.
                    const normalised = body
                        .replace(/\/\/[^\n]*/g, '')
                        .replace(/\/\*[\s\S]*?\*\//g, '')
                        .replace(/\s+/g, ' ')
                        .trim();

                    if (normalised.length < 80) continue; // Too short.

                    const hash = crypto.createHash('sha256').update(normalised).digest('hex');
                    if (!hashMap.has(hash)) hashMap.set(hash, []);
                    hashMap.get(hash).push({ file: relPath, fn: fnName, line: startLine });
                }
            } catch (_) {}
        }

        // Return only groups with more than one occurrence.
        const groups = [];
        for (const [hash, locations] of hashMap) {
            if (locations.length > 1) {
                groups.push({
                    hash:      hash.slice(0, 12),
                    count:     locations.length,
                    locations,
                    detectedAt: new Date().toISOString(),
                });
            }
        }
        return groups;
    }

    // -----------------------------------------------------------------------
    // v2.1 — Dead code detection
    // -----------------------------------------------------------------------

    /**
     * Detect exported symbols that are never imported in any other file.
     * Uses a simple two-pass approach: collect exports, then check imports.
     *
     * Limitation: only covers CommonJS exports (`module.exports.X`, `exports.X`,
     * `module.exports = { X }`). ES6 named exports (`export const X`, `export { X }`)
     * are not currently detected. Most services in this codebase use CommonJS.
     * @private
     */
    _detectDeadCode(files) {
        // Pass 1: Collect all exported names per file.
        /** @type {Map<string, Set<string>>} relPath → exported names */
        const exports = new Map();

        for (const filePath of files) {
            const ext = path.extname(filePath);
            if (ext !== '.js' && ext !== '.mjs') continue;
            try {
                const stat = fs.statSync(filePath);
                if (stat.size > MAX_FILE_BYTES) continue;
                const content = fs.readFileSync(filePath, 'utf8');
                const relPath = path.relative(PROJECT_ROOT, filePath);
                const names   = new Set();

                // CommonJS: module.exports.X = ... or exports.X = ...
                const cePattern = /(?:module\.exports|exports)\.(\w+)\s*=/g;
                let m;
                while ((m = cePattern.exec(content)) !== null) names.add(m[1]);

                // module.exports = { X, Y }  (destructured object export)
                const objExport = /module\.exports\s*=\s*\{([^}]+)\}/g;
                while ((m = objExport.exec(content)) !== null) {
                    const inner = m[1];
                    const keys  = inner.match(/\b(\w+)\b/g) || [];
                    keys.forEach(k => names.add(k));
                }

                if (names.size > 0) exports.set(relPath, names);
            } catch (_) {}
        }

        // Pass 2: Build set of all imported/required names across all files.
        const imported = new Set();
        for (const filePath of files) {
            const ext = path.extname(filePath);
            if (ext !== '.js' && ext !== '.mjs') continue;
            try {
                const stat = fs.statSync(filePath);
                if (stat.size > MAX_FILE_BYTES) continue;
                const content = fs.readFileSync(filePath, 'utf8');

                // require destructuring: const { X, Y } = require(...)
                const reqDestructure = /const\s*\{([^}]+)\}\s*=\s*require\s*\(/g;
                let m;
                while ((m = reqDestructure.exec(content)) !== null) {
                    const inner = m[1];
                    const keys  = inner.match(/\b(\w+)\b/g) || [];
                    keys.forEach(k => imported.add(k));
                }

                // Direct name usage after require: const X = require(...)
                const reqDirect = /(?:const|let|var)\s+(\w+)\s*=\s*require\s*\(/g;
                while ((m = reqDirect.exec(content)) !== null) imported.add(m[1]);
            } catch (_) {}
        }

        // Pass 3: Report exported names that are never imported.
        const deadSymbols = [];
        for (const [relPath, names] of exports) {
            for (const name of names) {
                if (!imported.has(name)) {
                    deadSymbols.push({
                        id:        'dead-export',
                        severity:  'low',
                        symbol:    name,
                        file:      relPath,
                        message:   `Exported symbol '${name}' appears unused across the codebase`,
                        detectedAt: new Date().toISOString(),
                    });
                }
            }
        }
        return deadSymbols;
    }

    // -----------------------------------------------------------------------
    // v2.1 — Incremental: git diff
    // -----------------------------------------------------------------------

    /**
     * Return absolute paths of files changed since the last commit (git diff --name-only).
     * Falls back to mtime-based detection if git is unavailable.
     * @private
     */
    async _getChangedFiles() {
        try {
            const { stdout } = await execFileAsync(
                'git', ['diff', '--name-only', 'HEAD'],
                { cwd: PROJECT_ROOT, timeout: 10000 }
            );
            const relPaths = stdout.split('\n').map(s => s.trim()).filter(Boolean);
            return relPaths
                .map(rp => path.join(PROJECT_ROOT, rp))
                .filter(fp => {
                    const ext = path.extname(fp);
                    return SCAN_EXTENSIONS.has(ext) && fs.existsSync(fp);
                });
        } catch (_) {
            // Git unavailable — return all files (full scan).
            return this._walkProject(PROJECT_ROOT);
        }
    }

    // -----------------------------------------------------------------------
    // v2.1 — Unified diff helper (dry-run)
    // -----------------------------------------------------------------------

    /** @private */
    _unifiedDiff(label, original, updated) {
        const origLines = original.split('\n');
        const newLines  = updated.split('\n');
        const diffLines = [];
        let added = 0, removed = 0;

        diffLines.push(`--- a/${label}`);
        diffLines.push(`+++ b/${label}`);

        // Simple line-by-line diff (LCS not required for preview purposes).
        const maxLen = Math.max(origLines.length, newLines.length);
        let hunkOpen = false;

        for (let i = 0; i < maxLen; i++) {
            const orig = i < origLines.length ? origLines[i] : null;
            const next = i < newLines.length  ? newLines[i]  : null;

            if (orig === next) {
                hunkOpen = false;
                continue;
            }

            if (!hunkOpen) {
                diffLines.push(`@@ -${i + 1} +${i + 1} @@`);
                hunkOpen = true;
            }

            if (orig !== null) { diffLines.push(`-${orig}`); removed++; }
            if (next !== null) { diffLines.push(`+${next}`); added++; }
        }

        return { diff: diffLines.join('\n'), linesAdded: added, linesRemoved: removed };
    }

    // -----------------------------------------------------------------------
    // v2.1 — Multi-turn LLM fix generation (explain → propose → refine)
    // -----------------------------------------------------------------------

    /**
     * Three-turn LLM conversation for high-quality fix proposals.
     * Turn 1 (explain): Ask LLM to explain the problem.
     * Turn 2 (propose): Ask LLM to propose a fix, given the explanation.
     * Turn 3 (refine):  Ask LLM to refine if confidence < threshold.
     * @private
     */
    async _generateFixMultiTurn(finding, llmFn, permGate) {
        // ── Turn 1: explain ──────────────────────────────────────────────────
        const explainPrompt = promptTemplates.renderBuiltin('__code_explain__', {
            ruleId:   finding.id,
            message:  finding.message,
            file:     finding.relPath,
            line:     finding.line,
            context:  finding.context || '',
        });

        let explanation = '';
        try {
            const r1 = await llmFn(explainPrompt);
            if (r1) {
                const m = r1.match(/\{[\s\S]*\}/);
                if (m) {
                    const p = JSON.parse(m[0]);
                    explanation = p.explanation || r1.slice(0, 300);
                } else {
                    explanation = r1.slice(0, 300);
                }
            }
        } catch (_) {}

        // ── Turn 2: propose ──────────────────────────────────────────────────
        const proposePrompt = promptTemplates.render(finding.id, {
            ruleId:      finding.id,
            message:     finding.message,
            severity:    finding.severity,
            file:        finding.relPath,
            line:        finding.line,
            context:     finding.context || '',
            explanation,
        });

        let response;
        try {
            response = await llmFn(proposePrompt);
        } catch (e) {
            return null;
        }

        if (!response) return null;

        let parsed = null;
        try {
            const match = response.match(/\{[\s\S]*\}/);
            if (match) parsed = JSON.parse(match[0]);
        } catch (_) {}

        if (!parsed || !parsed.fixedCode) return null;

        let confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;

        // ── Turn 3: refine (only if confidence is low) ───────────────────────
        if (confidence < 0.65) {
            const refinePrompt = promptTemplates.renderBuiltin('__code_refine__', {
                ruleId:      finding.id,
                file:        finding.relPath,
                line:        finding.line,
                previousFix: parsed.fixedCode,
                concern:     'Please double-check edge cases and ensure the fix does not introduce regressions.',
            });
            try {
                const r3 = await llmFn(refinePrompt);
                if (r3) {
                    const m = r3.match(/\{[\s\S]*\}/);
                    if (m) {
                        const refined = JSON.parse(m[0]);
                        if (refined.fixedCode) {
                            parsed.fixedCode   = refined.fixedCode;
                            confidence = typeof refined.confidence === 'number' ? refined.confidence : confidence;
                            parsed.notes = refined.notes || '';
                        }
                    }
                }
            } catch (_) {}
        }

        const fixId = crypto.randomUUID();
        const proposedFix = {
            fixId,
            findingId:    finding.id,
            severity:     finding.severity,
            file:         finding.relPath,
            line:         finding.line,
            issue:        finding.message,
            explanation,
            fix:          parsed.fix || '',
            fixedCode:    parsed.fixedCode,
            confidence,
            notes:        parsed.notes || '',
            multiTurn:    true,
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
        const bySource   = { regex: 0, ast: 0 };

        for (const f of findings) {
            bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
            byRule[f.id]           = (byRule[f.id] || 0) + 1;
            byFile[f.relPath]      = (byFile[f.relPath] || 0) + 1;
            if (f.source) bySource[f.source] = (bySource[f.source] || 0) + 1;
        }

        const topFiles = Object.entries(byFile)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([file, count]) => ({ file, count }));

        // Avg confidence for AST findings.
        const astFindings  = findings.filter(f => f.source === 'ast' && f.confidence !== null);
        const avgConfidence = astFindings.length > 0
            ? Math.round((astFindings.reduce((s, f) => s + f.confidence, 0) / astFindings.length) * 100) / 100
            : null;

        return {
            total: findings.length,
            bySeverity,
            byRule,
            topFiles,
            bySource,
            avgConfidence,
            // v2.1 additions.
            highComplexityFunctions: this._complexityReport.filter(c => c.complexity >= 10).length,
            duplicateGroups:  this._duplicates.length,
            deadCodeSymbols:  this._deadCode.length,
            generatedAt: new Date().toISOString(),
        };
    }

    /** @private */
    _saveReport(findings, summary) {
        const date     = new Date().toISOString().split('T')[0];
        const filePath = path.join(ANALYSIS_DIR, `${date}.json`);
        try {
            fs.writeFileSync(filePath, JSON.stringify({
                summary,
                findings,
                complexity: this._complexityReport.filter(c => c.complexity >= 10).slice(0, 30),
                duplicates: this._duplicates.slice(0, 20),
                deadCode:   this._deadCode.slice(0, 50),
            }, null, 2), 'utf8');
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
