'use strict';

/**
 * Admin Panel Feature Flag System
 *
 * Controls which admin interfaces are enabled via environment variables.
 *
 * Defaults:
 *   ENABLE_ADMIN_WEB=true     (web/frontend dashboard — always on by default)
 *   ENABLE_ADMIN_REST_API=false
 *   ENABLE_ADMIN_SSH=false
 *   ENABLE_ADMIN_WEBHOOK=false
 *   ENABLE_ADMIN_BOT_TELEGRAM=false
 *   ENABLE_ADMIN_BOT_SLACK=false
 *   ENABLE_ADMIN_EMAIL=false
 *
 * CLI is always available locally and is excluded from the env-flag system.
 */

function isEnabled(envVar, defaultValue = false) {
    const val = process.env[envVar];
    if (val === undefined || val === '') return defaultValue;
    return val.toLowerCase() === 'true' || val === '1';
}

const config = {
    // Web/Frontend dashboard — enabled by default
    web: {
        enabled: isEnabled('ENABLE_ADMIN_WEB', true),
        port: parseInt(process.env.ADMIN_WEB_PORT || '3001', 10),
        apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000',
        secret: process.env.REACT_APP_ADMIN_SECRET || '',
    },

    // REST API admin server
    restApi: {
        enabled: isEnabled('ENABLE_ADMIN_REST_API', false),
        port: parseInt(process.env.ADMIN_API_PORT || '8888', 10),
        host: process.env.ADMIN_API_HOST || '127.0.0.1',
        apiKey: process.env.ADMIN_API_KEY || '',
        corsOrigin: process.env.ADMIN_CORS_ORIGIN || 'http://localhost:3001',
        allowedIps: (process.env.ADMIN_ALLOWED_IPS || '127.0.0.1,::1').split(',').map(s => s.trim()),
    },

    // SSH admin dashboard
    ssh: {
        enabled: isEnabled('ENABLE_ADMIN_SSH', false),
        port: parseInt(process.env.ADMIN_SSH_PORT || '2222', 10),
        host: process.env.ADMIN_SSH_HOST || '127.0.0.1',
        password: process.env.ADMIN_SSH_PASSWORD || '',
        authorizedKeys: process.env.ADMIN_SSH_AUTHORIZED_KEYS || '',
        hostKeyPath: process.env.ADMIN_SSH_HOST_KEY_PATH || '',
        maxSessions: parseInt(process.env.ADMIN_SSH_MAX_SESSIONS || '5', 10),
        idleTimeout: parseInt(process.env.ADMIN_SSH_IDLE_TIMEOUT || '300', 10),
        banner: process.env.ADMIN_SSH_BANNER || 'Milonexa Admin SSH — Authorized Access Only',
        allowedIps: (process.env.ADMIN_ALLOWED_IPS || '127.0.0.1,::1').split(',').map(s => s.trim()),
    },

    // Webhook notification server
    webhook: {
        enabled: isEnabled('ENABLE_ADMIN_WEBHOOK', false),
        port: parseInt(process.env.ADMIN_WEBHOOK_PORT || '8889', 10),
        host: process.env.ADMIN_WEBHOOK_HOST || '0.0.0.0',
        secret: process.env.ADMIN_WEBHOOK_SECRET || '',
        // Outbound targets
        slack: (process.env.ADMIN_WEBHOOK_SLACK_URLS || '').split(',').filter(Boolean),
        teams: (process.env.ADMIN_WEBHOOK_TEAMS_URLS || '').split(',').filter(Boolean),
        pagerduty: (process.env.ADMIN_WEBHOOK_PAGERDUTY_KEY || ''),
        discord: (process.env.ADMIN_WEBHOOK_DISCORD_URLS || '').split(',').filter(Boolean),
    },

    // Telegram bot
    bot: {
        telegram: {
            enabled: isEnabled('ENABLE_ADMIN_BOT_TELEGRAM', false),
            token: process.env.TELEGRAM_BOT_TOKEN || '',
            allowedChatIds: (process.env.TELEGRAM_ADMIN_CHAT_IDS || '').split(',').filter(Boolean),
            adminUserIds: (process.env.TELEGRAM_ADMIN_USER_IDS || '').split(',').filter(Boolean),
        },
        slack: {
            enabled: isEnabled('ENABLE_ADMIN_BOT_SLACK', false),
            botToken: process.env.SLACK_BOT_TOKEN || '',
            appToken: process.env.SLACK_APP_TOKEN || '',
            signingSecret: process.env.SLACK_SIGNING_SECRET || '',
            adminChannels: (process.env.SLACK_ADMIN_CHANNELS || '').split(',').filter(Boolean),
            adminUserIds: (process.env.SLACK_ADMIN_USER_IDS || '').split(',').filter(Boolean),
            port: parseInt(process.env.SLACK_BOT_PORT || '3003', 10),
        },
    },

    // Email command interface
    email: {
        enabled: isEnabled('ENABLE_ADMIN_EMAIL', false),
        // Inbound IMAP (listen for commands)
        imap: {
            host: process.env.ADMIN_EMAIL_IMAP_HOST || '',
            port: parseInt(process.env.ADMIN_EMAIL_IMAP_PORT || '993', 10),
            tls: isEnabled('ADMIN_EMAIL_IMAP_TLS', true),
            user: process.env.ADMIN_EMAIL_USER || '',
            password: process.env.ADMIN_EMAIL_PASSWORD || '',
        },
        // Outbound SMTP (send responses)
        smtp: {
            host: process.env.ADMIN_EMAIL_SMTP_HOST || '',
            port: parseInt(process.env.ADMIN_EMAIL_SMTP_PORT || '587', 10),
            secure: isEnabled('ADMIN_EMAIL_SMTP_SECURE', false),
            user: process.env.ADMIN_EMAIL_SMTP_USER || process.env.ADMIN_EMAIL_USER || '',
            password: process.env.ADMIN_EMAIL_SMTP_PASS || process.env.ADMIN_EMAIL_PASSWORD || '',
            from: process.env.ADMIN_EMAIL_FROM || '',
        },
        // Allowed sender addresses that can issue commands (owner/admin emails)
        allowedSenders: (process.env.ADMIN_EMAIL_ALLOWED_SENDERS || '').split(',').filter(Boolean),
        // Subject prefix to identify admin command emails
        subjectPrefix: process.env.ADMIN_EMAIL_SUBJECT_PREFIX || '[ADMIN-CMD]',
        // Polling interval in seconds
        pollInterval: parseInt(process.env.ADMIN_EMAIL_POLL_INTERVAL || '30', 10),
        // Signature required in email body for extra security
        signature: process.env.ADMIN_EMAIL_SIGNATURE || '',
    },

    // Global security
    security: {
        allowedIps: (process.env.ADMIN_ALLOWED_IPS || '').split(',').filter(Boolean),
        allowedIpRanges: (process.env.ADMIN_ALLOWED_IP_RANGES || '').split(',').filter(Boolean),
        enable2FA: isEnabled('ENABLE_ADMIN_2FA', false),
    },

    // Database
    db: {
        url: process.env.ADMIN_DB_URL || '',
        masterUsername: process.env.ADMIN_MASTER_USERNAME || 'admin',
        masterPassword: process.env.ADMIN_MASTER_PASSWORD || '',
        jwtSecret: process.env.ADMIN_JWT_SECRET || '',
    },
};

