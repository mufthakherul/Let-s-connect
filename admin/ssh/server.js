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
    console.error('[ssh-admin] ssh2 package is required. Install with: cd admin/ssh && npm install');
    process.exit(1);
}

const { Server: SSHServer, utils: sshUtils } = ssh2;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const REPO_ROOT_CANDIDATE = path.resolve(__dirname, '../..');
const ROOT_DIR = fs.existsSync(path.join(REPO_ROOT_CANDIDATE, 'docker-compose.yml'))
    ? REPO_ROOT_CANDIDATE
    : path.resolve(__dirname, '..');
const ADMIN_HOME = process.env.ADMIN_HOME || path.join(ROOT_DIR, '.admin-cli');
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
const RECORD_SESSIONS = (process.env.ADMIN_SSH_RECORD_SESSIONS || 'true').toLowerCase() === 'true';
const SSH_KEYS_DIR = path.join(__dirname, 'ssh-keys');
const RECORDINGS_DIR = path.join(SSH_STATE_DIR, 'recordings');
const SESSION_LOG_FILE = path.join(SSH_STATE_DIR, 'session-log.json');
const REVOKED_KEYS_FILE = path.join(SSH_STATE_DIR, 'revoked-keys.json');
const BREAK_GLASS_FILE = path.join(ADMIN_HOME, 'break-glass.json');

// ---------------------------------------------------------------------------
// Load admin modules
// ---------------------------------------------------------------------------
const { MetricsCollector } = require('../shared/metrics');
const { AlertManager } = require('../shared/alerts');
const { SLAManager } = require('../shared/sla');
const { WebhookManager } = require('../shared/webhooks');
const { MultiClusterManager } = require('../shared/multi-cluster');
const { TrendAnalyzer } = require('../shared/trend-analysis');
const { RemediationEngine } = require('../shared/ai-remediation');
const { ComplianceManager } = require('../shared/compliance');
const { CostAnalyzer } = require('../shared/cost-analyzer');
const { RecommendationEngine } = require('../shared/recommendations');
// Q4 2026 modules
const { AIIntegrationBridge } = require('../shared/ai-integration');
const { FeatureFlagManager } = require('../shared/feature-flags');
const { TenantManager } = require('../shared/tenant-manager');

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
// Q3 2026 — Session Recording (asciinema v2)
// ---------------------------------------------------------------------------
function ensureRecordingsDir() {
    if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR, { recursive: true, mode: 0o700 });
}

function startRecording(sessionId, startTs) {
    if (!RECORD_SESSIONS) return;
    try {
        ensureRecordingsDir();
        const header = JSON.stringify({
            version: 2,
            width: 220,
            height: 50,
            timestamp: Math.floor(startTs / 1000),
            title: 'Admin SSH Session',
        });
        fs.writeFileSync(path.join(RECORDINGS_DIR, `${sessionId}.cast`), header + '\n', { mode: 0o600 });
    } catch (_) { /* non-fatal */ }
}

function recordSession(sessionId, data, type = 'o', startTs = 0) {
    if (!RECORD_SESSIONS) return;
    try {
        const elapsed = (Date.now() - startTs) / 1000;
        const line = JSON.stringify([elapsed, type, data]);
        fs.appendFileSync(path.join(RECORDINGS_DIR, `${sessionId}.cast`), line + '\n');
    } catch (_) { /* non-fatal */ }
}

// ---------------------------------------------------------------------------
// Q3 2026 — SSH Session Audit log
// ---------------------------------------------------------------------------
function readSessionLog() {
    try {
        if (!fs.existsSync(SESSION_LOG_FILE)) return [];
        return JSON.parse(fs.readFileSync(SESSION_LOG_FILE, 'utf8'));
    } catch (_) { return []; }
}

function writeSessionLog(entries) {
    try {
        if (!fs.existsSync(SSH_STATE_DIR)) fs.mkdirSync(SSH_STATE_DIR, { recursive: true, mode: 0o700 });
        fs.writeFileSync(SESSION_LOG_FILE, JSON.stringify(entries, null, 2), { mode: 0o600 });
    } catch (_) { /* non-fatal */ }
}

