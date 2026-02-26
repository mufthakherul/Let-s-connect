FROM node:18-alpine

# Build context is ./services/
# This allows access to shared utilities via COPY

WORKDIR /services/media-service

# Install dependencies first for layer caching
COPY media-service/package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy shared utilities (needed by this service)
COPY shared/ /services/shared/

# Copy service source
COPY --chown=node:node media-service/ ./

ENV PORT=8005

USER node

EXPOSE 8005

CMD ["node", "server.js"]
