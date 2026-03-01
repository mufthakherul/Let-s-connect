FROM node:18-alpine

ENV PORT=8009

WORKDIR /services/streaming-service

# Install dependencies
COPY streaming-service/package*.json ./
RUN npm install --production --legacy-peer-deps

# Shared modules required by service imports (e.g., ../shared/*)
COPY shared/ /services/shared/

# Copy source and set ownership for non-root user
COPY --chown=node:node streaming-service/ ./

# Fix line endings and permissions for entrypoint
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

# Use non-root user
USER node

EXPOSE 8009

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
ENV NODE_PATH=./node_modules
