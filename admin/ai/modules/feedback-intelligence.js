'use strict';

/**
 * @fileoverview Feedback intelligence module for the Milonexa AI Admin Agent.
 *
 * Capabilities (v2.2):
 *  - Sentiment trend analysis across time (weekly/monthly rolling charts).
 *  - Feature impact scoring: estimates effort × user demand for feature requests.
 *  - Admin approval workflow: queues feature suggestions as backlog items via PermissionGate.
 *  - NLP keyword clustering: groups feedback by dominant themes without external dependencies.
 *  - Automatic GitHub issue creation for approved `feature_request` items.
 *
 * Configuration (environment variables):
 *   FEEDBACK_GITHUB_OWNER      GitHub owner/org for issue creation
 *   FEEDBACK_GITHUB_REPO       GitHub repository name
 *   FEEDBACK_GITHUB_TOKEN      GitHub personal access token (required for issue creation)
 *   FEEDBACK_GITHUB_ISSUE_LABEL Label applied to auto-created GitHub issues (default: "ai-suggestion")
 *
 * All I/O uses ONLY Node.js built-in modules.
 */

const fs     = require('fs');
const path   = require('path');
const https  = require('https');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

const ADMIN_HOME    = process.env.ADMIN_HOME || path.resolve(__dirname, '..', '..', '..', '.admin-cli');
const AI_STATE_DIR  = path.join(ADMIN_HOME, 'ai');
const INTEL_DIR     = path.join(AI_STATE_DIR, 'feedback-intelligence');

const GH_OWNER        = process.env.FEEDBACK_GITHUB_OWNER || '';
const GH_REPO         = process.env.FEEDBACK_GITHUB_REPO  || '';
const GH_TOKEN        = process.env.FEEDBACK_GITHUB_TOKEN || '';
const GH_ISSUE_LABEL  = process.env.FEEDBACK_GITHUB_ISSUE_LABEL || 'ai-suggestion';

/**
 * Common English stop-words excluded from keyword clustering.
 * Keeping this as a small Set for fast O(1) lookup.
 */
const STOP_WORDS = new Set([
    'the','a','an','is','it','in','on','at','to','and','or','of','for','with',
    'this','that','are','was','were','be','been','have','has','had','do','does',
    'did','will','would','could','should','may','might','not','but','if','so',
    'as','by','from','into','about','which','when','where','who','how','what',
    'i','we','you','he','she','they','my','your','our','its','their',
    'can','just','also','very','like','get','got','use','used','using',
    'app','platform','service','feature','bug','issue','problem','please',
    'really','want','make','need','think','feel','let','connect','milonexa',
]);

// ---------------------------------------------------------------------------
// FeedbackIntelligence
// ---------------------------------------------------------------------------