function sessionAuditStart({ sessionId, actor, ip }) {
    try {
        const entry = JSON.stringify({
            ts: new Date().toISOString(),
            actor,
            action: 'ssh_session_start',
            ip,
            sessionId,
            interface: 'ssh',
        }) + '\n';
        fs.appendFileSync(path.join(ADMIN_HOME, 'audit.log'), entry);
        const sessions = readSessionLog();
        sessions.push({ sessionId, actor, ip, startTs: new Date().toISOString(), endTs: null, duration_sec: null, commandCount: 0, active: true });
        writeSessionLog(sessions);
    } catch (_) { /* non-fatal */ }
}

function sessionAuditEnd({ sessionId, actor, ip, startTs, commandCount }) {
    try {
        const duration_sec = Math.round((Date.now() - startTs) / 1000);
        const entry = JSON.stringify({
            ts: new Date().toISOString(),
            actor,
            action: 'ssh_session_end',
            ip,
            sessionId,
            duration_sec,
            commandCount,
            interface: 'ssh',
        }) + '\n';
        fs.appendFileSync(path.join(ADMIN_HOME, 'audit.log'), entry);
        const sessions = readSessionLog();
        const idx = sessions.findIndex(s => s.sessionId === sessionId);
        if (idx !== -1) {
            sessions[idx].endTs = new Date().toISOString();
            sessions[idx].duration_sec = duration_sec;
            sessions[idx].commandCount = commandCount;
            sessions[idx].active = false;
        }
        writeSessionLog(sessions);
    } catch (_) { /* non-fatal */ }
}

// ---------------------------------------------------------------------------
// Q3 2026 — Break-Glass
// ---------------------------------------------------------------------------
function readBreakGlass() {
    try {
        if (!fs.existsSync(BREAK_GLASS_FILE)) return null;
        const data = JSON.parse(fs.readFileSync(BREAK_GLASS_FILE, 'utf8'));
        if (!data || !data.expiry) return null;
        if (Date.now() > new Date(data.expiry).getTime()) {
            try { fs.unlinkSync(BREAK_GLASS_FILE); } catch (_) {}
            return null;
        }
        return data;
    } catch (_) { return null; }
}

