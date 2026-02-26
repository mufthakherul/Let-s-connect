FROM node:18-alpine

# Build context is ./services/
# This allows access to shared utilities via COPY

WORKDIR /services/content-service

# Install dependencies first for layer caching
COPY content-service/package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy shared utilities (needed by this service)
COPY shared/ /services/shared/

# Copy service source
COPY --chown=node:node content-service/ ./

ENV PORT=8002

USER node

EXPOSE 8002

CMD ["node", "server.js"]
