'use strict';

/**
 * @fileoverview Advanced observability for the Milonexa AI Admin Agent (v3.0).
 *
 * Capabilities:
 *  - Agent performance metrics: tracks LLM call latency, token usage, fix acceptance
 *    rate, and per-agent cycle times. Exposes rolling averages and percentiles.
 *  - Immutable append-only audit trail: every significant AI action is written as a
 *    JSON-lines record to `.admin-cli/ai/audit/audit.jsonl`. Lines are never modified
 *    (append-only); daily rotation keeps the file manageable.
 *  - Cost tracking: estimates dollar cost per LLM call using configurable price tables
 *    for OpenAI / Anthropic / Ollama (Ollama = $0 / local). Persists daily totals.
 *  - Structured JSON logging: wraps console.log to optionally emit JSON-formatted log
 *    entries when `OBSERVABILITY_JSON_LOG=true`.
 *  - Exports a singleton `observe` function (event, data, latencyMs?) used throughout
 *    the agent for uniform instrumentation.
 *
 * Configuration:
 *   OBSERVABILITY_JSON_LOG     'true' to emit JSON log lines (default: false)
 *   COST_PER_1K_INPUT_TOKENS   USD cost per 1 000 input tokens (default: 0)
 *   COST_PER_1K_OUTPUT_TOKENS  USD cost per 1 000 output tokens (default: 0)
 *   COST_DAILY_BUDGET_USD      Alert threshold for daily spend (default: 1.0)
 *
 * All I/O uses ONLY Node.js built-in modules.
 */

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

const ADMIN_HOME      = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const AI_STATE_DIR    = path.join(ADMIN_HOME, 'ai');
const AUDIT_DIR       = path.join(AI_STATE_DIR, 'audit');
const METRICS_DIR     = path.join(AI_STATE_DIR, 'observability');

const JSON_LOG        = process.env.OBSERVABILITY_JSON_LOG === 'true';
const COST_PER_1K_IN  = parseFloat(process.env.COST_PER_1K_INPUT_TOKENS   || '0');
const COST_PER_1K_OUT = parseFloat(process.env.COST_PER_1K_OUTPUT_TOKENS  || '0');
const DAILY_BUDGET    = parseFloat(process.env.COST_DAILY_BUDGET_USD       || '1.0');

// ---------------------------------------------------------------------------
// Observability
// ---------------------------------------------------------------------------

class Observability {
    constructor() {
        this._ensureDirs();

        // LLM metrics: rolling window (last 500 calls).
        /** @type {object[]} */
        this._llmCalls        = [];
        /** @type {object[]} Fix-acceptance events */
        this._fixEvents       = [];
        /** @type {object[]} Cycle metrics */
        this._cycleMetrics    = [];
        /** @type {Map<string, number>} Today's cost per model */
        this._dailyCost       = new Map();
        this._dailyCostDate   = this._today();
        this._totalCostAllTime = 0;

        // Load persisted daily totals.
        this._loadDailyCost();
    }

    // -----------------------------------------------------------------------
    // Public API — instrumentation functions
    // -----------------------------------------------------------------------

    /**
     * Record a single LLM API call.
     *
     * @param {object} params
     *   @param {string} params.provider     'ollama' | 'openai' | 'anthropic' | 'demo'
     *   @param {string} params.model        Model name.
     *   @param {number} params.latencyMs    Call duration in milliseconds.
     *   @param {number} [params.inputTokens]  Estimated input tokens.
     *   @param {number} [params.outputTokens] Estimated output tokens.
     *   @param {string} [params.taskType]   'classify' | 'generate' | 'analyze'
     *   @param {boolean} [params.success]   Whether the call succeeded.
     */
    trackLLMCall(params) {
        const { provider, model, latencyMs, inputTokens = 0, outputTokens = 0, taskType = 'unknown', success = true } = params;

        const cost = this._computeCost(inputTokens, outputTokens);
        const record = {
            provider,
            model,
            latencyMs,
            inputTokens,
            outputTokens,
            cost,
            taskType,
            success,
            timestamp: new Date().toISOString(),
        };

        this._llmCalls.push(record);
        if (this._llmCalls.length > 500) this._llmCalls.shift();

        // Daily cost accumulation.
        this._rotateDailyCostIfNeeded();
        const prev = this._dailyCost.get(model) || 0;
        this._dailyCost.set(model, prev + cost);
        this._totalCostAllTime += cost;
        this._saveDailyCost();

        // Alert on daily budget exceeded.
        const totalToday = [...this._dailyCost.values()].reduce((s, v) => s + v, 0);
        if (cost > 0 && totalToday >= DAILY_BUDGET) {
            console.warn(`[observability] ⚠️  Daily AI cost budget ($${DAILY_BUDGET}) exceeded: $${totalToday.toFixed(4)}`);
        }

        this._audit('llm_call', { provider, model, latencyMs, inputTokens, outputTokens, cost, taskType, success });

        if (JSON_LOG) {
            process.stdout.write(JSON.stringify({ level: 'info', event: 'llm_call', ...record }) + '\n');
        }
    }

