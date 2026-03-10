/**
 * API Gateway Route Registry and Policy Configuration
 * Workstream D1 & D2: Policy hardening and route governance
 * 
 * Defines:
 * - Route classifications (public, authenticated, admin)
 * - Rate limiting policies per route class
 * - API versioning strategy
 * - Route ownership and SLA metadata
 * - Contract publication tracking
 */

/**
 * Route Classification Schema
 * 
 * - PUBLIC: No authentication required, strict rate limits
 * - AUTHENTICATED: JWT required, standard rate limits
 * - ADMIN: Admin privileges required, relaxed limits but audit logged
 * - INTERNAL: Service-to-service only, requires internal token
 */
const ROUTE_CLASSES = {
    PUBLIC: 'public',
    AUTHENTICATED: 'authenticated',
    ADMIN: 'admin',
    INTERNAL: 'internal'
};

/**
 * SLA Tiers
 * Defines expected performance and availability characteristics
 */
const SLA_TIERS = {
    CRITICAL: 'critical',      // 99.9% uptime, p95 < 200ms
    STANDARD: 'standard',      // 99.5% uptime, p95 < 500ms
    BEST_EFFORT: 'best-effort' // No SLA, p95 < 2000ms
};

/**
 * Rate Limiting Policies by Route Class
 * windowMs: time window in milliseconds
 * max: maximum requests per window per IP
 * skipSuccessfulRequests: don't count successful requests against limit
 */
const rateLimitPolicies = {
    [ROUTE_CLASSES.PUBLIC]: {
        windowMs: 15 * 60 * 1000,           // 15 minutes
        max: 100,                            // 100 requests per 15 min
        skipSuccessfulRequests: false,
        standardHeaders: true,
        legacyHeaders: false,
        message: 'Too many requests from this IP, please try again later'
    },
    [ROUTE_CLASSES.AUTHENTICATED]: {
        windowMs: 15 * 60 * 1000,           // 15 minutes
        max: 500,                            // 500 requests per 15 min
        skipSuccessfulRequests: false,
        standardHeaders: true,
        legacyHeaders: false,
        message: 'Rate limit exceeded, please slow down'
    },
    [ROUTE_CLASSES.ADMIN]: {
        windowMs: 15 * 60 * 1000,           // 15 minutes
        max: 1000,                           // 1000 requests per 15 min
        skipSuccessfulRequests: false,
        standardHeaders: true,
        legacyHeaders: false,
        message: 'Admin rate limit exceeded'
    },
    [ROUTE_CLASSES.INTERNAL]: {
        windowMs: 60 * 1000,                // 1 minute
        max: 10000,                          // Very high limit for service-to-service
        skipSuccessfulRequests: true,
        standardHeaders: true,
        legacyHeaders: false,
        message: 'Internal service rate limit exceeded'
    }
};

/**
 * API Version Lifecycle Policy
 * 
 * Rules:
 * - v1 is current stable version
 * - v2 is in beta/next
 * - Deprecated versions remain available for 6 months with warnings
 * - Sunset versions return 410 Gone
 */
const apiVersions = {
    v1: {
        version: 'v1',
        status: 'stable',
        introduced: '2024-01-01',
        deprecated: null,
        sunset: null,
        supportedUntil: null,
        breaking: false,
        notes: 'Current stable API version'
    },
    v2: {
        version: 'v2',
        status: 'beta',
        introduced: '2026-03-10',
        deprecated: null,
        sunset: null,
        supportedUntil: null,
        breaking: true,
        notes: 'Next generation API with enhanced contracts'
    }
};

/**
 * Route Registry
 * Central source of truth for all gateway routes
 * 
 * Each entry defines:
 * - path: route path pattern
 * - service: target backend service
 * - class: route classification (public/authenticated/admin/internal)
 * - sla: SLA tier (critical/standard/best-effort)
 * - version: API version (v1, v2)
 * - owner: team/service responsible for this route
 * - description: human-readable description
 * - methods: allowed HTTP methods
 * - deprecated: deprecation status
 * - requiresAuth: boolean (derived from class)
 * - rateLimit: rate limit policy (derived from class)
 */
