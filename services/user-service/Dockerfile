FROM node:18-alpine

# Build context is ./services/
# This allows access to shared utilities via COPY

WORKDIR /services/user-service

# Install dependencies first for layer caching
COPY user-service/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --production --legacy-peer-deps || npm install --production --legacy-peer-deps; else npm install --production --legacy-peer-deps; fi

# Copy shared utilities (needed by this service)
COPY shared/ /services/shared/

# Copy service source
COPY --chown=node:node user-service/ ./

ENV PORT=8001

USER node

EXPOSE 8001

CMD ["node", "server.js"]
ENV NODE_PATH=./node_modules
