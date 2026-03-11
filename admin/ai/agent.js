'use strict';

/**
 * @fileoverview Milonexa AI Admin Agent — main orchestrator.
 *
 * Guards: if ENABLE_ADMIN_AI !== 'true', logs a message and exits.
 *
 * Architecture:
 *   - State machine: IDLE → MONITORING → ANALYZING → REVIEWING → ACTING → NOTIFYING → IDLE
 *   - Main loop runs every AI_CYCLE_INTERVAL_SECONDS (default 60 s).
 *   - Code analysis / doc generation / test generation run on a slower cadence
 *     controlled by AI_CODE_ANALYSIS_EVERY_N_CYCLES (default 10).
 *   - Emergency mode: cycle every 10 s, notify all channels immediately.
 *   - HTTP status/control server on AI_STATUS_PORT (default 8890).
 *   - Optional LLM enhancement: ollama (local) | openai | anthropic | demo (rule-based only).
 *
 * All heavy lifting is delegated to modules/ and ../shared/ modules.
 * Only Node.js built-in modules are used here.
 *
 * Environment variables:
 *   ENABLE_ADMIN_AI                  (required) must be 'true'
 *   AI_PROVIDER                      demo | ollama | openai | anthropic  (default: demo)
 *   OLLAMA_HOST                      Ollama server hostname (default: localhost)
 *   OLLAMA_PORT                      Ollama server port (default: 11434)
 *   OLLAMA_MODEL                     Model name (default: llama3.2)
 *   OPENAI_API_KEY                   (optional, only if AI_PROVIDER=openai)
 *   ANTHROPIC_API_KEY                (optional, only if AI_PROVIDER=anthropic)
 *   AI_CYCLE_INTERVAL_SECONDS        (default: 60)
 *   AI_CODE_ANALYSIS_EVERY_N_CYCLES  (default: 10)  — run code analysis every N cycles
 *   AI_DOC_GEN_EVERY_N_CYCLES        (default: 20)  — run doc generation every N cycles
 *   AI_TEST_GEN_EVERY_N_CYCLES       (default: 30)  — run test generation every N cycles
 *   AI_FEEDBACK_EVERY_N_CYCLES       (default: 5)   — run feedback processing every N cycles
 *   AI_STATUS_PORT                   (default: 8890)
 *   AI_NOTIFY_EVERY_CYCLE            (default: false)
 *   AI_EMERGENCY_NOTIFY              (default: true)
 *   AI_AUTO_HEAL                     (default: true)
 *   AI_AUTO_SECURITY                 (default: true)
 *   AI_GATEWAY_URL                   (default: http://localhost:8000)
 *   ADMIN_HOME                       (default: <repo-root>/.admin-cli)
 */

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

if (process.env.ENABLE_ADMIN_AI !== 'true') {
    console.log('[ai-agent] ENABLE_ADMIN_AI is not set to "true" — exiting.');
    process.exit(0);
}

// ---------------------------------------------------------------------------
// Built-in imports
// ---------------------------------------------------------------------------

const fs      = require('fs');
const path    = require('path');
const http    = require('http');
const https   = require('https');
const { URL } = require('url');

// ---------------------------------------------------------------------------
// Shared module imports
// ---------------------------------------------------------------------------

const SHARED_DIR = path.resolve(__dirname, '..', 'shared');

const { MetricsCollector }    = require(path.join(SHARED_DIR, 'metrics.js'));
const { AlertManager }        = require(path.join(SHARED_DIR, 'alerts.js'));
const { SLAManager }          = require(path.join(SHARED_DIR, 'sla.js'));
const { RemediationEngine }   = require(path.join(SHARED_DIR, 'ai-remediation.js'));
const { RecommendationEngine } = require(path.join(SHARED_DIR, 'recommendations.js'));
const { TrendAnalyzer }       = require(path.join(SHARED_DIR, 'trend-analysis.js'));

// ---------------------------------------------------------------------------
// AI module imports
// ---------------------------------------------------------------------------

const { Notifier }          = require('./modules/notifier.js');
const { PermissionGate }    = require('./modules/permission.js');
const { SecurityMonitor }   = require('./modules/security.js');
const { AutoHealer }        = require('./modules/healer.js');
const { Optimizer }         = require('./modules/optimizer.js');
const { CodeAnalyzer }      = require('./modules/code-analyzer.js');
const { DocGenerator }      = require('./modules/doc-generator.js');
const { FeedbackProcessor } = require('./modules/feedback-processor.js');
const { TestGenerator }     = require('./modules/test-generator.js');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGENT_VERSION = '2.0.0';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ADMIN_HOME   = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '.admin-cli');
const AI_STATE_DIR = path.join(ADMIN_HOME, 'ai');