class FeedbackIntelligence {
    constructor() {
        this._ensureDirs();
        /** @type {object[]} Weekly trend snapshots */
        this._trendHistory = this._loadTrendHistory();
        /** @type {object[]} Feature backlog items */
        this._backlog = this._loadBacklog();
        /** @type {object[]} Created GitHub issues */
        this._createdIssues = [];
        this._lastRunAt = null;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Run all v2.2 intelligence tasks against the processed feedback list.
     *
     * @param {object[]} processedItems   Array from FeedbackProcessor._processed.
     * @param {Function} [llmFn]          Optional async (prompt:string)=>string.
     * @param {object}   [permGate]       PermissionGate instance.
     * @returns {Promise<object>}         Summary of actions taken.
     */
    async analyze(processedItems, llmFn, permGate) {
        console.log('[feedback-intelligence] Starting feedback analysis…');
        this._lastRunAt = new Date().toISOString();

        if (!processedItems || processedItems.length === 0) {
            return { trendUpdated: false, backlogItems: 0, clusters: 0, issuesCreated: 0 };
        }

        // 1. Sentiment trend snapshot.
        const trendSnapshot = this._buildTrendSnapshot(processedItems);
        this._trendHistory.push(trendSnapshot);
        if (this._trendHistory.length > 104) this._trendHistory = this._trendHistory.slice(-104); // ~2 years of weekly data
        this._saveTrendHistory();

        // 2. Keyword clustering.
        const clusters = this._clusterKeywords(processedItems);

        // 3. Feature impact scoring.
        const features = this._scoreFeatures(processedItems);

        // 4. LLM-enhanced feature analysis.
        let llmFeatureAnalysis = null;
        if (typeof llmFn === 'function' && features.length > 0) {
            llmFeatureAnalysis = await this._llmAnalyzeFeatures(features.slice(0, 10), clusters, llmFn);
        }

        // 5. Build backlog items from top features.
        const newBacklogItems = this._buildBacklogItems(features.slice(0, 5), llmFeatureAnalysis);
        for (const item of newBacklogItems) {
            if (!this._backlog.find(b => b.id === item.id)) {
                this._backlog.push(item);
            }
        }
        if (this._backlog.length > 200) this._backlog = this._backlog.slice(-200);
        this._saveBacklog();

        // 6. Submit top backlog items for admin approval.
        const pendingItems = newBacklogItems.filter(i => i.status === 'pending');
        if (permGate && pendingItems.length > 0) {
            for (const item of pendingItems.slice(0, 3)) {
                try {
                    await permGate.requestPermission(
                        'create_github_issue',
                        `Create GitHub issue for feature: "${item.title}"`,
                        { backlogItemId: item.id, title: item.title, body: item.body, labels: [GH_ISSUE_LABEL] },
                        'medium'
                    );
                    item.status = 'awaiting_approval';
                } catch (_) {}
            }
            this._saveBacklog();
        }

        // 7. Save intelligence report.
        this._saveReport({ trendSnapshot, clusters, features, backlogItems: newBacklogItems });

        const summary = {
            trendUpdated: true,
            trendWeeks:   this._trendHistory.length,
            backlogItems: newBacklogItems.length,
            clusters:     clusters.length,
            topKeywords:  clusters.slice(0, 5).map(c => c.keyword),
            issuesCreated: this._createdIssues.length,
        };

        console.log(`[feedback-intelligence] Analysis done: ${clusters.length} clusters, ${newBacklogItems.length} backlog items`);
        return summary;
    }

    /**
     * Execute an admin-approved GitHub issue creation.
     * @param {object} permRecord
     * @returns {Promise<object>}
     */
    async executeApprovedIssueCreation(permRecord) {
        const { data } = permRecord;
        if (!data || !data.title || !data.body) {
            return { status: 'skipped', reason: 'Missing title or body in permission data' };
        }

        if (!GH_OWNER || !GH_REPO || !GH_TOKEN) {
            return { status: 'skipped', reason: 'GitHub credentials not configured (FEEDBACK_GITHUB_OWNER, FEEDBACK_GITHUB_REPO, FEEDBACK_GITHUB_TOKEN)' };
        }

        try {
            const issue = await this._createGitHubIssue({
                title:  data.title,
                body:   data.body,
                labels: data.labels || [GH_ISSUE_LABEL],
            });

            const record = {
                id:          crypto.randomUUID(),
                githubIssueNumber: issue.number,
                githubIssueUrl:    issue.html_url,
                title:             data.title,
                backlogItemId:     data.backlogItemId,
                createdAt:         new Date().toISOString(),
            };
            this._createdIssues.push(record);

            // Update backlog item status.
            const item = this._backlog.find(b => b.id === data.backlogItemId);
            if (item) {
                item.status     = 'issue_created';
                item.githubIssue = issue.html_url;
                this._saveBacklog();
            }

            console.log(`[feedback-intelligence] Created GitHub issue #${issue.number}: ${data.title}`);
            return { status: 'created', issueNumber: issue.number, issueUrl: issue.html_url };
        } catch (e) {
            return { status: 'error', reason: e.message };
        }
    }

    /** @returns {object[]} Trend history (weekly snapshots). */
    getTrendHistory(limit = 52) {
        return this._trendHistory.slice(-limit);
    }

    /** @returns {object[]} Feature backlog. */
    getBacklog(limit = 50) {
        return this._backlog.slice(-limit);
    }

    /** @returns {object[]} Created GitHub issues. */
    getCreatedIssues(limit = 20) {
        return this._createdIssues.slice(-limit);
    }

    /** @returns {object} Last run summary. */
    getLastRunSummary() {
        return {
            lastRunAt:    this._lastRunAt,
            trendWeeks:   this._trendHistory.length,
            backlogItems: this._backlog.length,
            issuesCreated: this._createdIssues.length,
        };
    }

    // -----------------------------------------------------------------------
    // 1. Sentiment trend analysis
    // -----------------------------------------------------------------------

    /** @private */
    _buildTrendSnapshot(items) {
        const snap = {
            week:       this._getISOWeek(),
            capturedAt: new Date().toISOString(),
            total:      items.length,
            // Sentiment breakdown.
            sentiment:  { positive: 0, neutral: 0, negative: 0 },
            // Category breakdown.
            byCategory: {},
            // Priority breakdown.
            byPriority: { high: 0, medium: 0, low: 0 },
            // Actionable rate.
            actionableRate: 0,
        };

        for (const item of items) {
            const sent = item.sentiment || 'neutral';
            snap.sentiment[sent] = (snap.sentiment[sent] || 0) + 1;

            const cat = item.category || 'other';
            snap.byCategory[cat] = (snap.byCategory[cat] || 0) + 1;

            const pri = item.priority || 'low';
            snap.byPriority[pri] = (snap.byPriority[pri] || 0) + 1;
        }

        const actionable = items.filter(i => i.actionable).length;
        snap.actionableRate = items.length > 0 ? Math.round((actionable / items.length) * 100) : 0;

        // Rolling 4-week moving average for negative sentiment.
        const recent4 = this._trendHistory.slice(-3);
        recent4.push(snap);
        const totalNeg   = recent4.reduce((s, w) => s + (w.sentiment.negative || 0), 0);
        const totalItems = recent4.reduce((s, w) => s + w.total, 0);
        snap.negativeMA4  = totalItems > 0 ? Math.round((totalNeg / totalItems) * 100) : 0;

        return snap;
    }

    // -----------------------------------------------------------------------
    // 2. Keyword clustering (NLP — no external libs)
    // -----------------------------------------------------------------------

    /**
     * Extract top keywords from feedback content and group by co-occurrence.
     * Returns an array of { keyword, count, relatedWords, sampleItems } sorted by count.
     * @private
     */
    _clusterKeywords(items) {
        /** @type {Map<string, { count: number, coCount: Map<string, number>, itemIds: string[] }>} */
        const kwMap = new Map();

        for (const item of items) {
            const text    = (item.originalContent || item.summary || '').toLowerCase();
            const words   = text
                .replace(/[^a-z0-9\s]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length >= 4 && !STOP_WORDS.has(w));

            const uniqueWords = [...new Set(words)];

            for (const word of uniqueWords) {
                if (!kwMap.has(word)) {
                    kwMap.set(word, { count: 0, coCount: new Map(), itemIds: [] });
                }
                const entry = kwMap.get(word);
                entry.count++;
                entry.itemIds.push(item.feedbackId || '');

                // Co-occurrence with other words in same item.
                for (const other of uniqueWords) {
                    if (other !== word) {
                        entry.coCount.set(other, (entry.coCount.get(other) || 0) + 1);
                    }
                }
            }
        }

        // Build clusters: top N keywords with their related words.
        const sorted = [...kwMap.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 30);

        return sorted.map(([keyword, data]) => ({
            keyword,
            count:        data.count,
            relatedWords: [...data.coCount.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([w]) => w),
            sampleItemIds: data.itemIds.slice(0, 3),
        }));
    }

    // -----------------------------------------------------------------------
    // 3. Feature impact scoring
    // -----------------------------------------------------------------------

    /**
     * Score feature requests by demand (count) and assign a simple effort estimate.
     * Impact = demand_score × (1 / effort_estimate).
     * @private
     */
    _scoreFeatures(items) {
        const featureRequests = items.filter(i => i.category === 'feature_request');

        if (featureRequests.length === 0) return [];

        // Group by similar ticket titles (normalised).
        /** @type {Map<string, { items: object[], highPriCount: number }>} */
        const groups = new Map();

        for (const item of featureRequests) {
            const key = this._normaliseTitle(item.ticketTitle || item.summary || item.originalContent || '');
            if (!groups.has(key)) groups.set(key, { items: [], highPriCount: 0 });
            const g = groups.get(key);
            g.items.push(item);
            if (item.priority === 'high') g.highPriCount++;
        }

        const features = [];

        for (const [normTitle, group] of groups) {
            const demand = group.items.length;
            const highPri = group.highPriCount;

            // Simple effort heuristic: short titles → likely small feature (1);
            // longer descriptions → medium (2); keywords like 'redesign','migrate' → large (3).
            const firstItem   = group.items[0];
            const description = (firstItem.ticketDescription || firstItem.summary || '').toLowerCase();
            let effort = 1;
            if (/redesign|migrate|rewrite|replace|overhaul/i.test(description)) effort = 3;
            else if (/integrate|add.*support|implement|build/i.test(description)) effort = 2;

            const impactScore = Math.round((demand * (1 + highPri * 0.5)) / effort * 100) / 100;

            features.push({
                id:           crypto.createHash('sha256').update(normTitle).digest('hex').slice(0, 12),
                normTitle,
                title:        firstItem.ticketTitle || firstItem.summary || normTitle,
                description:  firstItem.ticketDescription || '',
                demand,
                highPriCount: highPri,
                effort,        // 1=small, 2=medium, 3=large
                impactScore,
                sampleFeedbackIds: group.items.slice(0, 3).map(i => i.feedbackId),
                detectedAt:   new Date().toISOString(),
            });
        }

        return features.sort((a, b) => b.impactScore - a.impactScore);
    }

    /** @private — normalise a title for grouping: lowercase, strip punctuation, sort words. */
    _normaliseTitle(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2 && !STOP_WORDS.has(w))
            .sort()
            .join(' ')
            .slice(0, 80);
    }

