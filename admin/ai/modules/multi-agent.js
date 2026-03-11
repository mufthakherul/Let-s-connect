'use strict';

/**
 * @fileoverview Multi-agent orchestration for the Milonexa AI Admin Agent (v3.0).
 *
 * Architecture:
 *  - Three specialized sub-agents: security-agent, performance-agent, quality-agent.
 *  - `AgentOrchestrator` — priority queue (critical > high > medium > low), resource
 *    budget (max concurrent tasks, max LLM tokens per cycle, per-agent time cap).
 *  - `MessageBus` — in-process pub/sub with typed events for inter-agent coordination.
 *  - `EscalationManager` — detects and resolves cross-agent conflicts via human-in-the-loop
 *    approval through PermissionGate.
 *
 * Sub-agent responsibilities:
 *  - SecurityAgent: rate-limit/brute-force analysis, CVE cross-reference, config drift.
 *  - PerformanceAgent: latency baseline, memory trend, query hot-path detection.
 *  - QualityAgent: code-style lint summaries, tech-debt scoring, test coverage KPIs.
 *
 * All I/O uses ONLY Node.js built-in modules.
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Approximate characters per token (GPT-family average; used for budget estimation). */
const CHARS_PER_TOKEN       = 4;
/** Conservative output token buffer added to every LLM call estimate. */
const RESPONSE_TOKEN_BUFFER = 200;
/** Maximum number of conflicts retained in EscalationManager history. */
const MAX_CONFLICTS_HISTORY = 200;
// ---------------------------------------------------------------------------

const ADMIN_HOME       = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const AI_STATE_DIR     = path.join(ADMIN_HOME, 'ai');
const MULTI_AGENT_DIR  = path.join(AI_STATE_DIR, 'multi-agent');

// ---------------------------------------------------------------------------
// Priority levels
// ---------------------------------------------------------------------------

const PRIORITIES = Object.freeze({ critical: 0, high: 1, medium: 2, low: 3 });

// ---------------------------------------------------------------------------
// MessageBus — lightweight in-process pub/sub
// ---------------------------------------------------------------------------

class MessageBus {
    constructor() {
        /** @type {Map<string, Function[]>} topic → listeners */
        this._listeners = new Map();
        /** @type {object[]} Message history (last 200). */
        this._history   = [];
    }

    /**
     * Subscribe to a topic.
     * @param {string}   topic
     * @param {Function} listener   (message: object) => void
     */
    on(topic, listener) {
        if (!this._listeners.has(topic)) this._listeners.set(topic, []);
        this._listeners.get(topic).push(listener);
    }

    /**
     * Unsubscribe from a topic.
     */
    off(topic, listener) {
        if (!this._listeners.has(topic)) return;
        const updated = this._listeners.get(topic).filter(l => l !== listener);
        this._listeners.set(topic, updated);
    }

    /**
     * Publish a message to a topic.
     * @param {string} topic
     * @param {object} message   { from, payload, ... }
     */
    publish(topic, message) {
        const envelope = {
            id:        crypto.randomUUID(),
            topic,
            from:      message.from || 'unknown',
            payload:   message.payload || message,
            timestamp: new Date().toISOString(),
        };
        this._history.push(envelope);
        if (this._history.length > 200) this._history = this._history.slice(-200);

        const listeners = this._listeners.get(topic) || [];
        for (const fn of listeners) {
            try { fn(envelope); } catch (e) {
                console.error(`[message-bus] Listener error (${topic}):`, e.message);
            }
        }
    }

    /** @returns {object[]} Recent message history. */
    getHistory(limit = 50) {
        return this._history.slice(-limit);
    }
}

// ---------------------------------------------------------------------------
// SubAgent — base class
// ---------------------------------------------------------------------------

class SubAgent {
    /**
     * @param {string}     name       'security-agent' | 'performance-agent' | 'quality-agent'
     * @param {MessageBus} messageBus
     */
    constructor(name, messageBus) {
        this.name       = name;
        this._bus       = messageBus;
        this._findings  = [];
        this._lastRunAt = null;
        this._tokenBudget = 0; // Assigned by orchestrator.
        this._timeBudgetMs = 0;

        // Subscribe to findings from other agents (for cross-agent coordination).
        this._bus.on('finding', (msg) => {
            if (msg.from !== this.name) this._onExternalFinding(msg);
        });
    }

