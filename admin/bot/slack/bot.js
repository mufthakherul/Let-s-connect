'use strict';

/**
 * @fileoverview Milonexa Slack Admin Bot
 *
 * Provides a full Slack bot interface to the Milonexa admin CLI using
 * `@slack/bolt` in Socket Mode (no public URL required).
 * All admin commands are routed through `node ../../cli/index.js` via child_process.execFile.
 *
 * Environment variables:
 *   ENABLE_ADMIN_BOT_SLACK     Must be 'true' to start the bot
 *   SLACK_BOT_TOKEN            Bot OAuth token (xoxb-…)
 *   SLACK_APP_TOKEN            App-level token for Socket Mode (xapp-…)
 *   SLACK_SIGNING_SECRET       Signing secret from the Slack App settings
 *   SLACK_ADMIN_USER_IDS       Comma-separated list of allowed Slack user IDs
 *   SLACK_ADMIN_CHANNELS       Comma-separated list of allowed channel IDs
 *
 * Security model:
 *   - Only users in SLACK_ADMIN_USER_IDS may run commands (empty = all users, warns loudly).
 *   - Commands are only processed in SLACK_ADMIN_CHANNELS (empty = all channels, warns loudly).
 *   - Destructive commands (restart, backup) require a confirmation modal before execution.
 *   - Every command invocation is appended to .admin-cli/audit.log.
 */

// ─── Guard ────────────────────────────────────────────────────────────────────
if (process.env.ENABLE_ADMIN_BOT_SLACK !== 'true') {
  console.log('[slack-bot] ENABLE_ADMIN_BOT_SLACK is not "true" — exiting.');
  process.exit(0);
}

const { App } = require('@slack/bolt');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// ─── Config ───────────────────────────────────────────────────────────────────
const SLACK_BOT_TOKEN     = process.env.SLACK_BOT_TOKEN;
const SLACK_APP_TOKEN     = process.env.SLACK_APP_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

for (const [name, val] of [
  ['SLACK_BOT_TOKEN', SLACK_BOT_TOKEN],
  ['SLACK_APP_TOKEN', SLACK_APP_TOKEN],
  ['SLACK_SIGNING_SECRET', SLACK_SIGNING_SECRET],
]) {
  if (!val) {
    console.error(`[slack-bot] ${name} is required. Exiting.`);
    process.exit(1);
  }
}

