'use strict';

/**
 * Runtime helper factory for presence, event streaming, webhook delivery,
 * and email digest features. Accepts redis + model references so that
 * the helpers can be shared between socket.io handlers and route modules.
 */

const PRESENCE_KEY = 'milonexa:presence';
const PRESENCE_TTL_SECONDS = 90;
const EVENT_STREAM_KEY = 'milonexa:events';
const MAX_STREAM_LENGTH = 10000;
const DIGEST_CHECK_INTERVAL_MS = 60 * 60 * 1000;

module.exports = function createHelpers({ redis, Webhook, Notification, NotificationPreference, Op }) {

  // ── Online Presence ────────────────────────────────────────────────────────

  async function setUserPresence(userId, status = 'online', customStatus = '') {
    try {
      const value = JSON.stringify({ status, customStatus, lastSeen: Date.now() });
      await redis.hset(PRESENCE_KEY, userId, value);
      await redis.set(`milonexa:presence:ttl:${userId}`, '1', 'EX', PRESENCE_TTL_SECONDS);
    } catch (err) {
      console.error('[Presence] setUserPresence error:', err.message);
    }
  }

  async function clearUserPresence(userId) {
    try {
      await redis.hdel(PRESENCE_KEY, userId);
      await redis.del(`milonexa:presence:ttl:${userId}`);
    } catch (err) {
      console.error('[Presence] clearUserPresence error:', err.message);
    }
  }

  async function getUserPresence(userId) {
    try {
      const ttlExists = await redis.exists(`milonexa:presence:ttl:${userId}`);
      if (!ttlExists) {
        await redis.hdel(PRESENCE_KEY, userId);
        return { status: 'offline', lastSeen: null };
      }
      const raw = await redis.hget(PRESENCE_KEY, userId);
      return raw ? JSON.parse(raw) : { status: 'offline', lastSeen: null };
    } catch {
      return { status: 'offline', lastSeen: null };
    }
  }

  // ── Redis Streams ──────────────────────────────────────────────────────────

  async function publishEvent(eventType, data) {
    try {
      const payload = JSON.stringify({ eventType, data, ts: Date.now() });
      await redis.xadd(
        EVENT_STREAM_KEY, 'MAXLEN', '~', MAX_STREAM_LENGTH, '*',
        'eventType', eventType,
        'payload', payload
      );
    } catch (err) {
      console.error(`[Events] Failed to publish event ${eventType}:`, err.message);
    }
  }

  // ── Webhook Delivery ───────────────────────────────────────────────────────

  async function triggerWebhooks(eventType, data) {
    try {
      const https = require('https');
      const http = require('http');
      const webhooks = await Webhook.findAll();
      for (const wh of webhooks) {
        try {
          const body = JSON.stringify({ event: eventType, data, ts: new Date().toISOString() });
          const url = new URL(wh.endpoint || wh.avatarUrl || '');
          const lib = url.protocol === 'https:' ? https : http;
          const req = lib.request(
            {
              hostname: url.hostname,
              port: url.port || (url.protocol === 'https:' ? 443 : 80),
              path: url.pathname + url.search,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'X-Milonexa-Event': eventType,
                'X-Webhook-Token': wh.token || ''
              }
            },
            (res) => { res.resume(); }
          );
          req.on('error', (e) => console.error(`[Webhook] Delivery failed to ${wh.id}:`, e.message));
          req.write(body);
          req.end();
        } catch (e) {
          console.error(`[Webhook] Invalid webhook ${wh.id}:`, e.message);
        }
      }
    } catch (err) {
      console.error('[Webhook] triggerWebhooks error:', err.message);
    }
  }

  // ── Email Digest ───────────────────────────────────────────────────────────

  let emailTransport = null;
  try {
    const nodemailer = require('nodemailer');
    if (process.env.SMTP_HOST) {
      emailTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      console.log('[Email] SMTP transport configured.');
    } else {
      console.warn('[Email] SMTP_HOST not set — email digest is disabled.');
    }
  } catch {
    console.warn('[Email] nodemailer not installed — email digest is disabled.');
  }

  async function sendDigestEmail(userId, userEmail, notifications) {
    if (!emailTransport || !userEmail) return false;
    try {
      const listHtml = notifications.map(n =>
        `<li><strong>${n.title}</strong>: ${n.body}</li>`
      ).join('');
      await emailTransport.sendMail({
        from: process.env.SMTP_FROM || '"Milonexa" <noreply@milonexa.com>',
        to: userEmail,
        subject: `Your Milonexa digest — ${notifications.length} update${notifications.length !== 1 ? 's' : ''}`,
        html: `<h2>Your Milonexa Digest</h2><ul>${listHtml}</ul><p><a href="${process.env.APP_URL || 'https://milonexa.com'}">View all notifications</a></p>`
      });
      return true;
    } catch (err) {
      console.error('[Email] Digest send failed:', err.message);
      return false;
    }
  }

  function startDigestScheduler() {
    console.log(`[Digest] Scheduler started (check interval: 1 hour)`);
    setInterval(async () => {
      try {
        const now = new Date();
        const isDaily = now.getHours() === 8 && now.getMinutes() < 60;
        const isWeekly = now.getDay() === 1 && isDaily;

        const where = isWeekly
          ? { enableEmailDigest: true, digestFrequency: ['daily', 'weekly'] }
          : isDaily
            ? { enableEmailDigest: true, digestFrequency: 'daily' }
            : null;

        if (!where) return;

        const prefs = await NotificationPreference.findAll({ where });
        for (const pref of prefs) {
          const since = new Date(Date.now() - (pref.digestFrequency === 'weekly' ? 7 : 1) * 24 * 60 * 60 * 1000);
          const notifications = await Notification.findAll({
            where: { userId: pref.userId, isRead: false, createdAt: { [Op.gte]: since } },
            limit: 20
          });
          if (notifications.length === 0) continue;
          console.log(`[Digest] Sending digest to user ${pref.userId} (${notifications.length} notifications)`);
          await publishEvent('digest.sent', { userId: pref.userId, count: notifications.length });
        }
      } catch (err) {
        console.error('[Digest] Scheduler error:', err.message);
      }
    }, DIGEST_CHECK_INTERVAL_MS);
  }

  return {
    setUserPresence,
    clearUserPresence,
    getUserPresence,
    publishEvent,
    triggerWebhooks,
    sendDigestEmail,
    startDigestScheduler,
    PRESENCE_KEY,
    EVENT_STREAM_KEY
  };
};
