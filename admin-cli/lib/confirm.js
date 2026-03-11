'use strict';
/**
 * confirm.js — Production safety and confirmation prompts for Milonexa Admin CLI (Phase 2)
 *
 * Safety policies:
 *   - Any write command targeting production-scope prompts the operator to type CONFIRM.
 *   - --dry-run bypasses the prompt (nothing is actually executed).
 *   - --confirm flag bypasses the interactive prompt (for CI/automation pipelines).
 *   - break-glass role skips prompts (emergency use) but is always audited.
 *   - Non-interactive stdin refuses to hang: exits instead with a helpful message.
 */

const readline = require('readline');

/** Commands that only read/inspect — never require confirmation regardless of scope. */
const READ_ONLY_COMMANDS = new Set([
  'doctor',
  'status',
  'logs',
  'health',
  'run',
  'audit',
  'role',
  'set-role',
  'check',
  'incident',
]);

/**
 * Determine whether the CLI should prompt for confirmation before running.
 *
 * @param {string} command     CLI command name
 * @param {object} options     Parsed CLI options
 * @param {object} authResult  Result from checkAuthorization()
 * @returns {boolean}
 */
function requiresConfirmation(command, options, authResult) {
  // Read-only commands never need confirmation
  if (READ_ONLY_COMMANDS.has(command)) return false;

  // break-glass role bypasses confirmation (still audited)
  if (authResult && authResult.breakGlass) return false;

  // Not in production scope: no prompt needed
  if (!authResult || !authResult.isProd) return false;

  // --dry-run: nothing is actually executed, no prompt needed
  const hasDryRun = options && (options['dry-run'] === true || options['dry-run'] === 'true' || options['dry-run'] === '1');
  if (hasDryRun) return false;

  // --confirm: explicit acknowledgment provided (CI / pipeline mode)
  const hasExplicitConfirm = options && toBoolOpt(options.confirm);
  if (hasExplicitConfirm) return false;

  return true;
}

/** Minimal boolean coercion — avoids circular dependency on index.js toBool. */
function toBoolOpt(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;
  const s = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'y', 'on'].includes(s);
}

/**
 * Prompt the operator to type CONFIRM before proceeding.
 * Exits the process if stdin is non-interactive and auto-confirm was not passed.
 *
 * @param {string}  command  CLI command name
 * @param {boolean} isProd   Whether the command targets production
 * @param {string}  role     Active role name
 * @returns {Promise<boolean>} Resolves true if confirmed, false if aborted.
 */
async function promptConfirm(command, isProd, role) {
  const scope = isProd ? 'PRODUCTION' : 'elevated scope';

  if (!process.stdin.isTTY) {
    process.stderr.write(
      `\x1b[31m[error]\x1b[0m Command '\x1b[1m${command}\x1b[0m' targets ${scope} and requires confirmation.\n` +
      `       Non-interactive mode detected. Pass \x1b[1m--confirm\x1b[0m to acknowledge the risk,\n` +
      `       or \x1b[1m--dry-run\x1b[0m to preview without making changes.\n`
    );
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    const prompt =
      `\n\x1b[33m[confirm]\x1b[0m Command \x1b[1m${command}\x1b[0m targets \x1b[1m${scope}\x1b[0m (role: ${role}).\n` +
      `         This operation may affect live services. Type \x1b[1mCONFIRM\x1b[0m to proceed,\n` +
      `         or press Enter / type anything else to abort: `;

    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() === 'CONFIRM');
    });
  });
}

module.exports = { requiresConfirmation, promptConfirm };