    /**
     * Record a fix-acceptance or rejection event.
     *
     * @param {object} params
     *   @param {string}  params.fixId    ID of the proposed fix.
     *   @param {boolean} params.accepted Whether the fix was accepted.
     *   @param {string}  [params.source] 'code-analyzer' | 'test-intelligence' | etc.
     */
    trackFixEvent(params) {
        const { fixId, accepted, source = 'unknown', reason = '' } = params;
        const record = { fixId, accepted, source, reason, timestamp: new Date().toISOString() };
        this._fixEvents.push(record);
        if (this._fixEvents.length > 500) this._fixEvents.shift();
        this._audit('fix_event', record);
    }

    /**
     * Record the end of an agent main cycle.
     *
     * @param {object} params
     *   @param {number} params.cycleId
     *   @param {number} params.durationMs
     *   @param {string} params.state
     *   @param {number} params.findings
     */
    trackCycle(params) {
        const record = { ...params, timestamp: new Date().toISOString() };
        this._cycleMetrics.push(record);
        if (this._cycleMetrics.length > 200) this._cycleMetrics.shift();
        this._audit('cycle', record);
    }

    /**
     * Write an arbitrary audit entry.
     *
     * @param {string} action   Short action name (e.g. 'code_fix_applied').
     * @param {object} data     Associated data.
     * @param {string} [actor]  'agent' | 'admin' | sub-agent name.
     */
    audit(action, data, actor = 'agent') {
        this._audit(action, data, actor);
    }

    // -----------------------------------------------------------------------
    // Public API — queries
    // -----------------------------------------------------------------------

    /**
     * @returns {object} LLM performance summary.
     */
    getLLMMetrics() {
        if (this._llmCalls.length === 0) return { total: 0 };

        const recent  = this._llmCalls.slice(-100);
        const latencies = recent.map(c => c.latencyMs).sort((a, b) => a - b);
        const failures  = recent.filter(c => !c.success).length;

        const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
        const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
        const avg = latencies.reduce((s, v) => s + v, 0) / latencies.length;

        const totalInputTokens  = recent.reduce((s, c) => s + c.inputTokens, 0);
        const totalOutputTokens = recent.reduce((s, c) => s + c.outputTokens, 0);

        const byModel = {};
        for (const c of recent) {
            if (!byModel[c.model]) byModel[c.model] = { calls: 0, tokens: 0, cost: 0 };
            byModel[c.model].calls++;
            byModel[c.model].tokens += c.inputTokens + c.outputTokens;
            byModel[c.model].cost   += c.cost;
        }

        return {
            total:         this._llmCalls.length,
            recentSamples: recent.length,
            latency:       { p50, p95, avgMs: Math.round(avg) },
            successRate:   Math.round(((recent.length - failures) / recent.length) * 100),
            totalInputTokens,
            totalOutputTokens,
            byModel,
        };
    }

    /**
     * @returns {object} Fix acceptance stats.
     */
    getFixAcceptanceRate() {
        if (this._fixEvents.length === 0) return { total: 0, rate: null };
        const accepted = this._fixEvents.filter(e => e.accepted).length;
        return {
            total:    this._fixEvents.length,
            accepted,
            rejected: this._fixEvents.length - accepted,
            rate:     Math.round((accepted / this._fixEvents.length) * 100),
        };
    }

    /**
     * @returns {object} Cost summary.
     */
    getCostSummary() {
        this._rotateDailyCostIfNeeded();
        const todayTotal = [...this._dailyCost.values()].reduce((s, v) => s + v, 0);
        return {
            today:        { date: this._dailyCostDate, totalUsd: Math.round(todayTotal * 10000) / 10000, byModel: Object.fromEntries(this._dailyCost) },
            allTimeUsd:   Math.round(this._totalCostAllTime * 10000) / 10000,
            budget:       DAILY_BUDGET,
            budgetUsedPct: DAILY_BUDGET > 0 ? Math.round((todayTotal / DAILY_BUDGET) * 100) : null,
        };
    }