const CONFIG = {
    provider:       process.env.AI_PROVIDER || 'demo',
    openaiKey:      process.env.OPENAI_API_KEY || '',
    anthropicKey:   process.env.ANTHROPIC_API_KEY || '',
    ollamaHost:     process.env.OLLAMA_HOST || 'localhost',
    ollamaPort:     parseInt(process.env.OLLAMA_PORT || '11434', 10),
    ollamaModel:    process.env.OLLAMA_MODEL || 'llama3.2',
    cycleSeconds:   parseInt(process.env.AI_CYCLE_INTERVAL_SECONDS, 10) || 60,
    // Sub-cycle cadences (every N main cycles).
    codeAnalysisEvery:  parseInt(process.env.AI_CODE_ANALYSIS_EVERY_N_CYCLES  || '10', 10),
    docGenEvery:        parseInt(process.env.AI_DOC_GEN_EVERY_N_CYCLES        || '20', 10),
    testGenEvery:       parseInt(process.env.AI_TEST_GEN_EVERY_N_CYCLES       || '30', 10),
    feedbackEvery:      parseInt(process.env.AI_FEEDBACK_EVERY_N_CYCLES       || '5',  10),
    statusPort:     parseInt(process.env.AI_STATUS_PORT, 10) || 8890,
    // Shared secret required in `Authorization: Bearer <token>` header for all non-/health routes.
    // If empty, auth is disabled (suitable only for localhost-only deployments).
    statusToken:    process.env.AI_STATUS_TOKEN || '',
    notifyEvery:    process.env.AI_NOTIFY_EVERY_CYCLE === 'true',
    emergencyNotify: process.env.AI_EMERGENCY_NOTIFY !== 'false',
    autoHeal:       process.env.AI_AUTO_HEAL !== 'false',
    autoSecurity:   process.env.AI_AUTO_SECURITY !== 'false',
    gatewayUrl:     process.env.AI_GATEWAY_URL || 'http://localhost:8000',
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Agent finite-state-machine states. */
const STATES = Object.freeze({
    IDLE:        'IDLE',
    MONITORING:  'MONITORING',
    ANALYZING:   'ANALYZING',
    REVIEWING:   'REVIEWING',   // code analysis / doc generation / test generation
    ACTING:      'ACTING',
    NOTIFYING:   'NOTIFYING',
    EMERGENCY:   'EMERGENCY',
});

const agentState = {
    state:          STATES.IDLE,
    emergencyMode:  false,
    startedAt:      new Date().toISOString(),
    cycles:         0,
    lastCycle:      null,
    lastCycleMs:    null,
    lastThreats:    [],
    lastHealthIssues: [],
    lastOpportunities: [],
    errors:         [],
    codeAnalysis:   { lastRunAt: null, totalFindings: 0, critical: 0, high: 0, medium: 0, low: 0, proposedFixes: 0 },
    docs:           { lastRunAt: null, docsGenerated: 0, services: [] },
    tests:          { lastRunAt: null, stubsGenerated: 0, services: [] },
    feedback:       { lastRunAt: null, total: 0, byCategory: {}, suggestions: 0, unprocessed: 0 },
};

// ---------------------------------------------------------------------------
// Shared module instances
// ---------------------------------------------------------------------------

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(AI_STATE_DIR);
ensureDir(path.join(ADMIN_HOME, 'metrics'));
ensureDir(path.join(ADMIN_HOME, 'alerts'));
ensureDir(path.join(ADMIN_HOME, 'sla'));
ensureDir(path.join(ADMIN_HOME, 'remediation'));
ensureDir(path.join(ADMIN_HOME, 'recommendations'));
ensureDir(path.join(ADMIN_HOME, 'feedback'));

const metricsCollector  = new MetricsCollector(path.join(ADMIN_HOME, 'metrics'));
const alertManager      = new AlertManager(path.join(ADMIN_HOME, 'alerts'));
const slaManager        = new SLAManager(path.join(ADMIN_HOME, 'sla'));
const remediationEngine = new RemediationEngine(path.join(ADMIN_HOME, 'remediation'));
const recommendEngine   = new RecommendationEngine(path.join(ADMIN_HOME, 'recommendations'));
const trendAnalyzer     = new TrendAnalyzer(path.join(ADMIN_HOME, 'metrics'));

const notifier          = new Notifier();
const permGate          = new PermissionGate();
const secMonitor        = new SecurityMonitor();
const autoHealer        = new AutoHealer();
const optimizer         = new Optimizer();
const codeAnalyzer      = new CodeAnalyzer();
const docGenerator      = new DocGenerator();
const feedbackProcessor = new FeedbackProcessor();
const testGenerator     = new TestGenerator();

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

function printBanner() {
    const lines = [
        '',
        '╔══════════════════════════════════════════════════════════╗',
        `║          Milonexa AI Admin Agent  v${AGENT_VERSION}                 ║`,
        '╠══════════════════════════════════════════════════════════╣',
        `║  Provider  : ${CONFIG.provider.padEnd(44)}║`,
        `║  Model     : ${CONFIG.ollamaModel.padEnd(44)}║`,
        `║  Cycle     : ${String(CONFIG.cycleSeconds + 's').padEnd(44)}║`,
        `║  Port      : ${String(CONFIG.statusPort).padEnd(44)}║`,
        `║  Auto-Heal : ${String(CONFIG.autoHeal).padEnd(44)}║`,
        `║  Auto-Sec  : ${String(CONFIG.autoSecurity).padEnd(44)}║`,
        `║  Gateway   : ${CONFIG.gatewayUrl.padEnd(44)}║`,
        '╠══════════════════════════════════════════════════════════╣',
        '║  Active capabilities:                                    ║',
        '║  ✓ Runtime monitoring & auto-healing                     ║',
        '║  ✓ Security threat detection & response                  ║',
        '║  ✓ AI-powered code analysis & vulnerability scanning     ║',
        '║  ✓ Automated code fix proposals (admin-gated)            ║',
        '║  ✓ User feedback processing & feature suggestions        ║',
        '║  ✓ AI documentation generation                           ║',
        '║  ✓ Test stub generation for untested routes              ║',
        '╚══════════════════════════════════════════════════════════╝',
        '',
    ];
    console.log(lines.join('\n'));
}

// ---------------------------------------------------------------------------
// Audit log reader helper
// ---------------------------------------------------------------------------

function loadAuditLog(limit = 200) {
    const auditFile = path.join(ADMIN_HOME, 'audit.log');
    if (!fs.existsSync(auditFile)) return [];
    try {
        const lines = fs.readFileSync(auditFile, 'utf8')
            .split('\n')
            .filter(Boolean)
            .slice(-limit);
        return lines.map(l => { try { return JSON.parse(l); } catch (_) { return null; } }).filter(Boolean);
    } catch (_) {
        return [];
    }
}

// ---------------------------------------------------------------------------
// LLM integration (optional)
// ---------------------------------------------------------------------------

/**
 * Call OpenAI chat completion API.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function callOpenAI(prompt) {
    const body = JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are an expert DevOps AI assistant for the Milonexa platform. Provide concise, actionable analysis.' },
            { role: 'user', content: prompt },
        ],
        max_tokens: 512,
        temperature: 0.2,
    });

    return _llmPost('https://api.openai.com/v1/chat/completions', body, {
        'Authorization': `Bearer ${CONFIG.openaiKey}`,
        'Content-Type': 'application/json',
    }, r => {
        const d = JSON.parse(r);
        return d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    });
}

/**
 * Call Anthropic Messages API.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function callAnthropic(prompt) {
    const body = JSON.stringify({
        model: 'claude-haiku-20240307',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
    });

    return _llmPost('https://api.anthropic.com/v1/messages', body, {
        'x-api-key': CONFIG.anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
    }, r => {
        const d = JSON.parse(r);
        return d.content && d.content[0] && d.content[0].text;
    });
}

/**
 * Common HTTP POST for LLM APIs.
 * @private
 */
function _llmPost(urlStr, body, headers, extractFn) {
    return new Promise((resolve, reject) => {
        let parsed;
        try { parsed = new URL(urlStr); } catch (_) { return reject(new Error(`Invalid LLM URL: ${urlStr}`)); }

        const lib = parsed.protocol === 'https:' ? https : http;
        const options = {
            hostname: parsed.hostname,
            port:     parsed.port || 443,
            path:     parsed.pathname,
            method:   'POST',
            headers:  { ...headers, 'Content-Length': Buffer.byteLength(body) },
            timeout:  30000,
        };

        const req = lib.request(options, res => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(extractFn(data) || ''); } catch (e) { reject(e); }
                } else {
                    reject(new Error(`LLM API ${res.statusCode}: ${data.slice(0, 200)}`));
                }
            });
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('LLM API timeout')); });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

