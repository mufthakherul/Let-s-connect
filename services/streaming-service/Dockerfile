FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# ensure peer dependency conflicts don't abort the build
RUN npm install --production --legacy-peer-deps

COPY . .

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8009

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
