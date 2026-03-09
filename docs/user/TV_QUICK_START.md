# TV Enhancement System - Quick Start Guide

## 🚀 Getting Started (5 mins)

### Step 1: Start the Seeding Process

```bash
# Rebuild the streaming service with new code
docker compose up -d --build streaming-service

# Watch the seeding progress (takes 15-30 minutes)
docker compose logs -f streaming-service
```

### Step 2: Monitor Progress

You'll see output like:

```
📺 TV CHANNELS SEEDING
═══════════════════════════════════════════

📡 Fetching TV channels from IPTV...
✅ Playlist sources: 12,841 channels

🌐 Fetching channels from IPTV-ORG API...
✅ Fetched 50,000+ channels from IPTV-ORG

🎥 Loading YouTube channels...
✅ Loaded and enriched 500 YouTube channels

🔧 Enriching all channels with logos...
✅ Enriched 63,341 channels (validation, logo fetching)

📊 Final Summary:
- IPTV-ORG: 50,000 channels
- Playlists: 12,841 channels
- YouTube: 500 channels
- Total: 63,341 unique channels
```

### Step 3: Use in Frontend

Once seeding completes, channels are available in the TV section:

```javascript
// TV.js automatically handles:
// 1. YouTube channels → Play in iframe
// 2. IPTV streams → Play with Shaka Player
// 3. Logos → Display with fallback avatars

// Smart logo handling
<img 
    src={safeImageUrl(logoUrl)} 
    alt={channelName}
    // Falls back to icon if logo URL is invalid
/>
```

## 🎯 Common Tasks

### 1. Add More YouTube Channels

Edit: `services/streaming-service/data/Youtube-Tv.json`

```json
{
    "id": 501,
    "name": "CNN Live",
    "category": "News",
    "platform": "YouTube",
    "handle": "@CNN",
    "liveUrl": "https://www.youtube.com/@CNN/live",
    "iframeUrl": "https://www.youtube.com/embed/@CNN/live",
    "country": "United States",
    "categoryFull": "News - United States"
}
```

Then restart: `docker compose up -d --build streaming-service`

### 2. Filter Channels by Country

In `seed.js`, modify the IPTV-ORG fetch:

```javascript
// Instead of all channels
const iptvOrgChannels = await iptvAPI.fetchChannels();

// Fetch only specific countries
const iptvOrgChannels = await iptvAPI.fetchChannels({ 
    country: 'US' // or 'GB', 'IN', 'BR', etc.
});
```

### 3. Add Custom Stream Validation

In `channel-enricher.js`, modify `validateStreamUrl()`:

```javascript
async validateStreamUrl(url) {
    // Add your custom logic here
    // E.g., check for DRM protection, geo-blocking, etc.
    
    // Existing logic
    if (url.includes('youtube.com')) return true;
    // ... rest of validation
}
```

### 4. Customize Logo Fallback

In `channel-enricher.js`, modify `generateFallbackLogo()`:

```javascript
generateFallbackLogo(channel) {
    // Use your own branding/styling
    return `https://your-api.com/generate-logo?name=${channel.name}`;
}
```

## 🔍 Troubleshooting

### Seeding Fails / Times Out

**Problem**: Process exits or hangs

```bash
# Solution 1: Increase timeout for IPTV-ORG
# In seed.js, change timeout from 30000 to 60000 (60 seconds)
const iptvAPI = new IPTVOrgAPI({ timeout: 60000 });

# Solution 2: Reduce scope
# In seed.js, fetch only specific countries
const iptvOrgChannels = await iptvAPI.fetchChannels({ country: 'US' });

# Solution 3: Check internet connection
curl https://iptv-org.github.io/api/channels.json
```

### No YouTube Logos Appearing

**Problem**: YouTube channels showing fallback avatars

```bash
# Solution 1: Check if YouTube enrichment runs
# Look for "Enriching YouTube channels" in logs

# Solution 2: Disable enrichment validation
# In seed.js, pass { skipInvalid: true }
const enrichedChannels = await enricher.enrichChannels(allChannels, { 
    skipInvalid: true 
});

