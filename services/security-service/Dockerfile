FROM node:18-alpine

WORKDIR /app

COPY security-service/package*.json ./

RUN npm install

COPY shared/ ../shared/
COPY security-service/ .

EXPOSE 9101

CMD ["npm", "start"]