const routeRegistry = [
    // User Service Routes
    {
        path: '/user/register',
        service: 'user-service',
        class: ROUTE_CLASSES.PUBLIC,
        sla: SLA_TIERS.CRITICAL,
        version: 'v1',
        owner: 'user-team',
        description: 'User registration endpoint',
        methods: ['POST'],
        deprecated: false,
        contract: 'contracts/user-service/register.yaml'
    },
    {
        path: '/user/login',
        service: 'user-service',
        class: ROUTE_CLASSES.PUBLIC,
        sla: SLA_TIERS.CRITICAL,
        version: 'v1',
        owner: 'user-team',
        description: 'User login endpoint',
        methods: ['POST'],
        deprecated: false,
        contract: 'contracts/user-service/login.yaml'
    },
    {
        path: '/user/profile',
        service: 'user-service',
        class: ROUTE_CLASSES.AUTHENTICATED,
        sla: SLA_TIERS.STANDARD,
        version: 'v1',
        owner: 'user-team',
        description: 'Get/update user profile',
        methods: ['GET', 'PUT', 'PATCH'],
        deprecated: false,
        contract: 'contracts/user-service/profile.yaml'
    },
    {
        path: '/user/admin/*',
        service: 'user-service',
        class: ROUTE_CLASSES.ADMIN,
        sla: SLA_TIERS.STANDARD,
        version: 'v1',
        owner: 'user-team',
        description: 'Admin user management endpoints',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        deprecated: false,
        contract: 'contracts/user-service/admin.yaml'
    },

    // Content Service Routes
    {
        path: '/content/posts',
        service: 'content-service',
        class: ROUTE_CLASSES.PUBLIC,
        sla: SLA_TIERS.STANDARD,
        version: 'v1',
        owner: 'content-team',
        description: 'List public posts',
        methods: ['GET'],
        deprecated: false,
        contract: 'contracts/content-service/posts.yaml'
    },
    {
        path: '/content/posts',
        service: 'content-service',
        class: ROUTE_CLASSES.AUTHENTICATED,
        sla: SLA_TIERS.STANDARD,
        version: 'v1',
        owner: 'content-team',
        description: 'Create post',
        methods: ['POST'],
        deprecated: false,
        contract: 'contracts/content-service/posts.yaml'
    },
    {
        path: '/content/posts/:id',
        service: 'content-service',
        class: ROUTE_CLASSES.PUBLIC,
        sla: SLA_TIERS.STANDARD,
        version: 'v1',
        owner: 'content-team',
        description: 'Get specific post',
        methods: ['GET'],
        deprecated: false,
        contract: 'contracts/content-service/post-detail.yaml'
    },
    {
        path: '/content/moderate',
        service: 'content-service',
        class: ROUTE_CLASSES.ADMIN,
        sla: SLA_TIERS.STANDARD,
        version: 'v1',
        owner: 'content-team',
        description: 'Content moderation endpoints',
        methods: ['GET', 'POST', 'PUT'],
        deprecated: false,
        contract: 'contracts/content-service/moderation.yaml'
    },

    // Messaging Service Routes
    {
        path: '/messaging/conversations',
        service: 'messaging-service',
        class: ROUTE_CLASSES.AUTHENTICATED,
        sla: SLA_TIERS.STANDARD,
        version: 'v1',
        owner: 'messaging-team',
        description: 'List user conversations',
        methods: ['GET'],
        deprecated: false,
        contract: 'contracts/messaging-service/conversations.yaml'
    },
    {
        path: '/messaging/messages',
        service: 'messaging-service',
        class: ROUTE_CLASSES.AUTHENTICATED,
        sla: SLA_TIERS.CRITICAL,
        version: 'v1',
        owner: 'messaging-team',
        description: 'Send/receive messages',
        methods: ['GET', 'POST'],
        deprecated: false,
        contract: 'contracts/messaging-service/messages.yaml'
    },

    // Media Service Routes
    {
        path: '/media/upload',
        service: 'media-service',
        class: ROUTE_CLASSES.AUTHENTICATED,
        sla: SLA_TIERS.BEST_EFFORT,
        version: 'v1',
        owner: 'media-team',
        description: 'Upload media files',
        methods: ['POST'],
        deprecated: false,
        contract: 'contracts/media-service/upload.yaml'
    },
    {
        path: '/media/files',
        service: 'media-service',
        class: ROUTE_CLASSES.PUBLIC,
        sla: SLA_TIERS.STANDARD,
        version: 'v1',
        owner: 'media-team',
        description: 'Access media files',
        methods: ['GET'],
        deprecated: false,
        contract: 'contracts/media-service/files.yaml'
    },

    // Shop Service Routes
    {
        path: '/shop/products',
        service: 'shop-service',
        class: ROUTE_CLASSES.PUBLIC,
        sla: SLA_TIERS.STANDARD,
        version: 'v1',
        owner: 'commerce-team',
        description: 'List products',
        methods: ['GET'],
        deprecated: false,
        contract: 'contracts/shop-service/products.yaml'
    },
    {
        path: '/shop/cart',
        service: 'shop-service',
        class: ROUTE_CLASSES.AUTHENTICATED,
        sla: SLA_TIERS.CRITICAL,
        version: 'v1',
        owner: 'commerce-team',
        description: 'Shopping cart operations',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        deprecated: false,
        contract: 'contracts/shop-service/cart.yaml'
    },
    {
        path: '/shop/orders',
        service: 'shop-service',
        class: ROUTE_CLASSES.AUTHENTICATED,
        sla: SLA_TIERS.CRITICAL,
        version: 'v1',
        owner: 'commerce-team',
        description: 'Order management',
        methods: ['GET', 'POST'],
        deprecated: false,
        contract: 'contracts/shop-service/orders.yaml'
    },

    // AI Service Routes
    {
        path: '/ai/chat',
        service: 'ai-service',
        class: ROUTE_CLASSES.AUTHENTICATED,
        sla: SLA_TIERS.BEST_EFFORT,
        version: 'v1',
        owner: 'ai-team',
        description: 'AI chat/completion endpoint',
        methods: ['POST'],
        deprecated: false,
        contract: 'contracts/ai-service/chat.yaml'
    },

    // Collaboration Service Routes
    {
        path: '/collaboration/documents',
        service: 'collaboration-service',
        class: ROUTE_CLASSES.AUTHENTICATED,
        sla: SLA_TIERS.STANDARD,
        version: 'v1',
        owner: 'collaboration-team',
        description: 'Document management',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        deprecated: false,
        contract: 'contracts/collaboration-service/documents.yaml'
    },

    // Streaming Service Routes
    {
        path: '/streaming/live',
        service: 'streaming-service',
        class: ROUTE_CLASSES.PUBLIC,
        sla: SLA_TIERS.STANDARD,
        version: 'v1',
        owner: 'streaming-team',
        description: 'Live streaming endpoints',
        methods: ['GET'],
        deprecated: false,
        contract: 'contracts/streaming-service/live.yaml'
    },

    // Internal Health/Monitoring Routes
    {
        path: '/health',
        service: 'internal',
        class: ROUTE_CLASSES.PUBLIC,
        sla: SLA_TIERS.CRITICAL,
        version: 'v1',
        owner: 'platform-team',
        description: 'Gateway health check',
        methods: ['GET'],
        deprecated: false,
        contract: null
    },
    {
        path: '/metrics',
        service: 'internal',
        class: ROUTE_CLASSES.INTERNAL,
        sla: SLA_TIERS.CRITICAL,
        version: 'v1',
        owner: 'platform-team',
        description: 'Prometheus metrics endpoint',
        methods: ['GET'],
        deprecated: false,
        contract: null
    }
];

