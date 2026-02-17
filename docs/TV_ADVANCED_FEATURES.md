# Advanced TV Features Documentation

## 🎯 4 New Enterprise Features

Your TV system now includes 4 powerful features for search, discovery, health monitoring, and recommendations.

---

## 1. 🔍 Channel Search (Full-Text Search)

**File**: `channel-search.js`

### Features
- **Full-text search** across 60,000+ channels
- **Fuzzy matching** (typo tolerance)
- **Advanced filtering** by category, country, language, source
- **Autocomplete** suggestions
- **Search statistics** and trending searches
- **Similar channels** finder

### Usage Examples

#### Basic Search
```javascript
const ChannelSearch = require('./channel-search');

// Initialize with channels from database
const search = new ChannelSearch(allChannels);

// Search for channels
const results = search.search('BBC News', {
    limit: 20,
    offset: 0,
    fuzzy: true,
    sortBy: 'relevance'
});

// Results
{
    total: 15,
    limit: 20,
    offset: 0,
    results: [
        { id: '...', name: 'BBC News Live', category: 'News', ... }
    ]
}
```

#### Advanced Filtering
```javascript
// Search with filters
const results = search.search('news', {
    limit: 50,
    category: 'News',
    country: 'United Kingdom',
    language: 'English'
});

// Search US News channels
const usNews = search.search('news', {
    country: 'United States',
    category: 'News'
});

// Search by source
const youtubeChannels = search.search('youtube', {
    source: 'youtube'
});
```

#### Autocomplete
```javascript
// Get autocomplete suggestions
const suggestions = search.getSuggestions('bbc', 10);
// Returns: ['bbc', 'bbva', 'bbc news live', ...]
```

#### Get Categories/Countries/Languages
```javascript
const categories = search.getCategories();
// Returns: [{name: 'News', count: 500}, {name: 'Sports', count: 300}, ...]

const countries = search.getCountries();
// Returns: [{name: 'United States', count: 2000}, ...]

const languages = search.getLanguages();
// Returns: [{name: 'English', count: 5000}, ...]
```

#### Find Similar Channels
```javascript
const similar = search.findSimilar('channel-id-123', 5);
// Returns 5 channels in same category/country
```

#### Search Statistics
```javascript
const stats = search.getStats();
// {
//     totalChannels: 63000,
//     uniqueCategories: 50,
//     uniqueCountries: 200,
//     uniqueLanguages: 150,
//     indexedTerms: 50000
// }

const trending = search.getTrendingSearches(10);
// Returns most popular category/country combinations
```

### API Endpoint (Add to streaming-service/server.js)
```javascript
// GET /api/channels/search
app.get('/api/channels/search', async (req, res) => {
    const { q, limit = 50, offset = 0, category, country, language } = req.query;
    
    const search = new ChannelSearch(await getChannels());
    const results = search.search(q, { 
        limit: parseInt(limit), 
        offset: parseInt(offset), 
        category, 
        country, 
        language 
    });
    
    res.json(results);
});

// GET /api/channels/search/suggestions
app.get('/api/channels/search/suggestions', async (req, res) => {
    const { q, limit = 10 } = req.query;
    
    const search = new ChannelSearch(await getChannels());
    const suggestions = search.getSuggestions(q, parseInt(limit));
    
    res.json(suggestions);
});
```

---

## 2. 🏥 Channel Health Checker

**File**: `channel-health-checker.js`

### Features
- **Stream validation** with timeout protection
- **Health status tracking** (ok/warning/error)
- **Response time monitoring**
- **7-day history** tracking
- **Uptime calculation**
- **Problem channel detection**
- **System health dashboard**

### Usage Examples

#### Check Single Channel
```javascript
const ChannelHealthChecker = require('./channel-health-checker');

const checker = new ChannelHealthChecker({ timeout: 5000 });

const health = await checker.checkChannelHealth(channel);
// {
//     channelId: '...',
//     channelName: 'BBC News',
//     status: 'ok',
//     isHealthy: true,
//     statusCode: 200,
//     responseTime: 234,
//     error: null,
//     lastChecked: '2026-02-17T10:00:00Z'
// }
```

#### Check Multiple Channels
```javascript
const result = await checker.checkMultipleChannels(channels, { 
    progress: true 
});

// {
//     totalChecked: 63000,
//     results: [...],
//     summary: {
//         healthy: 59000,
//         warning: 3000,
//         error: 1000,
//         healthPercentage: 94
//     }
// }
```

