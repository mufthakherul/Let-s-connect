# TV Advanced Features - Quick Integration Guide

## 🚀 Add These Features to Your Streaming Service (10 mins)

### Step 1: Update `streaming-service/server.js`

Add these imports at the top:

```javascript
const ChannelSearch = require('./channel-search');
const ChannelHealthChecker = require('./channel-health-checker');
const ChannelRecommender = require('./channel-recommender');
```

### Step 2: Initialize Services (In your app startup)

```javascript
// Initialize services with channels
let searchEngine;
let healthChecker;
let recommender;
let allChannels = [];

// Load channels from database
async function initializeServices() {
    allChannels = await TVChannel.findAll();
    searchEngine = new ChannelSearch(allChannels);
    healthChecker = new ChannelHealthChecker({ timeout: 5000 });
    recommender = new ChannelRecommender(allChannels);
    console.log('✅ TV services initialized');
}

// Call on app startup
if (require.main === module) {
    initializeServices();
}
```

### Step 3: Add API Routes

Copy-paste this entire section into `streaming-service/server.js`:

```javascript
// ========== CHANNEL SEARCH ==========

/**
 * Full-text search across 60,000+ channels
 * GET /api/channels/search?q=bbc&limit=50&category=News&country=UK
 */
app.get('/api/channels/search', (req, res) => {
    try {
        const {
            q = '',
            limit = 50,
            offset = 0,
            category,
            country,
            language,
            source,
            sortBy = 'relevance'
        } = req.query;

        const results = searchEngine.search(q, {
            limit: Math.min(parseInt(limit), 250),
            offset: Math.max(0, parseInt(offset)),
            category,
            country,
            language,
            source,
            sortBy
        });

        res.json({
            success: true,
            total: results.total,
            limit: results.limit,
            offset: results.offset,
            results: results.results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get search suggestions/autocomplete
 * GET /api/channels/search/suggestions?q=bbc
 */
app.get('/api/channels/search/suggestions', (req, res) => {
    try {
        const { q = '', limit = 10 } = req.query;
        const suggestions = searchEngine.getSuggestions(q, Math.min(parseInt(limit), 50));

        res.json({ success: true, suggestions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get available search filters
 * GET /api/channels/search/filters
 */
app.get('/api/channels/search/filters', (req, res) => {
    try {
        res.json({
            categories: searchEngine.getCategories(),
            countries: searchEngine.getCountries(),
            languages: searchEngine.getLanguages(),
            stats: searchEngine.getStats()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== CHANNEL HEALTH ==========

/**
 * Get system health dashboard
 * GET /api/channels/health
 */
app.get('/api/channels/health', (req, res) => {
    try {
        const health = healthChecker.getSystemHealth();
        res.json({ success: true, data: health });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get health for specific channel
 * GET /api/channels/:channelId/health
 */
app.get('/api/channels/:channelId/health', (req, res) => {
    try {
        const health = healthChecker.getCachedHealth(req.params.channelId);
        if (!health) {
            return res.status(404).json({ error: 'No health data for channel' });
        }
        res.json({ success: true, data: health });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get problem channels (low uptime)
 * GET /api/channels/health/problems?minUptime=95
 */
app.get('/api/channels/health/problems', (req, res) => {
    try {
        const minUptime = parseInt(req.query.minUptime || 95);
        const problems = healthChecker.getProblemChannels(Math.max(0, Math.min(100, minUptime)));
        res.json({ success: true, problems, count: problems.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get full health report
 * GET /api/channels/health/report
 */
app.get('/api/channels/health/report', (req, res) => {
    try {
        const report = healthChecker.generateReport();
        res.json({ success: true, report });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== TELEMETRY ==========

/**
 * Report fallback usage from clients
 * POST /api/streaming/telemetry/fallbacks
 * Body: { itemId, itemType, primaryUrl, usedUrl, attemptIndex, error, metadata }
 */

/**
 * Query fallback events
 * GET /api/streaming/telemetry/fallbacks?itemId=&itemType=&limit=100&sinceDays=7
 */

/**
 * Aggregated fallback report
 * GET /api/streaming/telemetry/fallbacks/report?days=7&limit=20
 */

/**
 * Trigger health check (Admin only)
 * POST /api/channels/health/check
 */
app.post('/api/channels/health/check', async (req, res) => {
    try {
        // Check if admin — requires API Gateway to populate `req.user.isAdmin`
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const channels = allChannels.slice(0, 100); // Check first 100 for quick test
        const result = await healthChecker.checkMultipleChannels(channels);

        res.json({
            success: true,
            checked: result.totalChecked,
            summary: result.summary
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== RECOMMENDATIONS ==========

/**
 * Get personalized recommendations
 * GET /api/recommendations?userId=user-123&limit=20
 */
app.get('/api/recommendations', (req, res) => {
    try {
        const { userId, limit = 20, category, country } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }

        let recommendations;
        if (category) {
            recommendations = recommender.getRecommendationsByCategory(userId, category, parseInt(limit));
        } else if (country) {
            recommendations = recommender.getRecommendationsByCountry(userId, country, parseInt(limit));
        } else {
            recommendations = recommender.getRecommendations(userId, Math.min(parseInt(limit), 100));
        }

        res.json({ success: true, recommendations });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Track user watching a channel
 * POST /api/channels/view
 * Body: { userId, channelId, watchDurationMs }
 */
app.post('/api/channels/view', (req, res) => {
    try {
        const { userId, channelId, watchDurationMs = 0 } = req.body;

        if (!userId || !channelId) {
            return res.status(400).json({ error: 'userId and channelId required' });
        }

        recommender.trackView(userId, channelId, parseInt(watchDurationMs));

        res.json({ success: true, message: 'View tracked' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Rate a channel
 * POST /api/channels/rate
 * Body: { userId, channelId, rating }
 */
app.post('/api/channels/rate', (req, res) => {
    try {
        const { userId, channelId, rating } = req.body;

        if (!userId || !channelId || !rating) {
            return res.status(400).json({ error: 'userId, channelId, and rating required' });
        }

        const ratingNum = parseInt(rating);
        if (ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({ error: 'Rating must be 1-5' });
        }

        recommender.rateChannel(userId, channelId, ratingNum);

        res.json({ success: true, message: 'Rating saved' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get similar channels
 * GET /api/channels/:channelId/similar?limit=10
 */
app.get('/api/channels/:channelId/similar', (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const similar = recommender.getSimilarChannels(req.params.channelId, parseInt(limit));

        res.json({ success: true, similar });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get user statistics
 * GET /api/recommendations/stats/:userId
 */
app.get('/api/recommendations/stats/:userId', (req, res) => {
    try {
        const stats = recommender.getUserStats(req.params.userId);
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get system statistics
 * GET /api/recommendations/system-stats
 */
app.get('/api/recommendations/system-stats', (req, res) => {
    try {
        const stats = recommender.getSystemStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### Step 4: Add Background Health Checks

Add this to `streaming-service/server.js` (after app initialization):

```javascript
/**
 * Schedule periodic health checks
 * Runs every 6 hours to check streams
 */
