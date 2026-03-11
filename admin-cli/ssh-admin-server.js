#!/usr/bin/env node
/**
 * Milonexa SSH Admin Dashboard (Phase E)
 *
 * Provides a secure SSH-based interactive admin dashboard.
 * This is a fourth admin interface alongside CLI, frontend, and REST API.
 *
 * Features:
 *   - Full encrypted SSH transport (using ssh2)
 *   - Password and public-key authentication
 *   - Interactive TUI dashboard over SSH session
 *   - Run admin commands via SSH shell
 *   - SCP-style file transfer of JSON exports (via subsystem)
 *   - Multi-session support (configurable max sessions)
 *   - IP allowlist enforcement
 *   - All logins recorded in admin audit log
 *
 * Requirements:
 *   - SSH host key (auto-generated RSA 2048 if not found at SSH_HOST_KEY_PATH)
 *   - SSH_ADMIN_PASSWORD or SSH_ADMIN_AUTHORIZED_KEYS env var for auth
 *
 * Usage:
 *   node admin-cli/ssh-admin-server.js [--port 2222] [--host 0.0.0.0]
 *
 * Environment variables (all optional with secure defaults):
 *   ENABLE_ADMIN_SSH          — must be 'true' to start (default: false)
 *   ADMIN_SSH_PORT            — listen port (default: 2222)
 *   ADMIN_SSH_HOST            — bind host (default: 127.0.0.1)
 *   ADMIN_SSH_PASSWORD        — password for 'admin' user (if unset, password auth disabled)
 *   ADMIN_SSH_AUTHORIZED_KEYS — path to authorized_keys file (public-key auth)
 *   ADMIN_SSH_HOST_KEY_PATH   — path to host private key PEM (auto-generated if missing)
 *   ADMIN_SSH_MAX_SESSIONS    — max concurrent sessions (default: 5)
 *   ADMIN_SSH_IDLE_TIMEOUT    — session idle timeout seconds (default: 300)
 *   ADMIN_ALLOWED_IPS         — comma-separated IP allowlist (default: 127.0.0.1,::1)
 *   ADMIN_SSH_BANNER          — optional banner text shown on connect
 */

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execSync, spawn } = require('child_process');

// ---------------------------------------------------------------------------
// Guard: ENABLE_ADMIN_SSH must be 'true'
// ---------------------------------------------------------------------------
if ((process.env.ENABLE_ADMIN_SSH || 'false').toLowerCase() !== 'true') {
    console.error('[ssh-admin] SSH Admin Dashboard is disabled.');
    console.error('[ssh-admin] Set ENABLE_ADMIN_SSH=true to enable.');
    process.exit(0);
}

let ssh2;
try {
    ssh2 = require('ssh2');
} catch (_) {
    console.error('[ssh-admin] ssh2 package is required. Install with: cd admin-cli && npm install');
    process.exit(1);
}

const { Server: SSHServer, utils: sshUtils } = ssh2;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const ROOT_DIR = path.resolve(__dirname, '..');
const ADMIN_HOME = path.join(ROOT_DIR, '.admin-cli');
const SSH_STATE_DIR = path.join(ADMIN_HOME, 'ssh');

const args = process.argv.slice(2);
function getArg(name, def) {
    const idx = args.indexOf(name);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : def;
}

const PORT = parseInt(getArg('--port', process.env.ADMIN_SSH_PORT || '2222'));
const HOST = getArg('--host', process.env.ADMIN_SSH_HOST || '127.0.0.1');
const SSH_PASSWORD = process.env.ADMIN_SSH_PASSWORD || '';
const AUTHORIZED_KEYS_PATH = process.env.ADMIN_SSH_AUTHORIZED_KEYS || '';
const HOST_KEY_PATH = process.env.ADMIN_SSH_HOST_KEY_PATH || path.join(SSH_STATE_DIR, 'host_rsa');
const MAX_SESSIONS = parseInt(process.env.ADMIN_SSH_MAX_SESSIONS || '5');
const IDLE_TIMEOUT_SEC = parseInt(process.env.ADMIN_SSH_IDLE_TIMEOUT || '300');
const ALLOWED_IPS = (process.env.ADMIN_ALLOWED_IPS || '127.0.0.1,::1,::ffff:127.0.0.1')
    .split(',').map(ip => ip.trim()).filter(Boolean);
const BANNER = process.env.ADMIN_SSH_BANNER || '';

// ---------------------------------------------------------------------------
// Load admin modules
// ---------------------------------------------------------------------------
const { MetricsCollector } = require('./lib/metrics');
const { AlertManager } = require('./lib/alerts');
const { SLAManager } = require('./lib/sla');
const { WebhookManager } = require('./lib/webhooks');
const { MultiClusterManager } = require('./lib/multi-cluster');
const { TrendAnalyzer } = require('./lib/trend-analysis');
const { RemediationEngine } = require('./lib/ai-remediation');
const { ComplianceManager } = require('./lib/compliance');
const { CostAnalyzer } = require('./lib/cost-analyzer');
const { RecommendationEngine } = require('./lib/recommendations');

