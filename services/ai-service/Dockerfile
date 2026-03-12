FROM node:18-alpine

ENV PORT=8007

# Build context is ./services/
# This allows access to shared utilities via COPY

WORKDIR /services/ai-service

# Install dependencies
COPY ai-service/package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy shared utilities (needed by this service)
COPY shared/ /services/shared/

# Copy source and set ownership for non-root user
COPY --chown=node:node ai-service/ ./

# Use non-root user
USER node

EXPOSE 8007

CMD ["node", "server.js"]
ENV NODE_PATH=./node_modules