/**
 * Call local Ollama /api/chat endpoint (privacy-safe, no external API key).
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function callOllama(prompt) {
    const body = JSON.stringify({
        model: CONFIG.ollamaModel,
        messages: [
            { role: 'system', content: 'You are an expert DevOps AI assistant for the Milonexa platform. Provide concise, actionable analysis.' },
            { role: 'user', content: prompt },
        ],
        stream: false,
        options: { num_predict: 512, temperature: 0.2 },
    });

    return _llmPost(`http://${CONFIG.ollamaHost}:${CONFIG.ollamaPort}/api/chat`, body, {
        'Content-Type': 'application/json',
    }, (r) => {
        const d = JSON.parse(r);
        return d.message && d.message.content;
    });
}

/**
 * Get an LLM-enhanced summary/analysis for unusual anomalies.
 * Falls back to rule-based output if LLM unavailable or in demo mode.
 *
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function llmAnalyze(prompt) {
    try {
        if (CONFIG.provider === 'ollama') {
            return await callOllama(prompt);
        }
        if (CONFIG.provider === 'openai' && CONFIG.openaiKey) {
            return await callOpenAI(prompt);
        }
        if (CONFIG.provider === 'anthropic' && CONFIG.anthropicKey) {
            return await callAnthropic(prompt);
        }
    } catch (err) {
        console.error(`[ai-agent] LLM call failed (${CONFIG.provider}): ${err.message}`);
    }
    return null; // Demo / fallback — caller handles null.
}

// ---------------------------------------------------------------------------
// Main agent cycle
// ---------------------------------------------------------------------------

/**
 * Execute one full analysis-and-action cycle.
 */
