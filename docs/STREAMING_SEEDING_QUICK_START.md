# Quick Start: Streaming Service Database Seeding

## One-Command Deployment

```bash
cd /workspaces/Let-s-connect
docker-compose up --build -d
```

**What happens**:
- Automatically seeds 16 radio stations
- Automatically seeds 20 TV channels
- ~2 seconds to complete
- Ready to use immediately

## Verify It Worked

```bash
# Check service is running
docker-compose ps streaming-service

# View seeding logs
docker-compose logs streaming-service | tail -20

# Test radio API
curl http://localhost:8000/api/streaming/radio/stations

# Test TV API
curl http://localhost:8000/api/streaming/tv/channels
```

## Access in Browser

- **Radio**: http://localhost:3000/radio
- **TV**: http://localhost:3000/tv
- **API**: http://localhost:8000/api/streaming/health

## Manual Seeding (if needed)

```bash
# If already running
docker-compose exec streaming-service npm run seed

# Or if rebuilding
docker-compose up --build -d streaming-service
docker-compose logs -f streaming-service
```

## What Gets Added

| Item | Count | Source |
|------|-------|--------|
| **Radio Stations** | 16 | BBC, NPR, France, Australia, Canada, Ireland, etc. |
| **TV Channels** | 20 | BBC, France, Ireland, Australia, Canada, etc. |
| **Total Content** | 36 | Immediate playback-ready |

## Problems?

Check logs:
```bash
docker-compose logs streaming-service
```

See [STREAMING_SEEDING_IMPLEMENTATION.md](STREAMING_SEEDING_IMPLEMENTATION.md) for full troubleshooting guide.

---

**Status**: Ready to deploy ✅
