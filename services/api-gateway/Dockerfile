FROM node:18-alpine

WORKDIR /services/api-gateway

COPY api-gateway/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --production --legacy-peer-deps || npm install --production --legacy-peer-deps; else npm install --production --legacy-peer-deps; fi

COPY shared/ /services/shared/

COPY --chown=node:node api-gateway/ ./

ENV PORT=8000

USER node

EXPOSE 8000

CMD ["node", "server.js"]
ENV NODE_PATH=./node_modules