    // -----------------------------------------------------------------------
    // 4. LLM-enhanced feature analysis
    // -----------------------------------------------------------------------

    /** @private */
    async _llmAnalyzeFeatures(features, clusters, llmFn) {
        const prompt = [
            `You are a product manager for the Milonexa / Let's Connect social platform.`,
            `Analyse these top user-requested features and keyword clusters, then produce a`,
            `prioritised feature roadmap recommendation.`,
            ``,
            `TOP FEATURE REQUESTS (sorted by impact score):`,
            features.map((f, i) => `${i + 1}. "${f.title}" (demand=${f.demand}, impact=${f.impactScore})`).join('\n'),
            ``,
            `TOP FEEDBACK KEYWORDS: ${clusters.slice(0, 10).map(c => c.keyword).join(', ')}`,
            ``,
            `Return JSON: {`,
            `  "topPriority": ["feature title 1", "feature title 2", "feature title 3"],`,
            `  "rationale": "2-sentence explanation",`,
            `  "quickWins": ["small feature that can ship fast"],`,
            `  "risks": "any risks or dependencies to be aware of"`,
            `}`,
        ].join('\n');

        try {
            const response = await llmFn(prompt);
            const match = response && response.match(/\{[\s\S]*\}/);
            if (match) return JSON.parse(match[0]);
        } catch (_) {}
        return null;
    }