/**
 * Print summary of enabled/disabled admin interfaces to console.
 */
function printStatusSummary() {
    const interfaces = [
        { name: 'Web Dashboard  ', enabled: config.web.enabled, info: `port ${config.web.port}` },
        { name: 'REST API       ', enabled: config.restApi.enabled, info: `port ${config.restApi.port}` },
        { name: 'SSH Dashboard  ', enabled: config.ssh.enabled, info: `port ${config.ssh.port}` },
        { name: 'Webhook Server ', enabled: config.webhook.enabled, info: `port ${config.webhook.port}` },
        { name: 'Telegram Bot   ', enabled: config.bot.telegram.enabled, info: 'Telegram API' },
        { name: 'Slack Bot      ', enabled: config.bot.slack.enabled, info: `port ${config.bot.slack.port}` },
        { name: 'Email Interface', enabled: config.email.enabled, info: config.email.imap.host || 'IMAP' },
        { name: 'CLI            ', enabled: true, info: 'always available (local)' },
    ];

    console.log('\n  ╔══════════════════════════════════════════════╗');
    console.log('  ║         Admin Panel Interface Status          ║');
    console.log('  ╠══════════════════════════════════════════════╣');
    for (const iface of interfaces) {
        const icon = iface.enabled ? '✅' : '❌';
        const status = iface.enabled ? 'ENABLED ' : 'DISABLED';
        console.log(`  ║  ${icon} ${iface.name}  ${status}  (${iface.info})`);
    }
    console.log('  ╚══════════════════════════════════════════════╝\n');
}

module.exports = { config, isEnabled, printStatusSummary };
