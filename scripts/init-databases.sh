#!/usr/bin/env sh
set -e

APP_DB_USER="${APP_DB_USER:-app_user}"
APP_DB_PASSWORD="${APP_DB_PASSWORD:-change-me-now}"

echo "[Init] Ensuring least-privilege application role exists: ${APP_DB_USER}"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
DO
\$\$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_catalog.pg_roles
    WHERE rolname = '${APP_DB_USER}') THEN
    CREATE ROLE ${APP_DB_USER} LOGIN PASSWORD '${APP_DB_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
\$\$;
EOSQL

# Create multiple databases in PostgreSQL (idempotent)
# Create multiple databases in PostgreSQL (idempotent)
# Note: 'admin' is the default DB name used via ADMIN_DB_URL (see .env.example).
# 'milonexa_admin' is the fallback default in security-service/server.js when
# ADMIN_DB_URL is not set. Both are created for compatibility across deployments.
for db in users content messages collaboration media shop webhooks streaming admin milonexa_admin; do
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

  echo "[Init] Applying least-privilege grants on ${db} for ${APP_DB_USER}"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "${db}" <<-EOSQL
GRANT CONNECT ON DATABASE ${db} TO ${APP_DB_USER};
GRANT USAGE, CREATE ON SCHEMA public TO ${APP_DB_USER};

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON ALL TABLES IN SCHEMA public TO ${APP_DB_USER};

GRANT USAGE, SELECT, UPDATE
ON ALL SEQUENCES IN SCHEMA public TO ${APP_DB_USER};

GRANT EXECUTE
ON ALL FUNCTIONS IN SCHEMA public TO ${APP_DB_USER};

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO ${APP_DB_USER};

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${APP_DB_USER};

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT EXECUTE ON FUNCTIONS TO ${APP_DB_USER};
EOSQL
done

echo "[Init] Database initialization completed successfully."
