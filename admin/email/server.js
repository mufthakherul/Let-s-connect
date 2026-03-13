#!/usr/bin/env node
'use strict';

/**
 * @file server.js
 * @description Milonexa Admin Email Command Interface
 *
 * Polls an IMAP mailbox for admin command emails matching a configured subject
 * prefix and allowed-sender list, executes them via the Milonexa Admin CLI, and
 * replies with the output via SMTP.
 *
 * Guard: set ENABLE_ADMIN_EMAIL=true to activate. Any other value causes an
 * immediate clean exit so the process is safe to start unconditionally in
 * environments where the feature is not needed.
 *
 * Environment variables
 * ---------------------
 * ENABLE_ADMIN_EMAIL          Must be exactly 'true' to activate (required)
 *
 * IMAP (incoming mail)
 *   ADMIN_EMAIL_IMAP_HOST     IMAP server hostname (required)
 *   ADMIN_EMAIL_IMAP_PORT     IMAP port             (default: 993)
 *   ADMIN_EMAIL_IMAP_TLS      Use TLS               (default: true)
 *   ADMIN_EMAIL_USER          IMAP username / email address (required)
 *   ADMIN_EMAIL_PASSWORD      IMAP password (required)
 *
 * SMTP (outgoing replies)
 *   ADMIN_EMAIL_SMTP_HOST     SMTP server hostname (required)
 *   ADMIN_EMAIL_SMTP_PORT     SMTP port            (default: 587)
 *   ADMIN_EMAIL_SMTP_SECURE   Use TLS/SSL          (default: false → STARTTLS)
 *   ADMIN_EMAIL_SMTP_USER     SMTP auth user       (fallback: ADMIN_EMAIL_USER)
 *   ADMIN_EMAIL_SMTP_PASS     SMTP auth password   (fallback: ADMIN_EMAIL_PASSWORD)
 *   ADMIN_EMAIL_FROM          Sender address for replies (required)
 *
 * Access control
 *   ADMIN_EMAIL_ALLOWED_SENDERS  Comma-separated list of authorised sender addresses
 *   ADMIN_EMAIL_SUBJECT_PREFIX   Subject prefix that marks a command email (default: '[ADMIN-CMD]')
 *   ADMIN_EMAIL_SIGNATURE        Optional secret string that must appear in the email body
 *
 * Polling
 *   ADMIN_EMAIL_POLL_INTERVAL  Poll frequency in seconds (default: 30)
 */

if (process.env.ENABLE_ADMIN_EMAIL !== 'true') {
  console.log('[admin-email] ENABLE_ADMIN_EMAIL is not set to "true" – exiting cleanly.');
  process.exit(0);
}

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const Imap = require('imap');
const nodemailer = require('nodemailer');
const { simpleParser } = require('mailparser');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CLI_PATH = path.join(__dirname, '../cli/index.js');
const REPO_ROOT_CANDIDATE = path.resolve(__dirname, '..', '..');
const ROOT_DIR = fs.existsSync(path.join(REPO_ROOT_CANDIDATE, 'docker-compose.yml'))
  ? REPO_ROOT_CANDIDATE
  : path.resolve(__dirname, '..');
const ADMIN_HOME = process.env.ADMIN_HOME || path.join(ROOT_DIR, '.admin-cli');
const AUDIT_LOG_FILE = path.join(ADMIN_HOME, 'audit.log');
const COMMAND_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_CHARS = 4_000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1_000; // 1 hour

/**
 * Commands that may safely be executed via email.
 * Dangerous state-mutating commands (restart, stop, backup) are intentionally omitted.
 */
const ALLOWED_COMMANDS = new Set([
  'help',
  'status',
  'metrics',
  'alerts',
  'health',
  'audit',
  'sla',
  'costs',
  'compliance',
  'recommendations',
  'trends',
  'remediate',
  'cluster',
  'webhooks',
  'doctor',
  'logs',
]);

// ---------------------------------------------------------------------------
// Configuration builder
// ---------------------------------------------------------------------------

/**
 * Reads and validates configuration from environment variables.
 * @returns {object} Validated configuration object.
 * @throws {Error} When a required environment variable is missing.
 */