async function runCycle() {
    const cycleStart = Date.now();
    agentState.cycles += 1;
    const cycleId = agentState.cycles;

    setState(STATES.MONITORING);
    console.log(`\n[ai-agent] ── Cycle ${cycleId} starting ──────────────────────────────`);

    // ── 1. Collect metrics ──────────────────────────────────────────────────
    let metrics = null;
    try {
        metrics = metricsCollector.load ? { services: [] } : { services: [] };
        // metricsCollector stores historical data; build a live snapshot.
        const raw = typeof metricsCollector.getLatest === 'function'
            ? metricsCollector.getLatest()
            : (metricsCollector.metrics || []);
        metrics = buildMetricsSnapshot(raw);
    } catch (e) {
        console.error('[ai-agent] Metrics collection error:', e.message);
        metrics = { services: [] };
    }

    // ── 2. Check alerts ─────────────────────────────────────────────────────
    let activeAlerts = [];
    try {
        activeAlerts = (alertManager.history || [])
            .filter(a => a.severity === 'critical' || a.severity === 'warning')
            .slice(-50);
    } catch (e) {
        console.error('[ai-agent] Alert check error:', e.message);
    }

    // ── 3. SLA status ───────────────────────────────────────────────────────
    let slaStatus = null;
    try {
        slaStatus = typeof slaManager.getSummary === 'function'
            ? slaManager.getSummary()
            : { breaches: [] };
    } catch (e) {
        slaStatus = { breaches: [] };
    }

    // ── 4. Load audit log ───────────────────────────────────────────────────
    const auditLog = loadAuditLog(200);

    setState(STATES.ANALYZING);

    // ── 5. Security scan ────────────────────────────────────────────────────
    let threats = [];
    try {
        threats = await secMonitor.scanSecurityThreats(metrics, activeAlerts, auditLog);
        agentState.lastThreats = threats;
        if (threats.length > 0) {
            console.log(`[ai-agent] Security: ${threats.length} threat(s) detected`);
        }
    } catch (e) {
        console.error('[ai-agent] Security scan error:', e.message);
    }

    // ── 6. Health assessment ────────────────────────────────────────────────
    let healthAssessment = { healthy: true, score: 100, issues: [] };
    try {
        healthAssessment = await autoHealer.assessHealth(metrics, activeAlerts);
        agentState.lastHealthIssues = healthAssessment.issues;
        console.log(
            `[ai-agent] Health score: ${healthAssessment.score}/100` +
            (healthAssessment.issues.length ? ` (${healthAssessment.issues.length} issue(s))` : '')
        );
    } catch (e) {
        console.error('[ai-agent] Health assessment error:', e.message);
    }

    // ── 7. Optimisation analysis ────────────────────────────────────────────
    let opportunities = [];
    try {
        const recs = typeof recommendEngine.getRecommendations === 'function'
            ? recommendEngine.getRecommendations()
            : (recommendEngine.history || []);
        opportunities = await optimizer.analyze(metrics, null, recs);
        agentState.lastOpportunities = opportunities;
        if (opportunities.length > 0) {
            console.log(`[ai-agent] Optimizer: ${opportunities.length} opportunity(ies)`);
        }
    } catch (e) {
        console.error('[ai-agent] Optimizer error:', e.message);
    }

    // ── 8. AI remediation analysis ──────────────────────────────────────────
    let remediations = [];
    try {
        remediations = await remediationEngine.analyze({
            metrics:  metrics.services || [],
            alerts:   activeAlerts,
            sla:      slaStatus,
            provider: CONFIG.provider !== 'demo' ? CONFIG.provider : null,
        }).catch(() => []);
    } catch (e) {
        console.error('[ai-agent] Remediation analysis error:', e.message);
    }

    // ── 9. LLM-enhanced summary (if anomalies) ──────────────────────────────
    if (CONFIG.provider !== 'demo' && (threats.length > 0 || healthAssessment.issues.length > 0)) {
        const prompt = buildLLMPrompt(threats, healthAssessment.issues, opportunities, remediations);
        const llmSummary = await llmAnalyze(prompt);
        if (llmSummary) {
            console.log('[ai-agent] LLM insight:', llmSummary.slice(0, 300));
        }
    }

    // ── 10. Slow-cadence sub-cycles (REVIEWING state) ────────────────────────
    // Each capability is offset so they don't all pile up on the same cycle.
    // Feedback on cycle 1, N+1... Code on cycle 2, N+2... Docs on cycle 3... Tests on cycle 4...
    setState(STATES.REVIEWING);

    // 10a. Feedback processing (every feedbackEvery cycles, starting at cycle 1)
    if (cycleId > 0 && (cycleId - 1) % CONFIG.feedbackEvery === 0) {
        try {
            const llmFn = CONFIG.provider !== 'demo' ? llmAnalyze : null;
            const fbResult = await feedbackProcessor.processAll(llmFn, permGate);
            agentState.feedback = feedbackProcessor.getSummary();
            if (fbResult.processed > 0) {
                console.log(`[ai-agent] Feedback: processed ${fbResult.processed} items, ${fbResult.suggestions.length} actionable`);
            }
        } catch (e) {
            console.error('[ai-agent] Feedback processing error:', e.message);
        }
    }

    // 10b. Code analysis (every codeAnalysisEvery cycles, starting at cycle 2)
    if (cycleId > 1 && (cycleId - 2) % CONFIG.codeAnalysisEvery === 0) {
        try {
            const llmFn = CONFIG.provider !== 'demo' ? llmAnalyze : null;
            const { summary } = await codeAnalyzer.analyzeProject(llmFn, permGate);
            agentState.codeAnalysis = codeAnalyzer.getLastRunSummary();
            if (summary.bySeverity.critical > 0 || summary.bySeverity.high > 0) {
                console.warn(`[ai-agent] Code analysis: ${summary.bySeverity.critical} critical, ${summary.bySeverity.high} high severity findings`);
                await notifier.notify(
                    summary.bySeverity.critical > 0 ? 'critical' : 'warning',
                    'Code Analysis: Vulnerabilities Found',
                    `Critical: ${summary.bySeverity.critical}, High: ${summary.bySeverity.high}, Medium: ${summary.bySeverity.medium}. Check /code-analysis for details.`,
                    { total: summary.total, proposedFixes: agentState.codeAnalysis.proposedFixes }
                ).catch(() => {});
            }
        } catch (e) {
            console.error('[ai-agent] Code analysis error:', e.message);
        }
    }

    // 10c. Documentation generation (every docGenEvery cycles, starting at cycle 3)
    if (cycleId > 2 && (cycleId - 3) % CONFIG.docGenEvery === 0) {
        try {
            const llmFn = CONFIG.provider !== 'demo' ? llmAnalyze : null;
            await docGenerator.generateAll(llmFn, permGate);
            agentState.docs = docGenerator.getLastRunSummary();
            console.log(`[ai-agent] Documentation: generated for ${agentState.docs.docsGenerated} services`);
        } catch (e) {
            console.error('[ai-agent] Doc generation error:', e.message);
        }
    }

    // 10d. Test generation (every testGenEvery cycles, starting at cycle 4)
    if (cycleId > 3 && (cycleId - 4) % CONFIG.testGenEvery === 0) {
        try {
            const llmFn = CONFIG.provider !== 'demo' ? llmAnalyze : null;
            const { stubsGenerated } = await testGenerator.generateTests(llmFn, permGate);
            agentState.tests = testGenerator.getLastRunSummary();
            if (stubsGenerated > 0) {
                console.log(`[ai-agent] Test generation: ${stubsGenerated} new test stub(s) ready for review`);
            }
        } catch (e) {
            console.error('[ai-agent] Test generation error:', e.message);
        }
    }

    // ── 10. Process approved permissions ────────────────────────────────────
    setState(STATES.ACTING);
    await processApprovedPermissions();

    // ── 11. Auto-acting for new threats / health issues ──────────────────────
    if (CONFIG.autoSecurity && threats.length > 0) {
        for (const threat of threats) {
            try {
                await secMonitor.respondToThreat(threat, permGate, notifier);
            } catch (e) {
                console.error('[ai-agent] Threat response error:', e.message);
            }
        }
    }

    if (CONFIG.autoHeal && healthAssessment.issues.length > 0) {
        try {
            await autoHealer.heal(healthAssessment.issues, permGate, notifier);
        } catch (e) {
            console.error('[ai-agent] Healing error:', e.message);
        }
    }

    // Run optimizations (safe ones auto-applied, others gated).
    if (opportunities.length > 0) {
        try {
            await optimizer.optimize(opportunities, permGate, notifier);
        } catch (e) {
            console.error('[ai-agent] Optimization error:', e.message);
        }
    }

    // ── 12. Emergency mode assessment ───────────────────────────────────────
    const criticalThreats   = threats.filter(t => t.severity === 'critical' || t.severity === 'emergency');
    const criticalIssues    = healthAssessment.issues.filter(i => i.severity === 'critical');
    const shouldBeEmergency = criticalThreats.length > 0 || criticalIssues.length >= 2;

    if (shouldBeEmergency && !agentState.emergencyMode) {
        enterEmergencyMode(criticalThreats, criticalIssues);
    } else if (!shouldBeEmergency && agentState.emergencyMode) {
        exitEmergencyMode();
    }

    // ── 13. Cycle summary notification ──────────────────────────────────────
    setState(STATES.NOTIFYING);
    const hasIssues = threats.length > 0 || healthAssessment.issues.length > 0;

    if (CONFIG.notifyEvery || (hasIssues && CONFIG.emergencyNotify)) {
        const level = agentState.emergencyMode ? 'emergency'
            : (criticalThreats.length > 0 || criticalIssues.length > 0 ? 'critical' : 'warning');
        await notifier.notify(
            hasIssues ? level : 'info',
            `AI Agent Cycle #${cycleId} Summary`,
            buildCycleSummary(threats, healthAssessment, opportunities, remediations),
            { healthScore: healthAssessment.score, threats: threats.length, issues: healthAssessment.issues.length }
        ).catch(() => {});
    }

    // ── 14. Persist state ───────────────────────────────────────────────────
    agentState.lastCycle   = new Date().toISOString();
    agentState.lastCycleMs = Date.now() - cycleStart;
    setState(STATES.IDLE);
    saveAgentState();

    console.log(
        `[ai-agent] ── Cycle ${cycleId} done in ${agentState.lastCycleMs}ms ` +
        `(score=${healthAssessment.score}, threats=${threats.length}) ──`
    );
}

