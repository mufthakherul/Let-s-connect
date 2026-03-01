FROM node:18-alpine

ENV PORT=8006

WORKDIR /services/shop-service

# Install dependencies
COPY shop-service/package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy shared modules and service source
COPY shared/ /services/shared/
COPY --chown=node:node shop-service/ ./

# Use non-root user
USER node

EXPOSE 8006

CMD ["node", "server.js"]
ENV NODE_PATH=./node_modules