/** @type {Set<string>} Allowed Slack user IDs */
const ADMIN_USER_IDS = new Set(
  (process.env.SLACK_ADMIN_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

/** @type {Set<string>} Allowed Slack channel IDs */
const ADMIN_CHANNELS = new Set(
  (process.env.SLACK_ADMIN_CHANNELS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

const CLI_PATH = path.resolve(__dirname, '../../cli/index.js');
const AUDIT_LOG_PATH = path.resolve(process.cwd(), '.admin-cli/audit.log');

// ─── App initialisation ───────────────────────────────────────────────────────
const app = new App({
  token: SLACK_BOT_TOKEN,
  appToken: SLACK_APP_TOKEN,
  signingSecret: SLACK_SIGNING_SECRET,
  socketMode: true,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the userId + channelId combination is authorised.
 *
 * @param {string} userId
 * @param {string} channelId
 * @returns {boolean}
 */
function isAuthorised(userId, channelId) {
  const userOk = ADMIN_USER_IDS.size === 0 || ADMIN_USER_IDS.has(userId);
  const chanOk = ADMIN_CHANNELS.size === 0 || ADMIN_CHANNELS.has(channelId);
  if (ADMIN_USER_IDS.size === 0) {
    console.warn('[slack-bot] WARNING: SLACK_ADMIN_USER_IDS is not set — all users accepted.');
  }
  if (ADMIN_CHANNELS.size === 0) {
    console.warn('[slack-bot] WARNING: SLACK_ADMIN_CHANNELS is not set — all channels accepted.');
  }
  return userOk && chanOk;
}

/**
 * Appends a structured record to the audit log.
 *
 * @param {{ userId: string; command: string; args: string[]; channelId: string; outcome: string }} entry
 */
function writeAudit(entry) {
  try {
    const dir = path.dirname(AUDIT_LOG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const record = JSON.stringify({
      timestamp: new Date().toISOString(),
      source: 'slack-bot',
      actor: entry.userId,
      channelId: entry.channelId,
      command: entry.command,
      args: entry.args,
      outcome: entry.outcome,
      host: os.hostname(),
    });
    fs.appendFileSync(AUDIT_LOG_PATH, record + '\n');
  } catch (err) {
    console.error('[slack-bot] Audit write error:', err.message);
  }
}

/**
 * Runs a Milonexa admin CLI command and returns its stdout (truncated to
 * 2 900 chars to fit within a Slack block).
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
    const combined = (stdout + (stderr ? `\nstderr:\n${stderr}` : '')).trim();
    return combined.length > 2_900 ? combined.slice(0, 2_900) + '\n…(truncated)' : combined;
  } catch (err) {
    const msg = (err.stdout || '') + (err.stderr || '') || err.message;
    return `CLI error:\n${msg.trim().slice(0, 2_500)}`;
  }
}

/**
 * Builds a simple Block Kit response with a header, code block, and divider.
 *
 * @param {string} title
 * @param {string} body
 * @returns {import('@slack/bolt').Block[]}
 */
function codeBlocks(title, body) {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: title, emoji: true },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `\`\`\`${body}\`\`\`` },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `_Milonexa Admin Bot · ${new Date().toUTCString()}_`,
        },
      ],
    },
  ];
}

/**
 * Builds a destructive-action confirmation modal.
 *
 * @param {string} actionTitle  Human-readable action name, e.g. "Restart api-gateway"
 * @param {string} callbackId   Unique modal callback_id used to route the submission
 * @param {object} privateMetadata  Arbitrary object serialised into private_metadata
 * @returns {import('@slack/bolt').View}
 */
function confirmModal(actionTitle, callbackId, privateMetadata) {
  return {
    type: 'modal',
    callback_id: callbackId,
    private_metadata: JSON.stringify(privateMetadata),
    title: { type: 'plain_text', text: '⚠️ Confirm Action', emoji: true },
    submit: { type: 'plain_text', text: 'Confirm', emoji: true },
    close: { type: 'plain_text', text: 'Cancel', emoji: true },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Are you sure you want to *${actionTitle}*?\n\nThis action cannot be undone.`,
        },
      },
    ],
  };
}

// ─── Auth middleware ───────────────────────────────────────────────────────────

/**
 * Middleware that rejects commands from unauthorised users / channels.
 * Responds with an ephemeral error message and calls `next` only when authorised.
 */
async function authMiddleware({ payload, context, respond, next }) {
  const userId    = context.userId    || payload?.user_id    || payload?.user?.id;
  const channelId = context.channelId || payload?.channel_id || payload?.channel;

  if (!isAuthorised(userId, channelId)) {
    console.warn(`[slack-bot] Rejected unauthorised user ${userId} in channel ${channelId}`);
    if (typeof respond === 'function') {
      await respond({ response_type: 'ephemeral', text: '🚫 You are not authorised to use this bot.' });
    }
    return; // do NOT call next()
  }
  await next();
}

// ─── Slash command factory ────────────────────────────────────────────────────

/**
 * Registers a simple passthrough slash command.
 *
 * @param {string}   slashCommand  e.g. '/admin-status'
 * @param {string[]} cliArgs       Arguments forwarded to the CLI
 * @param {string}   title         Display title for the response block
 */
function registerSimpleCommand(slashCommand, cliArgs, title) {
  app.command(slashCommand, authMiddleware, async ({ ack, respond, command }) => {
    await ack();
    const userId    = command.user_id;
    const channelId = command.channel_id;
    writeAudit({ userId, channelId, command: slashCommand, args: cliArgs, outcome: 'started' });
    await respond({ response_type: 'in_channel', text: `⏳ Running ${slashCommand}…` });
    const output = await runCli(cliArgs);
    await respond({ response_type: 'in_channel', blocks: codeBlocks(title, output) });
    writeAudit({ userId, channelId, command: slashCommand, args: cliArgs, outcome: 'success' });
  });
}

// ─── Register simple commands ─────────────────────────────────────────────────

registerSimpleCommand('/admin-status',     ['status'],          '📊 Platform Status');
registerSimpleCommand('/admin-health',     ['health'],          '❤️  Health Check');
registerSimpleCommand('/admin-metrics',    ['metrics'],         '📈 Metrics Summary');
registerSimpleCommand('/admin-alerts',     ['alerts'],          '🔔 Active Alerts');
registerSimpleCommand('/admin-sla',        ['sla'],             '📋 SLA Status');
registerSimpleCommand('/admin-costs',      ['costs'],           '💰 Cost Summary');
registerSimpleCommand('/admin-compliance', ['compliance'],      '✅ Compliance Status');
registerSimpleCommand('/admin-recs',       ['recommendations'], '💡 Recommendations');
registerSimpleCommand('/admin-remediate',  ['remediate'],       '🤖 AI Remediation');
registerSimpleCommand('/admin-trends',     ['trends'],          '📉 Trend Analysis');

// ─── /admin-audit [n] ─────────────────────────────────────────────────────────
app.command('/admin-audit', authMiddleware, async ({ ack, respond, command }) => {
  await ack();
  const n = parseInt((command.text || '').trim(), 10) || 10;
  writeAudit({ userId: command.user_id, channelId: command.channel_id, command: '/admin-audit', args: [String(n)], outcome: 'started' });
  await respond({ response_type: 'in_channel', text: `⏳ Fetching last ${n} audit entries…` });
  const output = await runCli(['audit', '--tail', String(n)]);
  await respond({ response_type: 'in_channel', blocks: codeBlocks(`📝 Audit Log (last ${n})`, output) });
  writeAudit({ userId: command.user_id, channelId: command.channel_id, command: '/admin-audit', args: [String(n)], outcome: 'success' });
});

// ─── /admin-logs [service] [lines] ────────────────────────────────────────────
app.command('/admin-logs', authMiddleware, async ({ ack, respond, command }) => {
  await ack();
  const parts   = (command.text || '').trim().split(/\s+/);
  const service = parts[0] || 'api-gateway';
  const lines   = parseInt(parts[1], 10) || 50;
  writeAudit({ userId: command.user_id, channelId: command.channel_id, command: '/admin-logs', args: [service, String(lines)], outcome: 'started' });
  await respond({ response_type: 'in_channel', text: `⏳ Fetching last ${lines} lines of \`${service}\` logs…` });
  const output = await runCli(['logs', '--service', service, '--tail', String(lines)]);
  await respond({ response_type: 'in_channel', blocks: codeBlocks(`📜 Logs: ${service} (last ${lines} lines)`, output) });
  writeAudit({ userId: command.user_id, channelId: command.channel_id, command: '/admin-logs', args: [service, String(lines)], outcome: 'success' });
});