// ---------------------------------------------------------------------------
// Approved permissions processor
// ---------------------------------------------------------------------------

async function processApprovedPermissions() {
    const pending = permGate.listPending();
    // listPending() already calls _expirePending() internally — no extra action needed.

    // Check history for newly approved items we haven't executed yet.
    // We use a local executed-set stored in state file.
    const executedFile = path.join(AI_STATE_DIR, 'executed-permissions.json');
    let executed = new Set();
    if (fs.existsSync(executedFile)) {
        try { executed = new Set(JSON.parse(fs.readFileSync(executedFile, 'utf8'))); } catch (_) {}
    }

    const history = permGate.getHistory();
    const toExecute = history.filter(r =>
        r.status === 'approved' && !executed.has(r.id)
    );

    for (const record of toExecute) {
        executed.add(record.id);
        console.log(`[ai-agent] Executing approved action: ${record.action} (id=${record.id})`);
        try {
            let result;
            if (/block_ip|emergency_shutdown|rate_limit/.test(record.action)) {
                result = await secMonitor.executeApprovedAction(record);
            } else if (/restart|stop|rollback|scale/.test(record.action)) {
                result = await autoHealer.executeApprovedAction(record);
            } else if (/optimize/.test(record.action)) {
                result = await optimizer.executeApprovedAction(record);
            } else if (record.action === 'apply_code_fix') {
                result = await codeAnalyzer.executeApprovedFix(record);
            } else if (record.action === 'write_generated_docs') {
                result = await docGenerator.executeApprovedDocWrite(record);
            } else if (record.action === 'write_generated_tests') {
                result = await testGenerator.executeApprovedTestWrite(record);
            } else {
                result = { action: record.action, status: 'unhandled' };
            }
            console.log(`[ai-agent] Action result:`, JSON.stringify(result));
        } catch (e) {
            console.error(`[ai-agent] Action execution error (${record.action}):`, e.message);
        }
    }

    // Persist executed set.
    try {
        fs.writeFileSync(executedFile, JSON.stringify([...executed], null, 2), 'utf8');
    } catch (_) {}
}