    // -----------------------------------------------------------------------
    // 5. Backlog item builder
    // -----------------------------------------------------------------------

    /** @private */
    _buildBacklogItems(features, llmAnalysis) {
        const topPriority = new Set(
            llmAnalysis && Array.isArray(llmAnalysis.topPriority)
                ? llmAnalysis.topPriority.map(t => t.toLowerCase())
                : []
        );

        return features.map(f => {
            const isTopPriority = [...topPriority].some(t => f.title.toLowerCase().includes(t));

            const body = [
                `## Summary`,
                f.description || f.title,
                ``,
                `## Impact Data`,
                `- **User demand**: ${f.demand} request(s)`,
                `- **High-priority requests**: ${f.highPriCount}`,
                `- **Effort estimate**: ${f.effort === 1 ? 'Small' : f.effort === 2 ? 'Medium' : 'Large'}`,
                `- **Impact score**: ${f.impactScore}`,
                ``,
                `## Sample Feedback IDs`,
                f.sampleFeedbackIds.map(id => `- ${id}`).join('\n'),
                ``,
                `*Auto-generated by Milonexa AI Admin Agent v2.2*`,
            ].join('\n');

            return {
                id:              f.id,
                title:           f.title,
                body,
                impactScore:     f.impactScore,
                effort:          f.effort,
                demand:          f.demand,
                isLLMPrioritised: isTopPriority,
                status:          'pending',
                detectedAt:      f.detectedAt,
            };
        });
    }

