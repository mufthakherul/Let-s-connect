FROM node:18-alpine

WORKDIR /app

# Accept build-time environment variables
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV NODE_OPTIONS=--max_old_space_size=1536
ENV DISABLE_ESLINT_PLUGIN=true

# Development mode: Enable source maps; Production: Disable
ENV GENERATE_SOURCEMAP=${GENERATE_SOURCEMAP:-false}

COPY package*.json ./

RUN npm install

COPY . .

# Install Nginx for production mode
RUN apk add --no-cache nginx

# Copy Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

# Entrypoint determines whether to run dev server or production build + Nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
