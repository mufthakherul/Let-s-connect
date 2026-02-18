# Streaming Service Seeding Optimization

## Overview

The streaming service has been optimized to significantly reduce startup time during development while maintaining full functionality for production deployments.

## Problem Statement

The original seeding process was taking a long time (5-10 minutes or more) because it:
- Fetched data from multiple online sources (radio-browser.info, IPTV-ORG, YouTube, Xiph, etc.)
- Validated and enriched each channel individually
- Made sequential network requests
- Inserted thousands of records one by one

This long startup time was particularly problematic during development when you need to restart services frequently.

## Solution

We've implemented a **fast seeding mode** that uses static data and bulk operations to reduce startup time from minutes to seconds.

## Seeding Modes

The streaming service now supports three seeding modes:

### 1. **minimal** (Default - Recommended for Development)
- Uses static seed data only
- Seeds 50 radio stations and 50 TV channels by default
- **Startup time: ~5-10 seconds**
- Perfect for development and testing

### 2. **full** (Recommended for Production)
- Fetches from all online sources
- Enriches and validates channels
- Seeds thousands of channels
- **Startup time: 5-10 minutes**
- Use for production deployments

### 3. **skip**
- Skips seeding entirely
- **Startup time: ~1 second**
- Use when you already have data in the database

## Configuration

### Environment Variables

Add these to your `.env` file or docker-compose.yml:

```bash
# Seeding mode: minimal (fast), full (complete), or skip (none)
SEED_MODE=minimal

# For minimal mode: how many records to seed
SEED_MINIMAL_RADIO_LIMIT=50
SEED_MINIMAL_TV_LIMIT=50

# Performance optimizations
SEED_SKIP_ONLINE_FETCH=true   # Skip online API calls (use static data)
SEED_SKIP_VALIDATION=true     # Skip stream validation
SEED_SKIP_ENRICHMENT=true     # Skip metadata enrichment
SEED_BATCH_SIZE=100           # Batch size for bulk operations

# Use full seed script (original behavior)
USE_FULL_SEED=false
```

### Docker Compose Quick Setup

For **development** (fast startup):
```yaml
streaming-service:
  environment:
    - SEED_MODE=minimal
    - RUN_SEED=true
```

For **production** (complete data):
```yaml
streaming-service:
  environment:
    - SEED_MODE=full
    - USE_FULL_SEED=true
    - RUN_SEED=true
```

To **skip seeding** entirely:
```yaml
streaming-service:
  environment:
    - RUN_SEED=false
```

## Usage Examples

### Quick Development Start

```bash
# In your .env file
SEED_MODE=minimal

# Start services
docker-compose up
```

**Result:** Streaming service starts in ~10 seconds with 50 stations and 50 channels.

### Production Deployment

```bash
# In your .env file
SEED_MODE=full
USE_FULL_SEED=true

# Deploy
docker-compose up -d
```

**Result:** Streaming service seeds complete dataset from online sources.

### Skip Seeding (Database Already Populated)

```bash
# In your .env file
RUN_SEED=false

# Start services
docker-compose up
```

**Result:** Streaming service starts immediately without seeding.

## Manual Seeding

You can also run seeding manually:

### Fast Seeding
```bash
cd services/streaming-service
SEED_MODE=minimal node seed-fast.js
```

### Full Seeding (Original)
```bash
cd services/streaming-service
node seed.js
```

### Custom Limits
```bash
cd services/streaming-service
SEED_MODE=minimal SEED_MINIMAL_RADIO_LIMIT=100 SEED_MINIMAL_TV_LIMIT=100 node seed-fast.js
```

## Performance Comparison

| Mode | Startup Time | Radio Stations | TV Channels | Use Case |
|------|-------------|----------------|-------------|----------|
| skip | ~1 second | 0 | 0 | Database already populated |
| minimal | ~5-10 seconds | 50 | 50 | Development & Testing |
| full | ~5-10 minutes | 1000+ | 1000+ | Production Deployment |

## Files

- `seed-fast.js` - Optimized seeding script (new)
- `seed.js` - Original comprehensive seeding script
- `.env.example` - Example environment configuration
- `docker-entrypoint.sh` - Updated to use optimized seeding by default

## Migration Guide

### From Old Setup to New

1. **No changes required!** The new system is backward compatible.
   - By default, it uses `seed-fast.js` with `SEED_MODE=minimal`
   - Set `USE_FULL_SEED=true` to use the original `seed.js`

2. **For production deployments**, update your `.env`:
   ```bash
   SEED_MODE=full
   USE_FULL_SEED=true
   ```

3. **For development**, the defaults work great:
   ```bash
   # No configuration needed, or explicitly set:
   SEED_MODE=minimal
   ```

## Troubleshooting

### "Not enough channels/stations"

Increase the limits:
```bash
SEED_MINIMAL_RADIO_LIMIT=200
SEED_MINIMAL_TV_LIMIT=200
```

Or use full mode:
```bash
SEED_MODE=full
USE_FULL_SEED=true
```

### "Seeding takes too long in development"

Make sure you're using minimal mode:
```bash
SEED_MODE=minimal
USE_FULL_SEED=false
```

### "Want to skip seeding on every restart"

```bash
RUN_SEED=false
```

### "Need fresh data from online sources"

```bash
SEED_MODE=full
USE_FULL_SEED=true
SEED_SKIP_ONLINE_FETCH=false
```

## Technical Details

The optimization works by:

1. **Lazy Loading**: Only loads necessary modules based on mode
2. **Static Data Fallback**: Uses pre-fetched JSON data instead of API calls
3. **Bulk Operations**: Batches database inserts
4. **Conditional Features**: Skips validation, enrichment when not needed
5. **Smart Defaults**: Automatically uses fast mode in development

## Best Practices

1. **Development**: Use `SEED_MODE=minimal` for quick iterations
2. **CI/CD**: Use `RUN_SEED=false` if database is pre-populated
3. **Production**: Use `SEED_MODE=full` and `USE_FULL_SEED=true` for first deployment
4. **Updates**: Re-run full seed periodically to refresh channel lists

## Future Improvements

Potential enhancements:
- Incremental updates instead of full reseeding
- Background seeding after service starts
- CDN-hosted seed data for faster downloads
- Compressed seed data files
- Database migration scripts

## Support

For issues or questions:
1. Check environment variables are set correctly
2. Review logs for seeding output
3. Try manual seeding to isolate issues
4. Refer to `STREAMING_SEEDING_QUICK_START.md` for detailed guides
