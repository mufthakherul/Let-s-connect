# Database Seeding Guide

This directory contains **fallback seed data** for the streaming service database.

## 🌟 Dynamic + Fallback System

The streaming service uses a **intelligent hybrid approach**:

```
First Attempt (if online):
├─ Fetch from radio-browser.info → 5,000-50,000 radio stations ✅
└─ Fetch from GitHub IPTV playlists → 500-5,000 TV channels ✅

If Online Sources Unavailable:
├─ Fall back to radio-stations.json → 16 verified stations ✅
└─ Fall back to tv-channels.json → 20 verified channels ✅

Result: Always have content (online OR fallback) ✨
```

### Benefits

- 🌐 **Live Data**: Fetch 50,000+ radio stations worldwide
- 📺 **Playlist Support**: Parse M3U8 from GitHub and other sources
- 🔄 **Auto Merge**: Intelligently deduplicate and merge online + static data
- 💾 **Guaranteed Content**: Fallback ensures minimum viable dataset
- ⚡ **Smart Retry**: Auto-retry with exponential backoff for reliability
- 📊 **Detailed Reporting**: See what was added and from where

## Technical Details

See [DYNAMIC_SEEDING_GUIDE.md](../../DYNAMIC_SEEDING_GUIDE.md) for:
- Complete architecture and data flow
- API documentation
- Configuration options
- Troubleshooting guide

## Files in This Directory

### `radio-stations.json`
Contains 16 real, publicly available radio stations from around the world:
- **BBC Radio** (UK) - Radio 1, 2, 3, 4
- **NPR** (USA) - National Public Radio
- **WQXR** (USA) - Classical music
- **France Musique** (France) - Classical
- **RTE Radio One** (Ireland)
- **ABC Radio National** (Australia)
- **SBS Radio** (Australia) - Multicultural
- **Radio Canada** (Canada)
- **Sunny 91.1 FM** - Adult contemporary
- **EgoFM** (Germany) - Alternative/Indie
- **RFI Musique** (France) - World music
- **NTS Radio** (USA) - Electronic/Indie
- **KISS FM** - Pop/Dance

### `tv-channels.json`
Contains 20 real, publicly available TV channels from around the world:
- **BBC** (UK) - BBC One, Two, News
- **ITV** (UK) - Commercial television
- **EuroNews** (Europe) - International news
- **France TV** (France) - France 2, 3
- **RTE** (Ireland) - RTE One, Two
- **ABC News** (Australia)
- **SBS Australia** - Multicultural
- **CBC** (Canada) - News
- **RTBF** (Belgium) - Auvio
- **NRK** (Norway)
- **SVT** (Sweden)
- **Smithsonian Channel** (USA) - Documentary
- **TED Talks** - Educational
- **Al Jazeera English** (Qatar) - News
- **DW News** (Germany) - International news
- **CGTN** (China) - News

## How to Seed the Database

### ✅ Automatic (Recommended)

The seeding runs automatically when the streaming service starts:

```bash
docker-compose up --build -d
```

Logs will show:
- Online sources fetched ✅
- Or fallback used ⚠️
- Final statistics 📊

### Manual Seeding

If you need to re-seed:

```bash
# While service is running
docker-compose exec streaming-service npm run seed

# Or rebuild and seed
docker-compose up --build -d streaming-service
```

### Disable Auto-Seeding

Edit `docker-compose.yml`:
```yaml
streaming-service:
  environment:
    - RUN_SEED=false  # Disable auto-seeding
```

## Fallback Data Description

This directory contains **verified fallback streams** used when online sources are unavailable:

### `radio-stations.json` (16 stations)

**Verified public radio stations** - guaranteed to work:

**United Kingdom** (4):
- BBC Radio 1, 2, 3, 4 - Official BBC HLS streams

**United States** (3):
- NPR - National Public Radio
- WQXR - Classical music
- NTS Radio - Electronic/Indie

**France** (2):
- France Musique - Classical music
- RFI Musique - World music

**Other Countries** (7):
- RTE Radio One (Ireland)
- ABC Radio National (Australia)
- SBS Radio (Australia)
- Radio Canada (Canada)
- EgoFM (Germany)
- KISS FM
- Sunny 91.1 FM

**Features**:
- All streams verified working
- Includes bitrate, genre, language, logo
- Updated regularly
- Serves as quality baseline

### `tv-channels.json` (20 channels)

**Verified public TV channels** - guaranteed to work:

**United Kingdom** (3):
- BBC One, Two, News - Official BBC streams

**France** (2):
- France 2, 3 - Official France TV

**Other Countries** (15):
- ITV UK, RTE Ireland, ABC Australia, SBS Australia
- CBC Canada, EuroNews, RTBF Belgium
- NRK Norway, SVT Sweden
- Documentation: Smithsonian Channel, TED Talks
- News: Al Jazeera English, DW News, CGTN

**Features**:
- All streams verified working
- HLS/M3U8 format
- Includes category, language, resolution
- Quality baseline

## Data Sources

### Online Sources (Primary)

**Radio**:
- **radio-browser.info API**: 50,000+ stations, 30+ countries
- Real-time data with validation
- Click/vote metrics
- Bandwidth info

**TV**:
- **GitHub IPTV ORG**: 50,000+ channels
- **M3U Extended**: Additional playlists
- **IPTV2**: Focused collection
- **Public IPTV**: Free channels

### Fallback Sources (Local)

