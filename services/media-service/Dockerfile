FROM node:18-alpine

# Build context is ./services/
# This allows access to shared utilities via COPY

WORKDIR /services/media-service

# Install dependencies first for layer caching
COPY media-service/package*.json ./
# use npm ci when lockfile exists for reproducible installs; fallback to npm install if ci fails
RUN if [ -f package-lock.json ]; then npm ci --production --legacy-peer-deps || npm install --production --legacy-peer-deps; else npm install --production --legacy-peer-deps; fi

# Copy shared utilities (needed by this service)
COPY shared/ /services/shared/
# install shared dependencies to ensure logger works
RUN cd /services/shared && npm install --production --legacy-peer-deps

# Copy service source
COPY --chown=node:node media-service/ ./

ENV PORT=8005

USER node

EXPOSE 8005

CMD ["node", "server.js"]
