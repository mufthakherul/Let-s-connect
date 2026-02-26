FROM node:18-alpine

# Build context is ./services/
# This allows access to shared utilities via COPY

WORKDIR /services/content-service

# Install dependencies first for layer caching
COPY content-service/package*.json ./
# use npm ci when lockfile exists for reproducible installs; fallback to npm install on errors
RUN if [ -f package-lock.json ]; then npm ci --production --legacy-peer-deps || npm install --production --legacy-peer-deps; else npm install --production --legacy-peer-deps; fi

# Copy shared utilities (needed by this service)
COPY shared/ /services/shared/

# Copy service source
COPY --chown=node:node content-service/ ./

ENV PORT=8002

USER node

EXPOSE 8002

CMD ["node", "server.js"]