/**
 * Helper: Get route config by path and method
 */
function getRouteConfig(path, method) {
    return routeRegistry.find(route => {
        const pathMatch = route.path === path || 
                          (route.path.includes('*') && path.startsWith(route.path.replace('*', '')));
        const methodMatch = route.methods.includes(method.toUpperCase());
        return pathMatch && methodMatch;
    });
}

/**
 * Helper: Get rate limit policy for a route
 */
function getRateLimitPolicy(routeClass) {
    return rateLimitPolicies[routeClass] || rateLimitPolicies[ROUTE_CLASSES.PUBLIC];
}

/**
 * Helper: Check if route requires authentication
 */
function requiresAuth(routeClass) {
    return routeClass === ROUTE_CLASSES.AUTHENTICATED || 
           routeClass === ROUTE_CLASSES.ADMIN;
}

/**
 * Helper: Get all routes for a service
 */
function getServiceRoutes(serviceName) {
    return routeRegistry.filter(route => route.service === serviceName);
}

/**
 * Helper: Get routes by class
 */
function getRoutesByClass(routeClass) {
    return routeRegistry.filter(route => route.class === routeClass);
}

/**
 * Helper: Get routes by SLA tier
 */
function getRoutesBySLA(slaTier) {
    return routeRegistry.filter(route => route.sla === slaTier);
}

/**
 * Helper: Get deprecated routes
 */
function getDeprecatedRoutes() {
    return routeRegistry.filter(route => route.deprecated);
}

/**
 * Export route statistics
 */
function getRouteStats() {
    return {
        total: routeRegistry.length,
        byClass: {
            public: getRoutesByClass(ROUTE_CLASSES.PUBLIC).length,
            authenticated: getRoutesByClass(ROUTE_CLASSES.AUTHENTICATED).length,
            admin: getRoutesByClass(ROUTE_CLASSES.ADMIN).length,
            internal: getRoutesByClass(ROUTE_CLASSES.INTERNAL).length
        },
        bySLA: {
            critical: getRoutesBySLA(SLA_TIERS.CRITICAL).length,
            standard: getRoutesBySLA(SLA_TIERS.STANDARD).length,
            bestEffort: getRoutesBySLA(SLA_TIERS.BEST_EFFORT).length
        },
        deprecated: getDeprecatedRoutes().length,
        services: [...new Set(routeRegistry.map(r => r.service))].length
    };
}

module.exports = {
    ROUTE_CLASSES,
    SLA_TIERS,
    rateLimitPolicies,
    apiVersions,
    routeRegistry,
    getRouteConfig,
    getRateLimitPolicy,
    requiresAuth,
    getServiceRoutes,
    getRoutesByClass,
    getRoutesBySLA,
    getDeprecatedRoutes,
    getRouteStats
};
