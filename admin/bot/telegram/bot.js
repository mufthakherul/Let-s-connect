'use strict';

/**
 * @fileoverview Milonexa Telegram Admin Bot
 *
 * Provides a full Telegram bot interface to the Milonexa admin CLI.
 * All admin commands are routed through `node ../cli/index.js` via child_process.execFile.
 *
 * Environment variables:
 *   ENABLE_ADMIN_BOT_TELEGRAM    Must be 'true' to start the bot
 *   TELEGRAM_BOT_TOKEN           Bot token from @BotFather
 *   TELEGRAM_ADMIN_USER_IDS      Comma-separated list of allowed Telegram user IDs
 *   TELEGRAM_ADMIN_CHAT_IDS      Comma-separated list of allowed chat/group IDs
 *
 * Security model:
 *   - Only users AND chats in the allowlists are permitted to run commands.
 *   - Destructive commands (restart, backup, stop) require an inline confirmation step.
 *   - All commands are rate-limited to 10 per minute per user.
 *   - Every command invocation is appended to .admin-cli/audit.log.
 */

// ─── Guard ────────────────────────────────────────────────────────────────────
if (process.env.ENABLE_ADMIN_BOT_TELEGRAM !== 'true') {
  console.log('[telegram-bot] ENABLE_ADMIN_BOT_TELEGRAM is not "true" — exiting.');
  process.exit(0);
}

const TelegramBot = require('node-telegram-bot-api');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// ─── Config ───────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('[telegram-bot] TELEGRAM_BOT_TOKEN is required. Exiting.');
  process.exit(1);
}