function buildConfig() {
  const required = (key) => {
    const val = process.env[key];
    if (!val) throw new Error(`Missing required environment variable: ${key}`);
    return val;
  };
  const opt = (key, defaultValue = '') => process.env[key] || defaultValue;

  return {
    imap: {
      host: required('ADMIN_EMAIL_IMAP_HOST'),
      port: parseInt(opt('ADMIN_EMAIL_IMAP_PORT', '993'), 10),
      tls: opt('ADMIN_EMAIL_IMAP_TLS', 'true') !== 'false',
      user: required('ADMIN_EMAIL_USER'),
      password: required('ADMIN_EMAIL_PASSWORD'),
    },
    smtp: {
      host: required('ADMIN_EMAIL_SMTP_HOST'),
      port: parseInt(opt('ADMIN_EMAIL_SMTP_PORT', '587'), 10),
      secure: opt('ADMIN_EMAIL_SMTP_SECURE', 'false') === 'true',
      user: opt('ADMIN_EMAIL_SMTP_USER') || required('ADMIN_EMAIL_USER'),
      pass: opt('ADMIN_EMAIL_SMTP_PASS') || required('ADMIN_EMAIL_PASSWORD'),
    },
    from: required('ADMIN_EMAIL_FROM'),
    allowedSenders: opt('ADMIN_EMAIL_ALLOWED_SENDERS')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    subjectPrefix: opt('ADMIN_EMAIL_SUBJECT_PREFIX', '[ADMIN-CMD]'),
    signature: opt('ADMIN_EMAIL_SIGNATURE', ''),
    pollIntervalMs: parseInt(opt('ADMIN_EMAIL_POLL_INTERVAL', '30'), 10) * 1_000,
  };
}

// ---------------------------------------------------------------------------
// AdminEmailServer
// ---------------------------------------------------------------------------

class AdminEmailServer {
  /**
   * @param {object} config - Configuration produced by buildConfig().
   */
  constructor(config) {
    this.config = config;
    this._running = false;
    this._pollTimer = null;
    this._backoffMs = 5_000;

    /** @type {Map<string, number[]>} sender → array of command timestamps */
    this._rateLimitMap = new Map();

    this._transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /** Starts the polling loop. */
  async start() {
    this._running = true;
    console.log(`[admin-email] Starting – poll interval ${this.config.pollIntervalMs / 1_000}s`);
    this._ensureAuditDir();
    await this._poll();
  }

  /** Gracefully stops the polling loop. */
  async stop() {
    console.log('[admin-email] Stopping…');
    this._running = false;
    if (this._pollTimer) {
      clearTimeout(this._pollTimer);
      this._pollTimer = null;
    }
  }

  // -------------------------------------------------------------------------
  // Polling
  // -------------------------------------------------------------------------

  /** Schedules the next poll and executes the current one. */
  async _poll() {
    if (!this._running) return;

    try {
      await this.pollEmails();
      this._backoffMs = 5_000; // reset backoff on success
    } catch (err) {
      console.error(`[admin-email] Poll error: ${err.message}`);
      console.error(`[admin-email] Retrying in ${this._backoffMs / 1_000}s`);
      this._backoffMs = Math.min(this._backoffMs * 2, 5 * 60 * 1_000); // max 5 min
    }

    if (this._running) {
      this._pollTimer = setTimeout(() => this._poll(), this.config.pollIntervalMs);
    }
  }

  /**
   * Opens the IMAP INBOX, fetches UNSEEN messages, processes matching ones,
   * and marks them read.
   */
  async pollEmails() {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.config.imap.user,
        password: this.config.imap.password,
        host: this.config.imap.host,
        port: this.config.imap.port,
        tls: this.config.imap.tls,
        tlsOptions: { rejectUnauthorized: true },
        connTimeout: 15_000,
        authTimeout: 10_000,
      });

      imap.once('error', (err) => reject(err));

      imap.once('ready', () => {
        imap.openBox('INBOX', false /* read-write */, async (boxErr, box) => {
          if (boxErr) {
            imap.end();
            return reject(boxErr);
          }

          imap.search(['UNSEEN'], async (searchErr, uids) => {
            if (searchErr) {
              imap.end();
              return reject(searchErr);
            }

            if (!uids || uids.length === 0) {
              imap.end();
              return resolve();
            }

            console.log(`[admin-email] Found ${uids.length} unseen message(s)`);

            const fetch = imap.fetch(uids, { bodies: '' });
            const emailBuffers = [];

            fetch.on('message', (msg, seqno) => {
              let buffer = Buffer.alloc(0);

              msg.on('body', (stream) => {
                stream.on('data', (chunk) => {
                  buffer = Buffer.concat([buffer, chunk]);
                });
              });

              msg.once('end', () => emailBuffers.push({ uid: uids[seqno - 1] ?? seqno, buffer }));
            });

            fetch.once('error', (fetchErr) => {
              imap.end();
              reject(fetchErr);
            });

            fetch.once('end', async () => {
              // Process all emails sequentially; mark each read regardless of outcome.
              for (const { uid, buffer } of emailBuffers) {
                try {
                  const parsed = await simpleParser(buffer);
                  await this.processEmail(parsed);
                } catch (procErr) {
                  console.error(`[admin-email] Error processing message uid=${uid}: ${procErr.message}`);
                }

                // Mark as read (\Seen flag)
                imap.addFlags(uid, ['\\Seen'], (flagErr) => {
                  if (flagErr) console.error(`[admin-email] Could not mark uid=${uid} as read: ${flagErr.message}`);
                });
              }

              imap.end();
              resolve();
            });
          });
        });
      });