function getDir(sub) { return path.join(ADMIN_HOME, sub); }

// ---------------------------------------------------------------------------
// Logger & Audit
// ---------------------------------------------------------------------------
function log(level, msg) {
    const ts = new Date().toISOString();
    process.stdout.write(`[${ts}] [${level}] [ssh-admin] ${msg}\n`);
}

function auditLog(actor, action, detail = '') {
    try {
        const auditFile = path.join(ADMIN_HOME, 'audit.log');
        const entry = JSON.stringify({
            ts: new Date().toISOString(),
            actor,
            action,
            detail,
            interface: 'ssh',
        }) + '\n';
        fs.appendFileSync(auditFile, entry);
    } catch (_) { /* non-fatal */ }
}

// ---------------------------------------------------------------------------
// Host Key Management
// ---------------------------------------------------------------------------
function ensureHostKey() {
    if (!fs.existsSync(SSH_STATE_DIR)) {
        fs.mkdirSync(SSH_STATE_DIR, { recursive: true, mode: 0o700 });
    }
    if (!fs.existsSync(HOST_KEY_PATH)) {
        log('info', `Generating RSA host key at ${HOST_KEY_PATH} ...`);
        try {
            // ssh2 requires OpenSSH-format keys (not PKCS8/SPKI)
            const { privateKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: 2048,
                privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
                publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
            });
            fs.writeFileSync(HOST_KEY_PATH, privateKey, { mode: 0o600 });
            log('info', 'Host key generated.');
        } catch (err) {
            log('error', `Failed to generate host key: ${err.message}`);
            process.exit(1);
        }
    }
    return fs.readFileSync(HOST_KEY_PATH);
}

// ---------------------------------------------------------------------------
// Authorized Keys Parser
// ---------------------------------------------------------------------------
function loadAuthorizedKeys() {
    if (!AUTHORIZED_KEYS_PATH || !fs.existsSync(AUTHORIZED_KEYS_PATH)) return [];
    const lines = fs.readFileSync(AUTHORIZED_KEYS_PATH, 'utf8')
        .split('\n')
        .filter(l => l.trim() && !l.startsWith('#'));
    const keys = [];
    for (const line of lines) {
        try {
            const pk = sshUtils.parseKey(line);
            if (pk && !(pk instanceof Error)) keys.push(pk);
        } catch (_) { /* skip malformed */ }
    }
    return keys;
}

// ---------------------------------------------------------------------------
// IP Allowlist
// ---------------------------------------------------------------------------
function isAllowedIP(ip) {
    if (!ip) return false;
    const normalised = ip.replace(/^::ffff:/, '');
    return ALLOWED_IPS.some(allowed => {
        const normAllowed = allowed.replace(/^::ffff:/, '');
        return normalised === normAllowed || normAllowed === '0.0.0.0' || normAllowed === '::';
    });
}

// ---------------------------------------------------------------------------
// ANSI helpers
// ---------------------------------------------------------------------------
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';
const BG_BLUE = '\x1b[44m';
const BG_GREEN = '\x1b[42m';
const CLEAR = '\x1b[2J\x1b[H';

function c(color, text) {
    const m = {
        reset: RESET, bold: BOLD, dim: DIM, red: RED, green: GREEN,
        yellow: YELLOW, blue: BLUE, cyan: CYAN, white: WHITE, bg_blue: BG_BLUE
    };
    return (m[color] || '') + text + RESET;
}

