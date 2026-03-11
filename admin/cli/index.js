#!/usr/bin/env node

/**
 * Milonexa Omni Admin CLI (Phase D)
 *
 * CLI-first operational control plane for direct, Docker Compose, and Kubernetes runtimes.
 * Includes:
 *   - Phase 1: Multi-runtime lifecycle operations
 *   - Phase 2: RBAC, immutable audit logging, production safety gates
 *   - Phase 3: Scale, rollout strategies, and release validation checks
 *   - Phase 4: Incident intelligence, metrics, alerts, policies, costs, compliance, recommendations
 *
 * Usage:
 *   node admin-cli/index.js doctor
 *   node admin-cli/index.js build --runtime docker --env dev --admin
 *   node admin-cli/index.js start --runtime docker --env dev
 *   node admin-cli/index.js status --runtime docker
 *   node admin-cli/index.js logs --runtime docker --service api-gateway --follow --tail 100
 *   node admin-cli/index.js health --gateway http://localhost:8000
 *   node admin-cli/index.js backup backup all
 *   node admin-cli/index.js audit --tail 30
 *   node admin-cli/index.js set-role operator
 *
 * Role resolution (ADMIN_CLI_ROLE env > .admin-cli/role.json > default: operator):
 *   viewer       Read-only commands (doctor, status, logs, health, audit, monitor, run)
 *   operator     + build, start/restart in non-prod environments
 *   admin        + stop, backup, start/restart in production/k8s
 *   break-glass  Emergency override — skips confirmation prompts, always flagged in audit
 *
 * Production-scope commands that modify state require typing CONFIRM unless:
 *   --dry-run is set (preview only), --confirm is set (CI/pipeline), or role is break-glass.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

// Phase 2 modules
const { resolveRole, checkAuthorization, persistRole, ROLES, ROLE_FILE } = require('../shared/auth');
const { auditStart, printAuditLog, AUDIT_LOG_FILE } = require('../shared/audit');
const { requiresConfirmation, promptConfirm } = require('../shared/confirm');

// Phase D modules
const { MetricsCollector, DEFAULT_THRESHOLDS } = require('../shared/metrics');
const { AlertManager } = require('../shared/alerts');
const { PolicyEngine } = require('../shared/policies');
const { CostAnalyzer, forecastCosts } = require('../shared/cost-analyzer');
const { ComplianceManager } = require('../shared/compliance');
const { RecommendationEngine } = require('../shared/recommendations');

// Phase E modules
const { TUIDashboard } = require('../shared/tui');
const { WebhookManager } = require('../shared/webhooks');
const { SLAManager } = require('../shared/sla');
const { RemediationEngine } = require('../shared/ai-remediation');
const { MultiClusterManager } = require('../shared/multi-cluster');
const { TrendAnalyzer, sparkline, barChart, lineChart } = require('../shared/trend-analysis');

// Q4 2026 modules
const { FeatureFlagManager } = require('../shared/feature-flags');
const { TenantManager } = require('../shared/tenant-manager');
const { RunbookManager } = require('../shared/runbook');
const { AIIntegrationBridge } = require('../shared/ai-integration');
const { ChangeLog } = require('../shared/change-log');


// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT_DIR = path.resolve(__dirname, '../..');
const ADMIN_HOME = path.join(ROOT_DIR, '.admin-cli');
const DIRECT_LOG_DIR = path.join(ADMIN_HOME, 'logs');
const DIRECT_STATE_FILE = path.join(ADMIN_HOME, 'direct-processes.json');

// Phase F (Q2 2026) — Plugin system paths
const PLUGINS_DIR = path.join(__dirname, 'plugins');
const SNAPSHOTS_DIR = path.join(ADMIN_HOME, 'snapshots');

/** Plugin registry populated at startup by loadPlugins(). */
const _plugins = new Map();

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const COLORS = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

// ---------------------------------------------------------------------------
// Service/component definitions
// ---------------------------------------------------------------------------

const DOCKER_SERVICE_SET = new Set([
    'api-gateway',
    'security-service',
    'user-service',
    'content-service',
    'messaging-service',
    'collaboration-service',
    'media-service',
    'shop-service',
    'ai-service',
    'streaming-service',
    'frontend',
    'admin_frontend',
    'postgres',
    'redis',
    'elasticsearch',
    'minio',
]);

const SERVICE_ALIASES = {
    gateway: 'api-gateway',
    admin: 'admin_frontend',
    'admin-frontend': 'admin_frontend',
    users: 'user-service',
    user: 'user-service',
    content: 'content-service',
    messaging: 'messaging-service',
    collaboration: 'collaboration-service',
    media: 'media-service',
    shop: 'shop-service',
    ai: 'ai-service',
    streaming: 'streaming-service',
    db: 'postgres',
    cache: 'redis',
    search: 'elasticsearch',
    storage: 'minio',
    admin_frontend: 'admin_frontend',
};

const DIRECT_COMPONENTS = {
    'api-gateway': {
        cwd: 'services/api-gateway',
        start: { cmd: 'npm', args: ['start'] },
        install: { cmd: 'npm', args: ['install'] },
        build: { cmd: 'npm', args: ['run', 'build', '--if-present'] },
    },
    'security-service': {
        cwd: 'services/security-service',
        start: { cmd: 'npm', args: ['start'] },
        install: { cmd: 'npm', args: ['install'] },
        build: { cmd: 'npm', args: ['run', 'build', '--if-present'] },
    },
    'user-service': {
        cwd: 'services/user-service',
        start: { cmd: 'npm', args: ['start'] },
        install: { cmd: 'npm', args: ['install'] },
        build: { cmd: 'npm', args: ['run', 'build', '--if-present'] },
    },
    'content-service': {
        cwd: 'services/content-service',
        start: { cmd: 'npm', args: ['start'] },
        install: { cmd: 'npm', args: ['install'] },
        build: { cmd: 'npm', args: ['run', 'build', '--if-present'] },
    },
    'messaging-service': {
        cwd: 'services/messaging-service',
        start: { cmd: 'node', args: ['server.js'] },
        install: { cmd: 'npm', args: ['install'] },
        build: { cmd: 'npm', args: ['run', 'build', '--if-present'] },
    },
    'collaboration-service': {
        cwd: 'services/collaboration-service',
        start: { cmd: 'node', args: ['server.js'] },
        install: { cmd: 'npm', args: ['install'] },
        build: { cmd: 'npm', args: ['run', 'build', '--if-present'] },
    },
    'media-service': {
        cwd: 'services/media-service',
        start: { cmd: 'node', args: ['server.js'] },
        install: { cmd: 'npm', args: ['install'] },
        build: { cmd: 'npm', args: ['run', 'build', '--if-present'] },
    },
    'shop-service': {
        cwd: 'services/shop-service',
        start: { cmd: 'node', args: ['server.js'] },
        install: { cmd: 'npm', args: ['install'] },
        build: { cmd: 'npm', args: ['run', 'build', '--if-present'] },
    },
    'ai-service': {
        cwd: 'services/ai-service',
        start: { cmd: 'node', args: ['server.js'] },
        install: { cmd: 'npm', args: ['install'] },
        build: { cmd: 'npm', args: ['run', 'build', '--if-present'] },
    },
    'streaming-service': {
        cwd: 'services/streaming-service',
        start: { cmd: 'npm', args: ['start'] },
        install: { cmd: 'npm', args: ['install'] },
        build: { cmd: 'npm', args: ['run', 'build', '--if-present'] },
    },
    frontend: {
        cwd: 'frontend',
        start: { cmd: 'npm', args: ['start'] },
        install: { cmd: 'npm', args: ['install', '--legacy-peer-deps'] },
        build: { cmd: 'npm', args: ['run', 'build'] },
    },
    admin_frontend: {
        cwd: 'admin_frontend',
        start: { cmd: 'npm', args: ['start'] },
        install: { cmd: 'npm', args: ['install', '--legacy-peer-deps'] },
        build: { cmd: 'npm', args: ['run', 'build'] },
    },
};

const DEFAULT_DIRECT_COMPONENTS = [
    'api-gateway',
    'user-service',
    'content-service',
    'messaging-service',
    'collaboration-service',
    'media-service',
    'shop-service',
    'ai-service',
    'streaming-service',
    'frontend',
];

const K8S_MANIFEST_BY_SERVICE = {
    'api-gateway': 'k8s/api-gateway.yaml',
    'security-service': 'k8s/security-service.yaml',
    'user-service': 'k8s/user-service.yaml',
    'content-service': 'k8s/content-service.yaml',
    'messaging-service': 'k8s/messaging-service.yaml',
    'collaboration-service': 'k8s/collaboration-service.yaml',
    'media-service': 'k8s/media-service.yaml',
    'shop-service': 'k8s/shop-service.yaml',
    'ai-service': 'k8s/ai-service.yaml',
    'streaming-service': 'k8s/streaming-service.yaml',
    frontend: 'k8s/frontend.yaml',
    admin_frontend: 'k8s/admin-frontend.yaml',
    postgres: 'k8s/postgres.yaml',
    redis: 'k8s/redis.yaml',
    elasticsearch: 'k8s/elasticsearch.yaml',
    minio: 'k8s/minio.yaml',
};

const K8S_DEFAULT_APPLY_SEQUENCE = [
    'k8s/namespace.yaml',
    'k8s/secrets.yaml',
    'k8s/configmap.yaml',
    'k8s/storage.yaml',
    'k8s/postgres.yaml',
    'k8s/redis.yaml',
    'k8s/elasticsearch.yaml',
    'k8s/minio.yaml',
    'k8s/user-service.yaml',
    'k8s/content-service.yaml',
    'k8s/messaging-service.yaml',
    'k8s/collaboration-service.yaml',
    'k8s/media-service.yaml',
    'k8s/shop-service.yaml',
    'k8s/ai-service.yaml',
    'k8s/streaming-service.yaml',
    'k8s/api-gateway.yaml',
    'k8s/frontend.yaml',
    'k8s/ingress.yaml',
    'k8s/prometheus.yaml',
    'k8s/alertmanager.yaml',
    'k8s/grafana.yaml',
    'k8s/logging.yaml',
    'k8s/pod-disruption-budgets.yaml',
];

const K8S_DEPLOYMENTS = new Set([
    'api-gateway',
    'security-service',
    'user-service',
    'content-service',
    'messaging-service',
    'collaboration-service',
    'media-service',
    'shop-service',
    'ai-service',
    'streaming-service',
    'frontend',
    'redis',
    'minio',
    'grafana',
    'prometheus',
    'alertmanager',
]);

const K8S_STATEFULSETS = new Set(['postgres', 'elasticsearch']);

const K8S_BUILD_CONFIG = {
    'api-gateway': { context: 'services', dockerfile: 'api-gateway/Dockerfile' },
    'security-service': { context: 'services', dockerfile: 'security-service/Dockerfile' },
    'user-service': { context: 'services', dockerfile: 'user-service/Dockerfile' },
    'content-service': { context: 'services', dockerfile: 'content-service/Dockerfile' },
    'messaging-service': { context: 'services', dockerfile: 'messaging-service/Dockerfile' },
    'collaboration-service': { context: 'services', dockerfile: 'collaboration-service/Dockerfile' },
    'media-service': { context: 'services', dockerfile: 'media-service/Dockerfile' },
    'shop-service': { context: 'services', dockerfile: 'shop-service/Dockerfile' },
    'streaming-service': { context: 'services', dockerfile: 'streaming-service/Dockerfile' },
    'ai-service': { context: 'services/ai-service' },
    frontend: { context: 'frontend' },
    admin_frontend: { context: 'admin_frontend' },
};

// ---------------------------------------------------------------------------
// Phase 2: pending audit handle (allows fatal() to close the audit entry)
// ---------------------------------------------------------------------------

/** Module-level reference so fatal() can finalize the audit record before exiting. */
let _pendingAudit = null;

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function c(color, text) {
    return `${COLORS[color] || ''}${text}${COLORS.reset}`;
}

function info(msg) {
    console.log(`${c('cyan', '[info]')} ${msg}`);
}

function success(msg) {
    console.log(`${c('green', '[ok]')} ${msg}`);
}

function warn(msg) {
    console.warn(`${c('yellow', '[warn]')} ${msg}`);
}