function scheduleHealthChecks() {
    const HEALTH_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

    setInterval(async () => {
        try {
            const channels = allChannels.slice(0, 1000); // Check first 1000 channels
            const toCheck = healthChecker.getChannelsNeedingRecheck(channels);

            if (toCheck.length === 0) {
                console.log('✓ All channels have recent health data');
                return;
            }

            console.log(`🏥 Running health check on ${toCheck.length} channels...`);

            const result = await healthChecker.checkMultipleChannels(toCheck, { progress: false });

            console.log(`📊 Health check complete:`);
            console.log(`  - Healthy: ${result.summary.healthy}/${result.summary.healthyChannels + result.summary.warningChannels + result.summary.errorChannels}`);
            console.log(`  - Health percentage: ${result.summary.healthPercentage}%`);

            // Optionally update database with health status
            // for (const health of result.results) {
            //     await TVChannel.update(
            //         {
            //             isActive: health.isHealthy,
            //             metadata: { ...channel.metadata, lastHealthStatus: health }
            //         },
            //         { where: { id: health.channelId } }
            //     );
            // }
        } catch (error) {
            console.error('❌ Health check error:', error.message);
        }
    }, HEALTH_CHECK_INTERVAL);

    console.log('✅ Health check scheduler started (every 6 hours)');
}

// Start health checks after app initialization
if (require.main === module) {
    setTimeout(scheduleHealthChecks, 5000); // Start after 5 seconds
}
```

### Step 5: Test the APIs

```bash
# Test search
curl "http://localhost:8002/api/channels/search?q=BBC&limit=10"

# Test suggestions
curl "http://localhost:8002/api/channels/search/suggestions?q=bbc"

# Test health
curl "http://localhost:8002/api/channels/health"

# Test recommendations
curl "http://localhost:8002/api/recommendations?userId=test-user&limit=10"

# Test similar channels
curl "http://localhost:8002/api/channels/test-channel-id/similar"
```

### Step 6: Frontend Integration

Use endpoints in your TV component:

```javascript
// Search
const searchResults = await fetch(`/api/channels/search?q=${query}`).then(r => r.json());

// Get recommendations
const recs = await fetch(`/api/recommendations?userId=${userId}`).then(r => r.json());

// Track channel view
await fetch('/api/channels/view', {
    method: 'POST',
    body: JSON.stringify({ userId, channelId, watchDurationMs })
});

// Rate channel
await fetch('/api/channels/rate', {
    method: 'POST',
    body: JSON.stringify({ userId, channelId, rating: 5 })
});

// Get health status
const health = await fetch('/api/channels/health').then(r => r.json());
```

---

## 📋 Checklist

- [ ] Copy 3 new service files to `streaming-service/`
- [ ] Add imports to `server.js`
- [ ] Add initialization code
- [ ] Add all API routes
- [ ] Add health check scheduler
- [ ] Test all endpoints with curl
- [ ] Add frontend UI components
- [ ] Update API documentation

---

## 🎯 API Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/channels/search` | GET | Search 60,000+ channels |
| `/api/channels/search/suggestions` | GET | Autocomplete suggestions |
| `/api/channels/search/filters` | GET | Available filters |
| `/api/channels/health` | GET | System health dashboard |
| `/api/channels/:id/health` | GET | Single channel health |
| `/api/channels/health/problems` | GET | Problem channels |
| `/api/channels/health/report` | GET | Full health report |
| `/api/channels/health/check` | POST | Trigger health check |
| `/api/recommendations` | GET | Get recommendations |
| `/api/channels/view` | POST | Track user viewing |
| `/api/channels/rate` | POST | Rate a channel |
| `/api/channels/:id/similar` | GET | Similar channels |
| `/api/recommendations/stats/:userId` | GET | User stats |
| `/api/recommendations/system-stats` | GET | System stats |

---

Done! Your API is now ready with advanced TV features. 🚀