    /**
     * Run one analysis cycle.
     * @param {object} context   { metrics, threats, codeFindings, healthIssues, llmFn }
     * @returns {Promise<object[]>} New findings.
     */
    async run(context) {
        this._lastRunAt = new Date().toISOString();
        const findings  = await this._analyze(context);

        for (const finding of findings) {
            finding.agent    = this.name;
            finding.id       = finding.id || crypto.randomUUID();
            finding.detectedAt = new Date().toISOString();
            this._findings.push(finding);
            this._bus.publish('finding', { from: this.name, payload: finding });
        }

        if (this._findings.length > 500) this._findings = this._findings.slice(-500);
        return findings;
    }

    /** @returns {object[]} Findings from this sub-agent. */
    getFindings(limit = 50) {
        return this._findings.slice(-limit);
    }

    /** @returns {object} Summary. */
    getSummary() {
        return {
            agent:     this.name,
            lastRunAt: this._lastRunAt,
            total:     this._findings.length,
        };
    }

    /** @protected — override in sub-classes. */
    async _analyze(_context) { return []; }

    /** @protected — called when another agent publishes a finding. */
    _onExternalFinding(_msg) {}

    /**
     * Estimate LLM token usage for a given prompt string.
     * Uses CHARS_PER_TOKEN approximation plus a response buffer.
     * @protected
     * @param {string} prompt
     * @returns {number} Estimated token count.
     */
    _estimateTokens(prompt) {
        return Math.ceil(prompt.length / CHARS_PER_TOKEN) + RESPONSE_TOKEN_BUFFER;
    }
}

// ---------------------------------------------------------------------------
// SecurityAgent
// ---------------------------------------------------------------------------

class SecurityAgent extends SubAgent {
    constructor(bus) {
        super('security-agent', bus);
        this._conflicts = []; // Cross-agent conflicts detected.
    }

    /** @protected */
    async _analyze({ threats = [], codeFindings = [], llmFn } = {}) {
        const findings = [];

        // 1. Brute-force / rate-limit analysis from threats.
        const authThreats = threats.filter(t =>
            /brute.?force|rate.?limit|login.?attempt|401|403/i.test(JSON.stringify(t))
        );
        if (authThreats.length > 0) {
            findings.push({
                type:       'auth_threat_cluster',
                severity:   'high',
                summary:    `${authThreats.length} authentication threat(s) detected — possible brute-force campaign`,
                detail:     authThreats.slice(0, 5).map(t => JSON.stringify(t)).join('\n'),
                service:    SecurityAgent._extractServiceId(authThreats[0]),
                confidence: 0.85,
                source:     'security-agent',
            });
        }

        // 2. CVE cross-reference from code findings.
        const vulnFindings = codeFindings.filter(f =>
            f.type === 'security' || /sql.?inject|xss|csrf|prototype.?pollut/i.test(JSON.stringify(f))
        );
        if (vulnFindings.length > 0) {
            findings.push({
                type:       'vulnerability_cluster',
                severity:   vulnFindings.some(f => f.severity === 'critical') ? 'critical' : 'high',
                summary:    `${vulnFindings.length} security vulnerability finding(s) require CVE cross-reference`,
                detail:     vulnFindings.slice(0, 3).map(f => f.description || f.message || JSON.stringify(f)).join('\n'),
                service:    SecurityAgent._extractServiceId(vulnFindings[0]),
                confidence: 0.80,
                source:     'security-agent',
                crossRef:   'https://cve.mitre.org (manual lookup recommended)',
            });
        }

        // 3. LLM-enhanced threat assessment — publishes token usage to bus for budget tracking.
        if (typeof llmFn === 'function' && authThreats.length + vulnFindings.length > 0) {
            try {
                const prompt = [
                    `You are a security analyst. Analyze these threats and vulnerabilities from the Milonexa platform:`,
                    `Threats: ${JSON.stringify(authThreats.slice(0, 3))}`,
                    `Code vulnerabilities: ${JSON.stringify(vulnFindings.slice(0, 3))}`,
                    `Return JSON: { "riskLevel": "critical|high|medium|low", "topRisk": "one sentence", "immediateActions": ["action1", "action2"] }`,
                ].join('\n');
                this._bus.publish('llm_call', { from: this.name, payload: { tokens: this._estimateTokens(prompt), phase: 'security_assessment' } });
                const response = await llmFn(prompt);
                const match = response && response.match(/\{[\s\S]*\}/);
                if (match) {
                    const assessment = JSON.parse(match[0]);
                    findings.push({
                        type:       'llm_security_assessment',
                        severity:   assessment.riskLevel || 'medium',
                        summary:    assessment.topRisk || 'Security assessment completed',
                        actions:    assessment.immediateActions || [],
                        service:    null,
                        confidence: 0.75,
                        source:     'security-agent',
                        llmEnhanced: true,
                    });
                }
            } catch (_) {}
        }

        return findings;
    }