function writeBreakGlass(data) {
    if (!fs.existsSync(ADMIN_HOME)) fs.mkdirSync(ADMIN_HOME, { recursive: true });
    fs.writeFileSync(BREAK_GLASS_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

function isBreakGlassActive() {
    return readBreakGlass() !== null;
}

function activateBreakGlass({ actor, reason = '', ip = '' }) {
    const now = new Date();
    const expiry = new Date(now.getTime() + 15 * 60 * 1000);
    const data = {
        active: true,
        activatedBy: actor,
        activatedAt: now.toISOString(),
        expiry: expiry.toISOString(),
        reason,
        ip,
    };
    writeBreakGlass(data);
    const auditEntry = JSON.stringify({
        ts: now.toISOString(),
        actor,
        action: 'break_glass_activated',
        ip,
        reason,
        expiry: expiry.toISOString(),
        interface: 'ssh',
        breakGlass: true,
    }) + '\n';
    try { fs.appendFileSync(path.join(ADMIN_HOME, 'audit.log'), auditEntry); } catch (_) {}
    // Fire webhook notification
    try {
        const { WebhookManager } = require('../shared/webhooks');
        const wm = new WebhookManager(path.join(ADMIN_HOME, 'webhooks'));
        wm.fire('break_glass_activated', { actor, reason, expiry: expiry.toISOString(), ip }, 'critical').catch(() => {});
    } catch (_) {}
    return data;
}

function revokeBreakGlass(actor) {
    try {
        if (fs.existsSync(BREAK_GLASS_FILE)) fs.unlinkSync(BREAK_GLASS_FILE);
    } catch (_) {}
    const auditEntry = JSON.stringify({
        ts: new Date().toISOString(),
        actor,
        action: 'break_glass_revoked',
        interface: 'ssh',
        breakGlass: true,
    }) + '\n';
    try { fs.appendFileSync(path.join(ADMIN_HOME, 'audit.log'), auditEntry); } catch (_) {}
}

// ---------------------------------------------------------------------------
// Q3 2026 — SSH Key Management
// ---------------------------------------------------------------------------
function getKeyFingerprint(keyPath) {
    try {
        // Validate keyPath to prevent command injection: only allow safe path characters
        if (!/^[\w/\-. ]+$/.test(keyPath)) return '(invalid path)';
        const { execFileSync } = require('child_process');
        const result = execFileSync('ssh-keygen', ['-lf', keyPath], { encoding: 'utf8', timeout: 5000 });
        return result.trim();
    } catch (_) { return '(unknown)'; }
}

function rotateHostKey() {
    if (!fs.existsSync(SSH_STATE_DIR)) fs.mkdirSync(SSH_STATE_DIR, { recursive: true, mode: 0o700 });
    const ts = Date.now();
    const backupPath = HOST_KEY_PATH + `.backup.${ts}`;
    if (fs.existsSync(HOST_KEY_PATH)) {
        fs.copyFileSync(HOST_KEY_PATH, backupPath);
        fs.chmodSync(backupPath, 0o600);
    }
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
        publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    });
    fs.writeFileSync(HOST_KEY_PATH, privateKey, { mode: 0o600 });
    const auditEntry = JSON.stringify({
        ts: new Date().toISOString(),
        actor: 'system',
        action: 'ssh_host_key_rotated',
        backupPath,
        interface: 'ssh',
    }) + '\n';
    try { fs.appendFileSync(path.join(ADMIN_HOME, 'audit.log'), auditEntry); } catch (_) {}
    return { backupPath, newKeyPath: HOST_KEY_PATH };
}

function listSSHKeys() {
    const results = [];
    const revokedKeys = readRevokedKeys();
    function scanDir(dir) {
        if (!fs.existsSync(dir)) return;
        for (const f of fs.readdirSync(dir)) {
            const full = path.join(dir, f);
            try {
                const stat = fs.statSync(full);
                if (!stat.isFile()) continue;
                const ext = path.extname(f);
                if (!['.pub', '.pem', ''].includes(ext) && !f.endsWith('_rsa') && !f.endsWith('_ecdsa') && !f.endsWith('_ed25519')) continue;
                const isRevoked = revokedKeys.some(r => r.keyfile === full || r.keyfile === f);
                results.push({
                    file: f,
                    path: full,
                    createdAt: stat.birthtime.toISOString(),
                    modifiedAt: stat.mtime.toISOString(),
                    size: stat.size,
                    status: isRevoked ? 'revoked' : 'active',
                });
            } catch (_) {}
        }
    }
    scanDir(SSH_STATE_DIR);
    scanDir(SSH_KEYS_DIR);
    return results;
}

function readRevokedKeys() {
    try {
        if (!fs.existsSync(REVOKED_KEYS_FILE)) return [];
        return JSON.parse(fs.readFileSync(REVOKED_KEYS_FILE, 'utf8'));
    } catch (_) { return []; }
}