/** @type {Set<number>} Allowed Telegram user IDs */
const ADMIN_USER_IDS = new Set(
  (process.env.TELEGRAM_ADMIN_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
);

/** @type {Set<number>} Allowed chat / group IDs */
const ADMIN_CHAT_IDS = new Set(
  (process.env.TELEGRAM_ADMIN_CHAT_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
);

const CLI_PATH = path.resolve(__dirname, '../../cli/index.js');
const AUDIT_LOG_PATH = path.resolve(process.cwd(), '.admin-cli/audit.log');

/** Maximum commands per minute per user before rate-limit kicks in. */
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

// ─── Runtime state ────────────────────────────────────────────────────────────

/**
 * Per-user rate-limit counters.
 * @type {Map<number, { count: number; resetAt: number }>}
 */
const rateLimitMap = new Map();

/**
 * Pending confirmation tokens for destructive operations.
 * Key: `${userId}:${nonce}`, Value: { command, args, chatId, expiresAt }
 * @type {Map<string, { command: string; args: string[]; chatId: number; expiresAt: number }>}
 */
const pendingConfirms = new Map();

// ─── Bot initialisation ───────────────────────────────────────────────────────
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('[telegram-bot] Milonexa Telegram admin bot started.');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the userId + chatId combination is authorised.
 *
 * When TELEGRAM_ADMIN_USER_IDS is empty the bot accepts any user (useful for
 * initial setup — warn loudly). Same logic for TELEGRAM_ADMIN_CHAT_IDS.
 *
 * @param {number} userId
 * @param {number} chatId
 * @returns {boolean}
 */
function isAuthorised(userId, chatId) {
  const userOk = ADMIN_USER_IDS.size === 0 || ADMIN_USER_IDS.has(userId);
  const chatOk = ADMIN_CHAT_IDS.size === 0 || ADMIN_CHAT_IDS.has(chatId);
  if (ADMIN_USER_IDS.size === 0) {
    console.warn('[telegram-bot] WARNING: TELEGRAM_ADMIN_USER_IDS is not set — all users accepted.');
  }
  if (ADMIN_CHAT_IDS.size === 0) {
    console.warn('[telegram-bot] WARNING: TELEGRAM_ADMIN_CHAT_IDS is not set — all chats accepted.');
  }
  return userOk && chatOk;
}

/**
 * Checks and updates the per-user rate limit.
 *
 * @param {number} userId
 * @returns {boolean} true if under the limit, false if the user is rate-limited.
 */
function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

/**
 * Appends a structured record to the audit log.
 *
 * @param {{ userId: number; username?: string; command: string; args: string[]; chatId: number; outcome: string }} entry
 */
function writeAudit(entry) {
  try {
    const dir = path.dirname(AUDIT_LOG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const record = JSON.stringify({
      timestamp: new Date().toISOString(),
      source: 'telegram-bot',
      actor: entry.username || String(entry.userId),
      userId: entry.userId,
      chatId: entry.chatId,
      command: entry.command,
      args: entry.args,
      outcome: entry.outcome,
      host: os.hostname(),
    });
    fs.appendFileSync(AUDIT_LOG_PATH, record + '\n');
  } catch (err) {
    console.error('[telegram-bot] Audit write error:', err.message);
  }
}

/**
 * Runs a Milonexa admin CLI command and returns its stdout (truncated to 3 800
 * chars to fit within a Telegram message).
 *
 * @param {string[]} args  Arguments passed after `node cli/index.js`
 * @param {object}  [opts]
 * @param {number}  [opts.timeout=30000]
 * @returns {Promise<string>}
 */
async function runCli(args, { timeout = 30_000 } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync('node', [CLI_PATH, ...args], {
      timeout,
      env: { ...process.env, ADMIN_CLI_ROLE: 'operator', FORCE_COLOR: '0' },
    });
    const combined = (stdout + (stderr ? `\n⚠️ stderr:\n${stderr}` : '')).trim();
    return combined.length > 3_800 ? combined.slice(0, 3_800) + '\n…(truncated)' : combined;
  } catch (err) {
    const msg = (err.stdout || '') + (err.stderr || '') || err.message;
    return `❌ CLI error:\n${msg.trim().slice(0, 3_000)}`;
  }
}

/**
 * Sends a message with Markdown parse mode, falling back to plain text on
 * parse errors.
 *
 * @param {number} chatId
 * @param {string} text
 * @param {object} [extra]  Extra options forwarded to sendMessage.
 */
async function sendMd(chatId, text, extra = {}) {
  try {
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...extra });
  } catch {
    await bot.sendMessage(chatId, text.replace(/[_*`\[\]]/g, ''), extra);
  }
}

/**
 * Generates a short random nonce for pending-confirmation keys.
 * @returns {string}
 */
function nonce() {
  return Math.random().toString(36).slice(2, 8);
}

// ─── Main menu keyboard ───────────────────────────────────────────────────────

/** Returns the main inline keyboard. */
function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📊 Status',      callback_data: 'cmd:status' },
        { text: '❤️ Health',      callback_data: 'cmd:health' },
      ],
      [
        { text: '📈 Metrics',     callback_data: 'cmd:metrics' },
        { text: '🔔 Alerts',      callback_data: 'cmd:alerts' },
      ],
      [
        { text: '📋 SLA',         callback_data: 'cmd:sla' },
        { text: '💰 Costs',       callback_data: 'cmd:costs' },
      ],
      [
        { text: '✅ Compliance',   callback_data: 'cmd:compliance' },
        { text: '💡 Recs',        callback_data: 'cmd:recommendations' },
      ],
      [
        { text: '📝 Audit (10)',  callback_data: 'cmd:audit' },
        { text: '📉 Trends',     callback_data: 'cmd:trends' },
      ],
      [
        { text: '🤖 Remediate',   callback_data: 'cmd:remediate' },
        { text: '❓ Help',        callback_data: 'cmd:help' },
      ],
    ],
  };
}

// ─── Command handlers ─────────────────────────────────────────────────────────

/** Maps simple (non-interactive) bot command names to CLI arguments. */
const SIMPLE_COMMANDS = {
  status:          ['status'],
  health:          ['health'],
  metrics:         ['metrics'],
  alerts:          ['alerts'],
  sla:             ['sla'],
  costs:           ['costs'],
  compliance:      ['compliance'],
  recommendations: ['recommendations'],
  trends:          ['trends'],
  remediate:       ['remediate'],
};

/**
 * Handles a verified, rate-checked admin command.
 *
 * @param {number}   chatId
 * @param {number}   userId
 * @param {string}   username
 * @param {string}   command   e.g. 'status', 'audit', 'logs'
 * @param {string[]} params    Extra tokens after the command
 */
async function handleAdminCommand(chatId, userId, username, command, params) {
  writeAudit({ userId, username, chatId, command, args: params, outcome: 'started' });

  // ── /start ─────────────────────────────────────────────────────────────────
  if (command === 'start') {
    await sendMd(
      chatId,
      `👋 *Welcome to the Milonexa Admin Bot!*\n\nUse the menu below or type /help for a full command list.`,
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  // ── /help ──────────────────────────────────────────────────────────────────
  if (command === 'help') {
    const helpText = [
      '*Milonexa Admin Bot — Commands*',
      '',
      '`/start` — Welcome & main menu',
      '`/help` — This message',
      '`/status` — Platform health status',
      '`/health` — Health check',
      '`/metrics` — Metrics summary',
      '`/alerts` — Active alerts',
      '`/sla` — SLA status',
      '`/costs` — Cost summary',
      '`/compliance` — Compliance status',
      '`/recommendations` — Top recommendations',
      '`/audit [n]` — Last n audit entries (default 10)',
      '`/logs [service] [lines]` — Service logs (default: api-gateway, 50 lines)',
      '`/restart [service]` — Restart a service _(requires confirmation)_',
      '`/backup` — Trigger backup _(requires confirmation)_',
      '`/remediate` — AI remediation analysis',
      '`/trends` — Trend analysis report',
    ].join('\n');
    await sendMd(chatId, helpText, { reply_markup: mainMenuKeyboard() });
    return;
  }

  // ── Simple passthrough commands ────────────────────────────────────────────
  if (SIMPLE_COMMANDS[command]) {
    await bot.sendMessage(chatId, `⏳ Running \`/${command}\`…`, { parse_mode: 'Markdown' });
    const output = await runCli(SIMPLE_COMMANDS[command]);
    await sendMd(chatId, `*/${command}*\n\`\`\`\n${output}\n\`\`\``);
    writeAudit({ userId, username, chatId, command, args: params, outcome: 'success' });
    return;
  }

  // ── /audit [n] ─────────────────────────────────────────────────────────────
  if (command === 'audit') {
    const n = parseInt(params[0], 10) || 10;
    await bot.sendMessage(chatId, `⏳ Fetching last ${n} audit entries…`);
    const output = await runCli(['audit', '--tail', String(n)]);
    await sendMd(chatId, `*Audit log (last ${n})*\n\`\`\`\n${output}\n\`\`\``);
    writeAudit({ userId, username, chatId, command, args: params, outcome: 'success' });
    return;
  }

  // ── /logs [service] [lines] ────────────────────────────────────────────────
  if (command === 'logs') {
    const service = params[0] || 'api-gateway';
    const lines = parseInt(params[1], 10) || 50;
    await bot.sendMessage(chatId, `⏳ Fetching last ${lines} lines of \`${service}\` logs…`, { parse_mode: 'Markdown' });
    const output = await runCli(['logs', '--service', service, '--tail', String(lines)]);
    await sendMd(chatId, `*Logs: ${service} (last ${lines} lines)*\n\`\`\`\n${output}\n\`\`\``);
    writeAudit({ userId, username, chatId, command, args: params, outcome: 'success' });
    return;
  }

  // ── /restart [service]  — requires confirmation ────────────────────────────
  if (command === 'restart') {
    const service = params[0] || 'api-gateway';
    const key = `${userId}:${nonce()}`;
    pendingConfirms.set(key, {
      command: 'restart',
      args: ['restart', '--service', service, '--confirm'],
      chatId,
      expiresAt: Date.now() + 60_000,
    });
    await sendMd(
      chatId,
      `⚠️ *Confirm restart of \`${service}\`?*\nThis will restart the service. Press *Confirm* to proceed or *Cancel*.`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Confirm', callback_data: `confirm:${key}` },
            { text: '❌ Cancel',  callback_data: `cancel:${key}` },
          ]],
        },
      }
    );
    return;
  }

  // ── /backup — requires confirmation ───────────────────────────────────────
  if (command === 'backup') {
    const key = `${userId}:${nonce()}`;
    pendingConfirms.set(key, {
      command: 'backup',
      args: ['backup', 'all', '--confirm'],
      chatId,
      expiresAt: Date.now() + 60_000,
    });
    await sendMd(
      chatId,
      `⚠️ *Confirm full platform backup?*\nThis will snapshot all services. Press *Confirm* to proceed or *Cancel*.`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Confirm', callback_data: `confirm:${key}` },
            { text: '❌ Cancel',  callback_data: `cancel:${key}` },
          ]],
        },
      }
    );
    return;
  }

  await sendMd(chatId, `❓ Unknown command \`${command}\`. Type /help for a list.`);
}

