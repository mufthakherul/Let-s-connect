#!/bin/sh
set -e

# Docker entrypoint for frontend supporting both development and production modes

echo "================================================"
echo "Frontend Docker Entrypoint"
echo "================================================"
echo "NODE_ENV: $NODE_ENV"
echo "GENERATE_SOURCEMAP: $GENERATE_SOURCEMAP"
echo "PATH: $PATH"
echo "Current directory: $(pwd)"
echo "================================================"

if [ "$NODE_ENV" = "development" ]; then
  echo ""
  echo "[Frontend] 🚀 Starting in DEVELOPMENT mode"
  echo "[Frontend] ✓ Hot reload enabled"
  echo "[Frontend] ✓ Source maps enabled"
  echo "[Frontend] ✓ Available at http://localhost:3000"
  echo ""
  echo "Starting React dev server..."
  exec npm start
else
  echo ""
  echo "[Frontend] 📦 Starting in PRODUCTION mode"
  echo "[Frontend] Building optimized bundle..."
  npm run build
  echo "[Frontend] ✓ Build complete"
  echo "[Frontend] Starting Nginx server..."
  exec nginx -g "daemon off;"
fi
