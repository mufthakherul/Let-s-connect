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

# Check if seed should be run
if [ "$RUN_SEED" = "true" ]; then
  echo "🌾 Running database seed..."
  cd /app
  node seed.js
  echo "✅ Seed completed"
else
  echo "ℹ️  Seed skipped (set RUN_SEED=true to enable)"
fi

echo "✨ Database initialization completed"