    // -----------------------------------------------------------------------
    // GitHub issue creation
    // -----------------------------------------------------------------------

    /** @private */
    _createGitHubIssue({ title, body, labels }) {
        return new Promise((resolve, reject) => {
            const payload = JSON.stringify({ title, body, labels: labels || [] });
            const options = {
                hostname: 'api.github.com',
                path:     `/repos/${GH_OWNER}/${GH_REPO}/issues`,
                method:   'POST',
                headers:  {
                    'User-Agent':    'Milonexa-AI-Agent/2.2',
                    'Accept':        'application/vnd.github+json',
                    'Authorization': `Bearer ${GH_TOKEN}`,
                    'Content-Type':  'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
                timeout: 15000,
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', c => { data += c; });
                res.on('end', () => {
                    if (res.statusCode === 201) {
                        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
                    } else {
                        reject(new Error(`GitHub API ${res.statusCode}: ${data.slice(0, 200)}`));
                    }
                });
            });
            req.on('timeout', () => { req.destroy(); reject(new Error('GitHub API timeout')); });
            req.on('error', reject);
            req.write(payload);
            req.end();
        });
    }

    // -----------------------------------------------------------------------
    // Persistence
    // -----------------------------------------------------------------------

    /** @private */
    _loadTrendHistory() {
        const file = path.join(INTEL_DIR, 'trend-history.json');
        try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return []; }
    }

    /** @private */
    _saveTrendHistory() {
        try { fs.writeFileSync(path.join(INTEL_DIR, 'trend-history.json'), JSON.stringify(this._trendHistory, null, 2), 'utf8'); } catch (_) {}
    }

    /** @private */
    _loadBacklog() {
        const file = path.join(INTEL_DIR, 'backlog.json');
        try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return []; }
    }

    /** @private */
    _saveBacklog() {
        try { fs.writeFileSync(path.join(INTEL_DIR, 'backlog.json'), JSON.stringify(this._backlog, null, 2), 'utf8'); } catch (_) {}
    }

    /** @private */
    _saveReport(data) {
        const date = new Date().toISOString().split('T')[0];
        try { fs.writeFileSync(path.join(INTEL_DIR, `${date}-report.json`), JSON.stringify(data, null, 2), 'utf8'); } catch (_) {}
    }

    /** @private — ISO 8601 week string e.g. "2026-W11". */
    _getISOWeek() {
        const now      = new Date();
        const thursday = new Date(now);
        thursday.setDate(now.getDate() + (4 - (now.getDay() || 7)));
        const year = thursday.getFullYear();
        const jan4 = new Date(year, 0, 4);
        const week = Math.ceil(((thursday - jan4) / 86400000 + jan4.getDay() + 1) / 7);
        return `${year}-W${String(week).padStart(2, '0')}`;
    }

    /** @private */
    _ensureDirs() {
        [AI_STATE_DIR, INTEL_DIR].forEach(d => {
            if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        });
    }
}

module.exports = { FeedbackIntelligence };
