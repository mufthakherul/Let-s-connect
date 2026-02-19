FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8009

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
