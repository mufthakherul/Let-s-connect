'use strict';

/**
 * @fileoverview Operator-configurable prompt templates for the Milonexa AI Admin Agent.
 *
 * Capabilities (v2.1):
 *  - Loads custom prompt templates from .admin-cli/ai/prompt-templates.json.
 *  - Falls back to built-in defaults when a rule-specific template is absent.
 *  - Template strings support {{placeholder}} substitution.
 *  - `render(ruleId, vars)` returns the final prompt string.
 *  - `reload()` hot-reloads templates from disk without restarting the agent.
 *
 * Template file schema (all fields optional — omit to use built-in defaults):
 * {
 *   "hardcoded-secret": "Custom prompt for {{ruleId}} at {{file}}:{{line}}…",
 *   "eval-usage": "…",
 *   "__classification__": "Classify this feedback: {{text}}",
 *   "__code_fix__": "Propose a fix for {{ruleId}} at {{file}}:{{line}}:\n```\n{{context}}\n```"
 * }
 *
 * All I/O uses ONLY Node.js built-in modules.
 */

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ADMIN_HOME    = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const TEMPLATES_DIR = path.join(ADMIN_HOME, 'ai');
const TEMPLATES_FILE = path.join(TEMPLATES_DIR, 'prompt-templates.json');

// ---------------------------------------------------------------------------
// Built-in default templates
// ---------------------------------------------------------------------------

const DEFAULTS = {
    // Used by CodeAnalyzer for LLM fix proposals.
    __code_fix__: [
        'You are a security-focused code reviewer for the Milonexa platform.',
        'Analyze this code finding and propose a minimal, safe fix.',
        '',
        'Finding: {{message}} ({{severity}})',
        'Rule: {{ruleId}}',
        'File: {{file}}',
        'Line: {{line}}',
        'Code context:',
        '```javascript',
        '{{context}}',
        '```',
        '',
        'Return JSON only with these keys:',
        '{ "explanation": "why this is a problem", "fix": "what to change", "fixedCode": "the corrected code snippet", "confidence": 0-1 }',
    ].join('\n'),

    // Used for the "explain" turn in multi-turn code fix proposals.
    __code_explain__: [
        'You are a security reviewer. Explain in 2-3 sentences why the following code is a problem.',
        'Rule: {{ruleId}} — {{message}}',
        'File: {{file}}:{{line}}',
        '```javascript',
        '{{context}}',
        '```',
        'Reply with a single JSON object: { "explanation": "..." }',
    ].join('\n'),

    // Used for the "refine" turn in multi-turn code fix proposals.
    __code_refine__: [
        'You previously proposed this fix for {{ruleId}} in {{file}}:{{line}}:',
        '{{previousFix}}',
        '',
        'The developer raised this concern: {{concern}}',
        '',
        'Refine your fix accordingly. Return JSON: { "fixedCode": "...", "confidence": 0-1, "notes": "..." }',
    ].join('\n'),

    // Used by FeedbackProcessor for LLM categorisation.
    __feedback_classify__: [
        'Classify this user feedback into exactly one category: bug, feature_request, ux_issue, performance, praise, other.',
        'Also assign a priority: high, medium, or low.',
        'Generate a short developer ticket title and a 2-sentence description.',
        '',
        'Feedback: {{text}}',
        '',
        'Return JSON only: { "category": "...", "priority": "...", "ticketTitle": "...", "ticketDescription": "..." }',
    ].join('\n'),
};

// ---------------------------------------------------------------------------
// PromptTemplates
// ---------------------------------------------------------------------------

class PromptTemplates {
    constructor() {
        /** @type {object} */
        this._custom = {};
        this._loadFromDisk();
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Render a template for a given rule ID or built-in key.
     * Operator-defined templates take precedence over built-in defaults.
     *
     * @param {string} ruleId   Rule ID (e.g. 'hardcoded-secret') or built-in key (e.g. '__code_fix__').
     * @param {object} [vars]   Key→value substitutions for {{placeholder}}.
     * @returns {string}
     */
    render(ruleId, vars = {}) {
        // Look up in this order: custom rule-specific → default rule-specific → __code_fix__ default.
        const template = this._custom[ruleId]
            || DEFAULTS[ruleId]
            || this._custom['__code_fix__']
            || DEFAULTS['__code_fix__'];

        return this._substitute(template, vars);
    }

    /**
     * Render a built-in template key (e.g. '__code_explain__').
     * @param {string} key
     * @param {object} [vars]
     * @returns {string}
     */
    renderBuiltin(key, vars = {}) {
        const template = this._custom[key] || DEFAULTS[key] || '';
        return this._substitute(template, vars);
    }

    /**
     * Reload templates from disk (hot-reload without restart).
     * @returns {{ loaded: number }}
     */
    reload() {
        this._loadFromDisk();
        return { loaded: Object.keys(this._custom).length };
    }

    /**
     * List all currently loaded custom template IDs.
     * @returns {string[]}
     */
    listCustom() {
        return Object.keys(this._custom);
    }

    /**
     * List all built-in template IDs.
     * @returns {string[]}
     */
    listDefaults() {
        return Object.keys(DEFAULTS);
    }

    /**
     * Persist a new or updated custom template to disk.
     * @param {string} ruleId
     * @param {string} template
     */
    save(ruleId, template) {
        this._custom[ruleId] = template;
        this._saveToDisk();
    }

    /** Remove a custom template (falls back to built-in default). */
    remove(ruleId) {
        delete this._custom[ruleId];
        this._saveToDisk();
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /** @private */
    _substitute(template, vars) {
        if (!template) return '';
        return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
            const val = vars[key];
            return val !== undefined && val !== null ? String(val) : `{{${key}}}`;
        });
    }

    /** @private */
    _loadFromDisk() {
        try {
            if (!fs.existsSync(TEMPLATES_FILE)) { this._custom = {}; return; }
            const raw = fs.readFileSync(TEMPLATES_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                this._custom = parsed;
            } else {
                this._custom = {};
            }
        } catch (_) {
            this._custom = {};
        }
    }

    /** @private */
    _saveToDisk() {
        try {
            if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
            fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(this._custom, null, 2), 'utf8');
        } catch (_) {}
    }
}

// Singleton — shared across all modules.
const promptTemplates = new PromptTemplates();

module.exports = { PromptTemplates, promptTemplates, DEFAULTS };
