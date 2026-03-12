/**
 * Shared Event Bus — Hybrid-Grade API Platform
 * Phase 6: Distributed Systems Evolution
 *
 * Lightweight Redis pub/sub event bus that enables async, decoupled
 * service-to-service communication without tight coupling.
 *
 * Design principles:
 *  - Fire-and-forget for non-critical domain events (no ack required)
 *  - JSON envelope with schema version for forward compatibility
 *  - Automatic retry-safe serialization
 *  - Graceful degradation when Redis is unavailable
 *
 * Usage:
 *   const { EventBus } = require('../shared/event-bus');
 *   const Redis = require('ioredis');
 *
 *   const publishClient = new Redis(process.env.REDIS_URL);
 *   const subscribeClient = new Redis(process.env.REDIS_URL);
 *   const bus = new EventBus(publishClient, subscribeClient);
 *
 *   await bus.publish('user.registered', { userId, email });
 *   bus.subscribe('user.registered', async (payload) => { ... });
 */

const logger = require('./logger');

const EVENT_ENVELOPE_VERSION = '1';
const DEFAULT_CHANNEL_PREFIX = 'events';

/**
 * Build the full Redis channel name for an event type.
 * @param {string} eventType - Dot-namespaced event type, e.g. "user.registered"
 * @returns {string} Full channel name
 */
function channelName(eventType) {
  return `${DEFAULT_CHANNEL_PREFIX}:${eventType}`;
}

/**
 * Wrap a domain payload in a versioned event envelope.
 * @param {string} eventType
 * @param {object} payload
 * @param {object} [meta]
 * @returns {object} Enveloped event
 */
function createEnvelope(eventType, payload, meta = {}) {
  return {
    v: EVENT_ENVELOPE_VERSION,
    type: eventType,
    timestamp: new Date().toISOString(),
    requestId: meta.requestId || null,
    serviceOrigin: meta.serviceOrigin || process.env.SERVICE_NAME || 'unknown',
    payload
  };
}

class EventBus {
  /**
   * @param {import('ioredis').Redis} publishClient  - Redis client for publishing
   * @param {import('ioredis').Redis} subscribeClient - Dedicated Redis client for subscribing
   *        (Redis requires a separate client for subscribe mode)
   */
  constructor(publishClient, subscribeClient) {
    this._publisher = publishClient;
    this._subscriber = subscribeClient;
    this._handlers = new Map(); // channel → [handlerFn, ...]
    this._ready = false;

    if (this._subscriber) {
      this._subscriber.on('message', (channel, message) => {
        this._dispatch(channel, message);
      });
      this._ready = true;
    }
  }

  /**
   * Publish a domain event.
   *
   * @param {string} eventType - Namespaced event, e.g. "post.created"
   * @param {object} payload - Event-specific data
   * @param {object} [meta] - Optional metadata (requestId, serviceOrigin)
   * @returns {Promise<void>}
   */
  async publish(eventType, payload, meta = {}) {
    if (!this._publisher || this._publisher.status !== 'ready') {
      logger.warn({ eventType }, '[EventBus] Redis unavailable — event dropped');
      return;
    }

    const envelope = createEnvelope(eventType, payload, meta);
    try {
      await this._publisher.publish(channelName(eventType), JSON.stringify(envelope));
      logger.debug({ eventType, requestId: envelope.requestId }, '[EventBus] Event published');
    } catch (err) {
      logger.error({ err, eventType }, '[EventBus] Failed to publish event');
    }
  }

  /**
   * Subscribe to a domain event.
   *
   * @param {string} eventType - Event type to listen for
   * @param {Function} handler - async (payload, envelope) => void
   */
  subscribe(eventType, handler) {
    if (!this._subscriber) {
      logger.warn({ eventType }, '[EventBus] No subscribe client — subscription ignored');
      return;
    }

    const channel = channelName(eventType);

    if (!this._handlers.has(channel)) {
      this._handlers.set(channel, []);
      this._subscriber.subscribe(channel, (err) => {
        if (err) {
          logger.error({ err, channel }, '[EventBus] Failed to subscribe to channel');
        }
      });
    }

    this._handlers.get(channel).push(handler);
  }

  /**
   * Unsubscribe all handlers for an event type.
   * @param {string} eventType
   */
  unsubscribe(eventType) {
    const channel = channelName(eventType);
    if (this._handlers.has(channel)) {
      this._handlers.delete(channel);
      this._subscriber.unsubscribe(channel);
    }
  }

  /**
   * Internal dispatch — fan out to registered handlers in parallel.
   * Uses Promise.allSettled so a single handler failure does not block others.
   * @private
   */
  _dispatch(channel, message) {
    const handlers = this._handlers.get(channel) || [];
    if (handlers.length === 0) return;

    let envelope;
    try {
      envelope = JSON.parse(message);
    } catch (err) {
      logger.error({ err, channel }, '[EventBus] Failed to parse event message');
      return;
    }

    Promise.allSettled(
      handlers.map((handler) => handler(envelope.payload, envelope))
    ).then((results) => {
      results.forEach((result) => {
        if (result.status === 'rejected') {
          logger.error({ err: result.reason, channel, eventType: envelope.type }, '[EventBus] Handler threw an error');
        }
      });
    });
  }

  /**
   * Gracefully shut down both Redis clients.
   */
  async shutdown() {
    if (this._subscriber) await this._subscriber.quit();
    // Publisher client lifecycle is managed externally — do not quit here
    this._ready = false;
  }
}

module.exports = { EventBus, createEnvelope, channelName, EVENT_ENVELOPE_VERSION };
