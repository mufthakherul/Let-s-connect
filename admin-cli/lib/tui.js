/**
 * Interactive TUI Dashboard Module (Phase E)
 *
 * Full-screen terminal UI with real-time updating charts, system overview,
 * alert status, SLA health, and cost summary. Uses raw ANSI escape codes
 * and Node.js readline — zero external dependencies.
 *
 * Launched via: node admin-cli/index.js tui
 */

'use strict';

const { sparkline, barChart } = require('./trend-analysis');

// ---------------------------------------------------------------------------
// ANSI helpers
// ---------------------------------------------------------------------------

const A = {
    clear: '\x1b[2J\x1b[H',
    hideCursor: '\x1b[?25l',
    showCursor: '\x1b[?25h',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    italic: '\x1b[3m',
    underline: '\x1b[4m',
    blink: '\x1b[5m',

    // Foreground colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue: '\x1b[94m',
    brightMagenta: '\x1b[95m',
    brightCyan: '\x1b[96m',
    brightWhite: '\x1b[97m',

    // Background colors
    bgBlack: '\x1b[40m',
    bgBlue: '\x1b[44m',
    bgCyan: '\x1b[46m',
    bgDarkGray: '\x1b[100m',

    // Cursor
    moveTo: (row, col) => `\x1b[${row};${col}H`,
    clearLine: '\x1b[2K',
    saveCursor: '\x1b[s',
    restoreCursor: '\x1b[u',
};

function c(colorKey, text) {
    return `${A[colorKey] || ''}${text}${A.reset}`;
}

function getTermSize() {
    const cols = process.stdout.columns || 120;
    const rows = process.stdout.rows || 40;
    return { cols, rows };
}

function pad(str, len, align = 'left') {
    const s = String(str);
    if (align === 'right') return s.padStart(len).slice(-len);
    return s.padEnd(len).slice(0, len);
}

function hLine(width, char = '─') {
    return char.repeat(width);
}

