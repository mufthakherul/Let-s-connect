#!/bin/sh
set -e

# Docker entrypoint for frontend supporting both development and production modes

if [ "$NODE_ENV" = "development" ]; then
  echo "[Frontend] Starting in DEVELOPMENT mode with hot reload..."
  echo "[Frontend] React dev server will be available at http://localhost:3000"
  exec npm start
else
  echo "[Frontend] Starting in PRODUCTION mode..."
  echo "[Frontend] Building optimized production bundle..."
  npm run build
  echo "[Frontend] Starting Nginx server..."
  exec nginx -g "daemon off;"
fi