    /**
     * @returns {object} Cycle performance stats.
     */
    getCycleMetrics() {
        if (this._cycleMetrics.length === 0) return { total: 0 };
        const recent  = this._cycleMetrics.slice(-20);
        const durations = recent.map(c => c.durationMs).sort((a, b) => a - b);
        return {
            total:    this._cycleMetrics.length,
            avgMs:    Math.round(durations.reduce((s, v) => s + v, 0) / durations.length),
            p95Ms:    durations[Math.floor(durations.length * 0.95)] || 0,
            maxMs:    durations[durations.length - 1] || 0,
            lastCycle: this._cycleMetrics[this._cycleMetrics.length - 1] || null,
        };
    }

    /**
     * @returns {object} Full observability summary.
     */
    getSummary() {
        return {
            llm:         this.getLLMMetrics(),
            fixAcceptance: this.getFixAcceptanceRate(),
            cost:        this.getCostSummary(),
            cycles:      this.getCycleMetrics(),
        };
    }

    /**
     * Return last N audit log entries from disk.
     * @param {number} [limit=100]
     * @returns {object[]}
     */
    getAuditLog(limit = 100) {
        const today  = this._today();
        const files  = this._getAuditFiles();
        const entries = [];

        for (const file of files.reverse()) {
            try {
                const lines = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
                for (const line of lines.reverse()) {
                    try { entries.push(JSON.parse(line)); } catch (_) {}
                    if (entries.length >= limit) break;
                }
            } catch (_) {}
            if (entries.length >= limit) break;
        }

        return entries.reverse().slice(-limit);
    }

    // -----------------------------------------------------------------------
    // Audit trail (internal)
    // -----------------------------------------------------------------------

    /** @private */
    _audit(action, data, actor = 'agent') {
        const entry = {
            ts:     new Date().toISOString(),
            action,
            actor,
            data,
        };
        const line = JSON.stringify(entry) + '\n';

        const auditFile = path.join(AUDIT_DIR, `audit-${this._today()}.jsonl`);
        try { fs.appendFileSync(auditFile, line, 'utf8'); } catch (_) {}

        if (JSON_LOG) {
            process.stdout.write(JSON.stringify({ level: 'audit', ...entry }) + '\n');
        }
    }

    // -----------------------------------------------------------------------
    // Cost helpers
    // -----------------------------------------------------------------------

    /** @private */
    _computeCost(inputTokens, outputTokens) {
        return (inputTokens / 1000) * COST_PER_1K_IN + (outputTokens / 1000) * COST_PER_1K_OUT;
    }

    /** @private */
    _rotateDailyCostIfNeeded() {
        const today = this._today();
        if (today !== this._dailyCostDate) {
            // Archive yesterday's cost.
            this._saveDailyCost(this._dailyCostDate);
            this._dailyCost     = new Map();
            this._dailyCostDate = today;
        }
    }

    /** @private */
    _loadDailyCost() {
        const file = path.join(METRICS_DIR, `cost-${this._today()}.json`);
        try {
            const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
            this._dailyCost = new Map(Object.entries(raw.byModel || {}));
        } catch (_) {}
    }

    /** @private */
    _saveDailyCost(date) {
        const d = date || this._dailyCostDate;
        const obj = {
            date: d,
            totalUsd: [...this._dailyCost.values()].reduce((s, v) => s + v, 0),
            byModel:  Object.fromEntries(this._dailyCost),
        };
        try { fs.writeFileSync(path.join(METRICS_DIR, `cost-${d}.json`), JSON.stringify(obj, null, 2), 'utf8'); } catch (_) {}
    }

    /** @private */
    _getAuditFiles() {
        try {
            return fs.readdirSync(AUDIT_DIR)
                .filter(f => f.startsWith('audit-') && f.endsWith('.jsonl'))
                .sort()
                .map(f => path.join(AUDIT_DIR, f));
        } catch (_) { return []; }
    }

    /** @private */
    _today() {
        return new Date().toISOString().split('T')[0];
    }

    /** @private */
    _ensureDirs() {
        [AI_STATE_DIR, AUDIT_DIR, METRICS_DIR].forEach(d => {
            if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        });
    }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

const observability = new Observability();

module.exports = { Observability, observability };
