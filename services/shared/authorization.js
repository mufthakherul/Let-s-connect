/**
 * Authorization Middleware
 * Workstream E3: Security standards
 * 
 * Provides role-based access control (RBAC) and permission checks
 * Ensures strong authorization at route/controller boundaries
 */

const { AuthorizationError } = require('./errorHandling');
const logger = require('./logger');

/**
 * User roles hierarchy
 */
const Roles = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest'
};

/**
 * Role hierarchy (higher number = more permissions)
 */
const RoleHierarchy = {
  [Roles.ADMIN]: 100,
  [Roles.MODERATOR]: 50,
  [Roles.USER]: 10,
  [Roles.GUEST]: 0
};

/**
 * Common permissions
 */
const Permissions = {
  // User management
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  USER_BAN: 'user:ban',
  
  // Content management
  CONTENT_CREATE: 'content:create',
  CONTENT_READ: 'content:read',
  CONTENT_UPDATE: 'content:update',
  CONTENT_DELETE: 'content:delete',
  CONTENT_MODERATE: 'content:moderate',
  
  // Admin actions
  ADMIN_ACCESS: 'admin:access',
  ADMIN_SETTINGS: 'admin:settings',
  ADMIN_ANALYTICS: 'admin:analytics',
  
  // Shop management
  SHOP_MANAGE: 'shop:manage',
  SHOP_ORDERS: 'shop:orders',
  
  // Moderation
  MODERATE_CONTENT: 'moderate:content',
  MODERATE_USERS: 'moderate:users',
  MODERATE_REPORTS: 'moderate:reports'
};

/**
 * Role-based permissions mapping
 */
const RolePermissions = {
  [Roles.ADMIN]: [
    // Admins have all permissions
    ...Object.values(Permissions)
  ],
  [Roles.MODERATOR]: [
    Permissions.USER_READ,
    Permissions.USER_BAN,
    Permissions.CONTENT_READ,
    Permissions.CONTENT_MODERATE,
    Permissions.MODERATE_CONTENT,
    Permissions.MODERATE_USERS,
    Permissions.MODERATE_REPORTS
  ],
  [Roles.USER]: [
    Permissions.USER_READ,
    Permissions.CONTENT_CREATE,
    Permissions.CONTENT_READ,
    Permissions.CONTENT_UPDATE, // Own content only
    Permissions.CONTENT_DELETE  // Own content only
  ],
  [Roles.GUEST]: [
    Permissions.CONTENT_READ
  ]
};

/**
 * Check if user has required role
 */
function hasRole(user, requiredRole) {
  if (!user) {
    return false;
  }
  
  const userRole = user.role || Roles.USER;
  const userRoleLevel = RoleHierarchy[userRole] || 0;
  const requiredRoleLevel = RoleHierarchy[requiredRole] || 0;
  
  return userRoleLevel >= requiredRoleLevel;
}

/**
 * Check if user has permission
 */
function hasPermission(user, permission) {
  if (!user) {
    return false;
  }
  
  const userRole = user.role || Roles.USER;
  const rolePermissions = RolePermissions[userRole] || [];
  
  // Check if user has permission directly
  if (user.permissions && user.permissions.includes(permission)) {
    return true;
  }
  
  // Check if user's role has permission
  return rolePermissions.includes(permission);
}

/**
 * Check if user has any of the required permissions
 */
function hasAnyPermission(user, permissions) {
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if user has all required permissions
 */
function hasAllPermissions(user, permissions) {
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Check if user owns the resource
 */
function isOwner(user, resource) {
  if (!user || !resource) {
    return false;
  }
  
  // Check various owner field names
  return (
    resource.userId === user.id ||
    resource.user_id === user.id ||
    resource.ownerId === user.id ||
    resource.owner_id === user.id ||
    resource.createdBy === user.id ||
    resource.created_by === user.id ||
    resource.authorId === user.id ||
    resource.author_id === user.id
  );
}

/**
 * Middleware: Require authentication
 */
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    throw new AuthorizationError('Authentication required');
  }
  next();
}