#### Get Channel Uptime
```javascript
const uptime = checker.getChannelUptime('channel-id');
// Returns: 98.5 (percentage)

const avgResponseTime = checker.getAverageResponseTime('channel-id');
// Returns: 456 (milliseconds)
```

#### Get Problem Channels
```javascript
// Get channels below 95% uptime
const problems = checker.getProblemChannels(95);
// [
//     { channelName: 'Channel X', uptime: 85, lastStatus: 'error' },
//     ...
// ]
```

#### System Health Dashboard
```javascript
const systemHealth = checker.getSystemHealth();
// {
//     overallHealth: 'good',
//     totalChannels: 63000,
//     healthyChannels: 59000,
//     warningChannels: 3000,
//     errorChannels: 1000,
//     healthPercentage: 94,
//     avgResponseTime: 456,
//     checkedAt: '2026-02-17T10:00:00Z'
// }
```

#### Generate Report
```javascript
const report = checker.generateReport();
// {
//     summary: { ... },
//     byStatus: { ok: 59000, warning: 3000, error: 1000 },
//     slowestChannels: [ ... ],
//     problemChannels: [ ... ]
// }

// Export to JSON
const jsonData = checker.exportHealthData();
fs.writeFileSync('health-report.json', JSON.stringify(jsonData, null, 2));
```

### Periodic Health Checks (Background Job)
```javascript
// In your service startup (e.g., seed.js or separate scheduler)
const checker = new ChannelHealthChecker({ 
    checkInterval: 24 * 60 * 60 * 1000 // 24 hours
});

// Check channels that need rechecking
async function scheduleHealthChecks() {
    const channels = await TVChannel.findAll();
    
    // Get channels that haven't been checked in 24 hours
    const toCheck = checker.getChannelsNeedingRecheck(channels);
    
    if (toCheck.length > 0) {
        console.log(`🏥 Running health check on ${toCheck.length} channels...`);
        const result = await checker.checkMultipleChannels(toCheck, { progress: true });
        
        // Update database with health status
        for (const health of result.results) {
            await TVChannel.update(
                { 
                    isActive: health.isHealthy,
                    metadata: { 
                        ...channel.metadata,
                        lastHealthStatus: health.status,
                        lastHealthChecked: health.lastChecked
                    }
                },
                { where: { id: health.channelId } }
            );
        }
        
        // Log report
        const report = checker.generateReport();
        console.log(JSON.stringify(report, null, 2));
    }
}

// Run every 24 hours
setInterval(scheduleHealthChecks, 24 * 60 * 60 * 1000);
```

### API Endpoint
```javascript
// GET /api/channels/health
app.get('/api/channels/health', async (req, res) => {
    const checker = new ChannelHealthChecker();
    const system = checker.getSystemHealth();
    res.json(system);
});

// GET /api/channels/health/:channelId
app.get('/api/channels/health/:channelId', async (req, res) => {
    const checker = new ChannelHealthChecker();
    const health = checker.getCachedHealth(req.params.channelId);
    res.json(health || { error: 'No health data' });
});

// POST /api/channels/health/check
app.post('/api/channels/health/check', async (req, res) => {
    const checker = new ChannelHealthChecker({ timeout: 5000 });
    const channels = await TVChannel.findAll();
    const result = await checker.checkMultipleChannels(channels);
    res.json(result.summary);
});
```

---

## 3. 💡 Channel Recommender

**File**: `channel-recommender.js`

### Features
- **Personalized recommendations** based on viewing history
- **Similar channel finder**
- **Trending channels** (last 24 hours)
- **Category/country popularity**
- **User ratings** (1-5 stars)
- **User statistics** tracking
- **System statistics**

### Usage Examples

#### Track User Viewing
```javascript
const Recommender = require('./channel-recommender');

const recommender = new Recommender(allChannels);

// Track when user watches a channel
recommender.trackView(
    'user-123',           // userId
    'channel-456',        // channelId
    300000                // watch duration in ms (5 minutes)
);

// Multiple views
recommender.trackView('user-123', 'channel-789', 600000);
```

#### Rate Channels
```javascript
// User rates a channel
recommender.rateChannel('user-123', 'channel-456', 5); // 5 stars
recommender.rateChannel('user-123', 'channel-890', 3); // 3 stars
```

#### Get Personalized Recommendations
```javascript
// Get 20 personalized recommendations
const recommendations = recommender.getRecommendations('user-123', 20);
// Returns: [ {id, name, category, country, ...}, ... ]

// Get recommendations by category
const newsRecs = recommender.getRecommendationsByCategory('user-123', 'News', 10);

// Get recommendations by country
const usRecs = recommender.getRecommendationsByCountry('user-123', 'United States', 10);
```