    /** @protected */
    _onExternalFinding(msg) {
        // If performance-agent detects an anomaly that could be a DoS, flag it.
        const f = msg.payload;
        if (f && f.type === 'latency_spike' && f.severity === 'high') {
            this._conflicts.push({
                id:          crypto.randomUUID(),
                type:        'potential_dos',
                fromAgent:   msg.from,
                finding:     f,
                service:     f.service || null,
                detectedAt:  new Date().toISOString(),
                resolution:  'pending',
            });
        }
    }

    getConflicts() { return this._conflicts; }

    /**
     * Extract a service identifier from a threat or finding object.
     * Checks `.service` then `.target` then returns null.
     * @private
     */
    static _extractServiceId(obj) {
        if (!obj || typeof obj !== 'object') return null;
        return (obj.service || obj.target || null) || null;
    }
}

// ---------------------------------------------------------------------------
// PerformanceAgent
// ---------------------------------------------------------------------------

class PerformanceAgent extends SubAgent {
    constructor(bus) {
        super('performance-agent', bus);
        this._latencyBaselines = {};
        this._memoryTrends     = {};
    }

    /** @protected */
    async _analyze({ metrics = {}, healthIssues = [], llmFn } = {}) {
        const findings = [];

        // 1. Latency baseline tracking.
        const services = Object.keys(metrics);
        for (const svc of services) {
            const svcMetrics  = metrics[svc];
            const latency     = svcMetrics && svcMetrics.p95LatencyMs;
            if (typeof latency !== 'number') continue;

            const baseline = this._latencyBaselines[svc];
            if (!baseline) {
                this._latencyBaselines[svc] = latency;
                continue;
            }

            const ratio = latency / baseline;
            if (ratio >= 2.0) {
                findings.push({
                    type:       'latency_spike',
                    severity:   ratio >= 5.0 ? 'high' : 'medium',
                    summary:    `${svc}: p95 latency ${latency}ms is ${ratio.toFixed(1)}× baseline (${baseline}ms)`,
                    service:    svc,
                    current:    latency,
                    baseline,
                    ratio,
                    confidence: 0.90,
                    source:     'performance-agent',
                });
            }

            // Update baseline with exponential moving average.
            this._latencyBaselines[svc] = baseline * 0.9 + latency * 0.1;
        }

        // 2. Memory trend analysis.
        for (const svc of services) {
            const svcMetrics = metrics[svc];
            const memMb      = svcMetrics && svcMetrics.memoryMb;
            if (typeof memMb !== 'number') continue;

            if (!this._memoryTrends[svc]) this._memoryTrends[svc] = [];
            this._memoryTrends[svc].push(memMb);
            if (this._memoryTrends[svc].length > 20) this._memoryTrends[svc].shift();

            // Detect monotonic increase (possible memory leak).
            const samples = this._memoryTrends[svc];
            if (samples.length >= 5) {
                const increasing = samples.slice(-5).every((v, i, arr) => i === 0 || v >= arr[i - 1]);
                const growth     = samples[samples.length - 1] / samples[0];
                if (increasing && growth >= 1.5) {
                    findings.push({
                        type:       'memory_leak_suspect',
                        severity:   'medium',
                        summary:    `${svc}: memory grew ${((growth - 1) * 100).toFixed(0)}% over last ${samples.length} samples — possible leak`,
                        service:    svc,
                        samples:    samples.slice(-5),
                        growthRatio: growth,
                        confidence: 0.70,
                        source:     'performance-agent',
                    });
                }
            }
        }

        // 3. Health issue hot-paths.
        const slowEndpoints = (healthIssues || []).filter(i => /slow|timeout|latency/i.test(JSON.stringify(i)));
        if (slowEndpoints.length > 2) {
            findings.push({
                type:       'hot_path_cluster',
                severity:   'medium',
                summary:    `${slowEndpoints.length} slow-endpoint health issues suggest query hot-path — review DB indices`,
                count:      slowEndpoints.length,
                confidence: 0.65,
                source:     'performance-agent',
            });
        }

        return findings;
    }
}

