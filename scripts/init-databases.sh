#!/usr/bin/env sh
set -e

# Create multiple databases in PostgreSQL (idempotent)
# Create multiple databases in PostgreSQL (idempotent)
for db in users content messages collaboration media shop webhooks streaming; do
  echo "[Init] Ensuring database exists: ${db}"
  if ! psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'" | grep -q 1; then
    echo "[Init] Creating database: ${db}"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -c "CREATE DATABASE \"${db}\""
    
    # Enable professional extensions
    echo "[Init] Enabling extensions for ${db}"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "${db}" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "${db}" -c "CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";"
  else
    echo "[Init] Database ${db} already exists."
  fi
done

echo "[Init] Database initialization completed successfully."