// ─── /admin-restart [service] — opens confirmation modal ──────────────────────
app.command('/admin-restart', authMiddleware, async ({ ack, client, command }) => {
  await ack();
  const service = (command.text || '').trim() || 'api-gateway';
  try {
    await client.views.open({
      trigger_id: command.trigger_id,
      view: confirmModal(
        `Restart \`${service}\``,
        'confirm_restart',
        { userId: command.user_id, channelId: command.channel_id, service }
      ),
    });
  } catch (err) {
    console.error('[slack-bot] Failed to open restart modal:', err.message);
  }
});

app.view('confirm_restart', async ({ ack, view, client }) => {
  await ack();
  const meta = JSON.parse(view.private_metadata || '{}');
  const { userId, channelId, service } = meta;
  writeAudit({ userId, channelId, command: '/admin-restart', args: [service], outcome: 'started' });
  const output = await runCli(['restart', '--service', service, '--confirm']);
  try {
    await client.chat.postMessage({
      channel: channelId,
      blocks: codeBlocks(`🔄 Restart: ${service}`, output),
    });
  } catch (err) {
    console.error('[slack-bot] Failed to post restart result:', err.message);
  }
  writeAudit({ userId, channelId, command: '/admin-restart', args: [service], outcome: 'success' });
});

// ─── /admin-backup — opens confirmation modal ────────────────────────────────
app.command('/admin-backup', authMiddleware, async ({ ack, client, command }) => {
  await ack();
  try {
    await client.views.open({
      trigger_id: command.trigger_id,
      view: confirmModal(
        'Run Full Platform Backup',
        'confirm_backup',
        { userId: command.user_id, channelId: command.channel_id }
      ),
    });
  } catch (err) {
    console.error('[slack-bot] Failed to open backup modal:', err.message);
  }
});

app.view('confirm_backup', async ({ ack, view, client }) => {
  await ack();
  const meta = JSON.parse(view.private_metadata || '{}');
  const { userId, channelId } = meta;
  writeAudit({ userId, channelId, command: '/admin-backup', args: [], outcome: 'started' });
  const output = await runCli(['backup', 'all', '--confirm']);
  try {
    await client.chat.postMessage({
      channel: channelId,
      blocks: codeBlocks('💾 Backup Result', output),
    });
  } catch (err) {
    console.error('[slack-bot] Failed to post backup result:', err.message);
  }
  writeAudit({ userId, channelId, command: '/admin-backup', args: [], outcome: 'success' });
});

// ─── app_mention → help ───────────────────────────────────────────────────────
app.event('app_mention', async ({ event, say }) => {
  if (!isAuthorised(event.user, event.channel)) {
    await say({ text: '🚫 You are not authorised to use this bot.', thread_ts: event.ts });
    return;
  }
  await say({
    thread_ts: event.ts,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '❓ Milonexa Admin Bot — Commands', emoji: true },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            '`/admin-status` — Platform health status',
            '`/admin-health` — Health check',
            '`/admin-metrics` — Metrics summary',
            '`/admin-alerts` — Active alerts',
            '`/admin-sla` — SLA status',
            '`/admin-costs` — Cost summary',
            '`/admin-compliance` — Compliance status',
            '`/admin-recs` — Top recommendations',
            '`/admin-audit [n]` — Last n audit entries (default 10)',
            '`/admin-logs [service] [lines]` — Service logs (default: api-gateway, 50 lines)',
            '`/admin-restart [service]` — Restart a service _(opens confirmation modal)_',
            '`/admin-backup` — Trigger full backup _(opens confirmation modal)_',
            '`/admin-remediate` — AI remediation analysis',
            '`/admin-trends` — Trend analysis report',
          ].join('\n'),
        },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `_Milonexa Admin Bot · ${new Date().toUTCString()}_` },
        ],
      },
    ],
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
(async () => {
  await app.start();
  console.log('[slack-bot] Milonexa Slack admin bot started (Socket Mode).');
})();

// ─── Error handling ───────────────────────────────────────────────────────────
app.error(async (error) => {
  console.error('[slack-bot] App error:', error.message || error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[slack-bot] Unhandled rejection:', reason);
});

process.on('SIGTERM', async () => {
  console.log('[slack-bot] SIGTERM received — shutting down.');
  await app.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[slack-bot] SIGINT received — shutting down.');
  await app.stop();
  process.exit(0);
});
