FROM node:18-alpine

ENV PORT=8003

WORKDIR /services/messaging-service

# Install dependencies
COPY messaging-service/package*.json ./
# use npm ci with lockfile for reproducible builds, but fall back to npm install if lockfile is out of sync
RUN if [ -f package-lock.json ]; then npm ci --production --legacy-peer-deps || npm install --production --legacy-peer-deps; else npm install --production --legacy-peer-deps; fi

# Shared modules required by service imports (e.g., ../shared/*)
COPY shared/ /services/shared/

# Copy source and set ownership for non-root user
COPY --chown=node:node messaging-service/ ./

# Use non-root user
USER node

EXPOSE 8003

CMD ["node", "server.js"]
ENV NODE_PATH=./node_modules
