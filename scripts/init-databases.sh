#!/bin/bash
set -e

# Create multiple databases in PostgreSQL
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE users;
    CREATE DATABASE content;
    CREATE DATABASE messages;
    CREATE DATABASE collaboration;
    CREATE DATABASE media;
    CREATE DATABASE shop;
    CREATE DATABASE webhooks;
    CREATE DATABASE streaming;
EOSQL