// ---------------------------------------------------------------------------
// Emergency mode
// ---------------------------------------------------------------------------

function enterEmergencyMode(criticalThreats, criticalIssues) {
    agentState.emergencyMode = true;
    console.error('\n[ai-agent] ⚠️  ENTERING EMERGENCY MODE ⚠️');
    notifier.notify(
        'emergency',
        'AI Agent: EMERGENCY MODE ACTIVATED',
        `Critical threats: ${criticalThreats.length}, Critical issues: ${criticalIssues.length}. Cycle interval reduced to 10s.`,
        {}
    ).catch(() => {});
}

function exitEmergencyMode() {
    agentState.emergencyMode = false;
    console.log('[ai-agent] Emergency mode cleared — returning to normal monitoring.');
    notifier.notify('info', 'Emergency Mode Cleared', 'All critical threats resolved.', {}).catch(() => {});
}

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

function setState(s) {
    agentState.state = s;
}

function saveAgentState() {
    const stateFile = path.join(AI_STATE_DIR, 'agent-state.json');
    try {
        const snapshot = {
            ...agentState,
            pendingPermissions: permGate.listPending().length,
        };
        fs.writeFileSync(stateFile, JSON.stringify(snapshot, null, 2), 'utf8');
    } catch (_) {}
}

// ---------------------------------------------------------------------------
// Metrics snapshot builder
// ---------------------------------------------------------------------------

/**
 * Convert raw MetricsCollector data to the snapshot format used by the agent.
 * @param {object[]} raw
 * @returns {object}
 */
function buildMetricsSnapshot(raw) {
    if (!Array.isArray(raw) || raw.length === 0) return { services: [] };

    const SERVICES = [
        'api-gateway', 'user-service', 'content-service', 'media-service',
        'messaging-service', 'collaboration-service', 'streaming-service',
        'shop-service', 'security-service',
    ];

    const svcMap = {};
    for (const svc of SERVICES) svcMap[svc] = { name: svc };

    for (const m of raw) {
        if (!m.service || !svcMap[m.service]) continue;
        const s = svcMap[m.service];
        if (m.category === 'cpu')    s.cpu    = m.value;
        if (m.category === 'memory') s.memory = m.value;
        if (m.category === 'errors') s.errorRatePct = m.value;
        if (m.category === 'latency') s.latencyMs = m.value;
        s.restarts  = s.restarts || m.tags && m.tags.restarts || 0;
        s.status    = m.tags && m.tags.status || 'unknown';
    }

    return { services: Object.values(svcMap) };
}

// ---------------------------------------------------------------------------
// Narrative builders
// ---------------------------------------------------------------------------

function buildCycleSummary(threats, health, opps, rems) {
    const parts = [];
    parts.push(`Health score: ${health.score}/100`);
    if (threats.length)        parts.push(`${threats.length} security threat(s)`);
    if (health.issues.length)  parts.push(`${health.issues.length} health issue(s)`);
    if (opps.length)           parts.push(`${opps.length} optimisation opportunity(ies)`);
    if (rems && rems.length)   parts.push(`${rems.length} remediation suggestion(s)`);
    return parts.join(' | ');
}

function buildLLMPrompt(threats, issues, opps, rems) {
    return [
        'Analyse the following platform telemetry and provide a concise (3-sentence) prioritised summary with the most urgent action:',
        '',
        `SECURITY THREATS: ${JSON.stringify(threats.slice(0, 3))}`,
        `HEALTH ISSUES: ${JSON.stringify(issues.slice(0, 3))}`,
        `OPTIMISATION OPPORTUNITIES: ${JSON.stringify(opps.slice(0, 2))}`,
        `REMEDIATIONS SUGGESTED: ${JSON.stringify((rems || []).slice(0, 2))}`,
    ].join('\n');
}

// ---------------------------------------------------------------------------
// HTTP status/control server
// ---------------------------------------------------------------------------

/**
 * Verify the shared-secret Bearer token when AI_STATUS_TOKEN is configured.
 * Returns true if the request is authorized, false otherwise.
 * /health is always public so liveness probes work without credentials.
 * @param {http.IncomingMessage} req
 * @param {string} pathname
 * @returns {boolean}
 */