- `radio-stations.json` - 16 verified stations
- `tv-channels.json` - 20 verified channels
- Always available offline
- Guaranteed working streams

## Customization

### Add More Fallback Stations

Edit the JSON files directly, following this format:

**Radio Station**:
```json
{
  "name": "Station Name",
  "description": "Country/Description",
  "streamUrl": "http://stream.example.com/live.mp3",
  "websiteUrl": "https://example.com",
  "genre": "Genre Name",
  "country": "Country Code (GB, US, FR, etc)",
  "language": "Language Code (en, fr, de, etc)",
  "logoUrl": "https://example.com/logo.png",
  "bitrate": 192,
  "isActive": true
}
```

**TV Channel**:
```json
{
  "name": "Channel Name",
  "description": "Country/Description",
  "streamUrl": "https://stream.example.com/live.m3u8",
  "epgUrl": "https://epg.example.com",
  "category": "Category (News, Sports, etc)",
  "country": "Country Code",
  "language": "Language Code",
  "logoUrl": "https://example.com/logo.png",
  "resolution": "Resolution (HD, SD, Full HD)",
  "isActive": true
}
```

Then re-seed:
```bash
npm run seed
```

### Add More Online Countries

Edit `services/streaming-service/seed.js`:

```javascript
const fetcher = new RadioBrowserFetcher({
  countries: [
    // Existing countries
    'GB', 'US', 'FR', 'DE',
    // Add more (ISO 3166-1 alpha-2 codes)
    'JP', 'KR', 'BR', 'IN'
  ]
});
```

## Verification

### Check What Was Seeded

```bash
# Count radio stations
psql -h localhost -U postgres -d streaming \
  -c "SELECT COUNT(*) FROM \"RadioStations\";"

# Count TV channels
psql -h localhost -U postgres -d streaming \
  -c "SELECT COUNT(*) FROM \"TVChannels\";"

# See by source
psql -h localhost -U postgres -d streaming \
  -c "SELECT source, COUNT(*) FROM \"RadioStations\" GROUP BY source;"
```

### Test API Endpoints

```bash
# Get radio stations
curl http://localhost:8000/api/streaming/radio/stations?limit=5

# Get TV channels
curl http://localhost:8000/api/streaming/tv/channels?limit=5

# Get health status
curl http://localhost:8000/api/streaming/health
```

## Troubleshooting

### Using Fallback Instead of Online Data

**Cause**: Online APIs not accessible

**Solution**:
1. Check internet connection
2. Verify APIs:
   ```bash
   curl https://de1.api.radio-browser.info/json/stations/bycountry/GB
   ```
3. Check logs:
   ```bash
   docker-compose logs streaming-service | grep "⚠️"
   ```

### Stream Not Playing

**Cause**: Stream URL may have changed

**Solution**:
1. Check stream is valid:
   ```bash
   curl -I "https://stream.example.com/live.m3u8"
   ```
2. Update JSON file if needed
3. Re-run seeding:
   ```bash
   npm run seed
   ```

### Slow Seeding

**Cause**: Network latency (normal for first run)

**Solution**:
- First run: 2-4 minutes (expected)
- Subsequent: <1 minute (only new items)
- Check progress in logs:
  ```bash
  docker-compose logs -f streaming-service
  ```

## Performance

**Seeding Time**:
- First run (with API fetch): 2-4 minutes
- Subsequent runs (duplicates only): <1 minute
- Database size: ~20-100 MB (depending on items)

**Data Merge**:
- Online data: 5,000-50,000 radio + 500-5,000 TV
- Fallback data: 16 radio + 20 TV minimum
- Deduplication: Via URL matching
- Total items: 100-55,000+ depending on online availability

## Flow Chart

```
┌──────────────────────────────────────────┐
│  Docker Start / npm run seed             │
└──────────────────┬───────────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Try Online APIs    │
        │  ├─ Radio Browser   │
        │  └─ TV Playlists    │
        └──────────┬──────────┘
                   │
        ┌──────────┴──────────────────┐
        │                             │
   ✅ Success              ⚠️ Failed/Timeout
        │                             │
   Fetch 5K-50K         Use Fallback
   + 500-5K              16 Radio
        │                 20 TV
        │                             │
        └──────────┬──────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Merge & Deduplicate│
        │  (by URL)          │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  Insert to Database │
        │  (Skip duplicates)  │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  Report Results    │
        │  ✨ Complete!     │
        └────────────────────┘
```

## Advanced: Source Code

- **Fetching**: [radio-browser-fetcher.js](../radio-browser-fetcher.js)
- **Parsing**: [tv-playlist-fetcher.js](../tv-playlist-fetcher.js)
- **Orchestration**: [seed.js](../seed.js)
- **Startup**: [docker-entrypoint.sh](../docker-entrypoint.sh)

## Related Documentation

- [DYNAMIC_SEEDING_GUIDE.md](../../DYNAMIC_SEEDING_GUIDE.md) - Complete technical reference
- [DYNAMIC_SEEDING_QUICK_START.md](../../DYNAMIC_SEEDING_QUICK_START.md) - Quick deployment guide
- [STREAMING_SEEDING_IMPLEMENTATION.md](../../STREAMING_SEEDING_IMPLEMENTATION.md) - Static seeding details
- [API.md](../../docs/API.md) - REST API endpoints

---

**Updated**: February 2026  
**Status**: ✅ Dynamic System Active  
**Next Update**: Run `npm run seed` or restart service for latest data

---

Last Updated: February 2026
