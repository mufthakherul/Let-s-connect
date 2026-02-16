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
  if npm run build; then
    echo "[Frontend] ✓ Build complete"

    BUILD_DIR="$(pwd)/build"
    if [ -d "$BUILD_DIR" ]; then
      echo "[Frontend] Copying build to Nginx html directory..."
      rm -rf /usr/share/nginx/html/* || true
      cp -a "$BUILD_DIR/." /usr/share/nginx/html/
      chown -R nginx:nginx /usr/share/nginx/html || true
      echo "[Frontend] ✓ Static files placed in /usr/share/nginx/html"
    else
      echo "[Frontend] ⚠️ Build directory not found at $BUILD_DIR — Nginx may return 500"
    fi

    echo "[Frontend] Starting Nginx server..."
    exec nginx -g "daemon off;"
  else
    echo "[Frontend] ✖ Build failed — aborting container start"
    exit 1
  fi
fi