/**
 * Middleware: Require specific role
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      throw new AuthorizationError('Authentication required');
    }
    
    const hasRequiredRole = roles.some(role => hasRole(req.user, role));
    
    if (!hasRequiredRole) {
      logger.warn('Authorization failed - insufficient role', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
        method: req.method
      });
      throw new AuthorizationError(`Requires one of these roles: ${roles.join(', ')}`);
    }
    
    next();
  };
}

/**
 * Middleware: Require permission
 */
function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      throw new AuthorizationError('Authentication required');
    }
    
    const hasRequiredPermission = permissions.some(permission =>
      hasPermission(req.user, permission)
    );
    
    if (!hasRequiredPermission) {
      logger.warn('Authorization failed - insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredPermissions: permissions,
        path: req.path,
        method: req.method
      });
      throw new AuthorizationError(`Requires one of these permissions: ${permissions.join(', ')}`);
    }
    
    next();
  };
}

/**
 * Middleware: Require all permissions
 */
function requireAllPermissions(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      throw new AuthorizationError('Authentication required');
    }
    
    if (!hasAllPermissions(req.user, permissions)) {
      logger.warn('Authorization failed - missing required permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredPermissions: permissions,
        path: req.path,
        method: req.method
      });
      throw new AuthorizationError(`Requires all of these permissions: ${permissions.join(', ')}`);
    }
    
    next();
  };
}

/**
 * Middleware: Require ownership or admin
 */
function requireOwnership(getResourceFn) {
  return async (req, res, next) => {
    if (!req.user) {
      throw new AuthorizationError('Authentication required');
    }
    
    // Admins bypass ownership checks
    if (hasRole(req.user, Roles.ADMIN)) {
      return next();
    }
    
    try {
      const resource = await getResourceFn(req);
      
      if (!resource) {
        throw new AuthorizationError('Resource not found');
      }
      
      if (!isOwner(req.user, resource)) {
        logger.warn('Authorization failed - not resource owner', {
          userId: req.user.id,
          resourceId: resource.id,
          path: req.path,
          method: req.method
        });
        throw new AuthorizationError('You do not have permission to access this resource');
      }
      
      // Attach resource to request for controller use
      req.authorizedResource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware: Require admin
 */
const requireAdmin = requireRole(Roles.ADMIN);

/**
 * Middleware: Require moderator or admin
 */
const requireModerator = requireRole(Roles.MODERATOR, Roles.ADMIN);

/**
 * Middleware: Require user or higher
 */
const requireUser = requireRole(Roles.USER, Roles.MODERATOR, Roles.ADMIN);

/**
 * Check if user can perform action on resource
 */
function canPerform(user, action, resource = null) {
  // Check permission
  if (!hasPermission(user, action)) {
    return false;
  }
  
  // If resource ownership matters for this action
  if (resource && action.includes(':update') || action.includes(':delete')) {
    return isOwner(user, resource) || hasRole(user, Roles.ADMIN);
  }
  
  return true;
}

/**
 * Rate limit by user ID
 */
function createUserRateLimit(store, options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = 'Too many requests'
  } = options;
  
  return (req, res, next) => {
    if (!req.user || !req.user.id) {
      return next();
    }
    
    const key = `rate-limit:user:${req.user.id}`;
    // Implementation would use Redis or in-memory store
    // For now, just pass through
    next();
  };
}

/**
 * Audit log for authorization events
 */
function auditAuthorizationEvent(req, event, success, details = {}) {
  logger.info('Authorization event', {
    event,
    success,
    userId: req.user?.id,
    userRole: req.user?.role,
    path: req.path,
    method: req.method,
    ip: req.ip,
    requestId: req.id,
    ...details
  });
}

module.exports = {
  Roles,
  RoleHierarchy,
  Permissions,
  RolePermissions,
  hasRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isOwner,
  requireAuth,
  requireRole,
  requirePermission,
  requireAllPermissions,
  requireOwnership,
  requireAdmin,
  requireModerator,
  requireUser,
  canPerform,
  createUserRateLimit,
  auditAuthorizationEvent
};
