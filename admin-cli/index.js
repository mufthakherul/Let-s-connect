#!/usr/bin/env node

/**
 * Milonexa Omni Admin CLI (Phase 1+2)
 *
 * CLI-first operational control plane for direct, Docker Compose, and Kubernetes runtimes.
 * Phase 2 adds: role-based access control, immutable audit logging, and production safety.
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
const { resolveRole, checkAuthorization, persistRole, ROLES, ROLE_FILE } = require('./lib/auth');
const { auditStart, printAuditLog, AUDIT_LOG_FILE } = require('./lib/audit');
const { requiresConfirmation, promptConfirm } = require('./lib/confirm');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT_DIR = path.resolve(__dirname, '..');
const ADMIN_HOME = path.join(ROOT_DIR, '.admin-cli');
const DIRECT_LOG_DIR = path.join(ADMIN_HOME, 'logs');
const DIRECT_STATE_FILE = path.join(ADMIN_HOME, 'direct-processes.json');

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
    try { _pendingAudit.finish('failure', code); } catch (_) {}
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

  const rows = [['Tool', 'Purpose', 'Status']];
  checks.forEach(([tool, purpose]) => {
    rows.push([tool, purpose, commandExists(tool) ? c('green', 'available') : c('red', 'missing')]);
  });

  printTable(rows);

  // Phase 2: show active role and audit log location
  const role = resolveRole();
  console.log('');
  info(`Active role: ${c('bold', role)}`);
  info(`Role source: ${process.env.ADMIN_CLI_ROLE ? 'ADMIN_CLI_ROLE env' : fs.existsSync(ROLE_FILE) ? '.admin-cli/role.json' : 'default'}`);
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
// Phase 2: role viewer (viewer-accessible, read-only)
// ---------------------------------------------------------------------------

function cmdRole() {
  const current = resolveRole();
  const source = process.env.ADMIN_CLI_ROLE
    ? 'ADMIN_CLI_ROLE env'
    : fs.existsSync(ROLE_FILE) ? '.admin-cli/role.json' : 'default';
  console.log(`${c('bold', 'Active role:')} ${current}  (source: ${source})`);
  console.log(`${c('bold', 'Valid roles:')} ${ROLES.join(', ')}`);
  console.log(`${c('bold', 'Role file:  ')} ${path.relative(ROOT_DIR, ROLE_FILE)}`);
  console.log(`\nChange role (requires admin): node admin-cli/index.js set-role <role>`);
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
    cmdRole();
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
// Help
// ---------------------------------------------------------------------------

function printHelp() {
  const helpText = `
${c('bold', 'Milonexa Omni Admin CLI')} ${c('cyan', 'Phase 1+2')}

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

Roles (ascending privilege):
  viewer       Read-only (doctor, status, logs, health, audit, monitor, run)
  operator     + build, start/restart (non-prod)
  admin        + stop, backup, start/restart (prod/k8s)
  break-glass  Emergency override — skips prompts, always flagged in audit

Set role via env:  ADMIN_CLI_ROLE=admin node admin-cli/index.js start ...

Key flags:
  --env dev|staging|prod   Target environment (default: dev)
  --runtime direct|docker|k8s  Runtime adapter (default: docker)
  --admin                 Include admin profile/components
  --all                   Select all known components
  --install               Install dependencies before direct build/start
  --dry-run               Print commands without executing (skips prod confirmation)
  --confirm               Skip interactive confirmation prompt (CI/pipeline mode)
  --namespace <name>       Kubernetes namespace (default: milonexa)
  --force                 Force SIGKILL for stubborn direct-mode processes

Examples:
  node admin-cli/index.js doctor
  node admin-cli/index.js build --runtime docker --env dev --admin
  node admin-cli/index.js start --runtime docker --env dev
  node admin-cli/index.js start --runtime direct --install --admin
  node admin-cli/index.js start --runtime k8s --env prod --confirm
  node admin-cli/index.js stop  --runtime k8s --env prod --dry-run
  node admin-cli/index.js status --runtime direct
  node admin-cli/index.js logs --runtime docker --service api-gateway --follow --tail 100
  node admin-cli/index.js health --gateway http://localhost:8000
  node admin-cli/index.js backup backup all
  node admin-cli/index.js monitor cache 3
  node admin-cli/index.js audit --tail 20
  node admin-cli/index.js set-role operator
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
  const { options } = parseArgs(rawArgs);

  // ---- Phase 2: Resolve role and check authorization -----------------------
  const role = resolveRole();
  const authResult = checkAuthorization(command, options, role);

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
      case 'doctor':   cmdDoctor(options); break;
      case 'role':     cmdRole(); break;
      case 'build':    cmdBuild(rawArgs); break;
      case 'start':    cmdStart(rawArgs); break;
      case 'stop':     cmdStop(rawArgs); break;
      case 'restart':  cmdRestart(rawArgs); break;
      case 'status':   cmdStatus(rawArgs); break;
      case 'logs':     cmdLogs(rawArgs); break;
      case 'health':   cmdHealth(rawArgs); break;
      case 'backup':   cmdBackup(rawArgs); break;
      case 'monitor':  cmdMonitor(rawArgs); break;
      case 'run':      cmdRun(rawArgs); break;
      case 'audit':    cmdAudit(rawArgs); break;
      case 'set-role': cmdSetRole(rawArgs); break;
      default:
        fatal(`Unknown command: ${command}\nUse: node admin-cli/index.js --help`);
    }

    _pendingAudit.finish('success');
    _pendingAudit = null;
  } catch (err) {
    if (_pendingAudit) {
      try { _pendingAudit.finish('failure', 1); } catch (_) {}
      _pendingAudit = null;
    }
    console.error(`${c('red', '[error]')} Unexpected error: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main().catch((err) => {
  if (_pendingAudit) {
    try { _pendingAudit.finish('failure', 1); } catch (_) {}
  }
  console.error(`${c('red', '[fatal]')} ${err.message}`);
  process.exit(1);
});
