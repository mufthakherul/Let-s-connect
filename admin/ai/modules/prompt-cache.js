'use strict';

/**
 * @fileoverview In-memory prompt cache for the Milonexa AI Admin Agent.
 *
 * Capabilities (v2.1):
 *  - Caches LLM prompt→response pairs using a content-hash key.
 *  - Configurable TTL (default: 30 minutes) prevents stale results.
 *  - LRU eviction when capacity limit is reached (default: 256 entries).
 *  - `wrap(llmFn)` returns a transparent caching wrapper around any llmFn.
 *  - `getStats()` exposes hit/miss counters for observability.
 *
 * All I/O uses ONLY Node.js built-in modules.
 */

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TTL_MS  = 30 * 60 * 1000;  // 30 minutes
const DEFAULT_MAX_SIZE = 256;

// ---------------------------------------------------------------------------
// PromptCache
// ---------------------------------------------------------------------------

class PromptCache {
    /**
     * @param {{ ttlMs?: number, maxSize?: number }} [opts]
     */
    constructor(opts = {}) {
        this._ttlMs   = opts.ttlMs   || DEFAULT_TTL_MS;
        this._maxSize = opts.maxSize || DEFAULT_MAX_SIZE;
        /** @type {Map<string, { response: string, expiresAt: number, hits: number }>} */
        this._cache = new Map();
        this._stats = { hits: 0, misses: 0, evictions: 0 };
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Wrap an llmFn with transparent caching.
     *
     * @param {Function|null} llmFn  async (prompt: string) => string | null
     * @returns {Function|null}  wrapped function (or null if llmFn is null)
     */
    wrap(llmFn) {
        if (typeof llmFn !== 'function') return llmFn;
        return async (prompt) => {
            const key = this._hash(prompt);
            const cached = this._get(key);
            if (cached !== undefined) {
                this._stats.hits++;
                return cached;
            }
            this._stats.misses++;
            const response = await llmFn(prompt);
            if (response) this._set(key, response);
            return response;
        };
    }

    /**
     * Explicitly cache a known prompt→response pair.
     * @param {string} prompt
     * @param {string} response
     */
    put(prompt, response) {
        this._set(this._hash(prompt), response);
    }

    /**
     * Look up a cached response.
     * @param {string} prompt
     * @returns {string|undefined}
     */
    lookup(prompt) {
        const val = this._get(this._hash(prompt));
        if (val !== undefined) this._stats.hits++;
        else this._stats.misses++;
        return val;
    }

    /** Invalidate all cached entries. */
    clear() {
        this._cache.clear();
    }

    /** @returns {{ hits: number, misses: number, evictions: number, size: number, hitRatio: number }} */
    getStats() {
        const total = this._stats.hits + this._stats.misses;
        return {
            ...this._stats,
            size:     this._cache.size,
            hitRatio: total > 0 ? Math.round((this._stats.hits / total) * 100) / 100 : 0,
        };
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /** @private */
    _hash(prompt) {
        return crypto.createHash('sha256').update(prompt).digest('hex');
    }

    /** @private */
    _get(key) {
        const entry = this._cache.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expiresAt) {
            this._cache.delete(key);
            return undefined;
        }
        // LRU: re-insert to move to end of Map iteration order.
        entry.hits++;
        this._cache.delete(key);
        this._cache.set(key, entry);
        return entry.response;
    }

    /** @private */
    _set(key, response) {
        // Evict oldest entry if at capacity.
        if (this._cache.size >= this._maxSize) {
            const oldest = this._cache.keys().next().value;
            this._cache.delete(oldest);
            this._stats.evictions++;
        }
        this._cache.set(key, {
            response,
            expiresAt: Date.now() + this._ttlMs,
            hits: 0,
        });
    }
}

module.exports = { PromptCache };
