#!/usr/bin/env sh
set -e

# Create multiple databases in PostgreSQL (idempotent)
for db in users content messages collaboration media shop webhooks streaming; do
  echo "Ensuring database exists: ${db}"
  if ! psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'" | grep -q 1; then
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -c "CREATE DATABASE \"${db}\""
  fi
done