// ─── Telegram event listeners ─────────────────────────────────────────────────

/**
 * Central message handler — enforces auth and rate limiting before dispatching.
 *
 * @param {import('node-telegram-bot-api').Message} msg
 * @param {RegExpMatchArray|null} match
 * @param {string} command
 */
async function onCommand(msg, match, command) {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const username = msg.from?.username || msg.from?.first_name || String(userId);

  if (!isAuthorised(userId, chatId)) {
    console.warn(`[telegram-bot] Rejected unauthorised user ${userId} in chat ${chatId}`);
    await bot.sendMessage(chatId, '🚫 You are not authorised to use this bot.');
    return;
  }

  if (!checkRateLimit(userId)) {
    await bot.sendMessage(chatId, '⏱ Rate limit exceeded. Please wait a minute before sending more commands.');
    return;
  }

  // Extract any parameters after the command (strip bot @mention suffix)
  const rawText = msg.text || '';
  const afterCommand = rawText.replace(/^\/\w+(@\S+)?/, '').trim();
  const params = afterCommand ? afterCommand.split(/\s+/) : [];

  try {
    await handleAdminCommand(chatId, userId, username, command, params);
  } catch (err) {
    console.error(`[telegram-bot] Unhandled error for command /${command}:`, err);
    await bot.sendMessage(chatId, `❌ An unexpected error occurred: ${err.message}`);
    writeAudit({ userId, username, chatId, command, args: params, outcome: 'failure' });
  }
}