      imap.connect();
    });
  }

  // -------------------------------------------------------------------------
  // Email processing
  // -------------------------------------------------------------------------

  /**
   * Validates and dispatches a single parsed email message.
   * @param {import('mailparser').ParsedMail} email
   */
  async processEmail(email) {
    const subject = email.subject || '';
    const from = email.from?.value?.[0]?.address?.toLowerCase() ?? '';
    const body = email.text || email.html || '';

    // Subject filter
    if (!subject.startsWith(this.config.subjectPrefix)) {
      return;
    }

    // Sender allow-list
    if (!this.isAllowedSender(from)) {
      console.warn(`[admin-email] Rejected email from unauthorised sender: ${from}`);
      this.logAudit({ event: 'rejected_sender', from, subject });
      return;
    }

    // Signature verification
    if (this.config.signature && !body.includes(this.config.signature)) {
      console.warn(`[admin-email] Rejected email from ${from} – missing/invalid signature`);
      this.logAudit({ event: 'rejected_signature', from, subject });
      await this.sendReply(
        from,
        subject,
        'Command rejected: invalid or missing security signature.',
      );
      return;
    }

    // Rate limiting
    if (!this.checkRateLimit(from)) {
      console.warn(`[admin-email] Rate limit exceeded for sender: ${from}`);
      this.logAudit({ event: 'rate_limited', from, subject });
      await this.sendReply(
        from,
        subject,
        `Command rejected: rate limit exceeded. Maximum ${RATE_LIMIT_MAX} commands per hour.`,
      );
      return;
    }

    // Parse command from subject: strip prefix then tokenise
    const commandLine = subject.slice(this.config.subjectPrefix.length).trim();
    const [command, ...args] = commandLine.split(/\s+/);

    if (!command) {
      await this.sendReply(from, subject, 'Command rejected: no command found in subject line.');
      return;
    }

    console.log(`[admin-email] Command "${command} ${args.join(' ')}" from ${from}`);
    this.logAudit({ event: 'command_received', from, subject, command, args });

    const output = await this.executeCommand(command, args, from);
    await this.sendReply(from, subject, this._formatReply(command, args, output));
  }

  // -------------------------------------------------------------------------
  // Command execution
  // -------------------------------------------------------------------------

  /**
   * Executes a CLI command via child_process.execFile.
   * @param {string} command  - Top-level CLI command token.
   * @param {string[]} args   - Additional argument tokens.
   * @param {string} sender   - Sender email (for audit logging).
   * @returns {Promise<string>} Combined stdout + stderr, truncated to MAX_OUTPUT_CHARS.
   */
  async executeCommand(command, args, sender) {
    // Help is handled inline – no CLI invocation needed.
    if (command === 'help') {
      return this._helpText();
    }

    if (!ALLOWED_COMMANDS.has(command)) {
      this.logAudit({ event: 'blocked_command', from: sender, command, args });
      return (
        `Command "${command}" is not available via the email interface.\n\n` +
        `Allowed read-only commands:\n${[...ALLOWED_COMMANDS].join(', ')}`
      );
    }

    const cliArgs = [command, ...args];

    return new Promise((resolve) => {
      this.logAudit({ event: 'command_execute', from: sender, command, args });

      execFile('node', [CLI_PATH, ...cliArgs], { timeout: COMMAND_TIMEOUT_MS }, (err, stdout, stderr) => {
        let output = [stdout, stderr].filter(Boolean).join('\n').trim();

        if (err && err.killed) {
          output = `[TIMEOUT] Command exceeded ${COMMAND_TIMEOUT_MS / 1_000}s limit.\n` + output;
        }

        if (output.length > MAX_OUTPUT_CHARS) {
          output =
            output.slice(0, MAX_OUTPUT_CHARS) +
            `\n\n[Output truncated at ${MAX_OUTPUT_CHARS} characters]`;
        }

        this.logAudit({ event: 'command_complete', from: sender, command, args, exitCode: err?.code ?? 0 });
        resolve(output || '(no output)');
      });
    });
  }

  // -------------------------------------------------------------------------
  // Email replies
  // -------------------------------------------------------------------------

  /**
   * Sends a reply email.
   * @param {string} to      - Recipient address.
   * @param {string} subject - Original subject (used to build Re: subject).
   * @param {string} body    - Plain-text reply body.
   */
  async sendReply(to, subject, body) {
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

    try {
      await this._transporter.sendMail({
        from: this.config.from,
        to,
        subject: replySubject,
        text: body,
      });
      console.log(`[admin-email] Reply sent to ${to}`);
    } catch (err) {
      console.error(`[admin-email] Failed to send reply to ${to}: ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // Access control & rate limiting
  // -------------------------------------------------------------------------

  /**
   * Returns true if the sender address is in the allow-list.
   * @param {string} email - Normalised (lowercase) sender address.
   * @returns {boolean}
   */
  isAllowedSender(email) {
    if (this.config.allowedSenders.length === 0) return false;
    return this.config.allowedSenders.includes(email.toLowerCase());
  }

  /**
   * Returns true if the sender is within their rate limit, recording the
   * current timestamp. Returns false if the limit is exceeded.
   * @param {string} sender - Normalised sender address.
   * @returns {boolean}
   */
  checkRateLimit(sender) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    const timestamps = (this._rateLimitMap.get(sender) ?? []).filter((t) => t > windowStart);

    if (timestamps.length >= RATE_LIMIT_MAX) return false;

    timestamps.push(now);
    this._rateLimitMap.set(sender, timestamps);
    return true;
  }

  // -------------------------------------------------------------------------
  // Audit logging
  // -------------------------------------------------------------------------

  /**
   * Appends a structured audit entry to the shared audit log.
   * @param {object} entry - Audit payload (will be JSON-serialised).
   */
  logAudit(entry) {
    const line =
      JSON.stringify({
        ts: new Date().toISOString(),
        source: 'admin-email',
        host: os.hostname(),
        ...entry,
      }) + '\n';

    try {
      fs.appendFileSync(AUDIT_LOG_FILE, line, 'utf8');
    } catch (err) {
      console.error(`[admin-email] Audit log write failed: ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /** Ensures the directory containing the audit log exists. */
  _ensureAuditDir() {
    const dir = path.dirname(AUDIT_LOG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Formats the command result as a plain-text reply body.
   * @param {string}   command
   * @param {string[]} args
   * @param {string}   output
   * @returns {string}
   */
  _formatReply(command, args, output) {
    const fullCommand = [command, ...args].join(' ');
    return [
      'Admin Command Executed',
      '=====================',
      `Command:  ${fullCommand}`,
      `Executed: ${new Date().toISOString()}`,
      `Server:   ${os.hostname()}`,
      '',
      'Output:',
      '--------',
      output,
      '',
      '---',
      'Milonexa Admin Email Interface',
    ].join('\n');
  }

  /**
   * Returns inline help text listing all commands available via email.
   * @returns {string}
   */
  _helpText() {
    return [
      'Milonexa Admin Email Interface – Available Commands',
      '====================================================',
      '',
      'Send an email with subject: [ADMIN-CMD] <command> [args]',
      '',
      'Commands:',
      '  help                             Show this help message',
      '  status                           Platform status overview',
      '  health                           Run health checks',
      '  doctor                           System doctor diagnostic',
      '  metrics [subcommand]             Metrics (status|list|report)',
      '  alerts [subcommand]              Alerts (list|status|history)',
      '  audit [--tail N]                 View audit log entries',
      '  sla [subcommand]                 SLA status and reports',
      '  costs [subcommand]               Cost summary and analysis',
      '  compliance [subcommand]          Compliance status',
      '  recommendations [subcommand]     AI recommendations',
      '  trends [subcommand]              Trend analysis',
      '  remediate [subcommand]           AI remediation',
      '  cluster [subcommand]             Multi-cluster operations',
      '  webhooks [subcommand]            Webhook management',
      '  logs --service NAME [--tail N]   Service log tail',
      '',
      'Note: State-mutating commands (start, stop, restart, backup) are',
      'not available via the email interface for security reasons.',
    ].join('\n');
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  let config;
  try {
    config = buildConfig();
  } catch (err) {
    console.error(`[admin-email] Configuration error: ${err.message}`);
    process.exit(1);
  }

  const server = new AdminEmailServer(config);

  const shutdown = async (signal) => {
    console.log(`[admin-email] Received ${signal} – shutting down`);
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (err) => {
    console.error(`[admin-email] Uncaught exception: ${err.message}`, err.stack);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[admin-email] Unhandled rejection:', reason);
  });

  await server.start();
}

main();
