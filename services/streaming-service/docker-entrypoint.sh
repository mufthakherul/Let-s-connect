#!/bin/sh

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

# Determine canonical seeding mode with backward compatibility
# Canonical modes: skip | minimal | full | fast
RAW_SEED_MODE="$SEED_MODE"

if [ -z "$RAW_SEED_MODE" ]; then
  if [ "$USE_FULL_SEED" = "true" ]; then
    RAW_SEED_MODE="full"
  else
    RAW_SEED_MODE="minimal"
  fi
fi

case "$(echo "$RAW_SEED_MODE" | tr '[:upper:]' '[:lower:]')" in
  skip)
    NORMALIZED_SEED_MODE="skip"
    ;;
  minimal)
    NORMALIZED_SEED_MODE="minimal"
    ;;
  full)
    NORMALIZED_SEED_MODE="full"
    ;;
  fast)
    NORMALIZED_SEED_MODE="fast"
    ;;
  *)
    echo "⚠️  Unknown SEED_MODE='$RAW_SEED_MODE'. Falling back to 'minimal'"
    NORMALIZED_SEED_MODE="minimal"
    ;;
esac

SEED_SCRIPT=""
case "$NORMALIZED_SEED_MODE" in
  skip)
    SEED_SCRIPT="(none)"
    ;;
  minimal)
    SEED_SCRIPT="seed-fast.js"
    ;;
  full|fast)
    SEED_SCRIPT="seed.js"
    ;;
esac

export SEED_MODE="$NORMALIZED_SEED_MODE"

echo "ℹ️  Seeding mode (raw): ${RAW_SEED_MODE}"
echo "ℹ️  Seeding mode (normalized): ${SEED_MODE}"
echo "ℹ️  Seeding script selected: ${SEED_SCRIPT}"

# Check if seed should be run
if [ "$RUN_SEED" = "false" ]; then
  echo "⏭️  Seed explicitly skipped (RUN_SEED=false)"
elif [ "$SEED_MODE" = "skip" ]; then
  echo "⏭️  Seed skipped (SEED_MODE=skip)"
elif [ "$RUN_SEED" = "true" ]; then
  echo "🌾 Running database seed (mode: $SEED_MODE, script: $SEED_SCRIPT)..."
  cd /app
  node $SEED_SCRIPT
  echo "✅ Seed completed"
else
  # Default behavior: run canonical mode with selected script
  echo "🚀 Running database seed (default behavior)..."
  echo "   Set RUN_SEED=false to skip entirely"
  echo "   Canonical SEED_MODE values: skip|minimal|full|fast"
  echo "   Backward compat: USE_FULL_SEED=true only applies when SEED_MODE is unset"
  cd /app
  node $SEED_SCRIPT
  echo "✅ Seed completed"
fi

echo "✨ Database initialization completed"

# Execute the container command (CMD) so the server keeps running after initialization
# This makes the entrypoint script behave like a proper wrapper and starts `node server.js`
exec "$@"
