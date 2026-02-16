# Dynamic Streaming Seeding - Quick Start

## One-Command Deployment (📻 50,000+ Radio | 📺 500+ TV)

```bash
cd /workspaces/Let-s-connect
docker-compose up --build -d
```

**What automatically happens**:
✅ Fetches worldwide radio stations from radio-browser.info API  
✅ Collects TV channels from GitHub IPTV repositories  
✅ Falls back to verified static data if APIs unavailable  
✅ Merges and deduplicates all sources  
✅ Seeds database with 100-5,000+ items  
✅ Generates detailed statistics  
⏱️ Takes ~2-4 minutes (first run)

## Check Seeding Progress

```bash
# View real-time logs
docker-compose logs -f streaming-service

# Or check final stats (after completion)
docker-compose logs streaming-service | tail -50
```

## Verify It Worked

### 1. Check Database

```bash
# Count radio stations
psql -h localhost -U postgres -d streaming \
  -c "SELECT COUNT(*) FROM \"RadioStations\";"

# Count TV channels
psql -h localhost -U postgres -d streaming \
  -c "SELECT COUNT(*) FROM \"TVChannels\";"
```

### 2. Test API

```bash
# Get first 5 radio stations
curl http://localhost:8000/api/streaming/radio/stations?limit=5 | jq

# Get first 5 TV channels
curl http://localhost:8000/api/streaming/tv/channels?limit=5 | jq

# Check service health
curl http://localhost:8000/api/streaming/health | jq
```

### 3. Use in Browser

- **Radio**: http://localhost:3000/radio
- **TV**: http://localhost:3000/tv

Try playing a few streams!

## What Gets Added

| Source | Count | Fallback |
|--------|-------|----------|
| **Radio Browser API** | 5,000-50,000 stations | ✅ 16 verified |
| **TV Playlists (5 sources)** | 500-5,000 channels | ✅ 20 verified |
| **Total (with online)** | **5,500-55,000 items** | **36 items min** |

### Data Comes From

**Radio** (radio-browser.info):
- 30+ countries worldwide
- All genres (Pop, Rock, Jazz, Classical, News, Talk, etc.)
- Official broadcaster URLs
- Metadata: bitrate, language, logo, clicks

**TV** (GitHub & public sources):
- IPTV ORG (50,000+ channels)
- M3U Extended playlists
- IPTV2 collection
- PublicIPTV
- Coverage: Worldwide, all categories

## Manual Seeding (If Needed)

```bash
# Re-run seeding while service is running
docker-compose exec streaming-service npm run seed

# Or if rebuilding
docker-compose up --build -d streaming-service
```

## Troubleshooting

### Seeds but uses fallback (16 radio / 20 TV only)

**Cause**: Online APIs not accessible

**Solution**:
1. Check internet connection
2. Verify APIs are accessible:
   ```bash
   curl https://de1.api.radio-browser.info/json/stations/bycountry/GB
   curl https://raw.githubusercontent.com/iptv-org/iptv/master/index.m3u
   ```
3. Check Docker logs:
   ```bash
   docker-compose logs streaming-service | grep "⚠️"
   ```

### Seeding very slow

**Cause**: Network latency

**Solution**: Wait for completion (first run takes 2-4 minutes)
```bash
docker-compose logs -f streaming-service | grep "✨"
```

### Very few items added

**Cause**: Possible networking/firewall issue

**Solution**:
1. Restart services: `docker-compose restart`
2. Check firewall allows outbound HTTPS
3. Manually seed: `docker-compose exec streaming-service npm run seed`

## Configuration

### Disable Auto-Seeding

Edit `docker-compose.yml`:
```yaml
streaming-service:
  environment:
    - RUN_SEED=false  # Set to false
```

### Add More Radio Countries

Edit `services/streaming-service/seed.js`, find `countries:` array and add more:
```javascript
countries: [
  // ... existing
  'KR', 'TH', 'PH', 'VN'  // Add Asian countries
]
```

Then re-seed:
```bash
docker-compose exec streaming-service npm run seed
```

## File Structure

```
services/streaming-service/
├── seed.js                          # Main seeding orchestrator (450 lines)
├── radio-browser-fetcher.js         # Radio API fetcher (340 lines)
├── tv-playlist-fetcher.js          # TV playlist fetcher (460 lines)
├── seed-data/
│   ├── radio-stations.json         # 16 verified fallback stations
│   ├── tv-channels.json            # 20 verified fallback channels
│   └── README.md                   # Detailed documentation
└── docker-entrypoint.sh            # Auto-seeding trigger
```

## Expected Output

After `docker-compose up`, logs should show:

```
🌱 Starting streaming database seeding...

═══════════════════════════════════════════
📻 RADIO STATIONS SEEDING
═══════════════════════════════════════════

🌐 Attempting to fetch radio stations from online sources...

  ✅ GB: 400 new stations added
  ✅ US: 350 new stations added
  ✅ FR: 200 new stations added
  ... (more countries)

✅ Successfully fetched 5,234 radio stations from online source

📊 Merged Data: 5,234 unique radio stations
  - Online sources: 5,234
  - Static fallback: 16
  - Total unique: 5,234

🔄 Seeding 5,234 radio stations to database...
  ⏳ Progress: 50 stations added...
  ⏳ Progress: 100 stations added...
  ... (continues)

📊 Radio Stations Final Report:
  ✅ Created: 5,234
  ⏭️  Skipped (duplicates): 0
  📁 Total unique: 5,234

═══════════════════════════════════════════
📺 TV CHANNELS SEEDING
═══════════════════════════════════════════

🌐 Attempting to fetch TV channels from online sources...

  ✅ IPTV ORG: 1,200 new channels added
  ✅ M3U Extended: 350 new channels added
  ✅ Public IPTV: 180 new channels added
  ... (more sources)

✅ Successfully fetched 2,450 TV channels from online sources

📊 TV Channels Final Report:
  ✅ Created: 2,450
  ⏭️  Skipped (duplicates): 0
  📁 Total unique: 2,450

═══════════════════════════════════════════
📈 FINAL STATISTICS
═══════════════════════════════════════════

📻 Radio Stations: 5,234
📺 TV Channels: 2,450
🎬 Total Streaming Content: 7,684

✨ Database seeding completed successfully!
```

## Next Steps

1. **Test in Frontend**: Navigate to http://localhost:3000/radio and http://localhost:3000/tv
2. **Add Favorites**: Like/follow your favorite streams
3. **Create Playlists**: Build custom playlists
4. **Check History**: View your listening/watching history

## Monitoring

After deployment, check periodically:

```bash
# Monitor service health
curl http://localhost:8000/api/streaming/health

# Check latest stats
curl 'http://localhost:8000/api/streaming/radio/stations?limit=1' | jq '.meta'
```

## Support

For detailed information, see:
- [DYNAMIC_SEEDING_GUIDE.md](DYNAMIC_SEEDING_GUIDE.md) - Full technical guide
- [STREAMING_SEEDING_IMPLEMENTATION.md](STREAMING_SEEDING_IMPLEMENTATION.md) - Static seeding (fallback)
- [services/streaming-service/seed-data/README.md](services/streaming-service/seed-data/README.md) - Seed data details

---

**Status**: ✅ Ready to deploy  
**Live Data**: 50,000+ radio | 500+ TV  
**Fallback**: 16 radio | 20 TV (guaranteed)  
**Deploy**: `docker-compose up --build -d`
