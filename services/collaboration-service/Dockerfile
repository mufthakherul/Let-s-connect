FROM node:18-alpine

ENV PORT=8004

WORKDIR /services/collaboration-service

# Install dependencies
COPY collaboration-service/package*.json ./
RUN npm install --production --legacy-peer-deps

# Shared modules required by service imports (e.g., ../shared/*)
COPY shared/ /services/shared/

# Copy source and set ownership for non-root user
COPY --chown=node:node collaboration-service/ ./

# Use non-root user
USER node

EXPOSE 8004

CMD ["node", "server.js"]
ENV NODE_PATH=./node_modules