// ---------------------------------------------------------------------------
// QualityAgent
// ---------------------------------------------------------------------------

class QualityAgent extends SubAgent {
    constructor(bus) {
        super('quality-agent', bus);
        this._techDebtScore   = null;
        this._coverageHistory = [];
    }

    /** @protected */
    async _analyze({ codeFindings = [], testIntel, llmFn } = {}) {
        const findings = [];

        // 1. Tech-debt scoring.
        const complexityFindings = codeFindings.filter(f => f.type === 'complexity' || f.type === 'duplicate' || f.type === 'dead_code');
        const securityFindings   = codeFindings.filter(f => f.type === 'security' || f.source === 'ast');
        const debtScore          = Math.min(100, complexityFindings.length * 3 + securityFindings.length * 5);

        this._techDebtScore = debtScore;

        if (debtScore >= 20) {
            findings.push({
                type:       'tech_debt',
                severity:   debtScore >= 50 ? 'high' : 'medium',
                summary:    `Tech-debt score: ${debtScore}/100 — ${complexityFindings.length} complexity + ${securityFindings.length} security finding(s)`,
                score:      debtScore,
                breakdown:  { complexity: complexityFindings.length, security: securityFindings.length },
                confidence: 0.80,
                source:     'quality-agent',
            });
        }

        // 2. Coverage KPI tracking.
        if (testIntel && testIntel.uncoveredBranches !== null) {
            this._coverageHistory.push({
                uncoveredBranches: testIntel.uncoveredBranches,
                timestamp:         new Date().toISOString(),
            });
            if (this._coverageHistory.length > 20) this._coverageHistory.shift();

            // Alert if coverage is degrading.
            if (this._coverageHistory.length >= 3) {
                const recent  = this._coverageHistory.slice(-3);
                const trending = recent.every((v, i, arr) => i === 0 || v.uncoveredBranches >= arr[i - 1].uncoveredBranches);
                if (trending && recent[2].uncoveredBranches > recent[0].uncoveredBranches + 5) {
                    findings.push({
                        type:       'coverage_degradation',
                        severity:   'medium',
                        summary:    `Test coverage degrading: uncovered branches increased from ${recent[0].uncoveredBranches} to ${recent[2].uncoveredBranches}`,
                        trend:      this._coverageHistory.slice(-5),
                        confidence: 0.85,
                        source:     'quality-agent',
                    });
                }
            }
        }

        // 3. LLM tech-debt narrative — publishes token usage to bus for budget tracking.
        if (typeof llmFn === 'function' && debtScore >= 30) {
            try {
                const prompt = [
                    `You are a software quality engineer. A codebase has a tech-debt score of ${debtScore}/100.`,
                    `Breakdown: ${complexityFindings.length} complexity issues, ${securityFindings.length} security issues.`,
                    `Sample findings: ${JSON.stringify(codeFindings.slice(0, 5).map(f => f.description || f.message || f.type))}`,
                    `Return JSON: { "priority": "high|medium|low", "topIssue": "one sentence", "recommendations": ["rec1", "rec2", "rec3"], "estimatedDays": 1-30 }`,
                ].join('\n');
                const estTokens = this._estimateTokens(prompt);
                this._bus.publish('llm_call', { from: this.name, payload: { tokens: estTokens, phase: 'quality_assessment' } });
                const response = await llmFn(prompt);
                const match = response && response.match(/\{[\s\S]*\}/);
                if (match) {
                    const assessment = JSON.parse(match[0]);
                    findings.push({
                        type:       'llm_quality_assessment',
                        severity:   assessment.priority || 'medium',
                        summary:    assessment.topIssue || 'Quality assessment completed',
                        recommendations: assessment.recommendations || [],
                        estimatedDays:   assessment.estimatedDays,
                        confidence: 0.72,
                        source:     'quality-agent',
                        llmEnhanced: true,
                    });
                }
            } catch (_) {}
        }

        return findings;
    }

    getTechDebtScore() { return this._techDebtScore; }
    getCoverageHistory() { return this._coverageHistory; }
}

// ---------------------------------------------------------------------------
// EscalationManager
// ---------------------------------------------------------------------------