// Register all supported slash commands
const COMMANDS = [
  'start', 'help',
  'status', 'health', 'metrics', 'alerts', 'sla', 'costs',
  'compliance', 'recommendations', 'audit', 'logs',
  'restart', 'backup', 'remediate', 'trends',
];

for (const cmd of COMMANDS) {
  bot.onText(new RegExp(`^\\/${cmd}(?:@\\S+)?(?:\\s|$)`, 'i'), (msg, match) =>
    onCommand(msg, match, cmd)
  );
}

// ─── Callback query handler (inline keyboards) ────────────────────────────────
bot.on('callback_query', async (query) => {
  const chatId = query.message?.chat?.id;
  const userId = query.from?.id;
  const username = query.from?.username || query.from?.first_name || String(userId);
  const data = query.data || '';

  // Always ack the callback to remove the "loading" spinner
  await bot.answerCallbackQuery(query.id).catch(() => {});

  if (!isAuthorised(userId, chatId)) {
    await bot.sendMessage(chatId, '🚫 Not authorised.');
    return;
  }

  // ── Shortcut menu callbacks ─────────────────────────────────────────────
  if (data.startsWith('cmd:')) {
    const cmd = data.slice(4);
    if (!checkRateLimit(userId)) {
      await bot.sendMessage(chatId, '⏱ Rate limit exceeded.');
      return;
    }
    await handleAdminCommand(chatId, userId, username, cmd, []);
    return;
  }

  // ── Confirmation callbacks ──────────────────────────────────────────────
  if (data.startsWith('confirm:') || data.startsWith('cancel:')) {
    const [action, key] = data.split(':').slice(0, 2).concat(['']);
    const fullKey = data.slice(action.length + 1);

    // Clean expired entries
    const now = Date.now();
    for (const [k, v] of pendingConfirms) {
      if (now > v.expiresAt) pendingConfirms.delete(k);
    }

    const pending = pendingConfirms.get(fullKey);
    if (!pending) {
      await bot.sendMessage(chatId, '⚠️ This confirmation has expired. Please re-issue the command.');
      return;
    }

    // Ensure only the originating user can confirm
    const [ownerIdStr] = fullKey.split(':');
    if (userId !== parseInt(ownerIdStr, 10)) {
      await bot.sendMessage(chatId, '🚫 Only the user who issued the command may confirm it.');
      return;
    }

    pendingConfirms.delete(fullKey);

    if (action === 'cancel') {
      await bot.sendMessage(chatId, '❌ Operation cancelled.');
      writeAudit({ userId, username, chatId, command: pending.command, args: pending.args, outcome: 'cancelled' });
      return;
    }

    await bot.sendMessage(chatId, `⏳ Running \`${pending.command}\`…`, { parse_mode: 'Markdown' });
    const output = await runCli(pending.args);
    await sendMd(chatId, `*${pending.command} result*\n\`\`\`\n${output}\n\`\`\``);
    writeAudit({ userId, username, chatId, command: pending.command, args: pending.args, outcome: 'success' });
  }
});

// ─── Error handling ───────────────────────────────────────────────────────────
bot.on('polling_error', (err) => {
  console.error('[telegram-bot] Polling error:', err.code, err.message);
});

bot.on('error', (err) => {
  console.error('[telegram-bot] Bot error:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[telegram-bot] Unhandled rejection:', reason);
});

process.on('SIGTERM', () => {
  console.log('[telegram-bot] SIGTERM received — shutting down.');
  bot.stopPolling().then(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[telegram-bot] SIGINT received — shutting down.');
  bot.stopPolling().then(() => process.exit(0));
});