function isAuthorized(req, pathname) {
    if (!CONFIG.statusToken) return true; // auth disabled — localhost-only recommended
    if (pathname === '/health') return true; // always public
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    return token === CONFIG.statusToken;
}

function startStatusServer() {
    const server = http.createServer((req, res) => {
        const u = new URL(req.url, `http://localhost:${CONFIG.statusPort}`);
        const pathname = u.pathname;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Powered-By', 'Milonexa-AI-Agent');

        // ── Auth guard ───────────────────────────────────────────────────────
        if (!isAuthorized(req, pathname)) {
            res.writeHead(401);
            res.end(JSON.stringify({ error: 'Unauthorized: provide a valid Bearer token in Authorization header' }));
            return;
        }

        // ── GET /health ──────────────────────────────────────────────────────
        if (req.method === 'GET' && pathname === '/health') {
            res.writeHead(200);
            res.end(JSON.stringify({
                status:        'running',
                uptime:        process.uptime(),
                cycles:        agentState.cycles,
                lastCycle:     agentState.lastCycle,
                currentState:  agentState.state,
                emergencyMode: agentState.emergencyMode,
            }));
            return;
        }

        // ── GET /status ──────────────────────────────────────────────────────
        if (req.method === 'GET' && pathname === '/status') {
            res.writeHead(200);
            res.end(JSON.stringify({
                ...agentState,
                pendingPermissions: permGate.listPending(),
                config: {
                    provider:     CONFIG.provider,
                    cycleSeconds: CONFIG.cycleSeconds,
                    autoHeal:     CONFIG.autoHeal,
                    autoSecurity: CONFIG.autoSecurity,
                },
            }, null, 2));
            return;
        }

        // ── GET /permissions ─────────────────────────────────────────────────
        if (req.method === 'GET' && pathname === '/permissions') {
            res.writeHead(200);
            res.end(JSON.stringify(permGate.listPending(), null, 2));
            return;
        }

        // ── POST /permissions/:id/approve ────────────────────────────────────
        const approveMatch = pathname.match(/^\/permissions\/([^/]+)\/approve$/);
        if (req.method === 'POST' && approveMatch) {
            const id = approveMatch[1];
            permGate.approvePermission(id, 'http-api').then(ok => {
                res.writeHead(ok ? 200 : 404);
                res.end(JSON.stringify({ id, approved: ok }));
            }).catch(e => {
                res.writeHead(500);
                res.end(JSON.stringify({ error: e.message }));
            });
            return;
        }

        // ── POST /permissions/:id/deny ───────────────────────────────────────
        const denyMatch = pathname.match(/^\/permissions\/([^/]+)\/deny$/);
        if (req.method === 'POST' && denyMatch) {
            const id = denyMatch[1];
            permGate.denyPermission(id, 'http-api').then(ok => {
                res.writeHead(ok ? 200 : 404);
                res.end(JSON.stringify({ id, denied: ok }));
            }).catch(e => {
                res.writeHead(500);
                res.end(JSON.stringify({ error: e.message }));
            });
            return;
        }

        // ── GET /code-analysis ───────────────────────────────────────────────
        if (req.method === 'GET' && pathname === '/code-analysis') {
            res.writeHead(200);
            res.end(JSON.stringify({
                summary:      codeAnalyzer.getLastRunSummary(),
                findings:     codeAnalyzer.getLastFindings(50),
                proposedFixes: codeAnalyzer.getProposedFixes(20),
            }, null, 2));
            return;
        }

        // ── POST /code-analysis/trigger ──────────────────────────────────────
        if (req.method === 'POST' && pathname === '/code-analysis/trigger') {
            res.writeHead(202);
            res.end(JSON.stringify({ message: 'Code analysis scheduled for next cycle or running now.' }));
            // Trigger asynchronously in background.
            const llmFn = CONFIG.provider !== 'demo' ? llmAnalyze : null;
            codeAnalyzer.analyzeProject(llmFn, permGate)
                .then(r => { agentState.codeAnalysis = codeAnalyzer.getLastRunSummary(); })
                .catch(e => console.error('[ai-agent] Manual code analysis error:', e.message));
            return;
        }

        // ── GET /feedback ────────────────────────────────────────────────────
        if (req.method === 'GET' && pathname === '/feedback') {
            res.writeHead(200);
            res.end(JSON.stringify({
                summary:     feedbackProcessor.getSummary(),
                suggestions: feedbackProcessor.getSuggestions(20),
                recent:      feedbackProcessor.getProcessed(20),
            }, null, 2));
            return;
        }

        // ── POST /feedback ───────────────────────────────────────────────────
        // Accepts a new feedback entry from any source.
        if (req.method === 'POST' && pathname === '/feedback') {
            let body = '';
            req.on('data', c => { body += c; });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const id = feedbackProcessor.ingest({
                        userId:  data.userId || 'anonymous',
                        content: data.content || data.text || '',
                        source:  data.source || 'api',
                        metadata: data.metadata || {},
                    });
                    res.writeHead(201);
                    res.end(JSON.stringify({ id, message: 'Feedback received' }));
                } catch (e) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON body' }));
                }
            });
            return;
        }

        // ── GET /docs ────────────────────────────────────────────────────────
        if (req.method === 'GET' && pathname === '/docs') {
            res.writeHead(200);
            res.end(JSON.stringify({
                summary: docGenerator.getLastRunSummary(),
                docs:    docGenerator.getGeneratedDocs(),
            }, null, 2));
            return;
        }

        // ── POST /docs/trigger ───────────────────────────────────────────────
        if (req.method === 'POST' && pathname === '/docs/trigger') {
            res.writeHead(202);
            res.end(JSON.stringify({ message: 'Documentation generation triggered.' }));
            const llmFn = CONFIG.provider !== 'demo' ? llmAnalyze : null;
            docGenerator.generateAll(llmFn, permGate)
                .then(() => { agentState.docs = docGenerator.getLastRunSummary(); })
                .catch(e => console.error('[ai-agent] Manual doc gen error:', e.message));
            return;
        }

        // ── GET /tests ───────────────────────────────────────────────────────
        if (req.method === 'GET' && pathname === '/tests') {
            res.writeHead(200);
            res.end(JSON.stringify({
                summary: testGenerator.getLastRunSummary(),
                stubs:   testGenerator.getGeneratedStubs(30),
            }, null, 2));
            return;
        }

        // ── POST /tests/trigger ──────────────────────────────────────────────
        if (req.method === 'POST' && pathname === '/tests/trigger') {
            res.writeHead(202);
            res.end(JSON.stringify({ message: 'Test generation triggered.' }));
            const llmFn = CONFIG.provider !== 'demo' ? llmAnalyze : null;
            testGenerator.generateTests(llmFn, permGate)
                .then(() => { agentState.tests = testGenerator.getLastRunSummary(); })
                .catch(e => console.error('[ai-agent] Manual test gen error:', e.message));
            return;
        }

        // ── 404 ──────────────────────────────────────────────────────────────
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found', availableRoutes: [
            'GET  /health',
            'GET  /status',
            'GET  /permissions',
            'POST /permissions/:id/approve',
            'POST /permissions/:id/deny',
            'GET  /code-analysis',
            'POST /code-analysis/trigger',
            'GET  /feedback',
            'POST /feedback',
            'GET  /docs',
            'POST /docs/trigger',
            'GET  /tests',
            'POST /tests/trigger',
        ]}));
    });

    server.on('error', err => {
        console.error(`[ai-agent] Status server error: ${err.message}`);
    });

    server.listen(CONFIG.statusPort, '0.0.0.0', () => {
        console.log(`[ai-agent] Status server listening on port ${CONFIG.statusPort}`);
    });

    return server;
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

