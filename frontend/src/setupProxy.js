const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // proxy all /api requests to the backend - the target may be overridden by
  // REACT_APP_API_PROXY in development if you need to point at a different host.
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_PROXY || 'http://localhost:8000',
      changeOrigin: true,
      ws: true,
    })
  );
};