#### Find Similar Channels
```javascript
// Get channels similar to a specific one
const similar = recommender.getSimilarChannels('channel-456', 10);
// Returns 10 channels with same category/country/language
```

#### Trending & Popular Channels
```javascript
// Get trending channels (most viewed in last 24h)
// Already called internally in getRecommendations

// Popular channels in a category
const popNews = recommender.getPopularInCategory('News', 10);

// Popular channels in a country
const popUS = recommender.getPopularInCountry('United States', 10);
```

#### User Statistics
```javascript
const stats = recommender.getUserStats('user-123');
// {
//     userId: 'user-123',
//     uniqueChannelsWatched: 42,
//     totalViews: 156,
//     totalWatchTimeMs: 50400000,
//     channelsRated: 12,
//     averageRating: 4.25,
//     topCategories: [
//         { category: 'News', count: 30 },
//         { category: 'Sports', count: 12 },
//         ...
//     ]
// }
```

#### System Statistics
```javascript
const systemStats = recommender.getSystemStats();
// {
//     totalUsers: 1500,
//     totalViews: 156000,
//     totalRatings: 12000,
//     topChannels: [
//         { channel: 'BBC News', views: 5000 },
//         ...
//     ]
// }
```

#### Data Export & Cleanup
```javascript
// Export user viewing history
const userData = recommender.exportUserData('user-123');
// Has: history, ratings, stats

// Clean old data (keep only last 90 days)
recommender.clearOldData(90);
```

### API Endpoints
```javascript
// GET /api/recommendations
app.get('/api/recommendations', async (req, res) => {
    const { userId, limit = 20 } = req.query;
    
    const recommender = new Recommender(await getChannels());
    const recs = recommender.getRecommendations(userId, parseInt(limit));
    
    res.json(recs);
});

// POST /api/channels/view
app.post('/api/channels/view', async (req, res) => {
    const { userId, channelId, watchDurationMs } = req.body;
    
    const recommender = new Recommender(await getChannels());
    recommender.trackView(userId, channelId, watchDurationMs);
    
    res.json({ success: true });
});

// POST /api/channels/rate
app.post('/api/channels/rate', async (req, res) => {
    const { userId, channelId, rating } = req.body;
    
    const recommender = new Recommender(await getChannels());
    recommender.rateChannel(userId, channelId, rating);
    
    res.json({ success: true });
});

// GET /api/recommendations/similar/:channelId
app.get('/api/recommendations/similar/:channelId', async (req, res) => {
    const { limit = 10 } = req.query;
    
    const recommender = new Recommender(await getChannels());
    const similar = recommender.getSimilarChannels(req.params.channelId, parseInt(limit));
    
    res.json(similar);
});

// GET /api/recommendations/trending
app.get('/api/recommendations/trending', async (req, res) => {
    const { limit = 20 } = req.query;
    
    const recommender = new Recommender(await getChannels());
    const trending = recommender._getTrendingChannels(parseInt(limit));
    
    res.json(trending);
});
```

---

## 4. 🚀 Auto-Discovery (Enhanced YouTube)

**File**: `youtube-enricher.js` (updated)

### Features
- **Auto-discover** channels by category
- **Keyword-based search** across YouTube
- **Batch enrichment** with logos
- **Popular channels** finder
- **6 search categories** (News, Music, Entertainment, Sports, Education, Lifestyle)

### Usage Examples

#### Auto-Discover Channels
```javascript
const YouTubeEnricher = require('./youtube-enricher');

const enricher = new YouTubeEnricher();

// Discover top 50 channels across all categories
const discovered = await enricher.autoDiscoverChannels(null, 50);
// Returns: [
//     {
//         name: 'BBC News',
//         handle: 'BBCNews',
//         streamUrl: 'https://...',
//         category: 'News',
//         discoveredVia: 'BBC News',
//         discoveredAt: '2026-02-17T...',
//         ...
//     }
// ]
```

#### Enrich Discovered Channels
```javascript
// Get logos and metadata for discovered channels
const enriched = await enricher.enrichDiscoveredChannels(discovered);
// Now each channel has: logoUrl, metadata, enrichedAt, etc.
```

#### Custom Category Search
```javascript
// Search specific categories only
const customKeywords = {
    'News': ['BBC News', 'CNN', 'Reuters'],
    'Tech': ['Tech Channels', 'WIRED', 'The Verge']
};

const discovered = await enricher.autoDiscoverChannels(customKeywords, 30);
```