let _loopTimer = null;

function scheduleNext() {
    const intervalMs = agentState.emergencyMode
        ? 10_000
        : CONFIG.cycleSeconds * 1000;

    _loopTimer = setTimeout(async () => {
        try {
            await runCycle();
        } catch (err) {
            console.error('[ai-agent] Cycle error:', err.message);
            agentState.errors.push({ at: new Date().toISOString(), message: err.message });
            if (agentState.errors.length > 100) agentState.errors = agentState.errors.slice(-100);
        }
        scheduleNext();
    }, intervalMs);
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown(signal) {
    console.log(`\n[ai-agent] Received ${signal} — shutting down gracefully.`);
    if (_loopTimer) clearTimeout(_loopTimer);
    saveAgentState();
    notifier.notify('info', 'AI Agent Stopped', `Agent shut down (${signal}).`, {}).catch(() => {});
    setTimeout(() => process.exit(0), 1500);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('uncaughtException', err => {
    console.error('[ai-agent] Uncaught exception:', err.message);
    agentState.errors.push({ at: new Date().toISOString(), message: err.message, type: 'uncaught' });
});

process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    console.error('[ai-agent] Unhandled rejection:', msg);
    agentState.errors.push({ at: new Date().toISOString(), message: msg, type: 'unhandledRejection' });
});

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
    printBanner();

    // Warn if auth is disabled on the HTTP control server.
    if (!CONFIG.statusToken) {
        console.warn(
            '[ai-agent] ⚠️  WARNING: AI_STATUS_TOKEN is not set. ' +
            'The HTTP control server is unauthenticated. ' +
            'Ensure the port is firewalled and not publicly reachable, or set AI_STATUS_TOKEN.'
        );
    }

    // Start HTTP status server.
    startStatusServer();

    // Run initial full analysis cycle.
    console.log('[ai-agent] Running initial analysis cycle…');
    try {
        await runCycle();
    } catch (e) {
        console.error('[ai-agent] Initial cycle error:', e.message);
    }

    // Notify admin of startup.
    await notifier.notify(
        'info',
        'AI Admin Agent v2.0 Started',
        `Milonexa AI Admin Agent is now monitoring the platform (provider=${CONFIG.provider}, cycle=${CONFIG.cycleSeconds}s). ` +
        `New capabilities: code analysis (every ${CONFIG.codeAnalysisEvery} cycles), ` +
        `documentation generation (every ${CONFIG.docGenEvery} cycles), ` +
        `test generation (every ${CONFIG.testGenEvery} cycles), ` +
        `feedback processing (every ${CONFIG.feedbackEvery} cycles).`,
        { port: CONFIG.statusPort, autoHeal: CONFIG.autoHeal, autoSecurity: CONFIG.autoSecurity }
    ).catch(() => {});

    // Begin scheduled loop.
    scheduleNext();
}

main().catch(err => {
    console.error('[ai-agent] Fatal startup error:', err);
    process.exit(1);
});
