/**
 * Route Governance Middleware
 * Workstream D2: Route governance integration
 * 
 * Applies route-level policies from route-registry.js:
 * - Route classification and authentication guards
 * - SLA-appropriate timeouts
 * - Deprecation warnings
 * - Route ownership metadata
 */

const { 
  routeRegistry, 
  getRouteConfig, 
  requiresAuth, 
  ROUTE_CLASSES,
  SLA_TIERS,
  getRateLimitPolicy 
} = require('./route-registry');
const { getServiceTimeout } = require('./resilience-config');
const logger = require('../shared/logger');

/**
 * Route governance middleware - adds metadata and applies policies
 */
function routeGovernanceMiddleware(req, res, next) {
  const path = req.path;
  const method = req.method;
  
  // Find matching route from registry
  const routeConfig = getRouteConfig(path, method);
  
  if (routeConfig) {
    // Attach route metadata to request
    req.routeConfig = routeConfig;
    req.routeClass = routeConfig.class;
    req.routeSLA = routeConfig.sla;
    req.routeOwner = routeConfig.owner;
    req.routeVersion = routeConfig.version;
    
    // Add response headers
    res.setHeader('X-Route-Class', routeConfig.class);
    res.setHeader('X-Route-SLA', routeConfig.sla);
    res.setHeader('X-Route-Owner', routeConfig.owner);
    res.setHeader('X-API-Version', routeConfig.version);
    
    // Add deprecation warning
    if (routeConfig.deprecated) {
      res.setHeader('X-API-Deprecation', 'true');
      res.setHeader('Warning', '299 - "This endpoint is deprecated and will be removed in a future version"');
      
      if (routeConfig.sunsetDate) {
        res.setHeader('Sunset', routeConfig.sunsetDate);
      }
      
      logger.warn('Deprecated route accessed', {
        path: req.path,
        method: req.method,
        route: routeConfig.path,
        requestId: req.id
      });
    }
    
    // Log route access with classification
    if (process.env.LOG_LEVEL === 'debug') {
      logger.debug('Route accessed', {
        path: req.path,
        method: req.method,
        class: routeConfig.class,
        sla: routeConfig.sla,
        owner: routeConfig.owner,
        requestId: req.id
      });
    }
  } else {
    // Route not in registry - log warning
    logger.warn('Unregistered route accessed', {
      path: req.path,
      method: req.method,
      requestId: req.id
    });
  }
  
  next();
}

/**
 * Enhanced authentication middleware using route classifications
 */
function classificationAuthMiddleware(req, res, next) {
  const routeConfig = req.routeConfig;
  
  // If no route config, let existing guards handle it
  if (!routeConfig) {
    return next();
  }
  
  // PUBLIC routes - no auth required
  if (routeConfig.class === ROUTE_CLASSES.PUBLIC) {
    return next();
  }
  
  // All other routes require authentication
  if (!requiresAuth(routeConfig.path, req.method)) {
    return next();
  }
  
  // Check for auth token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication required for this endpoint',
        routeClass: routeConfig.class,
        trace: {
          requestId: req.id,
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method
        }
      }
    });
  }
  
  // ADMIN routes require admin role
  if (routeConfig.class === ROUTE_CLASSES.ADMIN) {
    const isAdmin = req.headers['x-user-is-admin'] === 'true' || 
                    req.user?.isAdmin === true || 
                    req.user?.role === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Admin access required for this endpoint',
          routeClass: routeConfig.class,
          trace: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
            path: req.path,
            method: req.method
          }
        }
      });
    }
  }
  
  next();
}

/**
 * Get timeout for route based on SLA tier
 */
function getRouteTimeout(routeConfig, serviceName) {
  if (!routeConfig) {
    return getServiceTimeout(serviceName);
  }
  
  // Use SLA-based timeout mapping
  const slaTimeouts = {
    [SLA_TIERS.CRITICAL]: 5000,   // 5s for critical endpoints
    [SLA_TIERS.STANDARD]: 30000,  // 30s for standard endpoints
    [SLA_TIERS.BEST_EFFORT]: 60000 // 60s for best effort endpoints
  };
  
  return slaTimeouts[routeConfig.sla] || getServiceTimeout(serviceName);
}