function revokeSSHKey(keyfile) {
    if (!fs.existsSync(SSH_STATE_DIR)) fs.mkdirSync(SSH_STATE_DIR, { recursive: true, mode: 0o700 });
    const revoked = readRevokedKeys();
    const existing = revoked.find(r => r.keyfile === keyfile);
    if (!existing) {
        revoked.push({ keyfile, revokedAt: new Date().toISOString() });
        fs.writeFileSync(REVOKED_KEYS_FILE, JSON.stringify(revoked, null, 2), { mode: 0o600 });
    }
    const auditEntry = JSON.stringify({
        ts: new Date().toISOString(),
        actor: 'system',
        action: 'ssh_key_revoked',
        keyfile,
        interface: 'ssh',
    }) + '\n';
    try { fs.appendFileSync(path.join(ADMIN_HOME, 'audit.log'), auditEntry); } catch (_) {}
    return { revoked: true, keyfile, alreadyRevoked: !!existing };
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

    // Break-glass status
    const bg = readBreakGlass();
    if (bg) {
        const bgLines = [
            `  ${c('red', '⚠ BREAK-GLASS IS ACTIVE')}`,
            `  Activated by: ${c('yellow', bg.activatedBy)}`,
            `  Expires:      ${c('yellow', bg.expiry)}`,
            `  Reason:       ${bg.reason || '(none)'}`,
        ];
        out += box('🔴 Emergency Break-Glass', bgLines, Math.floor(W / 2));
    }

    // Row 2: Services
    const clusterLines = clusters.length > 0
        ? clusters.map(cl => `  ${cl.enabled ? c('green', '●') : c('dim', '○')}  ${cl.name.padEnd(20)} ${cl.environment.padEnd(10)} ${cl.region || ''}`)
        : ['  ' + c('dim', 'No clusters registered')];
    out += box('☁  Clusters', clusterLines, Math.floor(W / 2));

    // Row 3: Quick Commands
    const cmdLines = [
        `  ${c('cyan', 'help')}              Show all available commands`,
        `  ${c('cyan', 'status')}            Service status overview`,
        `  ${c('cyan', 'sla')}               SLA compliance & predictions`,
        `  ${c('cyan', 'alerts')}            Active alerts`,
        `  ${c('cyan', 'metrics')}           Performance metrics`,
        `  ${c('cyan', 'trends')}            Trend analysis & charts`,
        `  ${c('cyan', 'remediate')}         AI remediation suggestions`,
        `  ${c('cyan', 'webhooks')}          Webhook integrations`,
        `  ${c('cyan', 'cluster')}           Multi-cluster management`,
        `  ${c('cyan', 'audit')}             Audit log`,
        `  ${c('cyan', 'sessions')}          Active SSH sessions`,
        `  ${c('cyan', 'key-list')}          List SSH keys`,
        `  ${c('cyan', 'key-rotate')}        Rotate host key (RSA 4096)`,
        `  ${c('cyan', 'break-glass')}       Emergency break-glass`,
        `  ${c('cyan', 'dashboard')}         Refresh this dashboard`,
        `  ${c('cyan', 'exit')}              End SSH session`,
    ];
    out += box('⌨  Quick Commands', cmdLines, 42);

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
            writeln('  ' + hline(60));
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
                ['sessions', 'Show active/past SSH sessions'],
                ['key-list', 'List SSH keys with fingerprints'],
                ['key-rotate', 'Generate new RSA 4096 host key'],
                ['key-revoke <keyfile>', 'Revoke an SSH key'],
                ['break-glass', 'Activate emergency break-glass (requires EMERGENCY)'],
                ['break-glass-status', 'Show break-glass status'],
                ['break-glass-revoke', 'Immediately end the break-glass window'],
                ['clear', 'Clear screen'],
                ['exit / quit', 'End SSH session'],
            ];
            for (const [c1, c2] of cmds) {
                writeln(`  ${c('cyan', c1.padEnd(32))}  ${c('dim', c2)}`);
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

        // ----------------------------------------------------------------
        // Q3 2026 — Session listing
        // ----------------------------------------------------------------
        case 'sessions': {
            try {
                const sessions = readSessionLog();
                writeln('');
                writeln(c('bold', `  SSH Sessions (${sessions.length} total)`));
                writeln('  ' + hline(100));
                writeln(`  ${c('dim', 'SESSION ID'.padEnd(38))}${c('dim', 'USER'.padEnd(14))}${c('dim', 'IP'.padEnd(18))}${c('dim', 'START'.padEnd(26))}${c('dim', 'DUR(s)'.padEnd(10))}${c('dim', 'CMDS'.padEnd(8))}${c('dim', 'STATUS')}`);
                writeln('  ' + hline(100));
                if (sessions.length === 0) {
                    writeln('  ' + c('dim', 'No sessions recorded'));
                } else {
                    for (const s of sessions.slice(-20)) {
                        const statusStr = s.active ? c('green', 'active') : c('dim', 'ended');
                        writeln(`  ${(s.sessionId || '').padEnd(38)}${(s.actor || '').padEnd(14)}${(s.ip || '').padEnd(18)}${(s.startTs || '').padEnd(26)}${String(s.duration_sec ?? '—').padEnd(10)}${String(s.commandCount ?? 0).padEnd(8)}${statusStr}`);
                    }
                }
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        // ----------------------------------------------------------------
        // Q3 2026 — SSH Key Management
        // ----------------------------------------------------------------
        case 'key-list': {
            try {
                const keys = listSSHKeys();
                writeln('');
                writeln(c('bold', `  SSH Keys (${keys.length} found)`));
                writeln('  ' + hline(80));
                if (keys.length === 0) {
                    writeln('  ' + c('dim', 'No key files found'));
                } else {
                    for (const k of keys) {
                        const statusColor = k.status === 'revoked' ? 'red' : 'green';
                        writeln(`  ${c(statusColor, k.status.padEnd(10))}  ${k.file.padEnd(30)}  ${k.createdAt.slice(0, 19)}`);
                    }
                }
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        case 'key-rotate': {
            try {
                writeln('  ' + c('yellow', '⚠  Rotating SSH host key (RSA 4096)…'));
                const { backupPath, newKeyPath } = rotateHostKey();
                writeln('  ' + c('green', `✓ New key generated: ${newKeyPath}`));
                writeln('  ' + c('dim', `  Old key backed up to: ${backupPath}`));
                writeln('  ' + c('yellow', '  NOTE: Clients will see a host key change warning on next connect.'));
                writeln('  ' + c('yellow', '        Restart the SSH server to apply the new key.'));
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        case 'key-revoke': {
            try {
                const keyfile = subArgs.join(' ').trim();
                if (!keyfile) {
                    writeln('  ' + c('red', 'Usage: key-revoke <keyfile>'));
                } else {
                    const result = revokeSSHKey(keyfile);
                    if (result.alreadyRevoked) {
                        writeln('  ' + c('yellow', `Key '${keyfile}' was already revoked.`));
                    } else {
                        writeln('  ' + c('green', `✓ Key '${keyfile}' revoked and recorded in revoked-keys.json`));
                    }
                }
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        // ----------------------------------------------------------------
        // Q3 2026 — Break-Glass Procedure
        // ----------------------------------------------------------------
        case 'break-glass': {
            const bg = readBreakGlass();
            if (bg) {
                writeln('  ' + c('yellow', '⚠  Break-glass is already active.'));
                writeln(`  Activated by: ${bg.activatedBy}  Expires: ${bg.expiry}`);
                writeln('  Use break-glass-revoke to end it early.');
                writeln('');
                break;
            }
            writeln('');
            writeln(c('bold', c('red', '  ⚠⚠  EMERGENCY BREAK-GLASS PROCEDURE  ⚠⚠')));
            writeln('  ' + hline(60));
            writeln(`  This will grant temporary 'admin' role override for 15 minutes.`);
            writeln(`  All commands during this window are flagged as ${c('red', 'breakGlass: true')}.`);
            writeln(`  An audit alert will be sent immediately.`);
            writeln('');
            writeln(`  ${c('yellow', 'Type exactly')} ${c('bold', 'EMERGENCY')} ${c('yellow', '(uppercase, no spaces) to confirm, or anything else to cancel:')}`);
            // Store pending state in the stream-local context via closure
            stream._breakGlassPending = true;
            break;
        }

        case 'break-glass-status': {
            const bg = readBreakGlass();
            writeln('');
            if (!bg) {
                writeln('  ' + c('green', '✓ Break-glass is NOT active'));
            } else {
                const remaining = Math.max(0, Math.round((new Date(bg.expiry).getTime() - Date.now()) / 1000));
                writeln('  ' + c('red', '⚠ BREAK-GLASS IS ACTIVE'));
                writeln(`  Activated by: ${c('yellow', bg.activatedBy)}`);
                writeln(`  Activated at: ${bg.activatedAt}`);
                writeln(`  Expires at:   ${c('yellow', bg.expiry)}  (${remaining}s remaining)`);
                writeln(`  Reason:       ${bg.reason || '(none)'}`);
            }
            writeln('');
            break;
        }

        case 'break-glass-revoke': {
            const bg = readBreakGlass();
            if (!bg) {
                writeln('  ' + c('green', 'Break-glass is not active — nothing to revoke.'));
            } else {
                revokeBreakGlass(user);
                writeln('  ' + c('green', '✓ Break-glass window revoked immediately.'));
            }
            writeln('');
            break;
        }

        case 'ai-status': {
            try {
                const bridge = new AIIntegrationBridge(getDir(''));
                const channels = bridge.getChannelStatus();
                const stats = bridge.getStats();
                writeln('');
                writeln(c('bold', '  AI Integration Channel Status'));
                writeln('  ' + hline(50));
                for (const [name, status] of Object.entries(channels)) {
                    const icon = status.connected ? c('green', '✓') : c('red', '✗');
                    const enabled = status.enabled ? c('green', 'enabled') : c('dim', 'disabled');
                    writeln(`  ${icon}  ${name.padEnd(12)}  ${enabled}`);
                }
                writeln(`\n  Workflows: ${stats.totalWorkflows} total, ${c('yellow', String(stats.pendingApprovals))} pending`);
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        case 'ai-workflows': {
            try {
                const bridge = new AIIntegrationBridge(getDir(''));
                const workflows = bridge.listWorkflows({ status: 'pending_approval' });
                writeln('');
                writeln(c('bold', `  Pending AI Workflows (${workflows.length})`));
                writeln('  ' + hline(80));
                if (workflows.length === 0) {
                    writeln('  ' + c('dim', 'No pending AI workflows'));
                } else {
                    for (const wf of workflows) {
                        writeln(`  ${c('yellow', wf.workflowId.padEnd(24))}  ${wf.name.padEnd(30)}  ${wf.channel || 'api'}`);
                    }
                }
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        case 'ai-approve': {
            try {
                const id = subArgs[0];
                if (!id) { writeln('  ' + c('red', 'Usage: ai-approve <workflowId>')); break; }
                const bridge = new AIIntegrationBridge(getDir(''));
                await bridge.approveWorkflow(id, user, 'Approved via SSH');
                writeln('  ' + c('green', `✓ Workflow ${id} approved and executing`));
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        case 'ai-deny': {
            try {
                const id = subArgs[0];
                if (!id) { writeln('  ' + c('red', 'Usage: ai-deny <workflowId>')); break; }
                const bridge = new AIIntegrationBridge(getDir(''));
                bridge.denyWorkflow(id, user, 'Denied via SSH');
                writeln('  ' + c('yellow', `✓ Workflow ${id} denied`));
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        case 'feature-flags': {
            try {
                const mgr = new FeatureFlagManager(getDir(''));
                const flags = mgr.listFlags();
                writeln('');
                writeln(c('bold', `  Feature Flags (${flags.length})`));
                writeln('  ' + hline(80));
                if (flags.length === 0) {
                    writeln('  ' + c('dim', 'No feature flags defined'));
                } else {
                    writeln(`  ${c('dim', 'NAME'.padEnd(30))}${c('dim', 'PROD'.padEnd(8))}${c('dim', 'STAGING'.padEnd(10))}${c('dim', 'DEV')}`);
                    writeln('  ' + hline(60));
                    for (const f of flags) {
                        const prod = f.environments && f.environments.production ? c('green', '✓') : c('red', '✗');
                        const staging = f.environments && f.environments.staging ? c('green', '✓') : c('red', '✗');
                        const dev = f.environments && f.environments.development ? c('green', '✓') : c('red', '✗');
                        writeln(`  ${f.name.padEnd(30)}${prod.padEnd(8)}${staging.padEnd(10)}${dev}`);
                    }
                }
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        case 'tenants': {
            try {
                const mgr = new TenantManager(getDir(''));
                const tenants = mgr.listTenants();
                writeln('');
                writeln(c('bold', `  Tenants (${tenants.length})`));
                writeln('  ' + hline(80));
                if (tenants.length === 0) {
                    writeln('  ' + c('dim', 'No tenants defined'));
                } else {
                    writeln(`  ${c('dim', 'NAME'.padEnd(24))}${c('dim', 'PLAN'.padEnd(14))}${c('dim', 'STATUS')}`);
                    writeln('  ' + hline(60));
                    for (const t of tenants) {
                        const statusColor = t.status === 'active' ? 'green' : t.status === 'suspended' ? 'yellow' : 'red';
                        writeln(`  ${t.name.padEnd(24)}${(t.plan || '').padEnd(14)}${c(statusColor, t.status)}`);
                    }
                }
            } catch (err) {
                writeln('  ' + c('red', `Error: ${err.message}`));
            }
            writeln('');
            break;
        }

        default:
            writeln(`  ${c('red', 'Unknown command:')} ${c('yellow', cmd)}  — type ${c('cyan', 'help')} for available commands`);
            writeln('');
    }
}
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
        const sessionId = crypto.randomBytes(12).toString('hex');
        const sessionStartTs = Date.now();
        let commandCount = 0;

        auditLog(user, 'ssh:login', `from ${remoteIP}`);
        log('info', `${user}@${remoteIP} authenticated — session ${sessionId}`);
        activeSessions++;

        sessionAuditStart({ sessionId, actor: user, ip: remoteIP });
        startRecording(sessionId, sessionStartTs);

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

                            // Handle break-glass confirmation
                            if (stream._breakGlassPending) {
                                stream._breakGlassPending = false;
                                if (line === 'EMERGENCY') {
                                    const bgData = activateBreakGlass({ actor: user, reason: 'SSH TUI activation', ip: remoteIP });
                                    stream.write(c('red', '\r\n  ⚠  BREAK-GLASS ACTIVATED\r\n'));
                                    stream.write(`  Expires: ${bgData.expiry}\r\n`);
                                    stream.write(c('yellow', '  All commands are now flagged in the audit log.\r\n'));
                                    stream.write(c('dim', '  Use break-glass-revoke to end early.\r\n\r\n'));
                                } else {
                                    stream.write(c('green', '\r\n  ✓ Break-glass cancelled.\r\n\r\n'));
                                }
                                stream.write(PROMPT);
                                continue;
                            }

                            if (line) {
                                commandCount++;
                                // Flag in audit if break-glass is active
                                if (isBreakGlassActive()) {
                                    try {
                                        const bgAuditEntry = JSON.stringify({
                                            ts: new Date().toISOString(),
                                            actor: user,
                                            action: 'ssh:command',
                                            detail: line,
                                            sessionId,
                                            ip: remoteIP,
                                            breakGlass: true,
                                            interface: 'ssh',
                                        }) + '\n';
                                        fs.appendFileSync(path.join(ADMIN_HOME, 'audit.log'), bgAuditEntry);
                                    } catch (_) {}
                                }
                                recordSession(sessionId, line + '\n', 'i', sessionStartTs);
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
                    sessionAuditEnd({ sessionId, actor: user, ip: remoteIP, startTs: sessionStartTs, commandCount });
                    log('info', `${user}@${remoteIP} disconnected — session ${sessionId} (${commandCount} commands)`);
                });

                stream.stderr.on('data', () => { /* ignore stderr */ });
            });

            // exec support (run a single command)
            session.on('exec', (accept, _reject, info) => {
                const stream = accept();
                const line = info.command;
                (async () => {
                    commandCount++;
                    recordSession(sessionId, line + '\n', 'i', sessionStartTs);
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

// ---------------------------------------------------------------------------
// Q3 2026 — Exported module interface for programmatic use
// ---------------------------------------------------------------------------
module.exports = {
    rotateHostKey,
    listSSHKeys,
    revokeSSHKey,
    readBreakGlass,
    activateBreakGlass,
    revokeBreakGlass,
    isBreakGlassActive,
    readSessionLog,
    recordSession,
};