#### Get Available Categories
```javascript
const categories = enricher.getSearchKeywords();
// {
//     'News': ['BBC News', 'CNN', ...],
//     'Music': ['Music 24/7', ...],
//     'Sports': ['ESPN', ...],
//     ...
// }
```

### Integration with Seeding
```javascript
// In seed.js, add auto-discovery step

const YouTubeEnricher = require('./youtube-enricher');

async function autoDiscoverYouTubeChannels() {
    console.log('🚀 Auto-discovering YouTube channels by keyword...\n');
    
    const enricher = new YouTubeEnricher({ timeout: 5000 });
    
    // Discover channels (50 total across all categories)
    const discovered = await enricher.autoDiscoverChannels(null, 50);
    
    if (discovered.length === 0) {
        console.log('⚠️  No channels discovered');
        return [];
    }
    
    // Enrich with logos
    const enriched = await enricher.enrichDiscoveredChannels(discovered);
    
    console.log(`✅ Discovered and enriched ${enriched.length} YouTube channels\n`);
    
    return enriched;
}

// Then add to seed.js TV channel pipeline
const discoveredYT = await autoDiscoverYouTubeChannels();
const allChannels = [...tvChannels, ...discoveredYT, ...iptvOrgChannels, ...youtubeChannels];
```

---

## 📊 Complete Integration Example

Add to `streaming-service/server.js`:

```javascript
const ChannelSearch = require('./channel-search');
const ChannelHealthChecker = require('./channel-health-checker');
const ChannelRecommender = require('./channel-recommender');

// Initialize services
let searchEngine;
let healthChecker;
let recommender;

// Load channels on startup
app.on('startup', async () => {
    const channels = await TVChannel.findAll();
    searchEngine = new ChannelSearch(channels);
    healthChecker = new ChannelHealthChecker();
    recommender = new ChannelRecommender(channels);
});

// ========== SEARCH ==========
app.get('/api/channels/search', (req, res) => {
    const { q, limit = 50, offset = 0 } = req.query;
    const results = searchEngine.search(q, { limit, offset });
    res.json(results);
});

app.get('/api/channels/search/suggestions', (req, res) => {
    const { q } = req.query;
    const suggestions = searchEngine.getSuggestions(q, 10);
    res.json(suggestions);
});

// ========== HEALTH ==========
app.get('/api/channels/health', (req, res) => {
    const health = healthChecker.getSystemHealth();
    res.json(health);
});

// ========== RECOMMENDATIONS ==========
app.get('/api/recommendations', (req, res) => {
    const { userId, limit = 20 } = req.query;
    const recs = recommender.getRecommendations(userId, limit);
    res.json(recs);
});

app.post('/api/channels/view', (req, res) => {
    const { userId, channelId, watchDurationMs } = req.body;
    recommender.trackView(userId, channelId, watchDurationMs);
    res.json({ success: true });
});

// ========== SCHEDULE HEALTH CHECKS ==========
setInterval(async () => {
    const channels = await TVChannel.findAll();
    const toCheck = healthChecker.getChannelsNeedingRecheck(channels);
    
    if (toCheck.length > 0) {
        const result = await healthChecker.checkMultipleChannels(toCheck);
        console.log(`Health check: ${result.summary.healthy}/${result.summary.totalChannels} channels healthy`);
    }
}, 6 * 60 * 60 * 1000); // Every 6 hours
```

---

## 🎯 Quick Start Integration

1. **Copy files to your project**:
   ```bash
   cp channel-search.js services/streaming-service/
   cp channel-health-checker.js services/streaming-service/
   cp channel-recommender.js services/streaming-service/
   ```

2. **Add API endpoints** to `streaming-service/server.js`

3. **Initialize on startup**:
   ```javascript
   const channels = await TVChannel.findAll();
   const search = new ChannelSearch(channels);
   const recommender = new ChannelRecommender(channels);
   const checker = new ChannelHealthChecker();
   ```

4. **Add frontend UI**:
   - Search input + suggestions
   - Health status dashboard
   - Recommendations carousel
   - "Similar channels" section

---

## 🚀 Next Steps

1. **Deploy services** (already available)
2. **Create API endpoints** (use examples above)
3. **Build frontend components** for search, recommendations, health
4. **Schedule health checks** (6-24 hour intervals)
5. **Monitor system statistics** (track trending channels)

All set! Your TV system is now enterprise-grade! 🎉