/** Print error and exit. Finalizes any in-progress audit entry as 'failure'. */
function fatal(msg, code = 1) {
    console.error(`${c('red', '[error]')} ${msg}`);
    if (_pendingAudit) {
        try { _pendingAudit.finish('failure', code); } catch (_) { }
        _pendingAudit = null;
    }
    process.exit(code);
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

function ensureAdminDirs() {
    fs.mkdirSync(ADMIN_HOME, { recursive: true });
    fs.mkdirSync(DIRECT_LOG_DIR, { recursive: true });
}

function quoteArg(arg) {
    if (!arg || /\s/.test(arg)) return JSON.stringify(arg || '');
    return arg;
}

function commandExists(cmd) {
    const checker = process.platform === 'win32' ? 'where' : 'which';
    const result = spawnSync(checker, [cmd], { stdio: 'ignore' });
    return result.status === 0;
}

// ---------------------------------------------------------------------------
// Command execution
// ---------------------------------------------------------------------------

function runCommand(cmd, args, opts = {}) {
    const {
        cwd = ROOT_DIR,
        env = {},
        dryRun = false,
        allowFailure = false,
        stdio = 'inherit',
    } = opts;

    const rendered = [cmd, ...args].map(quoteArg).join(' ');
    const relativeCwd = path.relative(ROOT_DIR, cwd) || '.';

    if (dryRun) {
        console.log(`${c('blue', '[dry-run]')} (${relativeCwd}) ${rendered}`);
        return { status: 0 };
    }

    const result = spawnSync(cmd, args, {
        cwd,
        env: { ...process.env, ...env },
        stdio,
    });

    if (result.error) {
        if (allowFailure) {
            warn(`Command failed to execute: ${rendered} (${result.error.message})`);
            return { status: 1, error: result.error };
        }
        fatal(`Failed to execute command: ${rendered}\n${result.error.message}`);
    }

    if ((result.status || 0) !== 0 && !allowFailure) {
        process.exit(result.status || 1);
    }

    return result;
}

/**
 * Execute a command and capture stdout/stderr for post-processing.
 * Useful for incident summaries and machine-readable output paths.
 */
function runCommandCapture(cmd, args, opts = {}) {
    const {
        cwd = ROOT_DIR,
        env = {},
        dryRun = false,
        allowFailure = false,
    } = opts;

    const rendered = [cmd, ...args].map(quoteArg).join(' ');
    const relativeCwd = path.relative(ROOT_DIR, cwd) || '.';

    if (dryRun) {
        console.log(`${c('blue', '[dry-run]')} (${relativeCwd}) ${rendered}`);
        return { status: 0, stdout: '', stderr: '' };
    }

    const result = spawnSync(cmd, args, {
        cwd,
        env: { ...process.env, ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
    });

    if (result.error) {
        if (allowFailure) {
            warn(`Command failed to execute: ${rendered} (${result.error.message})`);
            return { status: 1, stdout: '', stderr: result.error.message };
        }
        fatal(`Failed to execute command: ${rendered}\n${result.error.message}`);
    }

    const status = result.status || 0;
    if (status !== 0 && !allowFailure) {
        if (result.stderr) process.stderr.write(result.stderr);
        process.exit(status);
    }

    return {
        status,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
    };
}

// ---------------------------------------------------------------------------
// Argument parser
// ---------------------------------------------------------------------------

function parseArgs(rawArgs) {
    const options = {};
    const positionals = [];

    for (let i = 0; i < rawArgs.length; i += 1) {
        const token = rawArgs[i];

        if (token === '--') {
            positionals.push(...rawArgs.slice(i + 1));
            break;
        }

        if (token.startsWith('--')) {
            const eqIndex = token.indexOf('=');
            if (eqIndex > 2) {
                options[token.slice(2, eqIndex)] = token.slice(eqIndex + 1);
                continue;
            }
            const key = token.slice(2);
            const next = rawArgs[i + 1];
            if (next && !next.startsWith('-')) {
                options[key] = next;
                i += 1;
            } else {
                options[key] = true;
            }
            continue;
        }

        if (token.startsWith('-') && token.length > 1) {
            const key = token.slice(1);
            const next = rawArgs[i + 1];
            if (next && !next.startsWith('-')) {
                options[key] = next;
                i += 1;
            } else {
                options[key] = true;
            }
            continue;
        }

        positionals.push(token);
    }

    if (options.f && options.follow === undefined) options.follow = true;
    if (options.d && options.detach === undefined) options.detach = true;
    if (options.n && options.namespace === undefined) options.namespace = options.n;
    if (options.t && options.tail === undefined) options.tail = options.t;

    return { options, positionals };
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function toBool(value, fallback = false) {
    if (value === undefined) return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
    return fallback;
}

function uniq(list) {
    return [...new Set(list)];
}

function normalizeServiceName(name) {
    if (!name) return name;
    const key = String(name).trim();
    return SERVICE_ALIASES[key] || key;
}

function parseServiceSelection(positionals, options = {}) {
    const values = [];
    if (options.service) values.push(...String(options.service).split(','));
    if (options.services) values.push(...String(options.services).split(','));
    if (positionals && positionals.length > 0) values.push(...positionals);
    return uniq(values.map((item) => normalizeServiceName(item.trim())).filter(Boolean));
}

function resolveNodeEnv(profile) {
    const p = String(profile || 'dev').toLowerCase();
    if (['prod', 'production'].includes(p)) return 'production';
    if (['stage', 'staging'].includes(p)) return 'staging';
    return 'development';
}

function resolveEnvFile(profile) {
    const p = String(profile || '').toLowerCase();
    let file = null;
    if (!p || ['default', 'prod', 'production'].includes(p)) file = '.env';
    else if (['dev', 'development'].includes(p)) file = '.env.dev';
    else if (['stage', 'staging'].includes(p)) file = '.env.staging';
    if (!file) return null;
    const fullPath = path.join(ROOT_DIR, file);
    if (!fs.existsSync(fullPath)) {
        warn(`Env file not found: ${file}. Continuing without --env-file.`);
        return null;
    }
    return fullPath;
}

function emitJSON(payload) {
    process.stdout.write(JSON.stringify(payload, null, 2) + os.EOL);
}

/** Pad a string to a given length for tabular output. */
function pad(str, len, align = 'left') {
    const s = String(str == null ? '' : str);
    if (align === 'right') return s.padStart(len).slice(-len);
    return s.padEnd(len).slice(0, len);
}

/** Parse simple durations like 30m, 2h, 1d into seconds. */
function parseDurationToSeconds(input, fallbackSeconds = 3600) {
    if (!input) return fallbackSeconds;
    const raw = String(input).trim().toLowerCase();
    const match = raw.match(/^(\d+)(s|m|h|d)?$/);
    if (!match) return fallbackSeconds;
    const value = Number(match[1]);
    const unit = match[2] || 's';
    if (!Number.isFinite(value)) return fallbackSeconds;
    if (unit === 's') return value;
    if (unit === 'm') return value * 60;
    if (unit === 'h') return value * 3600;
    if (unit === 'd') return value * 86400;
    return fallbackSeconds;
}

function getComposeBaseArgs(options = {}) {
    const args = ['compose'];
    const envFile = resolveEnvFile(options.env || options.target);
    if (envFile) args.push('--env-file', envFile);
    if (toBool(options.admin, false)) args.push('--profile', 'admin');
    return args;
}

// ---------------------------------------------------------------------------
// Direct-mode state management
// ---------------------------------------------------------------------------

function readDirectState() {
    ensureAdminDirs();
    if (!fs.existsSync(DIRECT_STATE_FILE)) return { version: 1, processes: {} };
    try {
        const parsed = JSON.parse(fs.readFileSync(DIRECT_STATE_FILE, 'utf8'));
        return { version: parsed.version || 1, processes: parsed.processes || {} };
    } catch (error) {
        warn(`Unable to parse direct state file. Reinitializing: ${error.message}`);
        return { version: 1, processes: {} };
    }
}

function writeDirectState(state) {
    ensureAdminDirs();
    fs.writeFileSync(DIRECT_STATE_FILE, JSON.stringify(state, null, 2));
}

function isPidRunning(pid) {
    if (!pid || Number.isNaN(Number(pid))) return false;
    try { process.kill(Number(pid), 0); return true; } catch (_) { return false; }
}

function refreshDirectState() {
    const state = readDirectState();
    let changed = false;
    Object.entries(state.processes).forEach(([name, entry]) => {
        if (!entry || !isPidRunning(entry.pid)) {
            delete state.processes[name];
            changed = true;
        }
    });
    if (changed) writeDirectState(state);
    return state;
}

// ---------------------------------------------------------------------------
// Table printer
// ---------------------------------------------------------------------------

function printTable(rows) {
    if (rows.length === 0) return;
    const widths = [];
    rows.forEach((row) => {
        row.forEach((col, index) => {
            widths[index] = Math.max(widths[index] || 0, String(col).length);
        });
    });
    rows.forEach((row, index) => {
        const rendered = row.map((col, i) => String(col).padEnd(widths[i] + 2)).join('');
        if (index === 0) {
            console.log(c('bold', rendered));
            console.log('-'.repeat(rendered.length));
        } else {
            console.log(rendered);
        }
    });
}

// ---------------------------------------------------------------------------
// Shell script runner
// ---------------------------------------------------------------------------

function runBashScript(scriptName, args = [], opts = {}) {
    const scriptPath = path.join(ROOT_DIR, 'scripts', scriptName);
    if (!fs.existsSync(scriptPath)) fatal(`Script not found: scripts/${scriptName}`);

    let shell = 'bash';
    if (!commandExists('bash')) {
        if (!commandExists('sh')) fatal('No shell runtime found (bash or sh).');
        shell = 'sh';
    }
    return runCommand(shell, [scriptPath, ...args], opts);
}

// ---------------------------------------------------------------------------
// Direct component selector
// ---------------------------------------------------------------------------

function selectDirectComponents(services, options) {
    let selected = services;
    if (toBool(options.all, false)) selected = Object.keys(DIRECT_COMPONENTS);
    if (selected.length === 0) selected = [...DEFAULT_DIRECT_COMPONENTS];
    if (toBool(options.admin, false)) selected.push('security-service', 'admin_frontend');
    return uniq(selected).filter((name) => {
        if (!DIRECT_COMPONENTS[name]) {
            warn(`Unknown direct component skipped: ${name}`);
            return false;
        }
        return true;
    });
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function cmdDoctor(options) {
    const checks = [
        ['node', 'Node.js runtime'],
        ['npm', 'Node package manager'],
        ['docker', 'Docker CLI'],
        ['kubectl', 'Kubernetes CLI'],
        ['bash', 'Shell runtime'],
    ];

    const toolResults = checks.map(([tool, purpose]) => ({
        tool,
        purpose,
        available: commandExists(tool),
    }));

    // Phase 2: show active role and audit log location
    const role = resolveRole();
    const roleSource = process.env.ADMIN_CLI_ROLE
        ? 'ADMIN_CLI_ROLE env'
        : fs.existsSync(ROLE_FILE) ? '.admin-cli/role.json' : 'default';

    if (toBool(options.json, false)) {
        emitJSON({
            command: 'doctor',
            checkedAt: new Date().toISOString(),
            tools: toolResults,
            role,
            roleSource,
            paths: {
                auditLog: path.relative(ROOT_DIR, AUDIT_LOG_FILE),
                adminStateDir: path.relative(ROOT_DIR, ADMIN_HOME),
            },
        });
        return;
    }

    const rows = [['Tool', 'Purpose', 'Status']];
    toolResults.forEach(({ tool, purpose, available }) => {
        rows.push([tool, purpose, available ? c('green', 'available') : c('red', 'missing')]);
    });

    printTable(rows);
    console.log('');
    info(`Active role: ${c('bold', role)}`);
    info(`Role source: ${roleSource}`);
    info(`Audit log: ${path.relative(ROOT_DIR, AUDIT_LOG_FILE)}`);
    info(`State dir:  ${path.relative(ROOT_DIR, ADMIN_HOME)}`);

    if (toBool(options.verbose, false)) {
        info('Version details:');
        ['node', 'npm', 'docker', 'kubectl'].forEach((tool) => {
            if (commandExists(tool)) runCommand(tool, ['--version'], { allowFailure: true });
        });
    }
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

function cmdBuild(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const runtime = String(options.runtime || 'docker').toLowerCase();
    const services = parseServiceSelection(positionals, options);
    if (runtime === 'direct') return buildDirect(services, options);
    if (runtime === 'docker') return buildDocker(services, options);
    if (runtime === 'k8s' || runtime === 'kubernetes') return buildK8s(services, options);
    fatal(`Unsupported runtime for build: ${runtime}`);
}

function buildDirect(services, options) {
    const dryRun = toBool(options['dry-run'], false);
    const installDeps = toBool(options.install, false);
    const nodeEnv = resolveNodeEnv(options.env || options.target);
    const selected = selectDirectComponents(services, options);

    info(`Direct build mode (${nodeEnv}) for: ${selected.join(', ')}`);

    selected.forEach((component) => {
        const cfg = DIRECT_COMPONENTS[component];
        const cwd = path.join(ROOT_DIR, cfg.cwd);
        if (!fs.existsSync(cwd)) { warn(`Skipping ${component}: directory not found (${cfg.cwd})`); return; }
        console.log(`\n${c('bold', `== ${component} ==`)}`);
        if (installDeps && cfg.install) runCommand(cfg.install.cmd, cfg.install.args, { cwd, env: { NODE_ENV: nodeEnv }, dryRun });
        if (cfg.build) runCommand(cfg.build.cmd, cfg.build.args, { cwd, env: { NODE_ENV: nodeEnv }, dryRun });
    });

    success('Direct build workflow completed.');
}

function buildDocker(services, options) {
    if (!commandExists('docker')) fatal('Docker is required for docker runtime build.');
    const dryRun = toBool(options['dry-run'], false);
    const args = getComposeBaseArgs(options);
    args.push('build');
    const selected = services.filter((name) => DOCKER_SERVICE_SET.has(name));
    if (selected.length > 0) args.push(...selected);
    info(`Docker build with services: ${selected.length ? selected.join(', ') : 'all compose services'}`);
    runCommand('docker', args, { dryRun });
    success('Docker build completed.');
}

function buildK8s(services, options) {
    if (!commandExists('docker')) fatal('Docker is required for k8s runtime build.');
    const dryRun = toBool(options['dry-run'], false);
    const tag = String(options.tag || options.version || 'dev');

    let selected = services;
    if (toBool(options.all, false) || selected.length === 0) {
        selected = Object.keys(K8S_BUILD_CONFIG).filter((name) => name !== 'admin_frontend');
    }
    if (toBool(options.admin, false)) selected.push('admin_frontend');
    selected = uniq(selected.map(normalizeServiceName)).filter((name) => !!K8S_BUILD_CONFIG[name]);

    if (selected.length === 0) { warn('No buildable k8s components selected.'); return; }

    info(`K8s image build mode (tag=${tag}) for: ${selected.join(', ')}`);

    selected.forEach((name) => {
        const cfg = K8S_BUILD_CONFIG[name];
        const contextPath = path.join(ROOT_DIR, cfg.context);
        if (!fs.existsSync(contextPath)) { warn(`Skipping ${name}: context missing (${cfg.context})`); return; }

        const imageTag = `milonexa/${name}:${tag}`;
        const args = ['build', '-t', imageTag];
        if (cfg.dockerfile) args.push('-f', path.join(ROOT_DIR, cfg.context, cfg.dockerfile));
        if (name === 'frontend' || name === 'admin_frontend') {
            args.push('--build-arg', `REACT_APP_API_URL=${process.env.REACT_APP_API_URL || 'http://localhost:8000'}`);
        }
        args.push(contextPath);
        runCommand('docker', args, { dryRun });
        success(`Built ${imageTag}`);
    });

    success('K8s image build workflow completed.');
}

// ---------------------------------------------------------------------------
// start
// ---------------------------------------------------------------------------

function cmdStart(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const runtime = String(options.runtime || 'docker').toLowerCase();
    const services = parseServiceSelection(positionals, options);
    if (runtime === 'direct') return startDirect(services, options);
    if (runtime === 'docker') return startDocker(services, options);
    if (runtime === 'k8s' || runtime === 'kubernetes') return startK8s(services, options);
    fatal(`Unsupported runtime for start: ${runtime}`);
}

function startDocker(services, options) {
    if (!commandExists('docker')) fatal('Docker is required for docker runtime start.');
    const dryRun = toBool(options['dry-run'], false);
    const args = getComposeBaseArgs(options);
    args.push('up');
    if (toBool(options.detach, true)) args.push('-d');
    if (toBool(options.build, false)) args.push('--build');
    const selected = services.filter((name) => DOCKER_SERVICE_SET.has(name));
    if (selected.length > 0) args.push(...selected);
    info(`Docker start with services: ${selected.length ? selected.join(', ') : 'all compose services'}`);
    runCommand('docker', args, { dryRun });
    success('Docker start completed.');
}

function startDirect(services, options) {
    ensureAdminDirs();
    const dryRun = toBool(options['dry-run'], false);
    const installDeps = toBool(options.install, false);
    const nodeEnv = resolveNodeEnv(options.env || options.target);
    const selected = selectDirectComponents(services, options);
    const state = refreshDirectState();

    selected.forEach((component) => {
        const cfg = DIRECT_COMPONENTS[component];
        const cwd = path.join(ROOT_DIR, cfg.cwd);
        const current = state.processes[component];
        if (current && isPidRunning(current.pid)) { info(`${component} already running (pid=${current.pid})`); return; }
        if (!fs.existsSync(cwd)) { warn(`Skipping ${component}: directory not found (${cfg.cwd})`); return; }
        if (installDeps && cfg.install) runCommand(cfg.install.cmd, cfg.install.args, { cwd, env: { NODE_ENV: nodeEnv }, dryRun });

        if (dryRun) {
            console.log(`${c('blue', '[dry-run]')} detached start (${cfg.cwd}) ${cfg.start.cmd} ${cfg.start.args.map(quoteArg).join(' ')}`);
            return;
        }

        const logPath = path.join(DIRECT_LOG_DIR, `${component}.log`);
        const logFd = fs.openSync(logPath, 'a');
        const child = spawn(cfg.start.cmd, cfg.start.args, {
            cwd,
            env: { ...process.env, NODE_ENV: nodeEnv },
            detached: true,
            stdio: ['ignore', logFd, logFd],
        });
        child.unref();
        fs.closeSync(logFd);

        state.processes[component] = {
            pid: child.pid,
            cwd: cfg.cwd,
            command: [cfg.start.cmd, ...cfg.start.args].join(' '),
            logPath,
            startedAt: new Date().toISOString(),
            runtime: 'direct',
            env: nodeEnv,
        };
        success(`Started ${component} (pid=${child.pid})`);
    });

    if (!dryRun) {
        writeDirectState(state);
        info(`Direct process state saved: ${path.relative(ROOT_DIR, DIRECT_STATE_FILE)}`);
        info(`Logs directory: ${path.relative(ROOT_DIR, DIRECT_LOG_DIR)}`);
    }

    success('Direct start workflow completed.');
}

function startK8s(services, options) {
    if (!commandExists('kubectl')) fatal('kubectl is required for k8s runtime start.');
    const dryRun = toBool(options['dry-run'], false);
    const waitReady = toBool(options.wait, false);
    const namespace = String(options.namespace || 'milonexa');

    let manifests = services.length > 0
        ? services.map(normalizeServiceName).map((name) => K8S_MANIFEST_BY_SERVICE[name]).filter(Boolean)
        : [...K8S_DEFAULT_APPLY_SEQUENCE];

    manifests = uniq(manifests).filter((relPath) => {
        const fullPath = path.join(ROOT_DIR, relPath);
        if (!fs.existsSync(fullPath)) { warn(`Manifest not found; skipping: ${relPath}`); return false; }
        return true;
    });

    if (manifests.length === 0) { warn('No manifests selected for k8s start.'); return; }

    info(`Applying ${manifests.length} manifest(s) to Kubernetes...`);
    manifests.forEach((relPath) => {
        runCommand('kubectl', ['apply', '-f', path.join(ROOT_DIR, relPath)], { dryRun });
    });

    if (waitReady) {
        const servicesToWait = services.length > 0
            ? services.map(normalizeServiceName).filter((name) => K8S_DEPLOYMENTS.has(name))
            : ['user-service', 'content-service', 'messaging-service', 'collaboration-service',
                'media-service', 'shop-service', 'ai-service', 'streaming-service', 'api-gateway', 'frontend'];

        servicesToWait.forEach((name) => {
            runCommand('kubectl', ['-n', namespace, 'rollout', 'status', `deployment/${name}`, '--timeout=180s'], { dryRun, allowFailure: true });
        });
    }

    success('Kubernetes start workflow completed.');
}

// ---------------------------------------------------------------------------
// stop
// ---------------------------------------------------------------------------

function cmdStop(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const runtime = String(options.runtime || 'docker').toLowerCase();
    const services = parseServiceSelection(positionals, options);
    if (runtime === 'direct') return stopDirect(services, options);
    if (runtime === 'docker') return stopDocker(services, options);
    if (runtime === 'k8s' || runtime === 'kubernetes') return stopK8s(services, options);
    fatal(`Unsupported runtime for stop: ${runtime}`);
}

function stopDocker(services, options) {
    if (!commandExists('docker')) fatal('Docker is required for docker runtime stop.');
    const dryRun = toBool(options['dry-run'], false);
    const args = getComposeBaseArgs(options);
    const selected = services.filter((name) => DOCKER_SERVICE_SET.has(name));
    if (toBool(options.down, false) && selected.length === 0) {
        args.push('down', '--remove-orphans');
    } else {
        args.push('stop');
        if (selected.length > 0) args.push(...selected);
    }
    runCommand('docker', args, { dryRun });
    success('Docker stop completed.');
}

function stopDirect(services, options) {
    const dryRun = toBool(options['dry-run'], false);
    const force = toBool(options.force, false);
    const state = refreshDirectState();
    const selected = services.length > 0 ? services : Object.keys(state.processes);

    if (selected.length === 0) { warn('No direct-mode processes are currently tracked.'); return; }

    selected.forEach((name) => {
        const entry = state.processes[name];
        if (!entry) { warn(`No tracked process for ${name}`); return; }
        if (!isPidRunning(entry.pid)) { warn(`${name} is not running anymore (pid=${entry.pid})`); delete state.processes[name]; return; }

        if (dryRun) { console.log(`${c('blue', '[dry-run]')} kill ${entry.pid} (${name})`); return; }

        try {
            process.kill(Number(entry.pid), 'SIGTERM');
            success(`Stopped ${name} (pid=${entry.pid})`);
            delete state.processes[name];
        } catch (error) {
            warn(`Failed SIGTERM for ${name} (pid=${entry.pid}): ${error.message}`);
            if (force) {
                try {
                    process.kill(Number(entry.pid), 'SIGKILL');
                    success(`Force-stopped ${name} (pid=${entry.pid})`);
                    delete state.processes[name];
                } catch (killErr) {
                    warn(`Failed SIGKILL for ${name}: ${killErr.message}`);
                }
            }
        }
    });

    if (!dryRun) writeDirectState(state);
    success('Direct stop completed.');
}

function stopK8s(services, options) {
    if (!commandExists('kubectl')) fatal('kubectl is required for k8s runtime stop.');
    const dryRun = toBool(options['dry-run'], false);
    const namespace = String(options.namespace || 'milonexa');
    const selected = services.map(normalizeServiceName);

    if (selected.length === 0) {
        runCommand('kubectl', ['-n', namespace, 'scale', 'deployment', '--all', '--replicas=0'], { dryRun, allowFailure: true });
        runCommand('kubectl', ['-n', namespace, 'scale', 'statefulset', '--all', '--replicas=0'], { dryRun, allowFailure: true });
        success('Kubernetes scale-down completed for all deployments/statefulsets.');
        return;
    }

    selected.forEach((name) => {
        if (K8S_DEPLOYMENTS.has(name)) {
            runCommand('kubectl', ['-n', namespace, 'scale', 'deployment', name, '--replicas=0'], { dryRun, allowFailure: true });
        } else if (K8S_STATEFULSETS.has(name)) {
            runCommand('kubectl', ['-n', namespace, 'scale', 'statefulset', name, '--replicas=0'], { dryRun, allowFailure: true });
        } else {
            warn(`No known scalable k8s workload mapping for: ${name}`);
        }
    });

    success('Kubernetes stop workflow completed.');
}

// ---------------------------------------------------------------------------
// restart
// ---------------------------------------------------------------------------

function cmdRestart(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const runtime = String(options.runtime || 'docker').toLowerCase();
    const services = parseServiceSelection(positionals, options);

    if (runtime === 'docker') {
        const args = getComposeBaseArgs(options);
        args.push('restart');
        const selected = services.filter((name) => DOCKER_SERVICE_SET.has(name));
        if (selected.length > 0) args.push(...selected);
        runCommand('docker', args, { dryRun: toBool(options['dry-run'], false) });
        success('Docker restart completed.');
        return;
    }

    if (runtime === 'direct') {
        stopDirect(services, options);
        startDirect(services, options);
        success('Direct restart completed.');
        return;
    }

    if (runtime === 'k8s' || runtime === 'kubernetes') {
        if (!commandExists('kubectl')) fatal('kubectl is required for k8s runtime restart.');
        const namespace = String(options.namespace || 'milonexa');
        const dryRun = toBool(options['dry-run'], false);
        const targets = services.length > 0
            ? services.map(normalizeServiceName).filter((name) => K8S_DEPLOYMENTS.has(name))
            : [...K8S_DEPLOYMENTS].filter((name) => !['redis', 'minio', 'prometheus', 'alertmanager', 'grafana'].includes(name));

        targets.forEach((name) => {
            runCommand('kubectl', ['-n', namespace, 'rollout', 'restart', `deployment/${name}`], { dryRun });
        });
        success('Kubernetes rollout restart completed.');
        return;
    }

    fatal(`Unsupported runtime for restart: ${runtime}`);
}

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------

function cmdStatus(rawArgs) {
    const { options } = parseArgs(rawArgs);
    const runtime = String(options.runtime || 'docker').toLowerCase();

    if (runtime === 'docker') {
        const args = getComposeBaseArgs(options);
        args.push('ps');
        runCommand('docker', args, { dryRun: toBool(options['dry-run'], false) });
        return;
    }

    if (runtime === 'direct') {
        const state = refreshDirectState();
        const rows = [['Component', 'PID', 'Started', 'Log']];
        Object.entries(state.processes).forEach(([name, entry]) => {
            rows.push([name, entry.pid, entry.startedAt || 'n/a', path.relative(ROOT_DIR, entry.logPath || '')]);
        });
        if (rows.length === 1) { warn('No running direct-mode processes tracked.'); return; }
        printTable(rows);
        return;
    }

    if (runtime === 'k8s' || runtime === 'kubernetes') {
        const namespace = String(options.namespace || 'milonexa');
        runCommand('kubectl', ['-n', namespace, 'get', 'pods'], { dryRun: toBool(options['dry-run'], false) });
        return;
    }

    fatal(`Unsupported runtime for status: ${runtime}`);
}

// ---------------------------------------------------------------------------
// logs
// ---------------------------------------------------------------------------

function cmdLogs(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const runtime = String(options.runtime || 'docker').toLowerCase();
    const follow = toBool(options.follow, false);
    const tail = Number(options.tail || 200);

    if (runtime === 'docker') {
        const args = getComposeBaseArgs(options);
        args.push('logs', '--tail', String(Number.isFinite(tail) ? tail : 200));
        if (follow) args.push('-f');
        const selected = parseServiceSelection(positionals, options).filter((name) => DOCKER_SERVICE_SET.has(name));
        if (selected.length > 0) args.push(...selected);
        runCommand('docker', args, { dryRun: toBool(options['dry-run'], false) });
        return;
    }

    if (runtime === 'direct') {
        const selected = parseServiceSelection(positionals, options);
        const component = selected[0] || normalizeServiceName(options.service);
        if (!component) fatal('Direct logs requires --service <name> or a service positional argument.');

        const state = refreshDirectState();
        const entry = state.processes[component];
        const logPath = entry?.logPath || path.join(DIRECT_LOG_DIR, `${component}.log`);

        if (!fs.existsSync(logPath)) fatal(`Log file not found for ${component}: ${path.relative(ROOT_DIR, logPath)}`);

        if (follow) { runCommand('tail', ['-n', String(tail), '-f', logPath], { allowFailure: false }); return; }

        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split(/\r?\n/);
        console.log(lines.slice(Math.max(0, lines.length - tail)).join(os.EOL));
        return;
    }

    if (runtime === 'k8s' || runtime === 'kubernetes') {
        if (!commandExists('kubectl')) fatal('kubectl is required for k8s runtime logs.');
        const namespace = String(options.namespace || 'milonexa');
        const selected = parseServiceSelection(positionals, options);
        const service = selected[0];
        if (!service) fatal('Kubernetes logs requires --service <name> or a service positional argument.');
        const args = ['-n', namespace, 'logs', `deployment/${service}`, '--tail', String(tail)];
        if (follow) args.push('-f');
        runCommand('kubectl', args, { dryRun: toBool(options['dry-run'], false) });
        return;
    }

    fatal(`Unsupported runtime for logs: ${runtime}`);
}

// ---------------------------------------------------------------------------
// health
// ---------------------------------------------------------------------------

function cmdHealth(rawArgs) {
    const { options } = parseArgs(rawArgs);
    const gateway = options.gateway || process.env.API_GATEWAY_URL || 'http://localhost:8000';
    const timeout = String(options.timeout || process.env.TIMEOUT || '5');
    runBashScript('verify-health-checks.sh', [], {
        env: { API_GATEWAY_URL: gateway, TIMEOUT: timeout },
        dryRun: toBool(options['dry-run'], false),
    });
}

// ---------------------------------------------------------------------------
// backup
// ---------------------------------------------------------------------------

function cmdBackup(rawArgs) {
    runBashScript('backup-restore.sh', rawArgs, { dryRun: false });
}

// ---------------------------------------------------------------------------
// monitor
// ---------------------------------------------------------------------------

function cmdMonitor(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const action = String(positionals[0] || 'cache').toLowerCase();

    if (action === 'cache') {
        const interval = positionals[1] || options.interval;
        runBashScript('monitor-cache.sh', interval ? [String(interval)] : [], { dryRun: toBool(options['dry-run'], false) });
        return;
    }
    if (action === 'error-budget') {
        runBashScript('error-budget-report.sh', rawArgs.slice(1), { dryRun: toBool(options['dry-run'], false) });
        return;
    }
    if (action === 'release-health') {
        runBashScript('release-health-check.sh', rawArgs.slice(1), { dryRun: toBool(options['dry-run'], false) });
        return;
    }
    if (action === 'drift') {
        runBashScript('config-drift-detect.sh', rawArgs.slice(1), { dryRun: toBool(options['dry-run'], false) });
        return;
    }

    fatal(`Unknown monitor action: ${action}. Use cache | error-budget | release-health | drift`);
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------

function cmdRun(rawArgs) {
    if (rawArgs.length === 0) fatal('Usage: run <script-name> [args...]');
    runCommand('node', [path.join(ROOT_DIR, 'scripts', 'run-portable.js'), ...rawArgs], { dryRun: false });
}

// ---------------------------------------------------------------------------
// Phase 3: scale
// ---------------------------------------------------------------------------

function cmdScale(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const runtime = String(options.runtime || 'k8s').toLowerCase();
    const services = parseServiceSelection(positionals, options);
    const replicasRaw = options.replicas ?? options.r;
    const replicas = Number(replicasRaw);

    if (!Number.isInteger(replicas) || replicas < 0) {
        fatal('scale requires --replicas <non-negative-integer>. Example: scale --runtime k8s --service api-gateway --replicas 3');
    }

    if (runtime === 'docker') return scaleDocker(services, replicas, options);
    if (runtime === 'k8s' || runtime === 'kubernetes') return scaleK8s(services, replicas, options);

    fatal(`Unsupported runtime for scale: ${runtime}. Use docker or k8s.`);
}

function scaleDocker(services, replicas, options) {
    if (!commandExists('docker')) fatal('Docker is required for docker runtime scale.');

    const dryRun = toBool(options['dry-run'], false);
    const selected = services.filter((name) => DOCKER_SERVICE_SET.has(name));

    if (selected.length === 0) {
        fatal('Docker scale requires at least one valid service. Example: --service api-gateway');
    }

    const args = getComposeBaseArgs(options);
    args.push('up', '-d');
    selected.forEach((service) => {
        args.push('--scale', `${service}=${replicas}`);
    });
    args.push(...selected);

    info(`Docker scale: ${selected.join(', ')} => ${replicas} replica(s)`);
    runCommand('docker', args, { dryRun });
    success('Docker scale operation completed.');
}

function scaleK8s(services, replicas, options) {
    if (!commandExists('kubectl')) fatal('kubectl is required for k8s runtime scale.');

    const dryRun = toBool(options['dry-run'], false);
    const waitReady = toBool(options.wait, false);
    const namespace = String(options.namespace || 'milonexa');

    let selected = services.map(normalizeServiceName);
    if (selected.length === 0) {
        if (toBool(options.all, false)) {
            selected = [...new Set([...K8S_DEPLOYMENTS, ...K8S_STATEFULSETS])];
        } else {
            fatal('Kubernetes scale requires --service <name> (or --all for all workloads).');
        }
    }

    const summaryRows = [['Workload', 'Type', 'Replicas']];

    selected.forEach((name) => {
        if (K8S_DEPLOYMENTS.has(name)) {
            runCommand('kubectl', ['-n', namespace, 'scale', 'deployment', name, `--replicas=${replicas}`], { dryRun });
            summaryRows.push([name, 'deployment', replicas]);
            if (waitReady) {
                runCommand('kubectl', ['-n', namespace, 'rollout', 'status', `deployment/${name}`, '--timeout=180s'], {
                    dryRun,
                    allowFailure: true,
                });
            }
            return;
        }

        if (K8S_STATEFULSETS.has(name)) {
            runCommand('kubectl', ['-n', namespace, 'scale', 'statefulset', name, `--replicas=${replicas}`], { dryRun });
            summaryRows.push([name, 'statefulset', replicas]);
            return;
        }

        warn(`Unknown k8s workload mapping skipped: ${name}`);
    });

    printTable(summaryRows);
    success('Kubernetes scale operation completed.');
}

// ---------------------------------------------------------------------------
// Phase 3: rollout
// ---------------------------------------------------------------------------

function cmdRollout(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const runtime = String(options.runtime || 'k8s').toLowerCase();
    const strategy = String(options.strategy || 'rolling').toLowerCase();
    const dryRun = toBool(options['dry-run'], false);

    if (runtime === 'docker') {
        const services = parseServiceSelection(positionals, options).filter((name) => DOCKER_SERVICE_SET.has(name));
        const args = getComposeBaseArgs(options);
        args.push('restart');
        if (services.length > 0) args.push(...services);
        info(`Docker rollout (${strategy}) mapped to restart for: ${services.length ? services.join(', ') : 'all services'}`);
        runCommand('docker', args, { dryRun });
        success('Docker rollout operation completed.');
        return;
    }

    if (!(runtime === 'k8s' || runtime === 'kubernetes')) {
        fatal(`Unsupported runtime for rollout: ${runtime}. Use k8s or docker.`);
    }

    if (!commandExists('kubectl')) fatal('kubectl is required for k8s rollout operations.');

    const namespace = String(options.namespace || 'milonexa');
    const waitReady = toBool(options.wait, true);
    let services = parseServiceSelection(positionals, options).map(normalizeServiceName);

    if (services.length === 0 && toBool(options.all, false)) {
        services = [...K8S_DEPLOYMENTS].filter((name) => !['redis', 'minio', 'prometheus', 'alertmanager', 'grafana'].includes(name));
    }

    if (['rolling', 'restart', 'canary', 'status', 'undo'].includes(strategy) && services.length === 0) {
        fatal(`rollout --strategy ${strategy} requires --service <name> (or --all).`);
    }

    if (strategy === 'rolling' || strategy === 'restart') {
        services.forEach((name) => {
            runCommand('kubectl', ['-n', namespace, 'rollout', 'restart', `deployment/${name}`], { dryRun });
            if (waitReady) {
                runCommand('kubectl', ['-n', namespace, 'rollout', 'status', `deployment/${name}`, '--timeout=300s'], {
                    dryRun,
                    allowFailure: true,
                });
            }
        });
        success(`Kubernetes ${strategy} rollout completed.`);
        return;
    }

    if (strategy === 'status') {
        services.forEach((name) => {
            runCommand('kubectl', ['-n', namespace, 'rollout', 'status', `deployment/${name}`, '--timeout=300s'], {
                dryRun,
                allowFailure: true,
            });
        });
        return;
    }

    if (strategy === 'undo' || strategy === 'rollback') {
        services.forEach((name) => {
            runCommand('kubectl', ['-n', namespace, 'rollout', 'undo', `deployment/${name}`], { dryRun });
        });
        success('Kubernetes rollback completed.');
        return;
    }

    if (strategy === 'bluegreen') {
        const target = String(options.target || 'green').toLowerCase();
        const scriptArgs = ['--target', target, '--namespace', namespace];
        if (toBool(options['skip-migrations'], false)) scriptArgs.push('--skip-migrations');
        runBashScript('validate-bluegreen-config.sh', scriptArgs, {
            dryRun,
        });

        if (toBool(options.switch, false)) {
            warn('Blue/green slot switching is environment-specific; validation passed, perform switch in your ingress/service routing layer.');
        }
        success('Blue/green validation rollout completed.');
        return;
    }

    if (strategy === 'canary') {
        const image = options.image ? String(options.image) : '';
        const container = options.container ? String(options.container) : '';
        const runGate = options.gate === undefined ? true : toBool(options.gate, true);
        const autoRollback = toBool(options['auto-rollback'], true);

        services.forEach((name) => {
            if (image) {
                const containerName = container || name;
                runCommand('kubectl', ['-n', namespace, 'set', 'image', `deployment/${name}`, `${containerName}=${image}`], { dryRun });
            } else {
                runCommand('kubectl', ['-n', namespace, 'rollout', 'restart', `deployment/${name}`], { dryRun });
            }

            if (waitReady) {
                runCommand('kubectl', ['-n', namespace, 'rollout', 'status', `deployment/${name}`, '--timeout=300s'], {
                    dryRun,
                    allowFailure: true,
                });
            }
        });

        if (runGate) {
            const gateResult = runBashScript('release-health-check.sh', [], {
                dryRun,
                allowFailure: true,
                env: {
                    API_GATEWAY_URL: options.gateway || process.env.API_GATEWAY_URL || 'http://localhost:8000',
                    PROMETHEUS_URL: options.prometheus || process.env.PROMETHEUS_URL || 'http://localhost:9090',
                    TIMEOUT: String(options.timeout || process.env.TIMEOUT || '5'),
                },
            });

            if ((gateResult.status || 0) !== 0) {
                warn('Canary health gate failed.');
                if (autoRollback) {
                    warn('Auto-rollback enabled. Reverting updated deployments...');
                    services.forEach((name) => {
                        runCommand('kubectl', ['-n', namespace, 'rollout', 'undo', `deployment/${name}`], {
                            dryRun,
                            allowFailure: true,
                        });
                    });
                }
                fatal('Canary rollout failed health gate.');
            }
        }

        success('Canary rollout completed successfully.');
        return;
    }

    fatal(`Unknown rollout strategy: ${strategy}. Use rolling|canary|bluegreen|status|undo`);
}

// ---------------------------------------------------------------------------
// Phase 3: check
// ---------------------------------------------------------------------------

function cmdCheck(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const dryRun = toBool(options['dry-run'], false);
    const action = String(positionals[0] || 'all').toLowerCase();

    const validActions = new Set(['all', 'drift', 'release-gate', 'image-tags', 'bluegreen']);
    if (!validActions.has(action)) {
        fatal(`Unknown check action: ${action}. Use all|drift|release-gate|image-tags|bluegreen`);
    }

    const actions = action === 'all' ? ['drift', 'release-gate', 'image-tags', 'bluegreen'] : [action];
    const results = [];

    actions.forEach((item) => {
        if (item === 'drift') {
            const scriptArgs = [];
            if (options.env) scriptArgs.push('--env', String(options.env));
            if (options.namespace) scriptArgs.push('--namespace', String(options.namespace));
            const result = runBashScript('config-drift-detect.sh', scriptArgs, {
                dryRun,
                allowFailure: true,
            });
            results.push({ check: item, status: (result.status || 0) === 0 ? 'pass' : 'fail' });
            return;
        }

        if (item === 'release-gate') {
            const result = runBashScript('release-health-check.sh', [], {
                dryRun,
                allowFailure: true,
                env: {
                    API_GATEWAY_URL: options.gateway || process.env.API_GATEWAY_URL || 'http://localhost:8000',
                    PROMETHEUS_URL: options.prometheus || process.env.PROMETHEUS_URL || 'http://localhost:9090',
                    TIMEOUT: String(options.timeout || process.env.TIMEOUT || '5'),
                },
            });
            results.push({ check: item, status: (result.status || 0) === 0 ? 'pass' : 'fail' });
            return;
        }

        if (item === 'image-tags') {
            const scriptArgs = [];
            if (options.namespace) scriptArgs.push('--namespace', String(options.namespace));
            if (options.generate) {
                scriptArgs.push('--generate', String(options.generate));
            } else if (options.service && options.tag) {
                scriptArgs.push('--service', String(options.service), '--tag', String(options.tag));
            } else {
                scriptArgs.push('--all');
            }
            const result = runBashScript('validate-image-tags.sh', scriptArgs, {
                dryRun,
                allowFailure: true,
            });
            results.push({ check: item, status: (result.status || 0) === 0 ? 'pass' : 'fail' });
            return;
        }

        if (item === 'bluegreen') {
            const target = String(options.target || 'green');
            const scriptArgs = ['--target', target];
            if (options.namespace) scriptArgs.push('--namespace', String(options.namespace));
            if (toBool(options['skip-migrations'], false)) scriptArgs.push('--skip-migrations');

            const result = runBashScript('validate-bluegreen-config.sh', scriptArgs, {
                dryRun,
                allowFailure: true,
            });
            results.push({ check: item, status: (result.status || 0) === 0 ? 'pass' : 'fail' });
        }
    });

    if (toBool(options.json, false)) {
        emitJSON({
            command: 'check',
            action,
            checkedAt: new Date().toISOString(),
            results,
        });
    } else {
        const rows = [['Check', 'Result']];
        results.forEach((r) => rows.push([r.check, r.status === 'pass' ? c('green', 'pass') : c('red', 'fail')]));
        printTable(rows);
    }

    const failed = results.filter((r) => r.status !== 'pass').length;
    if (failed > 0) {
        fatal(`check detected ${failed} failing validation(s).`);
    }

    success('All selected checks passed.');
}

// ---------------------------------------------------------------------------
// Phase 4 (initial): incident summarize
// ---------------------------------------------------------------------------

function cmdIncident(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const action = String(positionals[0] || 'summarize').toLowerCase();

    if (action !== 'summarize') {
        fatal(`Unknown incident action: ${action}. Supported: summarize`);
    }

    const runtime = String(options.runtime || 'docker').toLowerCase();
    const service = normalizeServiceName(options.service || positionals[1]);
    const tail = Number(options.tail || 800);
    const since = String(options.since || '1h');
    const dryRun = toBool(options['dry-run'], false);

    if (!service) {
        fatal('incident summarize requires --service <name>.');
    }

    let logsText = '';

    if (runtime === 'docker') {
        if (!commandExists('docker')) fatal('Docker is required for docker runtime incident summaries.');
        const args = getComposeBaseArgs(options);
        args.push('logs', '--no-color', '--tail', String(Number.isFinite(tail) ? tail : 800), '--since', since, service);
        const result = runCommandCapture('docker', args, { dryRun, allowFailure: true });
        if ((result.status || 0) !== 0) fatal(`Could not read docker logs for ${service}.`);
        logsText = result.stdout;
    } else if (runtime === 'k8s' || runtime === 'kubernetes') {
        if (!commandExists('kubectl')) fatal('kubectl is required for k8s runtime incident summaries.');
        const namespace = String(options.namespace || 'milonexa');
        const sinceSeconds = parseDurationToSeconds(since, 3600);
        const args = ['-n', namespace, 'logs', `deployment/${service}`, '--tail', String(Number.isFinite(tail) ? tail : 800), '--since', `${sinceSeconds}s`];
        const result = runCommandCapture('kubectl', args, { dryRun, allowFailure: true });
        if ((result.status || 0) !== 0) fatal(`Could not read k8s logs for deployment/${service}.`);
        logsText = result.stdout;
    } else if (runtime === 'direct') {
        const state = refreshDirectState();
        const entry = state.processes[service];
        const logPath = entry?.logPath || path.join(DIRECT_LOG_DIR, `${service}.log`);
        if (!fs.existsSync(logPath)) fatal(`Log file not found for ${service}: ${path.relative(ROOT_DIR, logPath)}`);
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split(/\r?\n/);
        logsText = lines.slice(Math.max(0, lines.length - (Number.isFinite(tail) ? tail : 800))).join(os.EOL);
    } else {
        fatal(`Unsupported runtime for incident summarize: ${runtime}`);
    }

    if (dryRun) {
        success('Incident summarize dry-run completed.');
        return;
    }

    const lines = logsText.split(/\r?\n/).filter(Boolean);
    const errorRe = /(error|exception|fatal|panic|unhandled|timeout|failed|refused|unavailable)/i;
    const warnRe = /\bwarn(ing)?\b/i;
    const latencyRe = /(slow|latency|timeout|timed out|deadline exceeded)/i;

    let errorCount = 0;
    let warnCount = 0;
    let latencyCount = 0;

    const signatures = new Map();
    lines.forEach((line) => {
        if (errorRe.test(line)) errorCount += 1;
        if (warnRe.test(line)) warnCount += 1;
        if (latencyRe.test(line)) latencyCount += 1;

        if (errorRe.test(line) || warnRe.test(line)) {
            const sig = line
                .replace(/\d{4}-\d{2}-\d{2}[^\s]*/g, '<ts>')
                .replace(/[0-9a-f]{8,}/gi, '<id>')
                .replace(/\b\d+\b/g, '#')
                .trim()
                .slice(0, 160);
            signatures.set(sig, (signatures.get(sig) || 0) + 1);
        }
    });

    const topSignatures = [...signatures.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([signature, count]) => ({ signature, count }));

    const summary = {
        command: 'incident summarize',
        service,
        runtime,
        since,
        tail,
        analyzedAt: new Date().toISOString(),
        totals: {
            lines: lines.length,
            errors: errorCount,
            warnings: warnCount,
            latencySignals: latencyCount,
        },
        topSignatures,
        recommendations: [
            errorCount > 0 ? 'Inspect top error signatures and correlate with recent deploys.' : 'No high-severity error surge detected in sampled logs.',
            latencyCount > 0 ? 'Run `check release-gate` and verify upstream dependencies/DB latency.' : 'No dominant latency signature in sampled logs.',
            'If issue persists, run `rollout --strategy undo --service <name>` for fast rollback.',
        ],
    };

    if (options.export) {
        const exportPath = path.isAbsolute(String(options.export))
            ? String(options.export)
            : path.join(ROOT_DIR, String(options.export));
        fs.writeFileSync(exportPath, JSON.stringify(summary, null, 2));
        info(`Incident summary exported to: ${path.relative(ROOT_DIR, exportPath)}`);
    }

    if (toBool(options.json, false)) {
        emitJSON(summary);
        return;
    }

    console.log(`${c('bold', 'Incident Summary')}`);
    console.log(`Service: ${service}`);
    console.log(`Runtime: ${runtime}`);
    console.log(`Window:  ${since} (tail=${tail})`);
    console.log('');
    printTable([
        ['Metric', 'Value'],
        ['Lines analyzed', summary.totals.lines],
        ['Error signals', summary.totals.errors],
        ['Warning signals', summary.totals.warnings],
        ['Latency signals', summary.totals.latencySignals],
    ]);

    if (topSignatures.length > 0) {
        console.log('');
        console.log(c('bold', 'Top signatures'));
        topSignatures.forEach((entry, idx) => {
            console.log(`${idx + 1}. [${entry.count}] ${entry.signature}`);
        });
    }

    console.log('');
    console.log(c('bold', 'Recommendations'));
    summary.recommendations.forEach((rec, idx) => {
        console.log(`${idx + 1}. ${rec}`);
    });
}

// ---------------------------------------------------------------------------
// Phase 2: role viewer (viewer-accessible, read-only)
// ---------------------------------------------------------------------------

function cmdRole(rawArgs = []) {
    const { options } = parseArgs(rawArgs);
    const current = resolveRole();
    const source = process.env.ADMIN_CLI_ROLE
        ? 'ADMIN_CLI_ROLE env'
        : fs.existsSync(ROLE_FILE) ? '.admin-cli/role.json' : 'default';

    if (toBool(options.json, false)) {
        emitJSON({
            command: 'role',
            role: current,
            source,
            roleFile: path.relative(ROOT_DIR, ROLE_FILE),
            validRoles: ROLES,
            checkedAt: new Date().toISOString(),
        });
        return;
    }

    console.log(`${c('bold', 'Active role:')} ${current}  (source: ${source})`);
    console.log(`${c('bold', 'Valid roles:')} ${ROLES.join(', ')}`);
    console.log(`${c('bold', 'Role file:  ')} ${path.relative(ROOT_DIR, ROLE_FILE)}`);
    console.log(`\nChange role (requires admin): node admin-cli/index.js set-role <role>`);
}

// ---------------------------------------------------------------------------
// Phase D: Metrics tracking
// ---------------------------------------------------------------------------

function cmdMetrics(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const action = positionals[0] || 'status';
    const metricsDir = path.join(ADMIN_HOME, 'metrics');
    const collector = new MetricsCollector(metricsDir);

    if (action === 'status') {
        const filters = {
            service: options.service,
            category: options.category,
            since: options.since ? new Date(Date.now() - parseInt(options.since) * 1000).toISOString() : null,
        };

        const metrics = collector.query(filters);
        const stats = metrics.length > 0 ? collector.aggregate(filters) : {};

        if (toBool(options.json, false)) {
            emitJSON({ command: 'metrics status', stats, count: metrics.length });
        } else {
            console.log(`${c('bold', 'Metrics Summary')}`);
            console.log(`  Category: ${options.category || 'all'}`);
            console.log(`  Service: ${options.service || 'all'}`);
            console.log(`  Records: ${metrics.length}`);
            if (Object.keys(stats).length > 0) {
                console.log(`  Min: ${stats.min}, Max: ${stats.max}, Avg: ${stats.avg}`);
            }
        }
        return;
    }

    if (action === 'record') {
        const category = options.category || 'custom';
        const value = parseFloat(options.value) || 0;
        const unit = options.unit || 'count';
        const service = options.service || 'unknown';
        const runtime = options.runtime || 'direct';
        const result = collector.record(category, runtime, service, value, unit);
        success(`Metric recorded: ${category}=${value}${unit}`);
        return;
    }

    if (action === 'anomalies') {
        const thresholds = DEFAULT_THRESHOLDS;
        const anomalies = collector.detectAnomalies(thresholds);
        if (toBool(options.json, false)) {
            emitJSON({ command: 'metrics anomalies', anomalies, count: anomalies.length });
        } else {
            console.log(`${c('bold', `Anomalies detected: ${anomalies.length}`)}`);
            for (const a of anomalies) {
                console.log(`  [${a.severity}] ${a.service} ${a.category}: ${a.value} (threshold: ${a.threshold})`);
            }
        }
        return;
    }

    fatal(`Unknown metrics action: ${action}`);
}

// ---------------------------------------------------------------------------
// Phase D: Alert management
// ---------------------------------------------------------------------------

function cmdAlerts(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const action = positionals[0] || 'list';
    const alertsDir = path.join(ADMIN_HOME, 'alerts');
    const manager = new AlertManager(alertsDir);

    if (action === 'list') {
        const rules = manager.listRules({ enabled: options.enabled !== 'false' });
        if (toBool(options.json, false)) {
            emitJSON({ command: 'alerts list', rules, count: rules.length });
        } else {
            console.log(`${c('bold', `Alert Rules: ${rules.length}`)}`);
            for (const r of rules) {
                const enabled = r.enabled ? c('green', '✓') : c('red', '✗');
                console.log(`  ${enabled} ${r.name} (${r.severity})`);
            }
        }
        return;
    }

    if (action === 'history') {
        const history = manager.getHistory({ status: options.status, severity: options.severity });
        const stats = manager.getStats();
        if (toBool(options.json, false)) {
            emitJSON({ command: 'alerts history', history, stats });
        } else {
            console.log(`${c('bold', 'Alert Stats')}`);
            console.log(`  Active: ${stats.active}, Resolved: ${stats.resolved}, Critical: ${stats.critical}`);
            console.log(`${c('bold', `Recent alerts: ${history.length}`)}`);
            for (const a of history.slice(0, 10)) {
                console.log(`  [${a.status}] ${a.ruleName}: ${a.message}`);
            }
        }
        return;
    }

    if (action === 'acknowledge') {
        const alertId = positionals[1];
        manager.acknowledgeAlert(alertId);
        success(`Alert ${alertId} acknowledged`);
        return;
    }

    fatal(`Unknown alerts action: ${action}`);
}

// ---------------------------------------------------------------------------
// Phase D: Policy-as-Code engine
// ---------------------------------------------------------------------------

function cmdPolicies(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const action = positionals[0] || 'list';
    const policiesDir = path.join(ADMIN_HOME, 'policies');
    const engine = new PolicyEngine(policiesDir);

    if (action === 'list') {
        const policies = engine.listPolicies({ type: options.type });
        if (toBool(options.json, false)) {
            emitJSON({ command: 'policies list', policies, count: policies.length });
        } else {
            console.log(`${c('bold', `Policies: ${policies.length}`)}`);
            for (const p of policies) {
                console.log(`  [${p.spec.type}] ${p.metadata.name}`);
            }
        }
        return;
    }

    if (action === 'evaluate') {
        const request = {
            action: options.action || 'unknown',
            role: options.role || 'operator',
            runtime: options.runtime || 'docker',
            service: options.service,
            environment: options.env,
        };
        const result = engine.evaluate(request);
        if (toBool(options.json, false)) {
            emitJSON({ command: 'policies evaluate', request, result });
        } else {
            const status = result.allowed ? c('green', 'ALLOWED') : c('red', 'DENIED');
            console.log(`${c('bold', 'Policy Evaluation')}`);
            console.log(`  Status: ${status}`);
            console.log(`  Reason: ${result.reason}`);
            if (result.appliedPolicies.length > 0) {
                console.log(`  Applied: ${result.appliedPolicies.join(', ')}`);
            }
        }
        return;
    }

    fatal(`Unknown policies action: ${action}`);
}

// ---------------------------------------------------------------------------
// Phase D: Cost analysis and budgeting
// ---------------------------------------------------------------------------

function cmdCosts(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const action = positionals[0] || 'summary';
    const costDir = path.join(ADMIN_HOME, 'costs');
    const analyzer = new CostAnalyzer(costDir);

    if (action === 'summary') {
        const summary = analyzer.getCostSummary({ service: options.service });
        if (toBool(options.json, false)) {
            emitJSON({ command: 'costs summary', summary });
        } else {
            console.log(`${c('bold', 'Cost Summary (Monthly)')}`);
            console.log(`  Total: $${summary.total}`);
            if (Object.keys(summary.byService).length > 0) {
                console.log(`${c('bold', '  By Service:')}`);
                for (const [svc, cost] of Object.entries(summary.byService)) {
                    console.log(`    ${svc}: $${cost.toFixed(2)}`);
                }
            }
        }
        return;
    }

    if (action === 'budget') {
        const status = analyzer.checkBudgetStatus();
        if (toBool(options.json, false)) {
            emitJSON({ command: 'costs budget', status });
        } else {
            const color = status.exceeded ? 'red' : 'green';
            console.log(`${c('bold', 'Budget Status')}`);
            console.log(`  Usage: $${status.usage} / $${status.budget} (${c(color, status.percentUsed + '%')})`);
            console.log(`  Forecasted: $${status.forecastedTotal}`);
            if (status.categoryExceeded && status.categoryExceeded.length > 0) {
                console.log(`${c('bold', '  Exceeded Categories:')}`);
                for (const cat of status.categoryExceeded) {
                    console.log(`    ${cat.category}: $${cat.usage} / $${cat.budget}`);
                }
            }
        }
        return;
    }

    if (action === 'optimize') {
        const opportunities = analyzer.identifyOptimizations();
        if (toBool(options.json, false)) {
            emitJSON({ command: 'costs optimize', opportunities });
        } else {
            console.log(`${c('bold', `Cost Optimization Opportunities: ${opportunities.length}`)}`);
            for (const opp of opportunities) {
                console.log(`  • ${opp.recommendation}`);
            }
        }
        return;
    }

    fatal(`Unknown costs action: ${action}`);
}

// ---------------------------------------------------------------------------
// Phase D: Compliance auditing
// ---------------------------------------------------------------------------

function cmdCompliance(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const action = positionals[0] || 'status';
    const complianceDir = path.join(ADMIN_HOME, 'compliance');
    const manager = new ComplianceManager(complianceDir);

    if (action === 'status') {
        const status = manager.getStatus({ category: options.category });
        if (toBool(options.json, false)) {
            emitJSON({ command: 'compliance status', summary: status.summary || status });
        } else {
            const score = status.complianceScore ? status.complianceScore : ((status.passed / status.total) * 100).toFixed(1) + '%';
            console.log(`${c('bold', 'Compliance Status')}`);
            console.log(`  Score: ${score}`);
            console.log(`  Passed: ${status.passed}/${status.total}`);
            if (status.summary) {
                console.log(`  Failed: ${status.summary.failed}, Warnings: ${status.summary.warnings}`);
            }
        }
        return;
    }

    if (action === 'report') {
        const format = options.format || 'summary';
        const report = manager.generateReport(format);
        if (toBool(options.json, false)) {
            emitJSON({ command: 'compliance report', report });
        } else {
            console.log(`${c('bold', 'Compliance Report')}`);
            console.log(`  Generated: ${report.timestamp}`);
            console.log(`  Score: ${report.summary.complianceScore}`);
            if (report.recommendations) {
                console.log(`${c('bold', '  Recommendations:')}`);
                for (const rec of report.recommendations.slice(0, 5)) {
                    console.log(`    • ${rec.remediation}`);
                }
            }
        }
        return;
    }

    fatal(`Unknown compliance action: ${action}`);
}

// ---------------------------------------------------------------------------
// Phase D: Recommendations engine
// ---------------------------------------------------------------------------

function cmdRecommendations(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const action = positionals[0] || 'top';
    const recsDir = path.join(ADMIN_HOME, 'recommendations');
    const engine = new RecommendationEngine(recsDir);

    if (action === 'top') {
        const limit = parseInt(options.limit) || 10;
        const recs = engine.getTopRecommendations(limit);
        if (toBool(options.json, false)) {
            emitJSON({ command: 'recommendations top', recommendations: recs, count: recs.length });
        } else {
            console.log(`${c('bold', `Top ${Math.min(limit, recs.length)} Recommendations`)}`);
            for (const rec of recs.slice(0, limit)) {
                const impact = { high: c('red', 'HIGH'), medium: c('yellow', 'MED'), low: 'LOW' }[rec.impact] || 'MED';
                console.log(`  [${impact}] ${rec.title}`);
                console.log(`     ${rec.description}`);
            }
        }
        return;
    }

    if (action === 'dismiss') {
        const recId = positionals[1];
        engine.dismissRecommendation(recId);
        success(`Recommendation ${recId} dismissed`);
        return;
    }

    if (action === 'implement') {
        const recId = positionals[1];
        engine.implementRecommendation(recId);
        success(`Recommendation ${recId} marked as implemented`);
        return;
    }

    fatal(`Unknown recommendations action: ${action}`);
}

// ---------------------------------------------------------------------------
// Phase D: Dashboard/TUI
// ---------------------------------------------------------------------------

function cmdDashboard(rawArgs) {
    const { options } = parseArgs(rawArgs);
    const interval = parseInt(options.interval) || 5;

    if (!toBool(options.json, false)) {
        console.log(`${c('cyan', '╔═══════════════════════════════════════════════╗')}`);
        console.log(`${c('cyan', '║  Milonexa Admin Dashboard — Press Ctrl+C Exit   ║')}`);
        console.log(`${c('cyan', '╚═══════════════════════════════════════════════╝')}`);
        console.log('');
        console.log(`${c('bold', 'Operations Summary')}  [Updated every ${interval}s]`);
    }

    // Collect dashboard metrics
    const metricsDir = path.join(ADMIN_HOME, 'metrics');
    const collector = new MetricsCollector(metricsDir);
    const metrics = collector.query();

    const alertsDir = path.join(ADMIN_HOME, 'alerts');
    const alertMgr = new AlertManager(alertsDir);
    const alertStats = alertMgr.getStats();

    const complianceDir = path.join(ADMIN_HOME, 'compliance');
    const complianceMgr = new ComplianceManager(complianceDir);
    const complianceStatus = complianceMgr.getStatus();

    const costDir = path.join(ADMIN_HOME, 'costs');
    const costAnalyzer = new CostAnalyzer(costDir);
    const budgetStatus = costAnalyzer.checkBudgetStatus();

    const slaDir = path.join(ADMIN_HOME, 'sla');
    const slaMgr = new SLAManager(slaDir);
    const slaSummary = slaMgr.getSummary();

    const webhooksDir = path.join(ADMIN_HOME, 'webhooks');
    const webhookMgr = new WebhookManager(webhooksDir);
    const webhookStats = webhookMgr.getStats();

    if (toBool(options.json, false)) {
        emitJSON({
            command: 'dashboard',
            timestamp: new Date().toISOString(),
            metrics: { count: metrics.length },
            alerts: alertStats,
            compliance: { ...complianceStatus, checks: undefined },
            budget: budgetStatus,
            sla: slaSummary,
            webhooks: webhookStats,
        });
    } else {
        console.log(`  Alerts: ${alertStats.active} active, ${alertStats.critical} critical`);
        console.log(`  Compliance: ${complianceStatus.passed}/${complianceStatus.total} passed`);
        console.log(`  Budget: $${budgetStatus.usage}/$${budgetStatus.budget} (${budgetStatus.percentUsed}%)`);
        console.log(`  Metrics: ${metrics.length} data points collected`);
        console.log(`  SLA: ${slaSummary.ok}/${slaSummary.total} OK, ${slaSummary.atRisk} at risk, ${slaSummary.breached} breached`);
        console.log(`  Webhooks: ${webhookStats.total} configured, ${webhookStats.deliveries} deliveries`);
        console.log('');
        console.log('For interactive TUI: node admin-cli/index.js tui');
        console.log('Commands: metrics, alerts, compliance, costs, recommendations, sla, webhooks, trends, cluster, remediate');
    }
}

// ---------------------------------------------------------------------------
// Phase E: Interactive TUI
// ---------------------------------------------------------------------------

function cmdTUI(rawArgs) {
    const { options } = parseArgs(rawArgs);
    const interval = parseInt(options.interval) || 3;

    const metricsDir = path.join(ADMIN_HOME, 'metrics');
    const alertsDir = path.join(ADMIN_HOME, 'alerts');
    const complianceDir = path.join(ADMIN_HOME, 'compliance');
    const costDir = path.join(ADMIN_HOME, 'costs');
    const slaDir = path.join(ADMIN_HOME, 'sla');
    const clustersDir = path.join(ADMIN_HOME, 'clusters');

    const dashboard = new TUIDashboard({
        interval,
        metricsCollector: new MetricsCollector(metricsDir),
        alertManager: new AlertManager(alertsDir),
        slaManager: new SLAManager(slaDir),
        costAnalyzer: new CostAnalyzer(costDir),
        complianceManager: new ComplianceManager(complianceDir),
        multiClusterManager: new MultiClusterManager(clustersDir),
    });

    dashboard.start();
}

// ---------------------------------------------------------------------------
// Phase E: Webhook Integrations
// ---------------------------------------------------------------------------

async function cmdWebhooks(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const action = positionals[0] || 'list';
    const webhooksDir = path.join(ADMIN_HOME, 'webhooks');
    const mgr = new WebhookManager(webhooksDir);
    const jsonMode = toBool(options.json, false);

    if (action === 'list') {
        const type = options.type || null;
        const hooks = mgr.listWebhooks(type);
        if (jsonMode) { emitJSON({ command: 'webhooks list', webhooks: hooks, stats: mgr.getStats() }); return; }
        console.log(`${c('bold', 'Webhooks')}  (${hooks.length} total)\n`);
        if (hooks.length === 0) {
            console.log(c('yellow', '  No webhooks configured.'));
            console.log('  Add one: node admin-cli/index.js webhooks add --type slack --name "My Slack" --url https://hooks.slack.com/...');
            return;
        }
        console.log(`  ${'TYPE'.padEnd(12)} ${'NAME'.padEnd(25)} ${'STATUS'.padEnd(10)} ${'SEVERITY'.padEnd(10)} ID`);
        console.log(`  ${'─'.repeat(80)}`);
        for (const h of hooks) {
            const statusStr = h.enabled ? c('green', 'enabled') : c('gray', 'disabled');
            console.log(`  ${pad(h.type || '-', 12)} ${pad(h.name, 25)} ${statusStr.padEnd(10)} ${pad(h.severity || 'all', 10)} ${h.id}`);
        }
        console.log('');
        const stats = mgr.getStats();
        console.log(`  Total deliveries: ${stats.deliveries}`);
        return;
    }

    if (action === 'add') {
        const type = options.type;
        if (!type) fatal('--type is required (slack|teams|pagerduty|github)');
        const hook = mgr.addWebhook(type, {
            name: options.name || type,
            url: options.url || '',
            token: options.token || '',
            channel: options.channel || '',
            severity: options.severity || 'all',
        });
        if (jsonMode) { emitJSON({ created: hook }); return; }
        success(`Webhook added: ${hook.name} (${hook.type}) — ID: ${hook.id}`);
        return;
    }

    if (action === 'remove') {
        const type = options.type;
        const id = options.id || positionals[1];
        if (!type || !id) fatal('--type and --id are required');
        const ok = mgr.removeWebhook(type, id);
        if (jsonMode) { emitJSON({ removed: ok }); return; }
        if (ok) success(`Webhook ${id} removed`);
        else warn(`Webhook ${id} not found`);
        return;
    }

    if (action === 'enable' || action === 'disable') {
        const type = options.type;
        const id = options.id || positionals[1];
        if (!type || !id) fatal('--type and --id are required');
        mgr.toggleWebhook(type, id, action === 'enable');
        if (jsonMode) { emitJSON({ action, id }); return; }
        success(`Webhook ${id} ${action}d`);
        return;
    }

    if (action === 'fire') {
        const event = options.event || 'manual';
        const severity = options.severity || 'info';
        const message = options.message || 'Manual webhook test from Milonexa Admin CLI';
        info(`Firing webhooks for event: ${event} (severity: ${severity})`);
        const results = await mgr.fire(event, { message, source: 'admin-cli', timestamp: new Date().toISOString() }, severity);
        if (jsonMode) { emitJSON({ results }); return; }
        for (const r of results) {
            if (r.status === 'ok') success(`  ${r.type}/${r.name}: delivered`);
            else warn(`  ${r.type}/${r.name}: failed — ${r.error}`);
        }
        if (results.length === 0) warn('No webhooks matched. Check severity filter and ensure webhooks are enabled.');
        return;
    }

    if (action === 'history') {
        const limit = parseInt(options.limit) || 20;
        const history = mgr.getHistory(limit);
        if (jsonMode) { emitJSON({ history }); return; }
        console.log(`${c('bold', 'Webhook Delivery History')}  (last ${history.length})\n`);
        for (const h of history) {
            const ok = h.results.filter(r => r.status === 'ok').length;
            const fail = h.results.filter(r => r.status === 'error').length;
            const ts = new Date(h.ts).toLocaleString();
            console.log(`  ${ts}  ${c('cyan', h.eventType)}  sev:${h.severity}  ✓${ok} ✗${fail}`);
        }
        return;
    }

    if (action === 'stats') {
        const stats = mgr.getStats();
        if (jsonMode) { emitJSON(stats); return; }
        console.log(`${c('bold', 'Webhook Stats')}\n`);
        console.log(`  Total:       ${stats.total}`);
        console.log(`  Enabled:     ${stats.enabled}`);
        console.log(`  Deliveries:  ${stats.deliveries}`);
        console.log(`  By type:     Slack:${stats.byType.slack} Teams:${stats.byType.teams} PagerDuty:${stats.byType.pagerduty} GitHub:${stats.byType.github}`);
        return;
    }

    fatal(`Unknown webhooks action: ${action}\nUsage: webhooks list|add|remove|enable|disable|fire|history|stats`);
}

// ---------------------------------------------------------------------------
// Phase E: SLA Management
// ---------------------------------------------------------------------------

function cmdSLA(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const action = positionals[0] || 'status';
    const slaDir = path.join(ADMIN_HOME, 'sla');
    const mgr = new SLAManager(slaDir);
    const jsonMode = toBool(options.json, false);

    if (action === 'status') {
        const statuses = mgr.getStatus();
        const summary = mgr.getSummary();
        if (jsonMode) { emitJSON({ summary, statuses }); return; }
        console.log(`${c('bold', 'SLA Status')}\n`);
        console.log(`  Total: ${summary.total}  OK: ${c('green', summary.ok)}  At Risk: ${c('yellow', summary.atRisk)}  Breached: ${c('red', summary.breached)}  No Data: ${c('gray', summary.noData)}\n`);
        console.log(`  ${'SLO'.padEnd(25)} ${'SERVICE'.padEnd(15)} ${'TARGET'.padEnd(10)} ${'CURRENT'.padEnd(10)} ${'AVG'.padEnd(10)} STATUS`);
        console.log(`  ${'─'.repeat(90)}`);
        for (const s of statuses) {
            const statusColor = s.status === 'ok' ? 'green' : s.status === 'at_risk' ? 'yellow' : s.status === 'breached' ? 'red' : 'gray';
            const target = `${s.slo.target}${s.slo.unit === 'percent' ? '%' : s.slo.unit}`;
            const current = s.current !== null ? `${s.current}` : 'N/A';
            const avg = s.avg !== null ? `${s.avg}` : 'N/A';
            console.log(`  ${pad(s.slo.name, 25)} ${pad(s.slo.service, 15)} ${pad(target, 10)} ${pad(current, 10)} ${pad(avg, 10)} ${c(statusColor, s.status)}`);
        }
        return;
    }

    if (action === 'predict') {
        const predictions = mgr.getPredictions();
        if (jsonMode) { emitJSON({ predictions }); return; }
        console.log(`${c('bold', 'SLA Breach Predictions')}\n`);
        if (predictions.length === 0) {
            console.log(c('green', '  ✓ No high/medium risk SLA breaches predicted'));
            return;
        }
        for (const p of predictions) {
            const riskColor = p.breachRisk.risk === 'high' ? 'red' : 'yellow';
            const hrs = p.breachRisk.hoursUntilBreach;
            console.log(`  ${c(riskColor, `[${p.breachRisk.risk.toUpperCase()}]`)} ${c('bold', p.slo.name)}`);
            console.log(`    Service: ${p.slo.service}  Target: ${p.slo.target}${p.slo.unit === 'percent' ? '%' : ''}  Current: ${p.current || 'N/A'}`);
            console.log(`    Trend: ${p.breachRisk.trend}  ${hrs ? `Breach in ~${hrs}h` : 'Degrading'}  Slope: ${p.breachRisk.slope}`);
            console.log('');
        }
        return;
    }

    if (action === 'add') {
        const slo = mgr.addSLO({
            service: options.service,
            name: options.name,
            type: options.type || 'availability',
            target: options.target,
            window: options.window || '30d',
            unit: options.unit || 'percent',
            description: options.description || '',
        });
        if (jsonMode) { emitJSON({ created: slo }); return; }
        success(`SLO added: ${slo.name} (${slo.id})`);
        return;
    }

    if (action === 'record') {
        const sloId = options.id || positionals[1];
        const value = parseFloat(options.value);
        if (!sloId || isNaN(value)) fatal('--id and --value are required');
        const m = mgr.record(sloId, value);
        if (jsonMode) { emitJSON({ recorded: m }); return; }
        success(`Recorded: ${sloId} = ${value}`);
        return;
    }

    if (action === 'simulate') {
        // Record synthetic measurements for all SLOs
        const count = parseInt(options.count) || 10;
        let total = 0;
        for (const slo of mgr.slos) {
            for (let i = 0; i < count; i++) {
                mgr.recordSyntheticMeasurement(slo.id);
                total++;
            }
        }
        if (jsonMode) { emitJSON({ recorded: total }); return; }
        success(`Recorded ${total} synthetic measurements across ${mgr.slos.length} SLOs`);
        return;
    }

    if (action === 'list') {
        if (jsonMode) { emitJSON({ slos: mgr.slos }); return; }
        console.log(`${c('bold', 'SLO Definitions')}  (${mgr.slos.length} total)\n`);
        for (const slo of mgr.slos) {
            console.log(`  ${c('cyan', slo.id)}  ${c('bold', slo.name)}  [${slo.service}]  target: ${slo.target}${slo.unit === 'percent' ? '%' : ' ' + slo.unit}  window: ${slo.window}`);
        }
        return;
    }

    fatal(`Unknown sla action: ${action}\nUsage: sla status|predict|add|record|simulate|list`);
}

// ---------------------------------------------------------------------------
// Phase E: AI-Assisted Remediation
// ---------------------------------------------------------------------------

async function cmdRemediate(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const action = positionals[0] || 'analyze';
    const remediationDir = path.join(ADMIN_HOME, 'remediation');
    const engine = new RemediationEngine(remediationDir);
    const jsonMode = toBool(options.json, false);

    if (action === 'analyze') {
        info('Gathering system context for AI analysis...');

        // Collect current state
        const alertsDir = path.join(ADMIN_HOME, 'alerts');
        const alertMgr = new AlertManager(alertsDir);
        const slaDir = path.join(ADMIN_HOME, 'sla');
        const slaMgr = new SLAManager(slaDir);
        const complianceDir = path.join(ADMIN_HOME, 'compliance');
        const complianceMgr = new ComplianceManager(complianceDir);

        const alerts = (alertMgr.history || []).filter(h => h.status === 'active').slice(-20);
        const slaStatus = slaMgr.getStatus();
        const complianceStatus = complianceMgr.getStatus();

        const context = { alerts, slaStatus, complianceStatus };
        const suggestions = await engine.analyze(context);

        if (jsonMode) { emitJSON({ suggestions }); return; }

        console.log(`${c('bold', '🤖 AI-Assisted Remediation Analysis')}\n`);
        console.log(`  Analyzed: ${alerts.length} alerts, ${slaStatus.length} SLOs, compliance status`);
        console.log('');

        if (suggestions.length === 0) {
            console.log(c('green', '  ✓ No critical issues identified — system appears healthy'));
            return;
        }

        for (let i = 0; i < suggestions.length; i++) {
            const s = suggestions[i];
            const sevColor = s.severity === 'critical' ? 'red' : s.severity === 'warning' ? 'yellow' : 'cyan';
            console.log(`${c(sevColor, `[${i + 1}] ${s.severity.toUpperCase()}`)} ${c('bold', s.title)}`);
            if (s.source === 'llm') console.log(`     ${c('magenta', '🧠 AI-powered suggestion')}`);
            if (s.trigger) {
                const t = s.trigger;
                if (t.type === 'alert') console.log(`     Trigger: alert "${t.alert}" = ${t.value}`);
                if (t.type === 'sla') console.log(`     Trigger: SLA "${t.sloId}" breach in ~${t.hoursUntilBreach}h`);
                if (t.type === 'compliance') console.log(`     Trigger: ${t.failed} compliance failure(s)`);
            }
            console.log(`     ${c('bold', 'Remediation Steps:')}`);
            for (let j = 0; j < s.steps.length; j++) {
                console.log(`       ${j + 1}. ${s.steps[j]}`);
            }
            if (s.references && s.references.length > 0) {
                console.log(`     References: ${s.references.join(', ')}`);
            }
            console.log('');
        }
        return;
    }

    if (action === 'rules') {
        const rules = engine.getRules();
        if (jsonMode) { emitJSON({ rules }); return; }
        console.log(`${c('bold', 'Remediation Rules')}  (${rules.length} built-in)\n`);
        for (const r of rules) {
            console.log(`  ${c('cyan', r.id)}  ${c('bold', r.title)}  [${r.severity}]`);
        }
        return;
    }

    if (action === 'history') {
        const limit = parseInt(options.limit) || 10;
        const history = engine.getHistory(limit);
        if (jsonMode) { emitJSON({ history }); return; }
        console.log(`${c('bold', 'Remediation Session History')}  (last ${history.length})\n`);
        for (const h of history) {
            console.log(`  ${new Date(h.ts).toLocaleString()}  alerts:${h.context.alertCount}  sla_issues:${h.context.slaIssues}  suggestions:${h.suggestionCount}`);
        }
        return;
    }

    if (action === 'config') {
        if (options['llm-key'] || options['llm-url'] || options['llm-model'] || options['llm-enable'] !== undefined) {
            const cfg = {};
            if (options['llm-key']) cfg.llmApiKey = options['llm-key'];
            if (options['llm-url']) cfg.llmApiUrl = options['llm-url'];
            if (options['llm-model']) cfg.llmModel = options['llm-model'];
            if (options['llm-enable'] !== undefined) cfg.llmEnabled = toBool(options['llm-enable'], false);
            engine.configureLLM(cfg);
            if (jsonMode) { emitJSON({ config: engine.config }); return; }
            success('Remediation config updated');
            if (cfg.llmEnabled) info('LLM-assisted analysis enabled. Set OPENAI_API_KEY env var for authentication.');
        } else {
            const cfg = { ...engine.config, llmApiKey: engine.config.llmApiKey ? '***' : '(not set)' };
            if (jsonMode) { emitJSON({ config: cfg }); return; }
            console.log(`${c('bold', 'Remediation Config')}\n`);
            console.log(`  LLM enabled:  ${engine.config.llmEnabled}`);
            console.log(`  LLM provider: ${engine.config.llmProvider}`);
            console.log(`  LLM model:    ${engine.config.llmModel}`);
            console.log(`  LLM API URL:  ${engine.config.llmApiUrl}`);
            console.log(`  LLM API key:  ${engine.config.llmApiKey ? '***configured***' : '(not set)'}`);
        }
        return;
    }

    fatal(`Unknown remediate action: ${action}\nUsage: remediate analyze|rules|history|config`);
}

// ---------------------------------------------------------------------------
// Phase E: Multi-Cluster Kubernetes Management
// ---------------------------------------------------------------------------

function cmdCluster(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const action = positionals[0] || 'list';
    const clustersDir = path.join(ADMIN_HOME, 'clusters');
    const mgr = new MultiClusterManager(clustersDir);
    const jsonMode = toBool(options.json, false);

    if (action === 'list') {
        const clusters = mgr.listClusters();
        if (jsonMode) { emitJSON({ clusters }); return; }
        console.log(`${c('bold', 'Registered Clusters')}  (${clusters.length} total)\n`);
        if (clusters.length === 0) {
            console.log(c('yellow', '  No clusters registered.'));
            console.log('  Add one: node admin-cli/index.js cluster register --name prod-us --context gke_proj_us --env prod');
            return;
        }
        console.log(`  ${'NAME'.padEnd(20)} ${'CONTEXT'.padEnd(30)} ${'ENV'.padEnd(12)} ${'REGION'.padEnd(15)} ${'NS'.padEnd(12)} STATUS`);
        console.log(`  ${'─'.repeat(105)}`);
        for (const cl of clusters) {
            const envColor = cl.environment === 'prod' ? 'red' : cl.environment === 'staging' ? 'yellow' : 'green';
            console.log(`  ${pad(cl.name, 20)} ${pad(cl.context, 30)} ${c(envColor, pad(cl.environment, 12))} ${pad(cl.region, 15)} ${pad(cl.namespace, 12)} ${cl.enabled ? c('green', 'enabled') : c('gray', 'disabled')}`);
        }
        return;
    }

    if (action === 'register') {
        const cluster = mgr.registerCluster({
            name: options.name,
            context: options.context,
            namespace: options.namespace || 'milonexa',
            region: options.region || 'unknown',
            environment: options.env || options.environment || 'dev',
            kubeconfigPath: options.kubeconfig,
        });
        if (jsonMode) { emitJSON({ registered: cluster }); return; }
        success(`Cluster registered: ${cluster.name} (context: ${cluster.context})`);
        return;
    }

    if (action === 'deregister') {
        const name = options.name || positionals[1];
        if (!name) fatal('--name is required');
        const ok = mgr.deregisterCluster(name);
        if (jsonMode) { emitJSON({ deregistered: ok }); return; }
        if (ok) success(`Cluster '${name}' deregistered`);
        else warn(`Cluster '${name}' not found`);
        return;
    }

    if (action === 'contexts') {
        const result = mgr.getKubeconfigContexts(options.kubeconfig);
        if (jsonMode) { emitJSON(result); return; }
        if (!result.available) {
            warn(`kubectl not available: ${result.error}`);
            return;
        }
        console.log(`${c('bold', 'Available kubectl contexts')}  (${result.contexts.length})\n`);
        const current = mgr.getCurrentContext();
        for (const ctx of result.contexts) {
            const marker = ctx === current ? c('green', '● ') : '  ';
            console.log(`${marker}${ctx}`);
        }
        return;
    }

    if (action === 'status') {
        info('Fetching status from all registered clusters (this may take a moment)...');
        const results = mgr.getClusterStatus(options.namespace);
        if (jsonMode) { emitJSON({ clusterStatus: results }); return; }
        console.log(`${c('bold', 'Multi-Cluster Status')}\n`);
        for (const r of results) {
            const envColor = r.environment === 'prod' ? 'red' : r.environment === 'staging' ? 'yellow' : 'green';
            if (!r.available) {
                console.log(`  ${c('red', '✗')} ${c('bold', r.cluster)} [${r.context}]  ${c('red', 'UNREACHABLE')}`);
                continue;
            }
            const podColor = r.pods.running === r.pods.total ? 'green' : r.pods.running < r.pods.total ? 'yellow' : 'gray';
            console.log(`  ${c('green', '✓')} ${c('bold', r.cluster)} [${c(envColor, r.environment)}/${r.region}]  pods: ${c(podColor, r.pods.running + '/' + r.pods.total)} running  nodes: ${r.nodes.ready}/${r.nodes.total} ready`);
        }
        return;
    }

    if (action === 'exec') {
        const name = options.name || positionals[1];
        if (!name) fatal('--name (cluster name) is required');
        const kubectlArgs = positionals.slice(2);
        if (kubectlArgs.length === 0) fatal('Provide kubectl arguments after cluster name');
        const result = mgr.execOnCluster(name, kubectlArgs);
        if (jsonMode) { emitJSON(result); return; }
        if (!result.success) { warn(`Command failed: ${result.error || result.stderr}`); return; }
        process.stdout.write(result.stdout);
        return;
    }

    if (action === 'switch') {
        const context = options.context || positionals[1];
        if (!context) fatal('--context is required');
        const result = mgr.switchContext(context);
        if (jsonMode) { emitJSON(result); return; }
        if (result.success) success(`Switched kubectl context to: ${context}`);
        else warn(`Failed: ${result.error}`);
        return;
    }

    if (action === 'diff') {
        info('Comparing deployments across clusters...');
        const result = mgr.compareDeployments();
        if (jsonMode) { emitJSON(result); return; }
        console.log(`${c('bold', 'Deployment Diff Across Clusters')}\n`);
        const mismatched = result.diff.filter(d => d.missingFrom.length > 0);
        if (mismatched.length === 0) {
            success('All deployments are consistent across all clusters');
            return;
        }
        for (const d of mismatched) {
            console.log(`  ${c('yellow', '⚠')} ${d.deployment}  present in: ${d.presentIn.join(', ')}  missing from: ${c('red', d.missingFrom.join(', '))}`);
        }
        return;
    }

    fatal(`Unknown cluster action: ${action}\nUsage: cluster list|register|deregister|contexts|status|exec|switch|diff`);
}

// ---------------------------------------------------------------------------
// Phase E: Advanced Trend Analysis & Visualization
// ---------------------------------------------------------------------------

function cmdTrends(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const action = positionals[0] || 'report';
    const metricsDir = path.join(ADMIN_HOME, 'metrics');
    const collector = new MetricsCollector(metricsDir);
    const analyzer = new TrendAnalyzer(metricsDir);
    const jsonMode = toBool(options.json, false);

    if (action === 'report') {
        const category = options.category || null;
        const service = options.service || null;
        let metrics = collector.query(category ? { category } : {});
        if (service) metrics = metrics.filter(m => m.service === service || m.tags?.service === service);

        // Group by category
        const byCat = {};
        for (const m of metrics) {
            const key = m.category || 'unknown';
            if (!byCat[key]) byCat[key] = [];
            byCat[key].push(m.value);
        }

        const reports = [];
        for (const [cat, values] of Object.entries(byCat)) {
            reports.push(analyzer.analyze(cat, values));
        }

        if (jsonMode) { emitJSON({ reports }); return; }

        console.log(`${c('bold', '📈 Trend Analysis Report')}\n`);
        if (reports.length === 0) {
            console.log(c('yellow', '  No metrics data. Record with: node admin-cli/index.js metrics record --category cpu --value 45'));
            return;
        }

        for (const r of reports) {
            if (r.status === 'no_data') continue;
            const trendColor = r.regression.trend === 'increasing' ? 'yellow' : r.regression.trend === 'decreasing' ? 'cyan' : 'green';
            console.log(`  ${c('bold', r.name.padEnd(15))} n=${r.count}  mean=${r.mean}  min=${r.min}  max=${r.max}`);
            console.log(`  ${''.padEnd(15)} trend: ${c(trendColor, r.regression.trend.padEnd(12))} slope=${r.regression.slope}  R²=${r.regression.r2}  anomalies=${r.anomalies}`);
            console.log(`  ${''.padEnd(15)} forecast(3): ${r.forecast.map(v => v.toFixed(1)).join(', ')}`);
            console.log(`  ${''.padEnd(15)} ${c('dim', r.sparkline)}`);
            console.log('');
        }
        return;
    }

    if (action === 'chart') {
        const category = options.category;
        if (!category) fatal('--category is required (e.g. --category cpu)');
        const metrics = collector.query({ category });
        const values = metrics.map(m => m.value).filter(v => typeof v === 'number');
        if (values.length === 0) {
            warn(`No data for category: ${category}`);
            return;
        }
        if (jsonMode) {
            const report = analyzer.analyze(category, values);
            emitJSON(report);
            return;
        }
        console.log(`${c('bold', `📊 Line Chart: ${category}`)}\n`);
        const chartLines = lineChart(values, { width: 60, height: 10, label: category, unit: '' });
        for (const l of chartLines) console.log('  ' + l);
        console.log('');
        const report = analyzer.analyze(category, values);
        console.log(`  Mean: ${report.mean}  Min: ${report.min}  Max: ${report.max}`);
        console.log(`  Trend: ${c(report.regression.trend === 'increasing' ? 'yellow' : 'green', report.regression.trend)}  Slope: ${report.regression.slope}  R²: ${report.regression.r2}`);
        console.log(`  Anomalies: ${report.anomalies}  Forecast(3): ${report.forecast.join(', ')}`);
        return;
    }

    if (action === 'anomalies') {
        const category = options.category || null;
        const metrics = collector.query(category ? { category } : {});
        const byCat = {};
        for (const m of metrics) {
            if (!byCat[m.category]) byCat[m.category] = [];
            byCat[m.category].push({ value: m.value, ts: m.timestamp });
        }

        if (jsonMode) {
            const results = {};
            for (const [cat, pts] of Object.entries(byCat)) {
                results[cat] = analyzer.detectAnomalies(pts.map(p => p.value));
            }
            emitJSON({ anomalies: results });
            return;
        }

        console.log(`${c('bold', '🔍 Anomaly Detection')}\n`);
        for (const [cat, pts] of Object.entries(byCat)) {
            const anomalies = analyzer.detectAnomalies(pts.map(p => p.value));
            if (anomalies.length === 0) {
                console.log(`  ${c('green', '✓')} ${cat.padEnd(15)} no anomalies`);
            } else {
                console.log(`  ${c('yellow', '⚠')} ${cat.padEnd(15)} ${anomalies.length} anomaly(ies):`);
                for (const a of anomalies.slice(0, 5)) {
                    const ts = pts[a.index]?.ts ? new Date(pts[a.index].ts).toLocaleTimeString() : `idx[${a.index}]`;
                    console.log(`      ${ts}  value=${a.value}  z-score=${a.zscore.toFixed(2)}`);
                }
            }
        }
        return;
    }

    if (action === 'forecast') {
        const category = options.category;
        const steps = parseInt(options.steps) || 5;
        if (!category) fatal('--category is required');
        const metrics = collector.query({ category });
        const values = metrics.map(m => m.value).filter(v => typeof v === 'number');
        const forecast = analyzer.forecast(values, steps);
        if (jsonMode) { emitJSON({ category, steps, forecast }); return; }
        console.log(`${c('bold', `Forecast: ${category}`)}  (next ${steps} steps)\n`);
        console.log(`  Historical: ${values.slice(-5).join(', ')}`);
        console.log(`  Forecast:   ${forecast.join(', ')}`);
        const spark = sparkline([...values.slice(-20), ...forecast]);
        console.log(`  Sparkline: ${spark} ${c('dim', '← forecast →')}`);
        return;
    }

    fatal(`Unknown trends action: ${action}\nUsage: trends report|chart|anomalies|forecast`);
}

// ---------------------------------------------------------------------------
// Phase 2: audit viewer
// ---------------------------------------------------------------------------

function cmdAudit(rawArgs) {
    const { options } = parseArgs(rawArgs);
    const tail = Number(options.tail || 50);
    const jsonMode = toBool(options.json, false);
    const actor = options.actor || null;
    printAuditLog(tail, jsonMode, actor);
}

// ---------------------------------------------------------------------------
// Phase 2: set-role
// ---------------------------------------------------------------------------

function cmdSetRole(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);

    if (toBool(options.show, false) || positionals.length === 0) {
        // Redirect to the viewer-accessible `role` command output
        cmdRole(rawArgs);
        return;
    }

    const role = positionals[0].toLowerCase();
    try {
        persistRole(role);
        success(`Role set to '${role}'. Persisted to: ${path.relative(ROOT_DIR, ROLE_FILE)}`);
        if (role === 'break-glass') {
            warn('break-glass role grants emergency access. This will be flagged in all audit entries.');
        }
    } catch (err) {
        fatal(err.message);
    }
}

// ---------------------------------------------------------------------------
// Phase F (Q2 2026): Plugin System, Batch, Diff, Completion, TailLogs,
//                    Snapshot/Restore, and Side-by-side Comparison
// ---------------------------------------------------------------------------

// ── Plugin loader ─────────────────────────────────────────────────────────

function loadPlugins() {
    if (!fs.existsSync(PLUGINS_DIR)) return;
    for (const file of fs.readdirSync(PLUGINS_DIR)) {
        if (!file.endsWith('.js')) continue;
        try {
            const plugin = require(path.join(PLUGINS_DIR, file));
            if (plugin && plugin.name && typeof plugin.handler === 'function') {
                _plugins.set(plugin.name, plugin);
            } else {
                warn(`Plugin skipped (missing name/handler): ${file}`);
            }
        } catch (err) {
            warn(`Failed to load plugin ${file}: ${err.message}`);
        }
    }
}

// ── plugins — list installed plugins ─────────────────────────────────────

function cmdPlugins() {
    if (_plugins.size === 0) {
        console.log(c('yellow', 'No plugins installed.'));
        console.log(`  Drop .js files in: ${path.relative(ROOT_DIR, PLUGINS_DIR)}/`);
        return;
    }
    console.log(`${c('bold', 'Installed Plugins')}  (${_plugins.size} total)\n`);
    printTable([
        ['NAME', 'COMMAND', 'DESCRIPTION'],
        ...[..._plugins.values()].map(p => [p.name, p.command || p.name, p.description || '']),
    ]);
}

// ── plugin-run — invoke a named plugin ────────────────────────────────────

async function cmdPluginRun(rawArgs) {
    const { positionals } = parseArgs(rawArgs);
    const name = positionals[0];
    if (!name) fatal('Usage: plugin-run <name> [args...]');
    const plugin = _plugins.get(name);
    if (!plugin) fatal(`Plugin not found: ${name}\nRun: node admin-cli/index.js plugins`);
    const args = positionals.slice(1);
    const ctx = { ROOT_DIR, ADMIN_HOME, c, info, success, warn, fatal };
    await plugin.handler(args, ctx);
}

// ── batch — apply an operation to multiple services ───────────────────────

async function cmdBatch(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const operation = positionals[0];
    const validOps = ['start', 'stop', 'restart'];

    if (!operation || !validOps.includes(operation)) {
        fatal(`Usage: batch <start|stop|restart> <service1> [service2...] [--all]`);
    }

    let services;
    if (toBool(options.all, false)) {
        services = [...DOCKER_SERVICE_SET];
    } else {
        services = positionals.slice(1).map(s => normalizeServiceName(s));
        if (services.length === 0) fatal('Specify at least one service or use --all');
    }

    const runtime = options.runtime || 'docker';
    console.log(`${c('bold', `Batch ${operation}`)} on ${services.length} service(s) [runtime: ${runtime}]\n`);

    const results = [];
    for (const svc of services) {
        process.stdout.write(`  ${c('cyan', '→')} ${svc.padEnd(28)} ...`);
        try {
            let execResult;
            if (runtime === 'k8s' || runtime === 'kubernetes') {
                const namespace = options.namespace || 'milonexa';
                const k8sOp = operation === 'restart' ? ['rollout', 'restart', `deployment/${svc}`, '-n', namespace]
                    : operation === 'stop' ? ['scale', `deployment/${svc}`, '--replicas=0', '-n', namespace]
                    : ['scale', `deployment/${svc}`, '--replicas=1', '-n', namespace];
                execResult = spawnSync('kubectl', k8sOp, { cwd: ROOT_DIR, stdio: 'pipe', encoding: 'utf8' });
            } else {
                execResult = spawnSync('docker', ['compose', operation, svc],
                    { cwd: ROOT_DIR, stdio: 'pipe', encoding: 'utf8' });
            }
            if (execResult.status === 0) {
                process.stdout.write(`\r  ${c('green', '✓')} ${svc.padEnd(28)} ok\n`);
                results.push({ service: svc, status: 'ok' });
            } else {
                process.stdout.write(`\r  ${c('red', '✗')} ${svc.padEnd(28)} failed\n`);
                results.push({ service: svc, status: 'failed', error: (execResult.stderr || '').trim() });
            }
        } catch (err) {
            process.stdout.write(`\r  ${c('red', '✗')} ${svc.padEnd(28)} error\n`);
            results.push({ service: svc, status: 'error', error: err.message });
        }
    }

    console.log('');
    const ok = results.filter(r => r.status === 'ok').length;
    const failed = results.filter(r => r.status !== 'ok').length;
    console.log(c('bold', 'Batch Summary'));
    console.log('─'.repeat(40));
    printTable([
        ['SERVICE', 'RESULT'],
        ...results.map(r => [
            r.service,
            r.status === 'ok' ? c('green', '✓ ok') : c('red', `✗ ${r.status}`),
        ]),
    ]);
    console.log(`\n  ${c('green', `${ok} succeeded`)}  ${failed > 0 ? c('red', `${failed} failed`) : c('green', '0 failed')}`);
}

// ── diff — preview configuration or scale changes ─────────────────────────

function cmdDiff(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const subCommand = positionals[0];

    if (subCommand === 'config') {
        const service = positionals[1] || options.service;
        if (!service) fatal('Usage: diff config <service> [--new-env KEY=VAL ...]');

        // Collect --new-env values (may appear multiple times via repeated flag parsing)
        const newEnvPairs = [];
        for (let i = 0; i < rawArgs.length; i++) {
            if (rawArgs[i] === '--new-env' && rawArgs[i + 1]) {
                newEnvPairs.push(rawArgs[i + 1]);
                i++;
            } else if (rawArgs[i].startsWith('--new-env=')) {
                newEnvPairs.push(rawArgs[i].slice('--new-env='.length));
            }
        }

        // Parse current env from docker-compose.yml (simple regex extraction)
        const composePath = path.join(ROOT_DIR, 'docker-compose.yml');
        const currentEnv = {};
        if (fs.existsSync(composePath)) {
            const content = fs.readFileSync(composePath, 'utf8');
            // Escape service name for use in RegExp to avoid ReDoS or unexpected matches
            const escapedService = service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const svcRe = new RegExp(`(?:^|\\n)  ${escapedService}:\\s*\\n((?:[ \\t]+.*\\n)*)`, 'i');
            const svcMatch = content.match(svcRe);
            if (svcMatch) {
                const envBlockMatch = svcMatch[1].match(/environment:\s*\n((?:\s+-\s+\S[^\n]*\n)*)/);
                if (envBlockMatch) {
                    const lines = (envBlockMatch[1].match(/-\s+(\S[^\n]*)/g) || []).map(l => l.replace(/^-\s+/, ''));
                    for (const l of lines) {
                        const eqIdx = l.indexOf('=');
                        if (eqIdx > 0) currentEnv[l.slice(0, eqIdx)] = l.slice(eqIdx + 1);
                    }
                }
            }
        }

        // Overlay proposed changes
        const proposedEnv = { ...currentEnv };
        for (const pair of newEnvPairs) {
            const eqIdx = pair.indexOf('=');
            if (eqIdx > 0) proposedEnv[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1);
        }

        console.log(`${c('bold', `Config diff for: ${service}`)}\n`);
        const allKeys = [...new Set([...Object.keys(currentEnv), ...Object.keys(proposedEnv)])].sort();
        let hasDiff = false;
        for (const k of allKeys) {
            const cur = currentEnv[k];
            const proposed = proposedEnv[k];
            if (cur === proposed) {
                console.log(`   ${k}=${cur ?? ''}`);
            } else if (cur === undefined) {
                console.log(c('green', `+  ${k}=${proposed}`));
                hasDiff = true;
            } else if (proposed === undefined) {
                console.log(c('red', `-  ${k}=${cur}`));
                hasDiff = true;
            } else {
                console.log(c('red', `-  ${k}=${cur}`));
                console.log(c('green', `+  ${k}=${proposed}`));
                hasDiff = true;
            }
        }
        if (allKeys.length === 0) {
            console.log(c('yellow', `  No environment config found for service '${service}' in docker-compose.yml`));
        } else if (!hasDiff) {
            console.log(c('green', '\n  No differences — configuration is unchanged.'));
        } else {
            console.log(c('yellow', '\n  Preview only. Use start/restart to apply changes.'));
        }
        return;
    }

    if (subCommand === 'scale') {
        const service = positionals[1] || options.service;
        const replicas = parseInt(positionals[2] || options.replicas || '0', 10);
        if (!service || !replicas) fatal('Usage: diff scale <service> <replicas>');

        // Detect current replica count from docker compose ps
        let currentReplicas = 1;
        const psResult = spawnSync('docker', ['compose', 'ps', '--quiet', service],
            { cwd: ROOT_DIR, stdio: 'pipe', encoding: 'utf8' });
        if (psResult.status === 0 && psResult.stdout) {
            const lines = psResult.stdout.trim().split('\n').filter(Boolean);
            if (lines.length > 0) currentReplicas = lines.length;
        }

        console.log(`${c('bold', `Scale diff for: ${service}`)}\n`);
        console.log(c('red', `-  replicas: ${currentReplicas}`));
        console.log(c('green', `+  replicas: ${replicas}`));
        console.log(c('yellow', `\n  Preview only. Apply with: node admin-cli/index.js scale --service ${service} --replicas ${replicas}`));
        return;
    }

    fatal(`Unknown diff subcommand: ${subCommand || '(none)'}\nUsage:\n  diff config <service> [--new-env KEY=VAL ...]\n  diff scale <service> <replicas>`);
}

// ── completion — emit shell completion script ─────────────────────────────

function cmdCompletion(rawArgs) {
    const { positionals } = parseArgs(rawArgs);
    const shell = (positionals[0] || 'bash').toLowerCase();

    const builtinCmds = [
        'doctor', 'build', 'start', 'stop', 'restart', 'status', 'logs', 'health',
        'backup', 'monitor', 'run', 'audit', 'set-role', 'role', 'check',
        'scale', 'rollout', 'incident', 'metrics', 'alerts', 'policies', 'costs',
        'compliance', 'recommendations', 'dashboard', 'tui', 'webhooks', 'sla',
        'remediate', 'cluster', 'trends',
        // Phase F
        'batch', 'diff', 'completion', 'tail-logs', 'snapshot', 'compare',
        'plugins', 'plugin-run',
    ];
    const pluginCmds = [..._plugins.values()].map(p => p.command || p.name);
    const allCmds = [...new Set([...builtinCmds, ...pluginCmds])];
    const services = [...DOCKER_SERVICE_SET].join(' ');
    const cmdStr = allCmds.join(' ');
    const scriptFile = path.relative(process.cwd(), path.join(__dirname, 'index.js'));

    if (shell === 'bash') {
        process.stdout.write(`# Milonexa Admin CLI bash completion
# Source in ~/.bashrc:
#   source <(node ${scriptFile} completion bash)
_milonexa_admin_cli_complete() {
    local cur prev
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    if [ "$COMP_CWORD" -eq 1 ]; then
        COMPREPLY=( $(compgen -W "${cmdStr}" -- "$cur") )
        return 0
    fi
    case "$prev" in
        start|stop|restart|logs|scale|tail-logs|compare|diff|incident|metrics)
            COMPREPLY=( $(compgen -W "${services}" -- "$cur") );;
        batch)
            COMPREPLY=( $(compgen -W "start stop restart" -- "$cur") );;
        plugin-run)
            COMPREPLY=( $(compgen -W "${pluginCmds.join(' ')}" -- "$cur") );;
        snapshot)
            COMPREPLY=( $(compgen -W "save list show restore delete" -- "$cur") );;
        --runtime)
            COMPREPLY=( $(compgen -W "docker k8s direct" -- "$cur") );;
        --env)
            COMPREPLY=( $(compgen -W "dev staging prod" -- "$cur") );;
        completion)
            COMPREPLY=( $(compgen -W "bash zsh" -- "$cur") );;
    esac
}
complete -F _milonexa_admin_cli_complete node\n`);
        return;
    }

    if (shell === 'zsh') {
        process.stdout.write(`# Milonexa Admin CLI zsh completion
# Source in ~/.zshrc:
#   source <(node ${scriptFile} completion zsh)
_milonexa_admin_cli() {
    local -a cmds svcs
    cmds=(${allCmds.map(cmd => `'${cmd}'`).join(' ')})
    svcs=(${[...DOCKER_SERVICE_SET].map(s => `'${s}'`).join(' ')})
    if (( CURRENT == 2 )); then
        _describe 'commands' cmds; return
    fi
    case \$words[2] in
        start|stop|restart|logs|scale|tail-logs|compare|diff|incident)
            _describe 'services' svcs;;
        batch)
            _values 'operation' start stop restart;;
        plugin-run)
            local -a plugins; plugins=(${pluginCmds.map(p => `'${p}'`).join(' ')})
            _describe 'plugins' plugins;;
        snapshot)
            _values 'action' save list show restore delete;;
        --runtime)
            _values 'runtime' docker k8s direct;;
        --env)
            _values 'environment' dev staging prod;;
        completion)
            _values 'shell' bash zsh;;
    esac
}
compdef _milonexa_admin_cli node\n`);
        return;
    }

    fatal(`Unknown shell: ${shell}. Supported: bash, zsh`);
}

// ── tail-logs — stream live service logs ─────────────────────────────────

function cmdTailLogs(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const service = positionals[0] || options.service;
    if (!service) fatal('Usage: tail-logs <service> [--follow] [--tail 100] [--runtime docker|k8s]');

    const follow = toBool(options.follow, true);
    const tailLines = String(parseInt(options.tail || '100', 10));
    const runtime = options.runtime || 'docker';
    const namespace = options.namespace || 'milonexa';

    function colorizeLine(line) {
        if (/error|fatal|crit/i.test(line)) return c('red', line);
        if (/warn/i.test(line)) return c('yellow', line);
        if (/info/i.test(line)) return c('cyan', line);
        return line;
    }

    let proc;
    if (runtime === 'k8s' || runtime === 'kubernetes') {
        const kargs = ['logs', '--tail', tailLines, '-n', namespace];
        if (follow) kargs.push('-f');
        kargs.push(service);
        info(`Streaming k8s logs: kubectl ${kargs.join(' ')}`);
        proc = spawn('kubectl', kargs, { cwd: ROOT_DIR, stdio: ['ignore', 'pipe', 'pipe'] });
    } else {
        const normalizedSvc = normalizeServiceName(service);
        const dargs = ['compose', 'logs', '--tail', tailLines, normalizedSvc];
        if (follow) dargs.push('--follow');
        info(`Streaming docker logs: docker ${dargs.join(' ')}`);
        proc = spawn('docker', dargs, { cwd: ROOT_DIR, stdio: ['ignore', 'pipe', 'pipe'] });
    }

    const readline = require('readline');
    const rl = readline.createInterface({ input: proc.stdout });
    rl.on('line', line => console.log(colorizeLine(line)));
    proc.stderr.on('data', chunk => process.stderr.write(chunk.toString()));
    proc.on('close', code => {
        if (code !== null && code !== 0) warn(`Log stream exited with code ${code}`);
    });

    process.on('SIGINT', () => {
        proc.kill('SIGTERM');
        process.exit(0);
    });

    return new Promise(resolve => proc.on('close', resolve));
}

// ── snapshot — save/restore service configuration ─────────────────────────

async function cmdSnapshot(rawArgs) {
    const { options, positionals } = parseArgs(rawArgs);
    const action = positionals[0] || 'list';

    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

    if (action === 'save') {
        const defaultName = `snapshot-${new Date().toISOString().replace(/[:.]/g, '-')}`;
        const name = positionals[1] || options.name || defaultName;
        if (!/^[\w-]+$/.test(name)) fatal(`Invalid snapshot name '${name}'. Use alphanumeric characters and hyphens only.`);

        // Capture running services via docker compose ps
        let servicesState = [];
        const psResult = spawnSync('docker', ['compose', 'ps', '--format', 'json'],
            { cwd: ROOT_DIR, stdio: 'pipe', encoding: 'utf8' });
        if (psResult.status === 0 && psResult.stdout) {
            for (const line of psResult.stdout.trim().split('\n').filter(Boolean)) {
                try { servicesState.push(JSON.parse(line)); } catch (_) {}
            }
        }

        // Capture env files
        const envData = {};
        for (const f of ['.env', '.env.dev', '.env.staging']) {
            const fp = path.join(ROOT_DIR, f);
            if (fs.existsSync(fp)) envData[f] = fs.readFileSync(fp, 'utf8');
        }

        const snapshot = { name, createdAt: new Date().toISOString(), services: servicesState, envFiles: envData };
        const snapFile = path.join(SNAPSHOTS_DIR, `${name}.json`);
        fs.writeFileSync(snapFile, JSON.stringify(snapshot, null, 2));
        success(`Snapshot saved: ${c('bold', name)}`);
        console.log(`  File: ${path.relative(ROOT_DIR, snapFile)}`);
        return;
    }

    if (action === 'list') {
        const files = fs.existsSync(SNAPSHOTS_DIR)
            ? fs.readdirSync(SNAPSHOTS_DIR).filter(f => f.endsWith('.json'))
            : [];
        if (files.length === 0) {
            console.log(c('yellow', 'No snapshots found.'));
            console.log('  Create one: node admin-cli/index.js snapshot save [name]');
            return;
        }
        console.log(`${c('bold', 'Snapshots')}  (${files.length} total)\n`);
        printTable([
            ['NAME', 'CREATED AT', 'SERVICES', 'FILE'],
            ...files.map(f => {
                try {
                    const snap = JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, f), 'utf8'));
                    return [snap.name || f.replace('.json', ''), snap.createdAt || '-', String(snap.services?.length ?? 0), f];
                } catch (_) {
                    return [f.replace('.json', ''), '-', '-', f];
                }
            }),
        ]);
        return;
    }

    if (action === 'show') {
        const name = positionals[1] || options.name;
        if (!name) fatal('Usage: snapshot show <name>');
        const snapFile = path.join(SNAPSHOTS_DIR, `${name}.json`);
        if (!fs.existsSync(snapFile)) fatal(`Snapshot not found: ${name}`);
        const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
        console.log(`${c('bold', `Snapshot: ${snap.name}`)}`);
        console.log(`  Created:  ${snap.createdAt}`);
        console.log(`  Services: ${snap.services?.length ?? 0}`);
        if (snap.services?.length > 0) {
            console.log('');
            printTable([
                ['SERVICE', 'STATE', 'STATUS'],
                ...snap.services.map(s => [s.Service || s.Name || '-', s.State || '-', s.Status || '-']),
            ]);
        }
        if (snap.envFiles && Object.keys(snap.envFiles).length > 0) {
            console.log(`\n  Env files captured: ${Object.keys(snap.envFiles).join(', ')}`);
        }
        return;
    }

    if (action === 'restore') {
        const name = positionals[1] || options.name;
        if (!name) fatal('Usage: snapshot restore <name> [--confirm]');
        const snapFile = path.join(SNAPSHOTS_DIR, `${name}.json`);
        if (!fs.existsSync(snapFile)) fatal(`Snapshot not found: ${name}`);

        if (!toBool(options.confirm, false)) {
            console.log(c('yellow', `⚠  About to restore snapshot: ${c('bold', name)}`));
            console.log('  This will overwrite current .env files. No service restart is performed automatically.');
            console.log(`  To proceed: node admin-cli/index.js snapshot restore ${name} --confirm`);
            return;
        }

        const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
        if (snap.envFiles) {
            for (const [file, content] of Object.entries(snap.envFiles)) {
                fs.writeFileSync(path.join(ROOT_DIR, file), content);
                info(`Restored: ${file}`);
            }
        }
        success(`Snapshot '${name}' restored. Run 'restart' to apply changes.`);
        return;
    }

    if (action === 'delete') {
        const name = positionals[1] || options.name;
        if (!name) fatal('Usage: snapshot delete <name>');
        const snapFile = path.join(SNAPSHOTS_DIR, `${name}.json`);
        if (!fs.existsSync(snapFile)) fatal(`Snapshot not found: ${name}`);
        fs.unlinkSync(snapFile);
        success(`Snapshot deleted: ${name}`);
        return;
    }

    fatal(`Unknown snapshot action: ${action}\nUsage: snapshot save|list|show|restore|delete [name]`);
}

// ── compare — side-by-side service metrics comparison ────────────────────

function cmdCompare(rawArgs) {
    const { positionals } = parseArgs(rawArgs);
    const services = uniq(positionals.map(s => normalizeServiceName(s)));

    if (services.length < 2) fatal('Usage: compare <service1> <service2> [service3...]');

    const metricsDir = path.join(ADMIN_HOME, 'metrics');
    const collector = new MetricsCollector(metricsDir);

    const METRIC_LABELS = ['CPU %', 'Memory %', 'Error Rate %', 'Latency ms', 'Version'];
    const METRIC_KEYS   = ['cpu',   'memory',   'error_rate',   'latency',    'version'];

    // Collect latest value per (service, category) pair
    const serviceData = {};
    for (const svc of services) {
        serviceData[svc] = {};
        for (const key of METRIC_KEYS) {
            const records = collector.query({ category: key })
                .filter(m => m.service === svc || m.tags?.service === svc);
            if (records.length > 0) {
                const v = records[records.length - 1].value;
                serviceData[svc][key] = typeof v === 'number' ? v.toFixed(1) : String(v ?? '-');
            } else {
                serviceData[svc][key] = '-';
            }
        }
    }

    const colWidth = Math.max(16, ...services.map(s => s.length + 2));
    const metricWidth = 16;

    console.log(`${c('bold', 'Side-by-side Service Comparison')}\n`);
    const header = c('bold', 'METRIC'.padEnd(metricWidth)) +
        services.map(s => c('bold', s.padEnd(colWidth))).join('');
    console.log('  ' + header);
    console.log('  ' + '─'.repeat(metricWidth + services.length * colWidth));

    for (let i = 0; i < METRIC_LABELS.length; i++) {
        const label = METRIC_LABELS[i].padEnd(metricWidth);
        const values = services.map(svc => {
            const val = serviceData[svc][METRIC_KEYS[i]] || '-';
            return val.padEnd(colWidth);
        });
        console.log('  ' + label + values.join(''));
    }

    console.log('');
    console.log(c('dim', '  Data from .admin-cli/metrics/. Record with: metrics record --service <name> --category <key> --value <n>'));
}

// ---------------------------------------------------------------------------
// Q4 2026 Commands
// ---------------------------------------------------------------------------

function cmdFeatureFlags(rawArgs) {
    const { positionals } = parseArgs(rawArgs);
    const subCmd = (positionals[0] || 'list').toLowerCase();
    const mgr = new FeatureFlagManager(ADMIN_HOME);

    switch (subCmd) {
        case 'list': {
            const flags = mgr.listFlags();
            if (flags.length === 0) {
                console.log(c('dim', '  No feature flags defined.'));
                return;
            }
            console.log('');
            console.log(c('bold', `  Feature Flags (${flags.length})`));
            console.log('  ' + '─'.repeat(80));
            console.log(`  ${c('dim', 'ID'.padEnd(24))}${c('dim', 'NAME'.padEnd(30))}${c('dim', 'PROD'.padEnd(8))}${c('dim', 'STAGING'.padEnd(10))}${c('dim', 'DEV')}`);
            console.log('  ' + '─'.repeat(80));
            for (const f of flags) {
                const prod = f.environments && f.environments.production ? c('green', '✓') : c('red', '✗');
                const staging = f.environments && f.environments.staging ? c('green', '✓') : c('red', '✗');
                const dev = f.environments && f.environments.development ? c('green', '✓') : c('red', '✗');
                console.log(`  ${f.flagId.padEnd(24)}${f.name.padEnd(30)}${prod.padEnd(8)}${staging.padEnd(10)}${dev}`);
            }
            console.log('');
            break;
        }
        case 'create': {
            const name = positionals[1];
            const description = positionals[2] || '';
            if (!name) { console.error(c('red', '  Usage: feature-flags create <name> [description]')); return; }
            const flag = mgr.createFlag({ name, description, environments: { production: false, staging: true, development: true }, rolloutPercent: 100, tags: [], owner: 'admin' });
            console.log(c('green', `  ✓ Created flag '${name}' (${flag.flagId})`));
            break;
        }
        case 'toggle': {
            const id = positionals[1];
            const env = positionals[2];
            const state = positionals[3];
            if (!id || !env || !state) { console.error(c('red', '  Usage: feature-flags toggle <id> <env> <on|off>')); return; }
            const enabled = state === 'on' || state === 'true';
            const updated = mgr.toggleFlag(id, env, enabled, 'admin-cli');
            if (!updated) { console.error(c('red', `  Flag '${id}' not found`)); return; }
            console.log(c('green', `  ✓ Flag '${updated.name}' in '${env}': ${enabled ? 'ENABLED' : 'DISABLED'}`));
            break;
        }
        case 'delete': {
            const id = positionals[1];
            if (!id) { console.error(c('red', '  Usage: feature-flags delete <id>')); return; }
            const ok = mgr.deleteFlag(id);
            console.log(ok ? c('green', `  ✓ Deleted flag ${id}`) : c('red', `  Flag '${id}' not found`));
            break;
        }
        default:
            console.error(c('red', `  Unknown subcommand: ${subCmd}. Use: list|create|toggle|delete`));
    }
}

function cmdTenant(rawArgs) {
    const { positionals } = parseArgs(rawArgs);
    const subCmd = (positionals[0] || 'list').toLowerCase();
    const mgr = new TenantManager(ADMIN_HOME);

    switch (subCmd) {
        case 'list': {
            const tenants = mgr.listTenants();
            if (tenants.length === 0) { console.log(c('dim', '  No tenants defined.')); return; }
            console.log('');
            console.log(c('bold', `  Tenants (${tenants.length})`));
            console.log('  ' + '─'.repeat(80));
            console.log(`  ${c('dim', 'ID'.padEnd(20))}${c('dim', 'NAME'.padEnd(24))}${c('dim', 'PLAN'.padEnd(14))}${c('dim', 'STATUS')}`);
            console.log('  ' + '─'.repeat(80));
            for (const t of tenants) {
                const statusColor = t.status === 'active' ? 'green' : t.status === 'suspended' ? 'yellow' : 'red';
                console.log(`  ${t.tenantId.padEnd(20)}${t.name.padEnd(24)}${(t.plan || '').padEnd(14)}${c(statusColor, t.status)}`);
            }
            console.log('');
            break;
        }
        case 'create': {
            const name = positionals[1];
            const plan = positionals[2] || 'starter';
            if (!name) { console.error(c('red', '  Usage: tenant create <name> [plan]')); return; }
            const tenant = mgr.createTenant({ name, domain: name.toLowerCase().replace(/\s+/g, '-') + '.example.com', plan, ownerId: 'admin-cli' });
            console.log(c('green', `  ✓ Created tenant '${name}' (${tenant.tenantId}) plan=${plan}`));
            break;
        }
        case 'suspend': {
            const id = positionals[1];
            if (!id) { console.error(c('red', '  Usage: tenant suspend <id>')); return; }
            mgr.suspendTenant(id, 'Suspended via CLI');
            console.log(c('yellow', `  ✓ Tenant ${id} suspended`));
            break;
        }
        case 'activate': {
            const id = positionals[1];
            if (!id) { console.error(c('red', '  Usage: tenant activate <id>')); return; }
            mgr.activateTenant(id);
            console.log(c('green', `  ✓ Tenant ${id} activated`));
            break;
        }
        case 'quota': {
            const id = positionals[1];
            if (!id) { console.error(c('red', '  Usage: tenant quota <id>')); return; }
            const usage = mgr.getQuotaUsage(id);
            console.log('');
            console.log(c('bold', `  Quota Usage — ${id}`));
            console.log('  ' + '─'.repeat(60));
            for (const [key, val] of Object.entries(usage)) {
                const bar = '█'.repeat(Math.round((val.percent || 0) / 5)).padEnd(20, '░');
                const color = val.percent >= 90 ? 'red' : val.percent >= 70 ? 'yellow' : 'green';
                console.log(`  ${key.padEnd(18)}  ${c(color, bar)}  ${val.used}/${val.limit} (${val.percent}%)`);
            }
            console.log('');
            break;
        }
        default:
            console.error(c('red', `  Unknown subcommand: ${subCmd}. Use: list|create|suspend|activate|quota`));
    }
}

async function cmdRunbook(rawArgs) {
    const { positionals } = parseArgs(rawArgs);
    const subCmd = (positionals[0] || 'list').toLowerCase();
    const mgr = new RunbookManager(ADMIN_HOME);

    switch (subCmd) {
        case 'list': {
            const runbooks = mgr.listRunbooks();
            if (runbooks.length === 0) { console.log(c('dim', '  No runbooks defined.')); return; }
            console.log('');
            console.log(c('bold', `  Runbooks (${runbooks.length})`));
            console.log('  ' + '─'.repeat(80));
            for (const rb of runbooks) {
                const lastExec = rb.lastExecuted ? new Date(rb.lastExecuted).toLocaleString() : 'never';
                console.log(`  ${c('cyan', rb.id.padEnd(20))}  ${rb.name.padEnd(30)}  steps=${rb.steps ? rb.steps.length : 0}  last=${lastExec}`);
            }
            console.log('');
            break;
        }
        case 'run': {
            const id = positionals[1];
            if (!id) { console.error(c('red', '  Usage: runbook run <id>')); return; }
            console.log(`  Running runbook ${c('cyan', id)}...`);
            const result = await mgr.executeRunbook(id, {}, 'admin-cli');
            console.log('');
            console.log(c('bold', `  Execution: ${result.executionId}`));
            console.log('  ' + '─'.repeat(60));
            for (const step of (result.steps || [])) {
                const color = step.status === 'success' ? 'green' : step.status === 'failed' ? 'red' : 'yellow';
                console.log(`  ${c(color, step.status.padEnd(10))}  ${step.name}  (${step.duration}ms)`);
                if (step.output) console.log(`    ${c('dim', step.output.slice(0, 120))}`);
            }
            const overallColor = result.status === 'completed' ? 'green' : 'red';
            console.log(`\n  Overall: ${c(overallColor, result.status)}`);
            console.log('');
            break;
        }
        case 'history': {
            const history = mgr.getExecutionHistory(null, 20);
            if (history.length === 0) { console.log(c('dim', '  No execution history.')); return; }
            console.log('');
            console.log(c('bold', '  Recent Runbook Executions'));
            console.log('  ' + '─'.repeat(80));
            for (const exec of history) {
                const color = exec.status === 'completed' ? 'green' : 'red';
                const ts = exec.startTime ? new Date(exec.startTime).toLocaleString() : '';
                console.log(`  ${c(color, exec.status.padEnd(12))}  ${exec.executionId.padEnd(20)}  ${exec.runbookId.padEnd(20)}  ${ts}`);
            }
            console.log('');
            break;
        }
        default:
            console.error(c('red', `  Unknown subcommand: ${subCmd}. Use: list|run|history`));
    }
}

async function cmdAI(rawArgs) {
    const { positionals } = parseArgs(rawArgs);
    const subCmd = (positionals[0] || 'status').toLowerCase();
    const bridge = new AIIntegrationBridge(ADMIN_HOME);

    switch (subCmd) {
        case 'status': {
            const channels = bridge.getChannelStatus();
            console.log('');
            console.log(c('bold', '  AI Integration Channel Status'));
            console.log('  ' + '─'.repeat(50));
            for (const [name, status] of Object.entries(channels)) {
                const icon = status.connected ? c('green', '✓') : c('red', '✗');
                const enabled = status.enabled ? c('green', 'enabled') : c('dim', 'disabled');
                console.log(`  ${icon}  ${name.padEnd(12)}  ${enabled}`);
            }
            const stats = bridge.getStats();
            console.log(`\n  Workflows: ${stats.totalWorkflows} total, ${stats.pendingApprovals} pending approval`);
            console.log('');
            break;
        }
        case 'workflows': {
            const workflows = bridge.listWorkflows({ status: 'pending_approval' });
            if (workflows.length === 0) { console.log(c('dim', '  No pending AI workflows.')); return; }
            console.log('');
            console.log(c('bold', `  Pending AI Workflows (${workflows.length})`));
            console.log('  ' + '─'.repeat(80));
            for (const wf of workflows) {
                console.log(`  ${c('yellow', wf.workflowId.padEnd(24))}  ${wf.name.padEnd(30)}  channel=${wf.channel || 'api'}`);
            }
            console.log('');
            break;
        }
        case 'approve': {
            const id = positionals[1];
            if (!id) { console.error(c('red', '  Usage: ai approve <workflowId>')); return; }
            await bridge.approveWorkflow(id, 'admin-cli', 'Approved via CLI');
            console.log(c('green', `  ✓ Workflow ${id} approved and executing`));
            break;
        }
        case 'deny': {
            const id = positionals[1];
            if (!id) { console.error(c('red', '  Usage: ai deny <workflowId>')); return; }
            bridge.denyWorkflow(id, 'admin-cli', 'Denied via CLI');
            console.log(c('yellow', `  ✓ Workflow ${id} denied`));
            break;
        }
        default:
            console.error(c('red', `  Unknown subcommand: ${subCmd}. Use: status|workflows|approve|deny`));
    }
}

function cmdChangeLog(rawArgs) {
    const { positionals } = parseArgs(rawArgs);
    const subCmd = (positionals[0] || 'list').toLowerCase();
    const log = new ChangeLog(ADMIN_HOME);

    switch (subCmd) {
        case 'list': {
            const changes = log.search({});
            const recent = changes.slice(-20).reverse();
            if (recent.length === 0) { console.log(c('dim', '  No changes recorded.')); return; }
            console.log('');
            console.log(c('bold', '  Recent Changes'));
            console.log('  ' + '─'.repeat(90));
            console.log(`  ${c('dim', 'ID'.padEnd(20))}${c('dim', 'ACTOR'.padEnd(16))}${c('dim', 'ACTION'.padEnd(20))}${c('dim', 'RESOURCE'.padEnd(20))}${c('dim', 'TIME')}`);
            console.log('  ' + '─'.repeat(90));
            for (const ch of recent) {
                const ts = ch.timestamp ? new Date(ch.timestamp).toLocaleString() : '';
                console.log(`  ${ch.changeId.padEnd(20)}${(ch.actor || '').padEnd(16)}${(ch.action || '').padEnd(20)}${(ch.resource || '').padEnd(20)}${ts}`);
            }
            console.log('');
            break;
        }
        case 'search': {
            const query = positionals[1] || '';
            const results = log.search({}).filter(c =>
                JSON.stringify(c).toLowerCase().includes(query.toLowerCase())
            );
            console.log('');
            console.log(c('bold', `  Search: "${query}" — ${results.length} result(s)`));
            for (const ch of results.slice(-20)) {
                console.log(`  ${ch.changeId}  ${ch.actor}  ${ch.action}  ${ch.resource}  ${ch.timestamp}`);
            }
            console.log('');
            break;
        }
        case 'link': {
            const changeId = positionals[1];
            const ticket = positionals[2];
            if (!changeId || !ticket) { console.error(c('red', '  Usage: change-log link <changeId> <ticket>')); return; }
            log.link(changeId, ticket);
            console.log(c('green', `  ✓ Linked ${changeId} → ${ticket}`));
            break;
        }
        default:
            console.error(c('red', `  Unknown subcommand: ${subCmd}. Use: list|search|link`));
    }
}

function cmdConfig(rawArgs) {
    const { positionals } = parseArgs(rawArgs);
    const subCmd = (positionals[0] || 'list').toLowerCase();
    const configFile = path.join(ADMIN_HOME, 'service-configs.json');

    function readConfigs() {
        if (!fs.existsSync(configFile)) return {};
        try { return JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (_) { return {}; }
    }
    function writeConfigs(data) {
        if (!fs.existsSync(ADMIN_HOME)) fs.mkdirSync(ADMIN_HOME, { recursive: true });
        fs.writeFileSync(configFile, JSON.stringify(data, null, 2), 'utf8');
    }

    switch (subCmd) {
        case 'list': {
            const configs = readConfigs();
            const services = Object.keys(configs);
            if (services.length === 0) { console.log(c('dim', '  No service configs stored.')); return; }
            console.log('');
            console.log(c('bold', '  Service Configurations'));
            console.log('  ' + '─'.repeat(60));
            for (const svc of services) {
                const keys = Object.keys(configs[svc]);
                console.log(`  ${c('cyan', svc.padEnd(30))}  ${keys.length} key(s): ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
            }
            console.log('');
            break;
        }
        case 'get': {
            const service = positionals[1];
            if (!service) { console.error(c('red', '  Usage: config get <service>')); return; }
            const configs = readConfigs();
            const svcConfig = configs[service] || {};
            console.log('');
            console.log(c('bold', `  Config: ${service}`));
            console.log('  ' + '─'.repeat(60));
            if (Object.keys(svcConfig).length === 0) {
                console.log(c('dim', '  No config entries for this service.'));
            } else {
                for (const [k, v] of Object.entries(svcConfig)) {
                    console.log(`  ${c('cyan', k.padEnd(30))}  ${v}`);
                }
            }
            console.log('');
            break;
        }
        case 'set': {
            const service = positionals[1];
            const key = positionals[2];
            const value = positionals[3];
            if (!service || !key || value === undefined) {
                console.error(c('red', '  Usage: config set <service> <key> <value>'));
                return;
            }
            const configs = readConfigs();
            if (!configs[service]) configs[service] = {};
            const before = configs[service][key];
            configs[service][key] = value;
            writeConfigs(configs);
            // Record in change log
            try {
                const cl = new ChangeLog(ADMIN_HOME);
                cl.record({ actor: 'admin-cli', action: 'config.set', resource: `config:${service}`, before: { [key]: before }, after: { [key]: value }, environment: 'production' });
            } catch (_) {}
            console.log(c('green', `  ✓ Set ${service}.${key} = ${value}`));
            break;
        }
        default:
            console.error(c('red', `  Unknown subcommand: ${subCmd}. Use: list|get|set`));
    }
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp() {
    const helpText = `
${c('bold', 'Milonexa Omni Admin CLI')} ${c('cyan', 'Phase E (TUI · Webhooks · AI · Multi-Cluster · SLA · Trends)')}

Usage:
  node admin-cli/index.js <command> [options] [services]

Core commands:
  doctor                                    Check toolchain, role, and audit status
  build   [--runtime direct|docker|k8s]    Build services/images
  start   [--runtime direct|docker|k8s]    Start services
  stop    [--runtime direct|docker|k8s]    Stop services
  restart [--runtime direct|docker|k8s]    Restart services
  status  [--runtime direct|docker|k8s]    Show running state
  logs    [--runtime direct|docker|k8s] --service <name> [--follow] [--tail N]

Operational wrappers:
  health   [--gateway http://localhost:8000] [--timeout 5]
  backup   <backup-restore.sh args...>
  monitor  <cache|error-budget|release-health|drift> [...args]
  run      <portable-script-name> [...args]

Phase 2 — Authorization & Audit:
  role                                              Show current role (all roles)
  audit    [--tail 50] [--json] [--actor <name>]   View audit log
  set-role <viewer|operator|admin|break-glass>      Change active role (requires admin)

Phase 3 — Progressive Delivery & Validation:
  scale    --runtime k8s|docker --service <name> --replicas <n> [--wait]
  rollout  --runtime k8s --strategy rolling|canary|bluegreen|status|undo [--service]
  check    all|drift|release-gate|image-tags|bluegreen [--json]

Phase 4 — Incident Intelligence:
  incident summarize --runtime docker|k8s|direct --service <name> [--since 1h] [--tail 800]

Phase D — Advanced Intelligence & Governance:
  metrics      status|record|anomalies [--category] [--service] [--json]
  alerts       list|history|acknowledge [--status active|resolved] [--json]
  policies     list|evaluate [--action] [--role] [--json]
  costs        summary|budget|optimize [--service] [--json]
  compliance   status|report [--format summary|detailed] [--json]
  recommendations top|dismiss|implement [--limit 10] [--json]
  dashboard    [--interval 5] [--json]

Phase E — TUI · Webhooks · AI Remediation · Multi-Cluster · SLA · Trends:
  tui          [--interval 3]                        Interactive full-screen TUI dashboard
  webhooks     list|add|remove|enable|disable|fire|history|stats [--type slack|teams|pagerduty|github]
  sla          status|predict|add|record|simulate|list [--id] [--value] [--json]
  remediate    analyze|rules|history|config [--json] [--llm-enable true]
  cluster      list|register|deregister|contexts|status|exec|switch|diff [--name] [--context]
  trends       report|chart|anomalies|forecast [--category] [--steps N] [--json]

Phase F (Q2 2026) — Plugins · Batch · Diff · Completion · Logs · Snapshots · Compare:
  plugins                                            List installed plugins
  plugin-run   <name> [args...]                      Run a named plugin
  batch        <start|stop|restart> <svc...> [--all] Batch operation across multiple services
  diff         config <svc> [--new-env KEY=VAL ...]  Preview config change (no apply)
  diff         scale <svc> <replicas>                Preview replica count change
  completion   [bash|zsh]                            Print shell completion script
  tail-logs    <svc> [--follow] [--tail 100]         Stream live service logs (Docker/k8s)
  snapshot     save|list|show|restore|delete [name]  Save/restore service configuration
  compare      <svc1> <svc2> [svc3...]               Side-by-side metrics comparison

Roles (ascending privilege):
  viewer       Read-only (doctor, role, status, logs, health, check, audit, monitor, run, incident, metrics, etc.)
  operator     + build, start/restart, scale/rollout (non-prod), metrics recording, alerts, sla record
  admin        + stop, backup, scale/rollout/start/restart in prod/k8s, policy creation, budget management, webhooks
  break-glass  Emergency override — skips prompts, always flagged in audit

Set role via env:  ADMIN_CLI_ROLE=admin node admin-cli/index.js start ...

Key flags:
  --env dev|staging|prod       Target environment (default: dev)
  --runtime direct|docker|k8s  Runtime adapter (default: docker)
  --admin                      Include admin profile/components
  --all                        Select all known components
  --install                    Install dependencies before direct build/start
  --dry-run                    Print commands without executing (skips prod confirmation)
  --confirm                    Skip interactive confirmation prompt (CI/pipeline mode)
  --namespace <name>           Kubernetes namespace (default: milonexa)
  --force                      Force SIGKILL for stubborn direct-mode processes
  --json                       Emit machine-readable JSON output where supported
  --service <name>             Target specific service
  --category <type>            Filter by category (metrics, alerts, policies)
  --status <status>            Filter by status (active, resolved, pending, implemented)
  --limit <number>             Limit output (for rankings, history)
  --format <format>            Output format (summary, detailed)
  --interval <seconds>         Refresh interval for TUI/dashboard (default: 3-5s)

Examples:
  node admin-cli/index.js tui
  node admin-cli/index.js tui --interval 5
  node admin-cli/index.js webhooks add --type slack --name "Ops Slack" --url https://hooks.slack.com/...
  node admin-cli/index.js webhooks fire --event alert --severity critical --message "High CPU"
  node admin-cli/index.js sla status --json
  node admin-cli/index.js sla predict
  node admin-cli/index.js sla simulate --count 20
  node admin-cli/index.js remediate analyze
  node admin-cli/index.js remediate config --llm-enable true --llm-model gpt-4o-mini
  node admin-cli/index.js cluster register --name prod-us --context gke_project_us --env prod --region us-east1
  node admin-cli/index.js cluster status
  node admin-cli/index.js cluster diff
  node admin-cli/index.js trends report --json
  node admin-cli/index.js trends chart --category cpu
  node admin-cli/index.js trends anomalies
  node admin-cli/index.js trends forecast --category memory --steps 10
  node admin-cli/index.js doctor
  node admin-cli/index.js metrics status --service api-gateway --json
  node admin-cli/index.js alerts list --json
  node admin-cli/index.js costs summary --json
  node admin-cli/index.js compliance status --json
  node admin-cli/index.js recommendations top --limit 5
  node admin-cli/index.js dashboard --interval 5
  node admin-cli/index.js policies list --type operational
  node admin-cli/index.js scale --runtime k8s --service api-gateway --replicas 3 --wait
  node admin-cli/index.js rollout --runtime k8s --strategy canary --service api-gateway --wait
  node admin-cli/index.js check all --env staging --namespace milonexa
  node admin-cli/index.js incident summarize --runtime docker --service api-gateway --since 2h --tail 1200
  node admin-cli/index.js start --runtime docker --env dev
  node admin-cli/index.js status --runtime direct
  node admin-cli/index.js logs --runtime docker --service api-gateway --follow --tail 100
  node admin-cli/index.js health --gateway http://localhost:8000
  node admin-cli/index.js backup backup all
  node admin-cli/index.js audit --tail 20
  node admin-cli/index.js set-role operator

Data Directories (.admin-cli/):
  metrics/       Metrics time-series data and aggregations
  alerts/        Alert rules and trigger history
  policies/      Custom policy-as-code definitions
  costs/         Cost records and budget tracking
  compliance/    Compliance check results and reports
  recommendations/ Intelligence engine recommendations
  sla/           SLA definitions and measurements (Phase E)
  webhooks/      Webhook configurations and delivery history (Phase E)
  clusters/      Multi-cluster Kubernetes registry (Phase E)
  remediation/   AI remediation config and session history (Phase E)
  snapshots/     Configuration snapshots (Phase F)

Learn more: Review docs/admin/CLI_ADMIN_PANEL.md for detailed documentation
`;

    console.log(helpText);
}

// ---------------------------------------------------------------------------
// Main — Phase 2 dispatch with auth → confirm → audit → command → finish
// ---------------------------------------------------------------------------

async function main() {
    const [, , command, ...rawArgs] = process.argv;

    if (!command || ['help', '--help', '-h'].includes(command)) {
        printHelp();
        return;
    }

    // Pre-parse options early for auth/audit — cmd* functions re-parse internally
    const { options, positionals } = parseArgs(rawArgs);

    // Treat `set-role --show` (or `set-role` with no args) as read-only `role` for authorization.
    let commandForAuth = command;
    if (command === 'set-role' && (toBool(options.show, false) || positionals.length === 0)) {
        commandForAuth = 'role';
    }

    // ---- Phase 2: Resolve role and check authorization -----------------------
    const role = resolveRole();
    const authResult = checkAuthorization(commandForAuth, options, role);

    if (!authResult.allowed) {
        console.error(
            `${c('red', '[denied]')} Command '${c('bold', command)}' requires role '${c('bold', authResult.required)}'. ` +
            `Current role: '${c('bold', role)}'.\n` +
            `         Run: node admin-cli/index.js set-role ${authResult.required}`
        );
        process.exit(1);
    }

    if (authResult.breakGlass) {
        warn(`break-glass role active — authorization bypassed. This operation will be flagged in the audit log.`);
    }

    // ---- Phase 2: Production confirmation prompt -----------------------------
    if (requiresConfirmation(command, options, authResult)) {
        const confirmed = await promptConfirm(command, authResult.isProd, role);
        if (!confirmed) {
            warn('Operation aborted by user.');
            process.exit(0);
        }
    }

    // ---- Phase 2: Start audit entry ------------------------------------------
    _pendingAudit = auditStart(command, rawArgs, options, authResult);

    // ---- Dispatch ------------------------------------------------------------
    try {
        switch (command) {
            case 'doctor': cmdDoctor(options); break;
            case 'role': cmdRole(rawArgs); break;
            case 'check': cmdCheck(rawArgs); break;
            case 'build': cmdBuild(rawArgs); break;
            case 'scale': cmdScale(rawArgs); break;
            case 'rollout': cmdRollout(rawArgs); break;
            case 'incident': cmdIncident(rawArgs); break;
            case 'metrics': cmdMetrics(rawArgs); break;
            case 'alerts': cmdAlerts(rawArgs); break;
            case 'policies': cmdPolicies(rawArgs); break;
            case 'costs': cmdCosts(rawArgs); break;
            case 'compliance': cmdCompliance(rawArgs); break;
            case 'recommendations': cmdRecommendations(rawArgs); break;
            case 'dashboard': cmdDashboard(rawArgs); break;
            // Phase E
            case 'tui': cmdTUI(rawArgs); break;
            case 'webhooks': await cmdWebhooks(rawArgs); break;
            case 'sla': cmdSLA(rawArgs); break;
            case 'remediate': await cmdRemediate(rawArgs); break;
            case 'cluster': cmdCluster(rawArgs); break;
            case 'trends': cmdTrends(rawArgs); break;
            case 'start': cmdStart(rawArgs); break;
            case 'stop': cmdStop(rawArgs); break;
            case 'restart': cmdRestart(rawArgs); break;
            case 'status': cmdStatus(rawArgs); break;
            case 'logs': cmdLogs(rawArgs); break;
            case 'health': cmdHealth(rawArgs); break;
            case 'backup': cmdBackup(rawArgs); break;
            case 'monitor': cmdMonitor(rawArgs); break;
            case 'run': cmdRun(rawArgs); break;
            case 'audit': cmdAudit(rawArgs); break;
            case 'set-role': cmdSetRole(rawArgs); break;
            // Phase F (Q2 2026)
            case 'plugins': cmdPlugins(rawArgs); break;
            case 'plugin-run': await cmdPluginRun(rawArgs); break;
            case 'batch': await cmdBatch(rawArgs); break;
            case 'diff': cmdDiff(rawArgs); break;
            case 'completion': cmdCompletion(rawArgs); break;
            case 'tail-logs': await cmdTailLogs(rawArgs); break;
            case 'snapshot': await cmdSnapshot(rawArgs); break;
            case 'compare': cmdCompare(rawArgs); break;
            // Q4 2026
            case 'feature-flags': cmdFeatureFlags(rawArgs); break;
            case 'tenant': cmdTenant(rawArgs); break;
            case 'runbook': await cmdRunbook(rawArgs); break;
            case 'ai': await cmdAI(rawArgs); break;
            case 'change-log': cmdChangeLog(rawArgs); break;
            case 'config': cmdConfig(rawArgs); break;
            default:
                fatal(`Unknown command: ${command}\nUse: node admin-cli/index.js --help`);
        }

        _pendingAudit.finish('success');
        _pendingAudit = null;
    } catch (err) {
        if (_pendingAudit) {
            try { _pendingAudit.finish('failure', 1); } catch (_) { }
            _pendingAudit = null;
        }
        console.error(`${c('red', '[error]')} Unexpected error: ${err.message}`);
        if (process.env.DEBUG) console.error(err.stack);
        process.exit(1);
    }
}

// Load plugins before running the CLI
loadPlugins();

main().catch((err) => {
    if (_pendingAudit) {
        try { _pendingAudit.finish('failure', 1); } catch (_) { }
    }
    console.error(`${c('red', '[fatal]')} ${err.message}`);
    process.exit(1);
});