class EscalationManager {
    constructor(messageBus) {
        this._bus      = messageBus;
        this._conflicts = [];

        // Listen for cross-agent conflicts published by agents or detectAndEscalate().
        this._bus.on('conflict', (msg) => {
            const payload = msg.payload;
            if (Array.isArray(payload)) {
                for (const c of payload) this._conflicts.push(c);
            } else if (payload && typeof payload === 'object') {
                this._conflicts.push(payload);
            }
            if (this._conflicts.length > MAX_CONFLICTS_HISTORY) this._conflicts = this._conflicts.slice(-MAX_CONFLICTS_HISTORY);
        });
    }

    /**
     * Detect and escalate conflicts between agent findings.
     * Uses structured `service` field on findings for reliable cross-agent matching.
     * @param {SubAgent[]} agents
     * @param {object}     [permGate]
     * @returns {Promise<object[]>} Escalated conflicts.
     */
    async detectAndEscalate(agents, permGate) {
        const allFindings = agents.flatMap(a => a.getFindings(20));
        const escalated   = [];

        // Rule: If security-agent + performance-agent both find high-severity issues
        // for the same service within the same cycle, escalate as a compound risk.
        // Match is done via the explicit `service` field added to each finding.
        const secFindings  = allFindings.filter(f => f.source === 'security-agent'    && /critical|high/.test(f.severity));
        const perfFindings = allFindings.filter(f => f.source === 'performance-agent' && /critical|high/.test(f.severity));

        for (const sf of secFindings) {
            if (!sf.service) continue; // Skip unserviced findings — can't reliably match.

            const conflictingPerf = perfFindings.find(pf =>
                pf.service &&
                pf.service.toLowerCase() === sf.service.toLowerCase()
            );

            if (conflictingPerf) {
                const conflict = {
                    id:              crypto.randomUUID(),
                    type:            'compound_risk',
                    agents:          [sf.source, conflictingPerf.source],
                    securityFinding: sf,
                    perfFinding:     conflictingPerf,
                    service:         sf.service,
                    summary:         `Compound risk on '${sf.service}': security + performance degradation in same cycle`,
                    severity:        'critical',
                    detectedAt:      new Date().toISOString(),
                    resolution:      'pending',
                };
                escalated.push(conflict);

                if (permGate) {
                    await permGate.requestPermission(
                        'resolve_agent_conflict',
                        `Cross-agent conflict: ${conflict.summary}`,
                        { conflictId: conflict.id, securityFinding: sf, perfFinding: conflictingPerf },
                        'critical'
                    ).catch(() => {});
                    conflict.resolution = 'pending_approval';
                }
            }
        }

        if (escalated.length > 0) {
            // Publish to 'conflict' topic — the bus listener above will store them.
            this._bus.publish('conflict', { from: 'escalation-manager', payload: escalated });
            // Also publish as 'escalation' for backwards-compat listeners.
            this._bus.publish('escalation', { from: 'escalation-manager', payload: escalated });
        }

        return escalated;
    }

    /** @returns {object[]} All conflicts (from bus listener + direct detection). */
    getConflicts(limit = 20) {
        return this._conflicts.slice(-limit);
    }
}

// ---------------------------------------------------------------------------
// AgentOrchestrator
// ---------------------------------------------------------------------------

class AgentOrchestrator {
    /**
     * @param {object} [opts]
     *   @param {number} [opts.maxConcurrent]  Max concurrent sub-agent runs (default: 3).
     *   @param {number} [opts.tokenBudget]    Max LLM token budget per cycle (default: 10000).
     *   @param {number} [opts.timeBudgetMs]   Max time per cycle in ms (default: 60000).
     */
    constructor(opts = {}) {
        this._ensureDirs();
        this._messageBus       = new MessageBus();
        this._securityAgent    = new SecurityAgent(this._messageBus);
        this._performanceAgent = new PerformanceAgent(this._messageBus);
        this._qualityAgent     = new QualityAgent(this._messageBus);
        this._escalationMgr    = new EscalationManager(this._messageBus);

        this._maxConcurrent  = opts.maxConcurrent || 3;
        this._tokenBudget    = opts.tokenBudget    || 10000;
        this._timeBudgetMs   = opts.timeBudgetMs   || 60000;

        this._usedTokens     = 0;
        this._cycleResults   = [];
        this._lastRunAt      = null;

        // Publish/subscribe for token counting.
        this._messageBus.on('llm_call', (msg) => {
            this._usedTokens += (msg.payload && msg.payload.tokens) || 0;
        });
    }

