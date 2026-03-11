/**
 * AI-Assisted Guided Remediation Module (Phase E)
 *
 * Analyzes current alerts, metrics, SLA breaches, and compliance failures to
 * generate actionable remediation suggestions using a rule-based engine.
 * Optionally calls an external LLM API (OpenAI-compatible) when configured.
 *
 * Config in .admin-cli/remediation/config.json
 * Session history in .admin-cli/remediation/sessions.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// ---------------------------------------------------------------------------
// Rule-based remediation knowledge base
// ---------------------------------------------------------------------------

const REMEDIATION_RULES = [
    {
        id: 'high-cpu',
        match: { category: 'cpu', operator: '>', threshold: 80 },
        severity: 'warning',
        title: 'High CPU Utilization Detected',
        steps: [
            'Identify the top CPU-consuming processes: `docker stats` or `kubectl top pods`',
            'Check for infinite loops or runaway processes in recent deployments',
            'Scale up horizontally: `node admin-cli/index.js scale --service api-gateway --replicas 3`',
            'Review recent code changes for CPU-intensive operations',
            'Enable CPU throttling or request limits in Kubernetes',
            'Consider enabling auto-scaling: set HorizontalPodAutoscaler thresholds',
        ],
        references: ['https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/'],
    },
    {
        id: 'high-memory',
        match: { category: 'memory', operator: '>', threshold: 85 },
        severity: 'warning',
        title: 'High Memory Utilization',
        steps: [
            'Identify memory-heavy containers: `docker stats --no-stream`',
            'Check for memory leaks in Node.js services using heap dumps',
            'Restart affected services: `node admin-cli/index.js restart --service <name>`',
            'Increase memory limits in docker-compose.yml or Kubernetes resource limits',
            'Profile heap usage with `node --inspect` and Chrome DevTools',
            'Review recent dependencies for known memory leak issues',
        ],
        references: [],
    },
    {
        id: 'high-error-rate',
        match: { category: 'error_rate', operator: '>', threshold: 5 },
        severity: 'critical',
        title: 'Elevated Error Rate',
        steps: [
            'Immediately review error logs: `node admin-cli/index.js logs --service api-gateway --tail 200`',
            'Identify the most common error types from recent logs',
            'Check database connectivity: run health check on postgres/redis',
            'Verify upstream service dependencies are responding',
            'Consider rolling back recent deployment: `node admin-cli/index.js rollout --strategy undo`',
            'Enable error-budget tracking with SLA monitoring',
            'Trigger PagerDuty incident if error rate exceeds 10%',
        ],
        references: [],
    },
    {
        id: 'sla-breach-imminent',
        match: { type: 'sla', breachRisk: 'high' },
        severity: 'critical',
        title: 'SLA Breach Imminent',
        steps: [
            'Immediately identify which services are contributing to SLA degradation',
            'Scale up affected services to reduce load-induced latency',
            'Notify stakeholders via webhook: `node admin-cli/index.js webhooks fire --event sla_breach`',
            'Activate incident response playbook',
            'Temporarily reduce traffic by enabling rate limiting',
            'Consider activating break-glass override for emergency operations',
        ],
        references: [],
    },
    {
        id: 'compliance-failure',
        match: { type: 'compliance', status: 'failed' },
        severity: 'warning',
        title: 'Compliance Check Failure',
        steps: [
            'Review full compliance report: `node admin-cli/index.js compliance report --format detailed`',
            'Identify failed compliance controls and their descriptions',
            'Apply policy remediation for each failed control',
            'Re-run compliance check after fixes: `node admin-cli/index.js compliance status`',
            'Document exceptions through proper change management process',
            'Schedule compliance review with security team',
        ],
        references: [],
    },
    {
        id: 'pod-crashloop',
        match: { type: 'k8s', reason: 'CrashLoopBackOff' },
        severity: 'critical',
        title: 'Kubernetes Pod CrashLoopBackOff',
        steps: [
            'Check pod logs: `kubectl logs <pod-name> --previous`',
            'Describe pod for events: `kubectl describe pod <pod-name>`',
            'Check resource limits (OOMKilled): `kubectl get events --sort-by=.metadata.creationTimestamp`',
            'Verify environment variables and ConfigMaps are correct',
            'Check liveness/readiness probe configuration',
            'Review image tag for potential version conflict',
            'Scale down to 0 replicas then back up: `kubectl scale deployment <name> --replicas=0`',
        ],
        references: [],
    },
    {
        id: 'disk-full',
        match: { category: 'disk', operator: '>', threshold: 90 },
        severity: 'critical',
        title: 'Disk Space Critical',
        steps: [
            'Identify large files/directories: `du -sh /var/lib/docker/* | sort -rh | head -20`',
            'Clean up Docker system: `docker system prune -af --volumes`',
            'Clean up old log files: check /var/log and application log directories',
            'Archive or delete old backup files if present',
            'Expand storage volume or add additional storage',
            'Set up log rotation if not already configured',
        ],
        references: [],
    },
    {
        id: 'db-connection-pool',
        match: { category: 'database', type: 'connection_pool_exhausted' },
        severity: 'critical',
        title: 'Database Connection Pool Exhausted',
        steps: [
            'Check active connections: `SELECT count(*) FROM pg_stat_activity;`',
            'Kill idle connections: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = \'idle\' AND state_change < NOW() - INTERVAL \'10 minutes\';`',
            'Review connection pool settings in service configuration',
            'Increase max_connections in postgresql.conf',
            'Implement connection pooling with PgBouncer',
            'Restart affected services to release leaked connections',
        ],
        references: [],
    },
];

// ---------------------------------------------------------------------------
// RemediationEngine
// ---------------------------------------------------------------------------

class RemediationEngine {
    constructor(remediationDir) {
        this.remediationDir = remediationDir;
        this.configFile = path.join(remediationDir, 'config.json');
        this.sessionsFile = path.join(remediationDir, 'sessions.json');
        this.ensureDir();
        this.config = this.loadConfig();
        this.sessions = this.loadSessions();
    }

    ensureDir() {
        if (!fs.existsSync(this.remediationDir)) {
            fs.mkdirSync(this.remediationDir, { recursive: true });
        }
    }

    loadConfig() {
        if (fs.existsSync(this.configFile)) {
            try { return JSON.parse(fs.readFileSync(this.configFile, 'utf8')) || {}; } catch (_) { return {}; }
        }
        return {
            llmEnabled: false,
            llmProvider: 'openai',
            llmModel: 'gpt-4o-mini',
            llmApiUrl: 'https://api.openai.com/v1/chat/completions',
            llmApiKey: '',  // Set via OPENAI_API_KEY env var or config
            maxSuggestions: 5,
        };
    }

    loadSessions() {
        if (fs.existsSync(this.sessionsFile)) {
            try { return JSON.parse(fs.readFileSync(this.sessionsFile, 'utf8')) || []; } catch (_) { return []; }
        }
        return [];
    }

    saveConfig() {
        fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2), 'utf8');
    }

    saveSessions() {
        const trimmed = this.sessions.slice(-200);
        fs.writeFileSync(this.sessionsFile, JSON.stringify(trimmed, null, 2), 'utf8');
    }

    /**
     * Configure LLM integration.
     */
    configureLLM(cfg) {
        Object.assign(this.config, cfg);
        this.saveConfig();
    }

    /**
     * Analyze context and return remediation suggestions.
     * @param {object} context  { alerts, metrics, slaStatus, complianceStatus }
     * @returns {Promise<Array>} suggestions
     */
    async analyze(context) {
        const suggestions = [];

        // Rule-based analysis
        const ruleSuggestions = this._applyRules(context);
        suggestions.push(...ruleSuggestions);

        // LLM-based analysis (if configured)
        if (this.config.llmEnabled) {
            try {
                const llmSuggestions = await this._callLLM(context, ruleSuggestions);
                if (llmSuggestions) suggestions.push(llmSuggestions);
            } catch (err) {
                // LLM failure is non-fatal — fall back to rule-based
                suggestions.push({
                    id: 'llm-error',
                    title: 'LLM Analysis Unavailable',
                    source: 'system',
                    severity: 'info',
                    steps: [`LLM API error: ${err.message}`, 'Falling back to rule-based analysis only.'],
                });
            }
        }

        // Record session
        const session = {
            id: Date.now().toString(36),
            ts: new Date().toISOString(),
            context: {
                alertCount: (context.alerts || []).length,
                slaIssues: (context.slaStatus || []).filter(s => s.status !== 'ok').length,
                complianceFailures: (context.complianceStatus || {}).failed || 0,
            },
            suggestionCount: suggestions.length,
        };
        this.sessions.push(session);
        this.saveSessions();

        return suggestions.slice(0, this.config.maxSuggestions || 5);
    }

    /**
     * Apply rule-based analysis.
     */
    _applyRules(context) {
        const matched = [];
        const { alerts = [], metrics = [], slaStatus = [], complianceStatus = {} } = context;

        // Check alerts
        for (const alert of alerts) {
            for (const rule of REMEDIATION_RULES) {
                if (rule.match.type) continue; // Skip type-specific rules in alert context
                if (
                    rule.match.category && alert.category === rule.match.category &&
                    rule.match.operator === '>' && alert.value > rule.match.threshold
                ) {
                    matched.push({
                        id: rule.id,
                        title: rule.title,
                        source: 'rule-engine',
                        severity: rule.severity,
                        trigger: { type: 'alert', alert: alert.name, value: alert.value },
                        steps: rule.steps,
                        references: rule.references || [],
                    });
                    break;
                }
            }
        }

        // Check SLA
        for (const slaItem of slaStatus) {
            if (slaItem.breachRisk && slaItem.breachRisk.risk === 'high') {
                matched.push({
                    id: 'sla-breach-imminent',
                    title: `SLA Breach Imminent: ${slaItem.slo.name}`,
                    source: 'rule-engine',
                    severity: 'critical',
                    trigger: { type: 'sla', sloId: slaItem.slo.id, hoursUntilBreach: slaItem.breachRisk.hoursUntilBreach },
                    steps: REMEDIATION_RULES.find(r => r.id === 'sla-breach-imminent').steps,
                    references: [],
                });
            }
        }

        // Check compliance
        if (complianceStatus && complianceStatus.failed > 0) {
            const compRule = REMEDIATION_RULES.find(r => r.id === 'compliance-failure');
            if (compRule) {
                matched.push({
                    id: compRule.id,
                    title: `${complianceStatus.failed} Compliance Control(s) Failed`,
                    source: 'rule-engine',
                    severity: 'warning',
                    trigger: { type: 'compliance', failed: complianceStatus.failed },
                    steps: compRule.steps,
                    references: compRule.references || [],
                });
            }
        }

        // Deduplicate by id
        const seen = new Set();
        return matched.filter(s => {
            if (seen.has(s.id)) return false;
            seen.add(s.id);
            return true;
        });
    }

    /**
     * Call LLM API for AI-powered suggestions.
     * Supports: ollama (local, default), openai, or any OpenAI-compatible endpoint.
     */
    async _callLLM(context, existingRules) {
        const prompt = this._buildPrompt(context, existingRules);
        const systemPrompt = 'You are an expert DevOps/SRE assistant for Milonexa platform. Provide concise, actionable remediation steps. Format response as JSON with: { "title": "...", "severity": "info|warning|critical", "steps": ["step1", "step2", ...], "summary": "brief description" }';

        // ── Ollama (local LLM — no API key needed) ───────────────────────────
        const useOllama = this.config.llmProvider === 'ollama' ||
            (!this.config.llmProvider && !this.config.llmApiKey &&
             !process.env.OPENAI_API_KEY && !process.env.LLM_API_KEY);

        if (useOllama) {
            const ollamaHost  = this.config.ollamaHost  || process.env.OLLAMA_HOST  || 'localhost';
            const ollamaPort  = this.config.ollamaPort  || process.env.OLLAMA_PORT  || '11434';
            const ollamaModel = this.config.ollamaModel || process.env.OLLAMA_MODEL || 'llama3.2';
            const body = JSON.stringify({
                model: ollamaModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt },
                ],
                stream: false,
                options: { num_predict: 800, temperature: 0.3 },
            });

            const response = await this._post(
                `http://${ollamaHost}:${ollamaPort}/api/chat`,
                body,
                { 'Content-Type': 'application/json' }
            );

            try {
                const parsed = JSON.parse(response.body);
                const content = parsed.message?.content || '';
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const suggestion = JSON.parse(jsonMatch[0]);
                    return {
                        id: 'llm-suggestion',
                        title: suggestion.title || 'AI Remediation Suggestion',
                        source: 'llm-ollama',
                        severity: suggestion.severity || 'info',
                        summary: suggestion.summary || '',
                        steps: suggestion.steps || [],
                        references: [],
                    };
                }
            } catch (_) { /* ignore parse errors */ }
            return null;
        }

        // ── OpenAI-compatible endpoint (external) ────────────────────────────
        const apiKey = this.config.llmApiKey || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || '';
        if (!apiKey) {
            throw new Error('No LLM API key configured. Set OPENAI_API_KEY, or use Ollama (local) by setting AI_PROVIDER=ollama or leaving OPENAI_API_KEY unset.');
        }

        const body = JSON.stringify({
            model: this.config.llmModel || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
            ],
            max_tokens: 800,
            temperature: 0.3,
        });

        const response = await this._post(
            this.config.llmApiUrl || 'https://api.openai.com/v1/chat/completions',
            body,
            {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            }
        );

        try {
            const parsed = JSON.parse(response.body);
            const content = parsed.choices?.[0]?.message?.content || '';
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const suggestion = JSON.parse(jsonMatch[0]);
                return {
                    id: 'llm-suggestion',
                    title: suggestion.title || 'AI Remediation Suggestion',
                    source: 'llm',
                    severity: suggestion.severity || 'info',
                    summary: suggestion.summary || '',
                    steps: suggestion.steps || [],
                    references: [],
                };
            }
        } catch (_) { /* ignore parse errors */ }
        return null;
    }

    _buildPrompt(context, existingRules) {
        const lines = ['Current system state:'];
        const { alerts = [], metrics = [], slaStatus = [], complianceStatus = {} } = context;

        if (alerts.length > 0) {
            lines.push(`- Active alerts: ${alerts.length}`);
            for (const a of alerts.slice(0, 5)) {
                lines.push(`  * [${a.severity || 'warning'}] ${a.name || a.id}: ${a.message || ''}`);
            }
        }

        for (const sla of slaStatus.filter(s => s.status !== 'ok').slice(0, 3)) {
            lines.push(`- SLA ${sla.slo.name}: status=${sla.status}, risk=${sla.breachRisk?.risk || 'unknown'}`);
        }

        if (complianceStatus.failed > 0) {
            lines.push(`- Compliance: ${complianceStatus.failed}/${complianceStatus.total} controls failed`);
        }

        if (existingRules.length > 0) {
            lines.push(`\nRule-based suggestions already identified: ${existingRules.map(r => r.title).join(', ')}`);
            lines.push('Provide additional AI insights not covered by the above.');
        }

        lines.push('\nProvide the most critical remediation suggestion as JSON.');
        return lines.join('\n');
    }

    _post(urlStr, body, headers = {}) {
        return new Promise((resolve, reject) => {
            let parsedUrl;
            try { parsedUrl = new URL(urlStr); } catch (_) {
                return reject(new Error(`Invalid URL: ${urlStr}`));
            }

            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + (parsedUrl.search || ''),
                method: 'POST',
                headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
                timeout: 30000,
            };

            const lib = parsedUrl.protocol === 'https:' ? https : http;
            const req = lib.request(options, (res) => {
                let data = '';
                res.on('data', d => { data += d; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ statusCode: res.statusCode, body: data });
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
                    }
                });
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('LLM API timeout')); });
            req.write(body);
            req.end();
        });
    }

    /**
     * Get all available rules.
     */
    getRules() {
        return REMEDIATION_RULES;
    }

    /**
     * Get session history.
     */
    getHistory(limit = 20) {
        return this.sessions.slice(-limit).reverse();
    }
}

module.exports = { RemediationEngine, REMEDIATION_RULES };