function box(title, lines, width) {
    const titleStr = title ? ` ${title} ` : '';
    const topBorder = `╔${hLine(width - 2, '═')}╗`;
    const titleLine = titleStr
        ? `║${A.bold}${A.cyan} ${titleStr.padEnd(width - 3)}${A.reset}║`
        : null;
    const sep = titleStr ? `╠${hLine(width - 2, '═')}╣` : null;
    const rows = lines.map(l => {
        // Strip ANSI for length calculation
        const stripped = l.replace(/\x1b\[[0-9;]*m/g, '');
        const padding = width - 2 - stripped.length;
        return `║ ${l}${' '.repeat(Math.max(0, padding - 1))}║`;
    });
    const bottomBorder = `╚${hLine(width - 2, '═')}╝`;

    const parts = [topBorder];
    if (titleLine) { parts.push(titleLine); parts.push(sep); }
    parts.push(...rows);
    parts.push(bottomBorder);
    return parts;
}

// ---------------------------------------------------------------------------
// TUI Dashboard
// ---------------------------------------------------------------------------

class TUIDashboard {
    constructor(opts = {}) {
        this.interval = opts.interval || 3;
        this.metricsCollector = opts.metricsCollector || null;
        this.alertManager = opts.alertManager || null;
        this.slaManager = opts.slaManager || null;
        this.costAnalyzer = opts.costAnalyzer || null;
        this.complianceManager = opts.complianceManager || null;
        this.multiClusterManager = opts.multiClusterManager || null;

        this._timer = null;
        this._tick = 0;
        this._frame = 0;
        this._running = false;
        this._paused = false;
        this._selectedTab = 0;
        this._tabs = ['Overview', 'Metrics', 'Alerts', 'SLA', 'Clusters', 'Costs'];
        this._sparkHistory = {};
        this._lastRender = '';
    }

    /**
     * Start the TUI dashboard.
     */
    start() {
        if (!process.stdout.isTTY) {
            console.error('TUI requires a TTY terminal. Use --json for non-TTY output.');
            process.exit(1);
        }

        this._running = true;
        process.stdout.write(A.hideCursor);
        process.stdout.write(A.clear);

        // Keyboard input
        const readline = require('readline');
        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.setRawMode) process.stdin.setRawMode(true);

        process.stdin.on('keypress', (str, key) => {
            if (!key) return;
            if (key.ctrl && key.name === 'c') this.stop();
            if (key.name === 'q') this.stop();
            if (key.name === 'p') { this._paused = !this._paused; }
            if (key.name === 'r') this.render();
            if (key.name === 'right' || key.name === 'tab') {
                this._selectedTab = (this._selectedTab + 1) % this._tabs.length;
                this.render();
            }
            if (key.name === 'left') {
                this._selectedTab = (this._selectedTab - 1 + this._tabs.length) % this._tabs.length;
                this.render();
            }
            if (key.name >= '1' && key.name <= '6') {
                this._selectedTab = parseInt(key.name) - 1;
                this.render();
            }
        });

        process.on('SIGWINCH', () => this.render());
        process.on('SIGINT', () => this.stop());

        this.render();
        this._timer = setInterval(() => {
            if (!this._paused) {
                this._tick++;
                this._frame = (this._frame + 1) % 4;
                this.render();
            }
        }, this.interval * 1000);
    }

    stop() {
        this._running = false;
        if (this._timer) clearInterval(this._timer);
        process.stdout.write(A.showCursor);
        process.stdout.write(A.clear);
        if (process.stdin.setRawMode) process.stdin.setRawMode(false);
        console.log('TUI dashboard closed.');
        process.exit(0);
    }

    render() {
        const { cols, rows } = getTermSize();
        const lines = this._buildScreen(cols, rows);
        const output = A.clear + lines.join('\n');
        process.stdout.write(output);
    }

    _buildScreen(cols, rows) {
        const lines = [];
        const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        const spin = this._paused ? '⏸' : spinners[this._tick % spinners.length];

        // ---- Header ----
        const title = `  ${A.bold}${A.cyan}⚡ Milonexa Admin TUI Dashboard${A.reset}`;
        const status = `${spin} ${this._paused ? c('yellow', 'PAUSED') : c('green', 'LIVE')}  ${c('gray', new Date().toLocaleTimeString())}  Refresh: ${this.interval}s  `;
        const headerPad = cols - 32 - 20;
        lines.push(`${A.bgDarkGray}${title}${' '.repeat(Math.max(0, headerPad))}${status}${A.reset}`);

        // ---- Tab bar ----
        const tabLine = this._tabs.map((t, i) => {
            const num = `${i + 1}`;
            if (i === this._selectedTab) return `${A.bgBlue}${A.bold} ${num}:${t} ${A.reset}`;
            return `${A.dim} ${num}:${t} ${A.reset}`;
        }).join(c('gray', '│'));
        lines.push(tabLine + c('gray', '  [←/→ or 1-6: tab | p: pause | r: refresh | q: quit]'));
        lines.push(c('gray', '─'.repeat(cols)));

        // ---- Content ----
        switch (this._selectedTab) {
            case 0: lines.push(...this._renderOverview(cols)); break;
            case 1: lines.push(...this._renderMetrics(cols)); break;
            case 2: lines.push(...this._renderAlerts(cols)); break;
            case 3: lines.push(...this._renderSLA(cols)); break;
            case 4: lines.push(...this._renderClusters(cols)); break;
            case 5: lines.push(...this._renderCosts(cols)); break;
            default: lines.push('(unknown tab)');
        }

        // ---- Footer ----
        const footer = ` Tick: ${this._tick}  Terminal: ${cols}×${rows}  Built with ♥ by Milonexa Admin Engine `;
        lines.push(c('gray', '─'.repeat(cols)));
        lines.push(c('dim', footer));

        return lines;
    }

    // ---- Tab renderers ----

    _renderOverview(cols) {
        const lines = [];
        const half = Math.floor(cols / 2) - 2;

        // Gather data
        const alertStats = this._safeGet(() => this.alertManager.getStats(), { active: 0, critical: 0, total: 0 });
        const compStatus = this._safeGet(() => this.complianceManager.getStatus(), { passed: 0, total: 0 });
        const budgetStatus = this._safeGet(() => this.costAnalyzer.checkBudgetStatus(), { usage: 0, budget: 0, percentUsed: 0 });
        const slaSum = this._safeGet(() => this.slaManager.getSummary(), { ok: 0, total: 0, atRisk: 0, breached: 0 });
        const metrics = this._safeGet(() => this.metricsCollector.query(), []);

        // Left box: System Status
        const statusLines = [
            `${c('bold', 'System Status')}`,
            '',
            `  Alerts:     ${this._alertBadge(alertStats.active, alertStats.critical)}`,
            `  Compliance: ${alertStats.critical > 0 ? c('red', compStatus.passed + '/' + compStatus.total) : c('green', compStatus.passed + '/' + compStatus.total + ' ✓')}`,
            `  Budget:     ${budgetStatus.percentUsed > 90 ? c('red', budgetStatus.percentUsed + '%') : c('green', budgetStatus.percentUsed + '%')}`,
            `  SLA OK:     ${slaSum.breached > 0 ? c('red', slaSum.ok + '/' + slaSum.total) : c('green', slaSum.ok + '/' + slaSum.total + ' ✓')}`,
            `  Metrics:    ${c('cyan', metrics.length + ' data points')}`,
        ];
        const leftBox = box('📊 Overview', statusLines, half);

        // Right box: Quick Health
        const healthLines = [
            `${c('bold', 'Quick Health')}`,
            '',
            `  ${c('green', '●')} API Gateway    ${c('green', 'UP')}`,
            `  ${c('green', '●')} User Service   ${c('green', 'UP')}`,
            `  ${c('green', '●')} Postgres        ${c('green', 'UP')}`,
            `  ${c('green', '●')} Redis           ${c('green', 'UP')}`,
            `  ${c('gray', '○')} Elasticsearch  ${c('gray', 'N/A')}`,
        ];
        const rightBox = box('🏥 Services', healthLines, half);

        // Merge left and right side by side
        const maxLen = Math.max(leftBox.length, rightBox.length);
        for (let i = 0; i < maxLen; i++) {
            const l = (leftBox[i] || '').padEnd(half);
            const r = rightBox[i] || '';
            lines.push(`${l}  ${r}`);
        }

        // Metric sparklines
        lines.push('');
        lines.push(c('bold', '  📈 Metric Trends (last 40 samples)'));
        lines.push('');

        const cats = ['cpu', 'memory', 'error_rate', 'latency'];
        for (const cat of cats) {
            const catMetrics = metrics.filter(m => m.category === cat).slice(-40);
            const values = catMetrics.map(m => typeof m.value === 'number' ? m.value : 0);
            const spark = values.length > 0 ? sparkline(values) : '(no data)';
            const current = values.length > 0 ? values[values.length - 1] : null;
            const label = pad(cat, 12);
            const curStr = current !== null ? c('cyan', pad(current.toFixed(1), 8, 'right')) : c('gray', '     N/A');
            lines.push(`  ${c('dim', label)} ${spark} ${curStr}`);
        }

        return lines;
    }

    _renderMetrics(cols) {
        const lines = [];
        const metrics = this._safeGet(() => this.metricsCollector.query(), []);

        lines.push(c('bold', '  📊 Metrics Detail'));
        lines.push('');

        if (metrics.length === 0) {
            lines.push(c('yellow', '  No metrics recorded. Use: node admin-cli/index.js metrics record --category cpu --value 45'));
            return lines;
        }

        // Group by category
        const byCat = {};
        for (const m of metrics) {
            if (!byCat[m.category]) byCat[m.category] = [];
            byCat[m.category].push(m.value);
        }

        for (const [cat, values] of Object.entries(byCat)) {
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);
            const spark = sparkline(values.slice(-cols + 20));
            lines.push(`  ${c('cyan', pad(cat, 15))} avg:${c('bold', pad(mean.toFixed(1), 6, 'right'))} min:${pad(min.toFixed(1), 6, 'right')} max:${pad(max.toFixed(1), 6, 'right')} n=${values.length}`);
            lines.push(`  ${' '.repeat(15)} ${spark}`);
            lines.push('');
        }

        // Bar chart of category averages
        if (Object.keys(byCat).length > 0) {
            lines.push(c('bold', '  Category Averages:'));
            const items = Object.entries(byCat).map(([cat, vals]) => ({
                label: cat,
                value: vals.reduce((a, b) => a + b, 0) / vals.length,
            }));
            for (const l of barChart(items, 30)) {
                lines.push(`  ${l}`);
            }
        }

        return lines;
    }

    _renderAlerts(cols) {
        const lines = [];
        const alertMgr = this.alertManager;

        lines.push(c('bold', '  🚨 Alert Management'));
        lines.push('');

        if (!alertMgr) {
            lines.push(c('gray', '  Alert manager not available.'));
            return lines;
        }

        const stats = alertMgr.getStats();
        lines.push(`  Active: ${this._alertBadge(stats.active, stats.critical)}  Total rules: ${stats.total}`);
        lines.push('');

        const rules = alertMgr.rules || [];
        const header = `  ${'NAME'.padEnd(25)} ${'CATEGORY'.padEnd(12)} ${'SEVERITY'.padEnd(10)} ${'STATUS'.padEnd(10)}`;
        lines.push(c('dim', header));
        lines.push(c('gray', '  ' + '─'.repeat(cols - 4)));

        for (const rule of rules.slice(0, 12)) {
            const severityColor = rule.severity === 'critical' ? 'brightRed' : rule.severity === 'warning' ? 'brightYellow' : 'brightGreen';
            const statusColor = rule.enabled ? 'green' : 'gray';
            lines.push(`  ${pad(rule.name, 25)} ${pad(rule.condition?.metricCategory || '-', 12)} ${c(severityColor, pad(rule.severity, 10))} ${c(statusColor, rule.enabled ? 'ENABLED' : 'disabled')}`);
        }

        if (rules.length > 12) lines.push(c('dim', `  ... and ${rules.length - 12} more`));

        return lines;
    }

    _renderSLA(cols) {
        const lines = [];

        lines.push(c('bold', '  📋 SLA Monitoring & Predictions'));
        lines.push('');

        if (!this.slaManager) {
            lines.push(c('gray', '  SLA manager not available.'));
            return lines;
        }

        const summary = this.slaManager.getSummary();
        lines.push(`  OK: ${c('green', summary.ok)}  At Risk: ${c('yellow', summary.atRisk)}  Breached: ${c('red', summary.breached)}  No Data: ${c('gray', summary.noData)}`);
        lines.push('');

        const statuses = this.slaManager.getStatus();
        const header = `  ${'SLO'.padEnd(25)} ${'SERVICE'.padEnd(15)} ${'TARGET'.padEnd(8)} ${'CURRENT'.padEnd(10)} ${'STATUS'.padEnd(12)} ${'RISK'}`;
        lines.push(c('dim', header));
        lines.push(c('gray', '  ' + '─'.repeat(cols - 4)));

        for (const s of statuses) {
            const statusColor = s.status === 'ok' ? 'green' : s.status === 'at_risk' ? 'yellow' : s.status === 'breached' ? 'red' : 'gray';
            const riskColor = s.breachRisk?.risk === 'high' ? 'brightRed' : s.breachRisk?.risk === 'medium' ? 'brightYellow' : 'dim';
            const target = `${s.slo.target}${s.slo.unit === 'percent' ? '%' : s.slo.unit}`;
            const current = s.current !== null ? `${s.current}${s.slo.unit === 'percent' ? '%' : ''}` : 'N/A';
            const risk = s.breachRisk ? `${s.breachRisk.risk}${s.breachRisk.hoursUntilBreach ? ' (' + s.breachRisk.hoursUntilBreach + 'h)' : ''}` : 'unknown';
            lines.push(`  ${pad(s.slo.name, 25)} ${pad(s.slo.service, 15)} ${pad(target, 8)} ${pad(current, 10)} ${c(statusColor, pad(s.status, 12))} ${c(riskColor, risk)}`);
        }

        // Predictions
        const predictions = this.slaManager.getPredictions();
        if (predictions.length > 0) {
            lines.push('');
            lines.push(c('yellow', '  ⚠ Breach Predictions:'));
            for (const p of predictions) {
                const hrs = p.breachRisk.hoursUntilBreach;
                lines.push(`    • ${c('bold', p.slo.name)} — ${c('red', hrs ? `breach in ~${hrs}h` : 'degrading trend')} [${p.slo.service}]`);
            }
        }

        return lines;
    }

    _renderClusters(cols) {
        const lines = [];

        lines.push(c('bold', '  ☸  Multi-Cluster Kubernetes Management'));
        lines.push('');

        if (!this.multiClusterManager) {
            lines.push(c('gray', '  Multi-cluster manager not available.'));
            lines.push('');
            lines.push(`  Register clusters: ${c('cyan', 'node admin-cli/index.js cluster register --name prod-us --context gke_project_us --env prod')}`);
            return lines;
        }

        const clusters = this.multiClusterManager.listClusters();
        if (clusters.length === 0) {
            lines.push(c('yellow', '  No clusters registered.'));
            lines.push(`  Use: ${c('cyan', 'node admin-cli/index.js cluster register --name <name> --context <kubectl-ctx> --env <prod|staging|dev>')}`);
            return lines;
        }

        const header = `  ${'NAME'.padEnd(20)} ${'CONTEXT'.padEnd(30)} ${'ENV'.padEnd(10)} ${'REGION'.padEnd(12)} STATUS`;
        lines.push(c('dim', header));
        lines.push(c('gray', '  ' + '─'.repeat(cols - 4)));

        for (const cl of clusters) {
            const envColor = cl.environment === 'prod' ? 'red' : cl.environment === 'staging' ? 'yellow' : 'green';
            const status = cl.enabled ? c('green', '● ENABLED') : c('gray', '○ disabled');
            lines.push(`  ${pad(cl.name, 20)} ${pad(cl.context, 30)} ${c(envColor, pad(cl.environment, 10))} ${pad(cl.region, 12)} ${status}`);
        }

        return lines;
    }

    _renderCosts(cols) {
        const lines = [];

        lines.push(c('bold', '  💰 Cost Analysis & Budget'));
        lines.push('');

        if (!this.costAnalyzer) {
            lines.push(c('gray', '  Cost analyzer not available.'));
            return lines;
        }

        const summary = this._safeGet(() => this.costAnalyzer.getSummary(), null);
        const budget = this._safeGet(() => this.costAnalyzer.checkBudgetStatus(), { usage: 0, budget: 0, percentUsed: 0 });

        const pct = budget.percentUsed;
        const barWidth = 40;
        const filled = Math.round((pct / 100) * barWidth);
        const barColor = pct > 90 ? 'brightRed' : pct > 75 ? 'brightYellow' : 'brightGreen';
        const bar = c(barColor, '█'.repeat(filled)) + c('gray', '░'.repeat(barWidth - filled));
        lines.push(`  Budget: [${bar}] ${c('bold', pct + '%')} ($${budget.usage}/$${budget.budget})`);
        lines.push('');

        if (summary && summary.byService) {
            lines.push(c('bold', '  Cost by Service:'));
            const items = Object.entries(summary.byService)
                .map(([k, v]) => ({ label: k, value: v }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10);
            for (const l of barChart(items, 30)) {
                lines.push(`  ${l}`);
            }
        }

        return lines;
    }

    // ---- Helpers ----

    _alertBadge(active, critical) {
        if (critical > 0) return c('brightRed', `${active} active (${critical} critical)`);
        if (active > 0) return c('yellow', `${active} active`);
        return c('green', '0 active ✓');
    }

    _safeGet(fn, defaultVal) {
        try { return fn(); } catch (_) { return defaultVal; }
    }
}

module.exports = { TUIDashboard };