# Solution 3: Increase YouTube fetch timeout
# In youtube-enricher.js
const enricher = new YouTubeEnricher({ timeout: 10000 });
```

### Database Errors

**Problem**: "UNIQUE constraint violation"

```bash
# Solution 1: Clear database
docker compose exec postgres psql -U postgres streaming -c "DELETE FROM \"TVChannels\";"

# Solution 2: Check for duplicate URLs
# The code already handles this - shouldn't occur

# Solution 3: Increase database connection pool
# In seed.js
const sequelize = new Sequelize(url, {
    pool: { max: 20, min: 5 },
    logging: false
});
```

### Memory Issues

**Problem**: "Out of memory" error during seeding

```bash
# Solution 1: Reduce batch size
# In seed.js
const chunkSize = 100; // Smaller batches

# Solution 2: Limit IPTV-ORG to specific region
const iptvOrgChannels = await iptvAPI.fetchChannels({ 
    country: 'US' // Load 1 country at a time
});

# Solution 3: Skip YouTube enrichment (temporary)
const youtubeChannels = [];
```

## 📊 Performance Tips

### Faster Seeding

1. **Reduce YouTube enrichment**:
   ```javascript
   const enricher = new YouTubeEnricher({ 
       timeout: 2000,  // Faster timeout
       retries: 0      // No retries
   });
   ```

2. **Skip stream validation**:
   ```javascript
   const enricher = new ChannelEnricher({ 
       validateStreams: false  // Skip validation
   });
   ```

3. **Limit to 1 IPTV region**:
   ```javascript
   const iptvOrgChannels = await iptvAPI.fetchChannels({ 
       country: 'US' 
   });
   ```

### Expected Times

| Task | Time |
|------|------|
| Fetch playlists | 2-3 min |
| Fetch IPTV-ORG | 5-7 min |
| Enrich YouTube | 3-5 min |
| Validate streams | 5-10 min |
| Database insert | 2-4 min |
| **Total** | **15-30 min** |

## 🎨 Customizing for Your Brand

### Change Logo Fallback Style

In `channel-enricher.js`:

```javascript
generateFallbackLogo(channel) {
    // Use DiceBear instead of UI Avatars
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${channel.name}`;
    
    // Or use Gravatar
    return `https://www.gravatar.com/avatar/${md5(channel.name)}?d=identicon`;
    
    // Or use your own service
    return `https://your-api.com/logo?name=${channel.name}&color=blue`;
}
```

### Change Stream Validation Rules

In `channel-enricher.js`:

```javascript
async validateStreamUrl(url) {
    // Custom logic: only accept certain streams
    
    // Accept YouTube
    if (url.includes('youtube.com')) return true;
    
    // Accept IPTV-ORG streams
    if (url.includes('.m3u8') || url.includes('hls')) return true;
    
    // Reject others
    return false;
}
```

## 📈 Next Steps

After successful seeding:

1. **Test playback**:
   - Open TV section
   - Try YouTube channel (should play in iframe)
   - Try IPTV channel (should play with Shaka Player)
   - Verify logos load correctly

2. **Monitor performance**:
   - Check database query times
   - Monitor stream load times
   - Track viewer metrics

3. **Optimize further**:
   - Add caching for logos
   - Implement CDN for streams
   - Add health checks for channels

4. **Add features**:
   - Search across 60,000+ channels
   - Channel recommendations
   - Viewing history
   - Favorite channels

## 🔗 Useful Links

- IPTV-ORG Channels: https://iptv-org.github.io/iptv/index.m3u
- YouTube Live Finder: https://www.youtube.com/results?search_query=live
- Shaka Player Docs: https://shaka-player-demo.appspot.com/
- HLS Stream Validator: https://videojs.github.io/m3u8-parser/

## 📞 Support

If issues occur:

1. Check logs: `docker compose logs streaming-service`
2. Read detailed guide: [TV_PROFESSIONAL_UPGRADE.md](./TV_PROFESSIONAL_UPGRADE.md)
3. Check configuration: `services/streaming-service/seed.js`
4. Verify database: `docker compose exec postgres psql -l`

Enjoy! 🎉📺