/**
 * Dynamic rate limiter selector based on route classification
 */
function selectRateLimiter(routeConfig, limiters) {
  if (!routeConfig || !limiters) {
    return null;
  }
  
  const policy = getRateLimitPolicy(routeConfig.class);
  
  // Map to existing rate limiters
  const limiterMap = {
    [ROUTE_CLASSES.PUBLIC]: limiters.global,
    [ROUTE_CLASSES.AUTHENTICATED]: limiters.user,
    [ROUTE_CLASSES.ADMIN]: limiters.admin,
    [ROUTE_CLASSES.INTERNAL]: null // No limiting for internal
  };
  
  return limiterMap[routeConfig.class];
}

/**
 * Generate route statistics for monitoring
 */
function generateRouteStats() {
  const stats = {
    totalRoutes: routeRegistry.length,
    byClass: {},
    bySLA: {},
    byService: {},
    byVersion: {},
    deprecated: 0
  };
  
  routeRegistry.forEach(route => {
    // By classification
    stats.byClass[route.class] = (stats.byClass[route.class] || 0) + 1;
    
    // By SLA
    stats.bySLA[route.sla] = (stats.bySLA[route.sla] || 0) + 1;
    
    // By service
    stats.byService[route.service] = (stats.byService[route.service] || 0) + 1;
    
    // By version
    stats.byVersion[route.version] = (stats.byVersion[route.version] || 0) + 1;
    
    // Deprecated count
    if (route.deprecated) {
      stats.deprecated++;
    }
  });
  
  return stats;
}

/**
 * Route registry endpoint for debugging/monitoring
 */
function routeRegistryHandler(req, res) {
  const includeDeprecated = req.query.includeDeprecated === 'true';
  const service = req.query.service;
  const classification = req.query.class;
  
  let routes = [...routeRegistry];
  
  // Filter deprecated
  if (!includeDeprecated) {
    routes = routes.filter(r => !r.deprecated);
  }
  
  // Filter by service
  if (service) {
    routes = routes.filter(r => r.service === service);
  }
  
  // Filter by classification
  if (classification) {
    routes = routes.filter(r => r.class === classification);
  }
  
  res.json({
    success: true,
    data: {
      routes: routes.map(r => ({
        path: r.path,
        methods: r.methods,
        service: r.service,
        class: r.class,
        sla: r.sla,
        version: r.version,
        owner: r.owner,
        description: r.description,
        deprecated: r.deprecated || false,
        contract: r.contract
      })),
      stats: generateRouteStats()
    },
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Route ownership endpoint - shows who owns each service
 */
function routeOwnershipHandler(req, res) {
  const ownershipMap = {};
  
  routeRegistry.forEach(route => {
    if (!ownershipMap[route.service]) {
      ownershipMap[route.service] = {
        owner: route.owner,
        routes: [],
        slaBreakdown: {}
      };
    }
    
    ownershipMap[route.service].routes.push({
      path: route.path,
      methods: route.methods,
      sla: route.sla,
      deprecated: route.deprecated || false
    });
    
    // SLA breakdown
    const sla = route.sla;
    ownershipMap[route.service].slaBreakdown[sla] = 
      (ownershipMap[route.service].slaBreakdown[sla] || 0) + 1;
  });
  
  res.json({
    success: true,
    data: {
      services: ownershipMap,
      summary: {
        totalServices: Object.keys(ownershipMap).length,
        totalRoutes: routeRegistry.length
      }
    },
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString()
    }
  });
}

module.exports = {
  routeGovernanceMiddleware,
  classificationAuthMiddleware,
  getRouteTimeout,
  selectRateLimiter,
  generateRouteStats,
  routeRegistryHandler,
  routeOwnershipHandler
};
