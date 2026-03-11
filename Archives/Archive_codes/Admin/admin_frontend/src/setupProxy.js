const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');

module.exports = function (app) {
  const isDocker = fs.existsSync('/.dockerenv');
  const target =
    process.env.REACT_APP_API_PROXY ||
    (isDocker ? 'http://api-gateway:8000' : 'http://localhost:8000');

  // proxy all /api requests to the backend - the target may be overridden by
  // REACT_APP_API_PROXY in development if you need to point at a different host.
  app.use(
    createProxyMiddleware('/api', {
      target,
      changeOrigin: true,
      ws: false,
    })
  );
};
