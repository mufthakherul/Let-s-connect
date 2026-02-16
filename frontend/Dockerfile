FROM node:18-alpine

WORKDIR /app

# Accept build-time environment variables
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV NODE_OPTIONS=--max_old_space_size=1536
ENV DISABLE_ESLINT_PLUGIN=true

# Set Node environment - can be overridden at runtime
# Default to production, can be set to development via docker-compose environment or run command
ENV NODE_ENV=${NODE_ENV:-production}
ENV GENERATE_SOURCEMAP=${GENERATE_SOURCEMAP:-false}

COPY package*.json ./

# Always install all dependencies (including devDependencies) during build
# The NODE_ENV variable will be used at runtime to decide dev vs prod mode
RUN NODE_ENV= npm install

COPY . .

# Install Nginx for production mode
RUN apk add --no-cache nginx

# Copy Nginx config
# On Alpine's nginx package the conf files with `server {}` blocks must go
# into /etc/nginx/http.d/ (conf.d/ is included at the global/root context).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script and make it executable
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh && \
    # Verify script exists and is executable
    ls -la /docker-entrypoint.sh

EXPOSE 3000

# Entrypoint determines whether to run dev server or production build + Nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
