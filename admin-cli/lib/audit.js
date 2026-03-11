'use strict';
/**
 * audit.js — Immutable append-only audit log for Milonexa Admin CLI (Phase 2)
 *
 * Format: NDJSON (one JSON record per line) at .admin-cli/audit.log
 *
 * Each record contains:
 *   traceId     Unique 8-byte hex ID per invocation
 *   timestamp   ISO-8601
 *   actor       USER env / hostname fallback
 *   role        Active RBAC role
 *   command     CLI command name
 *   args        Raw argv (capped, sensitive values redacted)
 *   options     Parsed options object (sensitive values redacted)
 *   runtime     direct | docker | k8s
 *   env         dev | staging | prod | default
 *   dryRun      boolean
 *   isProd      boolean — was this a production-scoped operation?
 *   breakGlass  boolean — was break-glass role used?
 *   outcome     started | success | failure
 *   exitCode    integer (on completion records only)
 *   durationMs  integer (on completion records only)
 *   host        hostname
 *
 * Audit failures are written to stderr but NEVER interrupt CLI operations.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const ADMIN_HOME = path.resolve(__dirname, '..', '..', '.admin-cli');
const AUDIT_LOG_FILE = path.join(ADMIN_HOME, 'audit.log');

/** Keys whose values are redacted in audit output to avoid leaking secrets. */
const SENSITIVE_KEY_FRAGMENTS = ['password', 'secret', 'token', 'key', 'auth', 'jwt', 'credential', 'passwd'];

function ensureAuditDir() {
  try {
    fs.mkdirSync(ADMIN_HOME, { recursive: true });
  } catch (_) {
    // ignore
  }
}

function getActor() {
  return (
    process.env.ADMIN_CLI_ACTOR ||
    process.env.USER ||
    process.env.USERNAME ||
    os.hostname()
  );
}

/** Shallow-redact object keys that look sensitive. */
function redactSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  Object.entries(obj).forEach(([k, v]) => {
    const lower = k.toLowerCase();
    if (SENSITIVE_KEY_FRAGMENTS.some((frag) => lower.includes(frag))) {
      result[k] = '[REDACTED]';
    } else {
      result[k] = v;
    }
  });
  return result;
}

/** Append a single record to the audit log (fire-and-forget; never throws). */
function auditRecord(entry) {
  ensureAuditDir();
  try {
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(AUDIT_LOG_FILE, line, 'utf8');
  } catch (err) {
    process.stderr.write(`[audit-warn] Could not write audit log: ${err.message}\n`);
  }
}

/**
 * Begin an audited operation. Returns a handle with a finish(outcome, exitCode) method.
 *
 * @param {string}   command    CLI command name
 * @param {string[]} rawArgs    Raw argv after the command token
 * @param {object}   options    Already-parsed CLI options
 * @param {object}   context    Auth context from checkAuthorization()
 * @returns {{ traceId: string, finish: function }}
 */
function auditStart(command, rawArgs, options, context) {
  const traceId = crypto.randomBytes(8).toString('hex');
  const startTime = Date.now();

  const baseEntry = {
    traceId,
    timestamp: new Date().toISOString(),
    actor: getActor(),
    role: (context && context.role) || 'unknown',
    command,
    // Cap args length and redact any obvious secret-looking positional args
    args: (rawArgs || []).slice(0, 20),
    options: redactSensitive({ ...(options || {}) }),
    runtime: (options && (options.runtime || 'docker')) || 'docker',
    env: (options && (options.env || options.target || 'default')) || 'default',
    dryRun: !!(options && (options['dry-run'] || options.dryRun)),
    isProd: !!(context && context.isProd),
    breakGlass: !!(context && context.breakGlass),
    outcome: 'started',
    host: os.hostname(),
  };

  auditRecord(baseEntry);

  return {
    traceId,
    finish(outcome, exitCode = 0) {
      auditRecord({
        ...baseEntry,
        outcome,
        exitCode,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    },
  };
}

/**
 * Read and pretty-print recent audit log entries.
 * @param {number}  tail     Number of most-recent records to show
 * @param {boolean} jsonMode Emit raw NDJSON instead of formatted table
 * @param {string}  actor    Optional filter: only show entries for this actor
 */
function printAuditLog(tail, jsonMode, actor) {
  if (!fs.existsSync(AUDIT_LOG_FILE)) {
    process.stdout.write('No audit log found yet.\n');
    return;
  }

  const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf8');
  let lines = content.split('\n').filter(Boolean);

  // Show only completion records (not the 'started' entries) unless we have no completions
  const completions = lines.filter((l) => {
    try {
      const e = JSON.parse(l);
      return e.outcome !== 'started';
    } catch (_) {
      return false;
    }
  });
  if (completions.length > 0) lines = completions;

  if (actor) {
    lines = lines.filter((l) => {
      try { return JSON.parse(l).actor === actor; } catch (_) { return false; }
    });
  }

  const recent = lines.slice(Math.max(0, lines.length - (tail || 50)));

  if (jsonMode) {
    recent.forEach((line) => process.stdout.write(line + '\n'));
    return;
  }

  // Header
  const COLS = ['Timestamp', 'Actor', 'Role', 'Command', 'Env', 'DryRun', 'Result', 'ms'];
  const colWidths = COLS.map((h) => h.length);
  const parsed = recent.map((line) => {
    try {
      const e = JSON.parse(line);
      return [
        (e.timestamp || '').slice(0, 19).replace('T', ' '),
        String(e.actor || ''),
        String(e.role || ''),
        String(e.command || '') + (e.breakGlass ? ' [BG]' : ''),
        String(e.env || '') + (e.isProd ? '*' : ''),
        e.dryRun ? 'yes' : 'no',
        e.outcome === 'success' ? 'ok' : e.outcome === 'failure' ? 'FAIL' : e.outcome,
        e.durationMs != null ? String(e.durationMs) : '-',
      ];
    } catch (_) {
      return [line.slice(0, 40), '-', '-', '-', '-', '-', '-', '-'];
    }
  });

  // Compute widths
  parsed.forEach((row) => row.forEach((col, i) => {
    colWidths[i] = Math.max(colWidths[i] || 0, String(col).length);
  }));

  const fmt = (row) => row.map((col, i) => String(col).padEnd(colWidths[i] + 2)).join('');

  process.stdout.write('\x1b[1m' + fmt(COLS) + '\x1b[0m\n');
  process.stdout.write('-'.repeat(colWidths.reduce((s, w) => s + w + 2, 0)) + '\n');
  parsed.forEach((row) => {
    const line = fmt(row);
    const isFailure = row[6] === 'FAIL';
    process.stdout.write((isFailure ? '\x1b[31m' : '') + line + (isFailure ? '\x1b[0m' : '') + '\n');
  });
}

module.exports = {
  auditStart,
  auditRecord,
  printAuditLog,
  AUDIT_LOG_FILE,
};