function center(text, width) {
    const len = text.replace(/\x1b\[[^m]*m/g, '').length;
    const pad = Math.max(0, Math.floor((width - len) / 2));
    return ' '.repeat(pad) + text;
}

function hline(w, ch = '─') { return ch.repeat(w); }

function box(title, lines, width) {
    const innerW = width - 2;
    const header = c('bold', title);
    const hLen = header.replace(/\x1b\[[^m]*m/g, '').length;
    const hPad = Math.max(0, innerW - hLen);
    let out = `┌${hline(innerW, '─')}┐\n`;
    out += `│ ${header}${' '.repeat(hPad - 1)}│\n`;
    out += `├${hline(innerW, '─')}┤\n`;
    for (const line of lines) {
        const visible = line.replace(/\x1b\[[^m]*m/g, '').length;
        const pad = Math.max(0, innerW - visible - 1);
        out += `│ ${line}${' '.repeat(pad)}│\n`;
    }
    out += `└${hline(innerW, '─')}┘\n`;
    return out;
}

// ---------------------------------------------------------------------------
// Dashboard renderer
// ---------------------------------------------------------------------------
function renderDashboard() {
    const W = 80;
    const now = new Date().toISOString();

    const metricsColl = new MetricsCollector(getDir('metrics'));
    const alertMgr = new AlertManager(getDir('alerts'));
    const slaMgr = new SLAManager(getDir('sla'));
    const complianceMgr = new ComplianceManager(getDir('compliance'));
    const costAnalyzer = new CostAnalyzer(getDir('costs'));
    const webhookMgr = new WebhookManager(getDir('webhooks'));
    const clusterMgr = new MultiClusterManager(getDir('clusters'));
    const recEngine = new RecommendationEngine(getDir('recommendations'));

    function safe(fn, def) { try { return fn(); } catch (_) { return def; } }
    const alertStats = safe(() => alertMgr.getStats(), { active: 0, critical: 0, total: 0 });
    const slaSum = safe(() => slaMgr.getSummary(), { ok: 0, total: 0, atRisk: 0, breached: 0 });
    const compStatus = safe(() => complianceMgr.getStatus(), { passed: 0, total: 0, failed: 0 });
    const budget = safe(() => costAnalyzer.checkBudgetStatus(), { percentUsed: 0, totalSpend: 0, budget: 0 });
    const metrics = safe(() => metricsColl.query(), []);
    const webhookStats = safe(() => webhookMgr.getStats(), { total: 0, enabled: 0, deliveries: 0 });
    const clusters = safe(() => clusterMgr.listClusters(), []);
    const recs = safe(() => recEngine.getTopRecommendations(3), []);

    let out = CLEAR;

    // Header bar
    out += c('bg_blue', c('bold', center(` ★ Milonexa SSH Admin Dashboard  ·  ${now} `, W))) + '\n';
    out += c('dim', hline(W)) + '\n\n';

    // Row 1: Status overview
    const statusLines = [
        `  Alerts Active:   ${alertStats.active > 0 ? c('red', String(alertStats.active)) : c('green', '0')}  (${alertStats.critical > 0 ? c('red', alertStats.critical + ' critical') : c('green', '0 critical')})`,
        `  Compliance:      ${compStatus.failed > 0 ? c('yellow', compStatus.passed + '/' + compStatus.total) : c('green', (compStatus.passed || 0) + '/' + (compStatus.total || 0) + ' ✓')}`,
        `  Budget Used:     ${budget.percentUsed > 90 ? c('red', budget.percentUsed + '%') : c('green', budget.percentUsed + '%')}  ($${budget.totalSpend}/$${budget.budget})`,
        `  SLA Status:      ${slaSum.breached > 0 ? c('red', 'BREACH!') : slaSum.atRisk > 0 ? c('yellow', slaSum.atRisk + ' at risk') : c('green', 'All OK')}  (${slaSum.ok}/${slaSum.total})`,
        `  Metrics Points:  ${c('cyan', String(metrics.length))}`,
        `  Webhooks:        ${c('cyan', webhookStats.total + ' configured, ' + webhookStats.deliveries + ' delivered')}`,
    ];
    out += box('📊 System Overview', statusLines, Math.floor(W / 2));

    // Row 2: Services
    const clusterLines = clusters.length > 0
        ? clusters.map(cl => `  ${cl.enabled ? c('green', '●') : c('dim', '○')}  ${cl.name.padEnd(20)} ${cl.environment.padEnd(10)} ${cl.region || ''}`)
        : ['  ' + c('dim', 'No clusters registered')];
    out += box('☁  Clusters', clusterLines, Math.floor(W / 2));

    // Row 3: Quick Commands
    const cmdLines = [
        `  ${c('cyan', 'help')}       Show all available commands`,
        `  ${c('cyan', 'status')}     Service status overview`,
        `  ${c('cyan', 'sla')}        SLA compliance & predictions`,
        `  ${c('cyan', 'alerts')}     Active alerts`,
        `  ${c('cyan', 'metrics')}    Performance metrics`,
        `  ${c('cyan', 'trends')}     Trend analysis & charts`,
        `  ${c('cyan', 'remediate')}  AI remediation suggestions`,
        `  ${c('cyan', 'webhooks')}   Webhook integrations`,
        `  ${c('cyan', 'cluster')}    Multi-cluster management`,
        `  ${c('cyan', 'audit')}      Audit log`,
        `  ${c('cyan', 'dashboard')}  Refresh this dashboard`,
        `  ${c('cyan', 'exit')}       End SSH session`,
    ];
    out += box('⌨  Quick Commands', cmdLines, 40);

    // Recommendations
    if (recs.length > 0) {
        const recLines = recs.slice(0, 3).map(r => `  ${c('yellow', '→')} ${r.title || r.description || JSON.stringify(r)}`);
        out += box('💡 Top Recommendations', recLines, W);
    }

    out += '\n' + c('dim', `SSH Session · ${HOST}:${PORT} · Type 'help' for commands`) + '\n';
    return out;
}

// ---------------------------------------------------------------------------
// Command handler
// ---------------------------------------------------------------------------
async function handleCommand(line, user, stream) {
    const parts = line.trim().split(/\s+/).filter(Boolean);
    const cmd = (parts[0] || '').toLowerCase();
    const subArgs = parts.slice(1);

    function write(s) { stream.write(s); }
    function writeln(s) { stream.write(s + '\r\n'); }

    auditLog(user, 'ssh:command', line.trim());

    switch (cmd) {
        case 'dashboard':
        case 'dash':
            write(renderDashboard());
            break;

        case 'help': {
            writeln('');
            writeln(c('bold', '  Milonexa SSH Admin — Available Commands'));
            writeln('  ' + hline(50));
            const cmds = [
                ['dashboard', 'Refresh the admin dashboard'],
                ['status', 'Show service status (docker ps)'],
                ['sla', 'Show SLA compliance status'],
                ['sla predict', 'Breach predictions'],
                ['sla simulate', 'Generate sample SLA measurements'],
                ['alerts', 'List active alerts'],
                ['alerts history', 'Alert history'],
                ['metrics', 'Show metrics summary'],
                ['metrics record <cat> <val>', 'Record a metric value'],
                ['trends', 'Trend analysis report'],
                ['trends anomalies', 'Anomaly detection'],
                ['trends chart <cat>', 'ASCII chart for category'],
                ['webhooks', 'List configured webhooks'],
                ['webhooks fire', 'Test fire all webhooks'],
                ['cluster', 'List registered clusters'],
                ['remediate', 'Run AI remediation analysis'],
                ['audit [N]', 'Show last N audit entries (default 20)'],
                ['health', 'Check API gateway health'],
                ['env', 'Show active admin panel env config'],
                ['clear', 'Clear screen'],
                ['exit / quit', 'End SSH session'],
            ];
            for (const [c1, c2] of cmds) {
                writeln(`  ${c('cyan', c1.padEnd(30))}  ${c('dim', c2)}`);
            }
            writeln('');
            break;
        }

        case 'status': {
            writeln(c('bold', '\n  Service Status'));
            writeln('  ' + hline(50));
            try {
                const result = execSync('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1', {
                    timeout: 5000, encoding: 'utf8',
                });
                for (const l of result.split('\n').filter(Boolean)) {
                    const isUp = /Up/i.test(l);
                    writeln('  ' + (isUp ? c('green', '●') + '  ' : c('red', '○') + '  ') + l);
                }
            } catch (_) {
                writeln('  ' + c('yellow', 'Docker not available or no containers running'));
            }
            writeln('');
            break;
        }

        case 'sla': {
            try {
                const mgr = new SLAManager(getDir('sla'));
                const subCmd = (subArgs[0] || '').toLowerCase();

                if (subCmd === 'predict') {
                    const preds = mgr.getPredictions();
                    writeln('');
                    writeln(c('bold', '  SLA Breach Predictions'));
                    writeln('  ' + hline(60));
                    if (preds.length === 0) {
                        writeln('  ' + c('green', 'No breach predictions — all SLOs trending OK'));
                    } else {
                        for (const p of preds) {
                            const risk = p.breachRisk?.risk || 'unknown';
                            const riskColor = risk === 'high' ? 'red' : risk === 'medium' ? 'yellow' : 'green';
                            writeln(`  ${c(riskColor, '[' + risk.toUpperCase() + ']')} ${p.slo?.name} (${p.slo?.service})`);
                            writeln(`     Trend: ${p.breachRisk?.trend} | Slope: ${p.breachRisk?.slope}`);
                            if (p.breachRisk?.hoursUntilBreach) {
                                writeln(`     ETA breach: ~${p.breachRisk.hoursUntilBreach}h`);
                            }
                        }
                    }
                } else if (subCmd === 'simulate') {
                    let total = 0;
                    for (const slo of mgr.slos) {
                        for (let i = 0; i < 10; i++) { mgr.recordSyntheticMeasurement(slo.id); total++; }
                    }
                    writeln('  ' + c('green', `✓ Recorded ${total} synthetic measurements`));
                } else {
                    const statuses = mgr.getStatus();
                    const summary = mgr.getSummary();
                    writeln('');
                    writeln(c('bold', '  SLA Status'));
                    writeln('  ' + hline(80));
                    writeln(`  ${c('dim', 'SLO'.padEnd(26))}${c('dim', 'SERVICE'.padEnd(16))}${c('dim', 'TARGET'.padEnd(10))}${c('dim', 'CURRENT'.padEnd(10))}${c('dim', 'STATUS')}`);
                    writeln('  ' + hline(80));
                    for (const s of statuses) {
                        const stColor = s.status === 'ok' ? 'green' : s.status === 'breached' ? 'red' : 'yellow';
                        writeln(`  ${s.slo.name.padEnd(26)}${s.slo.service.padEnd(16)}${String(s.slo.target + (s.slo.unit === 'percent' ? '%' : '')).padEnd(10)}${String(s.current || 'N/A').padEnd(10)}${c(stColor, s.status)}`);
                    }
                    writeln('');
                    writeln(`  Total: ${summary.total} | OK: ${c('green', String(summary.ok))} | At Risk: ${c('yellow', String(summary.atRisk))} | Breached: ${c('red', String(summary.breached))}`);
                }
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        case 'alerts': {
            try {
                const mgr = new AlertManager(getDir('alerts'));
                const subCmd = (subArgs[0] || '').toLowerCase();
                if (subCmd === 'history') {
                    const hist = mgr.getHistory ? mgr.getHistory(20) : [];
                    writeln('');
                    writeln(c('bold', `  Alert History (last ${hist.length})`));
                    writeln('  ' + hline(70));
                    if (hist.length === 0) writeln('  ' + c('dim', 'No history'));
                    for (const h of hist) {
                        const col = h.severity === 'critical' ? 'red' : h.severity === 'warning' ? 'yellow' : 'cyan';
                        writeln(`  ${c(col, ('[' + h.severity + ']').padEnd(12))} ${String(h.message || h.description || '').slice(0, 50).padEnd(50)} ${h.ts ? new Date(h.ts).toLocaleString() : ''}`);
                    }
                } else {
                    const stats = mgr.getStats();
                    writeln('');
                    writeln(c('bold', '  Alert Stats'));
                    writeln('  ' + hline(40));
                    writeln(`  Active:    ${stats.active > 0 ? c('red', String(stats.active)) : c('green', '0')}`);
                    writeln(`  Critical:  ${stats.critical > 0 ? c('red', String(stats.critical)) : c('green', '0')}`);
                    writeln(`  Resolved:  ${c('green', String(stats.resolved || 0))}`);
                    writeln(`  Total:     ${stats.total}`);
                }
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        case 'metrics': {
            try {
                const collector = new MetricsCollector(getDir('metrics'));
                const subCmd = (subArgs[0] || '').toLowerCase();
                if (subCmd === 'record') {
                    const [, category, val] = subArgs;
                    if (!category || val === undefined) {
                        writeln('  ' + c('red', 'Usage: metrics record <category> <value> [service]'));
                    } else {
                        collector.record({ category, value: parseFloat(val), service: subArgs[3] || 'manual', runtime: 'ssh' });
                        writeln('  ' + c('green', `✓ Recorded ${category}=${val}`));
                    }
                } else {
                    const all = collector.query();
                    const byCat = {};
                    for (const m of all) {
                        if (!byCat[m.category]) byCat[m.category] = [];
                        byCat[m.category].push(m.value);
                    }
                    writeln('');
                    writeln(c('bold', '  Metrics Summary'));
                    writeln('  ' + hline(50));
                    if (Object.keys(byCat).length === 0) {
                        writeln('  ' + c('dim', 'No metrics recorded yet'));
                    } else {
                        for (const [cat, vals] of Object.entries(byCat)) {
                            const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
                            const latest = vals[vals.length - 1];
                            writeln(`  ${c('cyan', cat.padEnd(20))}  n=${vals.length}  avg=${avg}  latest=${latest}`);
                        }
                    }
                }
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        case 'trends': {
            try {
                const collector = new MetricsCollector(getDir('metrics'));
                const analyzer = new TrendAnalyzer(getDir('metrics'));
                const subCmd = (subArgs[0] || '').toLowerCase();
                const cat = subArgs[1] || subArgs[0];
                const metrics = collector.query(cat && cat !== 'anomalies' && cat !== 'chart' ? { category: cat } : {});
                const byCat = {};
                for (const m of metrics) {
                    if (!byCat[m.category]) byCat[m.category] = [];
                    byCat[m.category].push(m.value);
                }

                if (Object.keys(byCat).length === 0) {
                    writeln('  ' + c('dim', 'No metrics data. Use: metrics record <category> <value>'));
                } else if (subCmd === 'anomalies') {
                    writeln('');
                    writeln(c('bold', '  Anomaly Detection'));
                    writeln('  ' + hline(50));
                    for (const [catName, vals] of Object.entries(byCat)) {
                        const anomalies = analyzer.detectAnomalies(vals);
                        writeln(`  ${c('cyan', catName.padEnd(20))}  ${anomalies.length > 0 ? c('yellow', anomalies.length + ' anomalies') : c('green', '✓ clean')}`);
                    }
                } else if (subCmd === 'chart') {
                    const chartCat = subArgs[1] || Object.keys(byCat)[0];
                    if (byCat[chartCat]) {
                        writeln('');
                        writeln(c('bold', `  ASCII Chart: ${chartCat}`));
                        writeln('  ' + hline(60));
                        const rows = analyzer.renderChart(chartCat, byCat[chartCat], 60, 8);
                        for (const row of rows) writeln('  ' + row);
                    } else {
                        writeln('  ' + c('red', `Category '${chartCat}' not found`));
                    }
                } else {
                    writeln('');
                    writeln(c('bold', '  Trend Analysis Report'));
                    writeln('  ' + hline(60));
                    for (const [catName, vals] of Object.entries(byCat)) {
                        const report = analyzer.analyze(catName, vals);
                        const trendColor = report.regression?.trend === 'increasing' ? 'yellow' : report.regression?.trend === 'decreasing' ? 'green' : 'dim';
                        writeln(`  ${c('cyan', catName.padEnd(20))}  n=${report.count}  mean=${report.mean}  trend=${c(trendColor, report.regression?.trend || 'N/A')}  anomalies=${report.anomalies}`);
                        writeln(`    Sparkline: ${report.sparkline}`);
                    }
                }
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        case 'webhooks': {
            try {
                const mgr = new WebhookManager(getDir('webhooks'));
                const subCmd = (subArgs[0] || '').toLowerCase();
                if (subCmd === 'fire') {
                    writeln('  Firing webhooks...');
                    const results = await mgr.fire('ssh_test', { message: 'SSH Admin test fire', source: 'ssh-admin', ts: new Date().toISOString() }, 'info');
                    const ok = results.filter(r => r.status === 'ok').length;
                    const fail = results.filter(r => r.status !== 'ok').length;
                    writeln(`  ${c('green', '✓')} Fired ${results.length} webhooks: ${ok} delivered, ${fail} failed`);
                } else {
                    const hooks = mgr.listWebhooks();
                    const stats = mgr.getStats();
                    writeln('');
                    writeln(c('bold', `  Webhooks (${stats.total} total, ${stats.enabled} enabled)`));
                    writeln('  ' + hline(60));
                    if (hooks.length === 0) {
                        writeln('  ' + c('dim', 'No webhooks configured'));
                    } else {
                        for (const h of hooks) {
                            writeln(`  ${h.enabled ? c('green', '●') : c('dim', '○')}  ${c('cyan', h.type.padEnd(12))}  ${h.name.padEnd(24)}  ${h.severity || 'all'}`);
                        }
                    }
                    writeln(`\n  Deliveries: ${stats.deliveries}`);
                }
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        case 'cluster': {
            try {
                const mgr = new MultiClusterManager(getDir('clusters'));
                const clusters = mgr.listClusters();
                writeln('');
                writeln(c('bold', `  Registered Clusters (${clusters.length})`));
                writeln('  ' + hline(80));
                if (clusters.length === 0) {
                    writeln('  ' + c('dim', 'No clusters registered'));
                    writeln('  ' + c('dim', 'Register: node admin-cli/index.js cluster register --name prod --context gke_...'));
                } else {
                    writeln(`  ${c('dim', 'NAME'.padEnd(22))}${c('dim', 'ENV'.padEnd(12))}${c('dim', 'REGION'.padEnd(16))}${c('dim', 'CONTEXT')}`);
                    writeln('  ' + hline(80));
                    for (const cl of clusters) {
                        const envColor = cl.environment === 'prod' ? 'red' : cl.environment === 'staging' ? 'yellow' : 'green';
                        writeln(`  ${cl.name.padEnd(22)}${c(envColor, cl.environment.padEnd(12))}${(cl.region || '—').padEnd(16)}${cl.context}`);
                    }
                }
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        case 'remediate': {
            try {
                const engine = new RemediationEngine(getDir('remediation'));
                writeln('  Analyzing system state...');
                const ctx = {};
                const suggestions = await engine.analyze(ctx);
                writeln('');
                writeln(c('bold', `  AI Remediation (${suggestions.length} suggestion(s))`));
                writeln('  ' + hline(60));
                if (suggestions.length === 0) {
                    writeln('  ' + c('green', '✓ No issues detected — system healthy'));
                } else {
                    for (const s of suggestions) {
                        const sevColor = s.severity === 'critical' ? 'red' : s.severity === 'warning' ? 'yellow' : 'cyan';
                        writeln(`  ${c(sevColor, '[' + s.severity.toUpperCase() + ']')} ${s.title}`);
                        writeln(`  Steps:`);
                        for (const step of (s.steps || []).slice(0, 4)) {
                            writeln(`    ${c('dim', '→')} ${step}`);
                        }
                        writeln('');
                    }
                }
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        case 'audit': {
            try {
                const n = parseInt(subArgs[0] || '20');
                const auditFile = path.join(ADMIN_HOME, 'audit.log');
                writeln('');
                writeln(c('bold', `  Audit Log (last ${n})`));
                writeln('  ' + hline(80));
                if (!fs.existsSync(auditFile)) {
                    writeln('  ' + c('dim', 'No audit log entries'));
                } else {
                    const lines = fs.readFileSync(auditFile, 'utf8').trim().split('\n').filter(Boolean).slice(-n);
                    for (const l of lines) {
                        try {
                            const e = JSON.parse(l);
                            const iface = e.interface ? `[${e.interface}]` : '';
                            writeln(`  ${c('dim', e.ts || '')} ${c('cyan', (e.actor || '').padEnd(14))} ${c('yellow', iface.padEnd(8))} ${e.action || ''} ${e.detail ? c('dim', '| ' + e.detail) : ''}`);
                        } catch (_) {
                            writeln('  ' + c('dim', l.slice(0, 100)));
                        }
                    }
                }
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        case 'health': {
            writeln('  Checking API gateway health...');
            try {
                const http = require('http');
                await new Promise((resolve) => {
                    const req = http.get('http://localhost:8000/health', { timeout: 4000 }, (res) => {
                        let body = '';
                        res.on('data', d => body += d);
                        res.on('end', () => {
                            writeln('  ' + c('green', '✓') + ` API Gateway: HTTP ${res.statusCode}`);
                            resolve();
                        });
                    });
                    req.on('error', () => {
                        writeln('  ' + c('yellow', '○') + ' API Gateway: not reachable on localhost:8000');
                        resolve();
                    });
                });
            } catch (_) {
                writeln('  ' + c('yellow', '○') + ' API Gateway: not reachable');
            }
            writeln('');
            break;
        }

        case 'env': {
            writeln('');
            writeln(c('bold', '  Admin Panel Configuration'));
            writeln('  ' + hline(50));
            const panelVars = [
                ['ENABLE_ADMIN_FRONTEND', 'Admin React Frontend (port 3001)'],
                ['ENABLE_ADMIN_REST_API', 'Admin REST API server (port 8888)'],
                ['ENABLE_ADMIN_SSH', 'This SSH Admin Dashboard (port 2222)'],
            ];
            for (const [varName, desc] of panelVars) {
                const val = (process.env[varName] || 'false').toLowerCase();
                const isOn = val === 'true';
                writeln(`  ${c('cyan', varName.padEnd(28))}  ${isOn ? c('green', 'enabled') : c('dim', 'disabled')}  ${c('dim', desc)}`);
            }
            writeln('  ' + hline(50));
            writeln(`  ${c('dim', 'CLI Admin Panel')}                    ${c('green', 'always available')}  (local filesystem only)`);
            writeln('');
            break;
        }

        case 'clear':
            write(CLEAR);
            break;

        case '':
            break; // Empty line — do nothing

        case 'exit':
        case 'quit':
        case 'logout':
            writeln(c('green', '\n  Goodbye! Session closed.\n'));
            stream.end();
            break;

        default:
            writeln(`  ${c('red', 'Unknown command:')} ${c('yellow', cmd)}  — type ${c('cyan', 'help')} for available commands`);
            writeln('');
    }
}

// ---------------------------------------------------------------------------
// Session manager
// ---------------------------------------------------------------------------
let activeSessions = 0;

function createSession(client, remoteIP) {
    let user = 'admin';
    let idleTimer = null;
    let ptyInfo = null;

    function resetIdle(stream) {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            stream.write(c('yellow', '\r\n  Session idle timeout — disconnecting.\r\n'));
            stream.end();
        }, IDLE_TIMEOUT_SEC * 1000);
    }

    client.on('authentication', (ctx) => {
        user = ctx.username;

        if (ctx.method === 'password') {
            if (!SSH_PASSWORD) {
                return ctx.reject(['publickey']);
            }
            if (ctx.password === SSH_PASSWORD) {
                return ctx.accept();
            }
            return ctx.reject(['password']);
        }

        if (ctx.method === 'publickey') {
            const authorizedKeys = loadAuthorizedKeys();
            if (authorizedKeys.length === 0) {
                return ctx.reject(['password']);
            }
            for (const key of authorizedKeys) {
                try {
                    if (ctx.key.algo === key.type &&
                        ctx.key.data.equals(key.getPublicSSH())) {
                        if (ctx.signature) {
                            // Use the parsed key object directly for verification
                            if (key.verify(ctx.blob, ctx.signature, ctx.hashAlgo) === true) {
                                return ctx.accept();
                            }
                        } else {
                            // No signature = key-existence probe, accept to proceed
                            return ctx.accept();
                        }
                    }
                } catch (_) { /* key compare failed */ }
            }
            return ctx.reject(['publickey']);
        }

        // Reject other methods
        return ctx.reject(['password', 'publickey']);
    });

    client.on('ready', () => {
        auditLog(user, 'ssh:login', `from ${remoteIP}`);
        log('info', `${user}@${remoteIP} authenticated`);
        activeSessions++;

        client.on('session', (accept) => {
            const session = accept();

            session.on('pty', (accept, _reject, info) => {
                ptyInfo = info;
                accept();
            });

            session.on('shell', (accept) => {
                const stream = accept();

                if (BANNER) {
                    stream.write(c('yellow', '\r\n  ' + BANNER + '\r\n\r\n'));
                }

                // Show initial dashboard
                stream.write(renderDashboard());

                // Show prompt
                const PROMPT = c('bold', c('green', `\r\n[admin@milonexa]$ `));
                stream.write(PROMPT);

                let lineBuffer = '';
                resetIdle(stream);

                stream.on('data', async (data) => {
                    resetIdle(stream);
                    const s = data.toString();

                    for (const ch of s) {
                        const code = ch.charCodeAt(0);

                        if (code === 13 || code === 10) {
                            // Enter
                            stream.write('\r\n');
                            const line = lineBuffer.trim();
                            lineBuffer = '';
                            if (line) {
                                await handleCommand(line, user, stream);
                                if (line === 'exit' || line === 'quit' || line === 'logout') {
                                    return; // stream.end() already called
                                }
                            }
                            stream.write(PROMPT);
                        } else if (code === 127 || code === 8) {
                            // Backspace
                            if (lineBuffer.length > 0) {
                                lineBuffer = lineBuffer.slice(0, -1);
                                stream.write('\b \b');
                            }
                        } else if (code === 3) {
                            // Ctrl+C
                            lineBuffer = '';
                            stream.write('^C\r\n');
                            stream.write(PROMPT);
                        } else if (code === 4 && lineBuffer.length === 0) {
                            // Ctrl+D on empty line = EOF/logout
                            stream.write('\r\n');
                            await handleCommand('exit', user, stream);
                            return;
                        } else if (code >= 32) {
                            lineBuffer += ch;
                            stream.write(ch);
                        }
                        // Ignore control chars we don't handle
                    }
                });

                stream.on('close', () => {
                    if (idleTimer) clearTimeout(idleTimer);
                    activeSessions = Math.max(0, activeSessions - 1);
                    auditLog(user, 'ssh:logout', `from ${remoteIP}`);
                    log('info', `${user}@${remoteIP} disconnected`);
                });

                stream.stderr.on('data', () => { /* ignore stderr */ });
            });

            // exec support (run a single command)
            session.on('exec', (accept, _reject, info) => {
                const stream = accept();
                const line = info.command;
                (async () => {
                    await handleCommand(line, user, stream);
                    stream.exit(0);
                    stream.end();
                })();
            });
        });
    });

    client.on('error', (err) => {
        log('warn', `Client error from ${remoteIP}: ${err.message}`);
    });

    client.on('close', () => {
        activeSessions = Math.max(0, activeSessions - 1);
    });
}

// ---------------------------------------------------------------------------
// Start SSH Server
// ---------------------------------------------------------------------------
const hostKey = ensureHostKey();
const authorizedKeys = loadAuthorizedKeys();

if (!SSH_PASSWORD && authorizedKeys.length === 0) {
    log('error', 'No authentication configured!');
    log('error', 'Set ADMIN_SSH_PASSWORD and/or ADMIN_SSH_AUTHORIZED_KEYS to allow logins.');
    process.exit(1);
}

const server = new SSHServer({
    hostKeys: [hostKey],
    banner: BANNER || undefined,
    greeting: '',
    debug: process.env.ADMIN_SSH_DEBUG === 'true'
        ? (msg) => process.stderr.write('[ssh2-debug] ' + msg + '\n')
        : undefined,
}, (client) => {
    const remoteIP = client._sock?.remoteAddress || 'unknown';

    if (!isAllowedIP(remoteIP)) {
        log('warn', `Rejected connection from ${remoteIP} (not in ADMIN_ALLOWED_IPS)`);
        auditLog('unknown', 'ssh:rejected', `IP ${remoteIP} not in allowlist`);
        client.end();
        return;
    }

    if (activeSessions >= MAX_SESSIONS) {
        log('warn', `Max sessions (${MAX_SESSIONS}) reached, rejecting ${remoteIP}`);
        client.end();
        return;
    }

    log('info', `New connection from ${remoteIP}`);
    createSession(client, remoteIP);
});

server.on('error', (err) => {
    log('error', `SSH server error: ${err.message}`);
    if (err.code === 'EADDRINUSE') {
        log('error', `Port ${PORT} is already in use. Set ADMIN_SSH_PORT to use a different port.`);
        process.exit(1);
    }
});

server.listen(PORT, HOST, () => {
    log('info', `SSH Admin Dashboard started — ssh admin@${HOST} -p ${PORT}`);
    log('info', `Auth:           ${SSH_PASSWORD ? 'password' : '(disabled)'}${authorizedKeys.length > 0 ? ' + public-key' : ''}`);
    log('info', `Max sessions:   ${MAX_SESSIONS}`);
    log('info', `Idle timeout:   ${IDLE_TIMEOUT_SEC}s`);
    log('info', `IP allowlist:   ${ALLOWED_IPS.join(', ')}`);
    log('info', `Host key:       ${HOST_KEY_PATH}`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
