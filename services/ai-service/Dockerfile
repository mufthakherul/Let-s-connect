FROM node:18-alpine

ENV PORT=8007

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy source and set ownership for non-root user
COPY --chown=node:node . .

# Use non-root user
USER node

EXPOSE 8007

CMD ["node", "server.js"]
