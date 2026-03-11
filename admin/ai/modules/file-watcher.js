'use strict';

/**
 * @fileoverview Real-time file-watcher for the Milonexa AI Admin Agent.
 *
 * Capabilities (v2.1):
 *  - Watches the project source tree via Node.js built-in `fs.watch` / FSWatcher.
 *  - Debounces rapid save events to avoid redundant analysis triggers.
 *  - Emits `change` events with the list of modified file paths.
 *  - Integrates with CodeAnalyzer to trigger incremental analysis on save.
 *  - Publishes live findings to registered WebSocket/SSE clients.
 *
 * All I/O uses ONLY Node.js built-in modules.
 */

const fs      = require('fs');
const path    = require('path');
const { EventEmitter } = require('events');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

/** Directories we never watch. */
const SKIP_DIRS = new Set([
    'node_modules', '.git', 'dist', 'build', '.admin-cli',
    'coverage', '.nyc_output', 'archive_code', 'Archives',
]);

/** File extensions we care about. */
const WATCH_EXTENSIONS = new Set(['.js', '.mjs', '.ts', '.json']);

/**
 * Debounce interval in ms — balances responsiveness against redundant analysis
 * triggers from rapid save-compile-save cycles in modern editors/bundlers.
 * 800ms is long enough to coalesce a typical "save → auto-format → save" sequence.
 */
const DEBOUNCE_MS = 800;

// ---------------------------------------------------------------------------
// FileWatcher
// ---------------------------------------------------------------------------

class FileWatcher extends EventEmitter {
    constructor() {
        super();
        /** @type {Map<string,fs.FSWatcher>} path → watcher handle */
        this._watchers = new Map();
        /** @type {Set<string>} paths changed since last debounce flush */
        this._pending  = new Set();
        /** @type {ReturnType<typeof setTimeout>|null} */
        this._debounceTimer = null;
        this._running = false;
        this._watchedDirs = 0;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Start watching the project tree.
     * Emits `change` event with `{ files: string[] }` after debounce.
     */
    start() {
        if (this._running) return;
        this._running = true;
        this._watchDir(PROJECT_ROOT);
        console.log(`[file-watcher] Watching ${this._watchedDirs} directories for changes…`);
    }

    /** Stop all watchers and clean up. */
    stop() {
        this._running = false;
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
        }
        for (const w of this._watchers.values()) {
            try { w.close(); } catch (_) {}
        }
        this._watchers.clear();
        this._pending.clear();
        console.log('[file-watcher] Stopped.');
    }

    /** @returns {{ running: boolean, watchedDirs: number, pendingChanges: number }} */
    getStatus() {
        return {
            running:        this._running,
            watchedDirs:    this._watchedDirs,
            pendingChanges: this._pending.size,
        };
    }

    // -----------------------------------------------------------------------
    // Private — directory walk and watcher setup
    // -----------------------------------------------------------------------

    /** @private */
    _watchDir(dir) {
        if (this._watchers.has(dir)) return;

        let watcher;
        try {
            watcher = fs.watch(dir, { persistent: false }, (eventType, filename) => {
                if (!filename) return;
                const ext = path.extname(filename);
                if (!WATCH_EXTENSIONS.has(ext)) return;

                const fullPath = path.join(dir, filename);
                this._schedule(fullPath);
            });
        } catch (_) {
            return; // dir may have been deleted mid-watch
        }

        watcher.on('error', () => {
            this._watchers.delete(dir);
            this._watchedDirs = Math.max(0, this._watchedDirs - 1);
        });

        this._watchers.set(dir, watcher);
        this._watchedDirs++;

        // Recurse into subdirectories.
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (entry.name.startsWith('.')) continue;
            if (SKIP_DIRS.has(entry.name)) continue;
            this._watchDir(path.join(dir, entry.name));
        }
    }

    // -----------------------------------------------------------------------
    // Private — debounce
    // -----------------------------------------------------------------------

    /** @private */
    _schedule(filePath) {
        this._pending.add(filePath);

        if (this._debounceTimer) clearTimeout(this._debounceTimer);

        this._debounceTimer = setTimeout(() => {
            this._debounceTimer = null;
            const files = [...this._pending];
            this._pending.clear();
            if (files.length > 0) {
                this.emit('change', { files });
            }
        }, DEBOUNCE_MS);
    }
}

module.exports = { FileWatcher };
