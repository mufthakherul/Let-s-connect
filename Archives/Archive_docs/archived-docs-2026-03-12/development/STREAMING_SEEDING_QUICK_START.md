# Quick Start: Streaming Service Database Seeding

## Canonical Mode Contract

- `skip` → skip seeding
- `minimal` → run `seed-fast.js` (static subset)
- `full` → run `seed.js` (dynamic + enrichment/validation)
- `fast` → run `seed.js` (dynamic broad collection with heavy checks reduced)

Backward compatibility: if `SEED_MODE` is unset and `USE_FULL_SEED=true`, mode resolves to `full`; otherwise default is `minimal`.

## One-Command Deployment

```bash
cd /workspaces/Let-s-connect
docker-compose up --build -d
```

**What happens**:
- Automatically seeds minimal static subset by default (`SEED_MODE=minimal`)
- Fast startup for development
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
# Minimal static subset (default dev)
docker-compose exec streaming-service npm run seed:minimal

# Full dynamic seed (most complete)
docker-compose exec streaming-service npm run seed:full

# Fast dynamic seed (broad + optimized)
docker-compose exec streaming-service npm run seed:fast

# Or if rebuilding
docker-compose up --build -d streaming-service
docker-compose logs -f streaming-service
```

## Environment Variables (Most Used)

```bash
# Canonical mode
SEED_MODE=minimal

# Minimal mode limits
SEED_MINIMAL_RADIO_LIMIT=50
SEED_MINIMAL_TV_LIMIT=50

# Fast mode toggles (used when SEED_MODE=fast)
SEED_FAST_DISABLE_STREAM_VALIDATION=true
SEED_FAST_DISABLE_LOGO_NETWORK=true
SEED_FAST_DISABLE_YOUTUBE_ENRICHMENT=true
SEED_FAST_DISABLE_DELAYS=true
SEED_FAST_SKIP_PER_ITEM_PRECHECK=true
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

See [STREAMING_SEEDING_OPTIMIZATION.md](STREAMING_SEEDING_OPTIMIZATION.md) for mode and optimization details.

---

**Status**: Ready to deploy ✅
