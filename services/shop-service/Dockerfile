FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# ensure peer dependency conflicts don't abort the build
RUN npm install --production --legacy-peer-deps

COPY . .

EXPOSE 8006

CMD ["node", "server.js"]