    /**
     * Run all sub-agents with priority queue scheduling.
     *
     * @param {object} context   { metrics, threats, codeFindings, healthIssues, llmFn, testIntel }
     * @param {object} [permGate]
     * @returns {Promise<object>}
     */
    async runCycle(context, permGate) {
        this._lastRunAt  = new Date().toISOString();
        this._usedTokens = 0;
        const startTime  = Date.now();

        console.log('[multi-agent] Running multi-agent analysis cycle…');

        // Priority queue: each task has { priority, agent, name }.
        const queue = [
            { priority: PRIORITIES.critical, agent: this._securityAgent,    name: 'security' },
            { priority: PRIORITIES.high,     agent: this._performanceAgent, name: 'performance' },
            { priority: PRIORITIES.medium,   agent: this._qualityAgent,     name: 'quality' },
        ].sort((a, b) => a.priority - b.priority);

        const results = {};
        let totalFindings = 0;

        for (const task of queue) {
            if (Date.now() - startTime >= this._timeBudgetMs) {
                console.warn(`[multi-agent] Time budget (${this._timeBudgetMs}ms) exceeded — skipping remaining agents`);
                break;
            }

            // Token budget: skip LLM for lower-priority agents if budget is exhausted.
            const llmFn = this._usedTokens < this._tokenBudget * 0.8 ? context.llmFn : null;

            const agentContext = { ...context, llmFn };

            try {
                const findings = await task.agent.run(agentContext);
                results[task.name] = { findings: findings.length, latencyMs: Date.now() - startTime };
                totalFindings += findings.length;
                console.log(`[multi-agent] ${task.name}: ${findings.length} finding(s)`);
            } catch (e) {
                console.error(`[multi-agent] ${task.name} error:`, e.message);
                results[task.name] = { findings: 0, error: e.message };
            }
        }

        // Escalation check.
        const escalated = await this._escalationMgr.detectAndEscalate(
            [this._securityAgent, this._performanceAgent, this._qualityAgent],
            permGate
        );

        const cycleResult = {
            id:             crypto.randomUUID(),
            totalFindings,
            results,
            escalations:    escalated.length,
            usedTokens:     this._usedTokens,
            durationMs:     Date.now() - startTime,
            cycledAt:       new Date().toISOString(),
        };
        this._cycleResults.push(cycleResult);
        if (this._cycleResults.length > 50) this._cycleResults.shift();

        this._saveCycleResult(cycleResult);
        return cycleResult;
    }

    /** @returns {MessageBus} The shared message bus. */
    getMessageBus() { return this._messageBus; }

    /** @returns {SecurityAgent} */
    getSecurityAgent()    { return this._securityAgent; }

    /** @returns {PerformanceAgent} */
    getPerformanceAgent() { return this._performanceAgent; }

    /** @returns {QualityAgent} */
    getQualityAgent()     { return this._qualityAgent; }

    /** @returns {EscalationManager} */
    getEscalationManager() { return this._escalationMgr; }

    /** @returns {object} Full summary. */
    getSummary() {
        return {
            lastRunAt:        this._lastRunAt,
            totalCycles:      this._cycleResults.length,
            lastCycle:        this._cycleResults[this._cycleResults.length - 1] || null,
            agents: {
                security:    this._securityAgent.getSummary(),
                performance: this._performanceAgent.getSummary(),
                quality:     this._qualityAgent.getSummary(),
            },
            escalations:      this._escalationMgr.getConflicts(5).length,
            tokenBudget:      this._tokenBudget,
            usedTokensLast:   this._usedTokens,
        };
    }

    // -----------------------------------------------------------------------
    // Persistence
    // -----------------------------------------------------------------------

    /** @private */
    _saveCycleResult(result) {
        try { fs.writeFileSync(path.join(MULTI_AGENT_DIR, 'last-cycle.json'), JSON.stringify(result, null, 2), 'utf8'); } catch (_) {}
    }

    /** @private */
    _ensureDirs() {
        [AI_STATE_DIR, MULTI_AGENT_DIR].forEach(d => {
            if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        });
    }
}

module.exports = { AgentOrchestrator, MessageBus, SecurityAgent, PerformanceAgent, QualityAgent, EscalationManager };
