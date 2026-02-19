#!/bin/sh
#/bin/bash

# Database initialization script for streaming service
# This runs automatically when the streaming-service container starts

set -e

echo "🌱 Initializing Streaming Service Database..."

# Wait for PostgreSQL to be ready
while ! nc -z postgres 5432; do
  echo "⏳ Waiting for PostgreSQL to be ready..."
  sleep 1
done

echo "✅ PostgreSQL is ready"

# Determine which seed script to use based on SEED_MODE
SEED_MODE=${SEED_MODE:-minimal}
SEED_SCRIPT="seed-fast.js"

# Use original seed.js only if explicitly requested
if [ "$USE_FULL_SEED" = "true" ]; then
  SEED_SCRIPT="seed.js"
  echo "ℹ️  Using full seed script (seed.js) - this may take several minutes"
fi

# Check if seed should be run
if [ "$RUN_SEED" = "true" ]; then
  echo "🌾 Running database seed (mode: $SEED_MODE, script: $SEED_SCRIPT)..."
  cd /app
  node $SEED_SCRIPT
  echo "✅ Seed completed"
elif [ "$RUN_SEED" = "false" ]; then
  echo "⏭️  Seed explicitly skipped (RUN_SEED=false)"
else
  # Default behavior: run fast seed in minimal mode for quick startup
  echo "🚀 Running quick seed (default behavior)..."
  echo "   Set RUN_SEED=false to skip entirely"
  echo "   Set USE_FULL_SEED=true for production seeding"
  cd /app
  node $SEED_SCRIPT
  echo "✅ Quick seed completed"
fi

echo "✨ Database initialization completed"

# Execute the container command (CMD) so the server keeps running after initialization
# This makes the entrypoint script behave like a proper wrapper and starts `node server.js`
exec "$@"
