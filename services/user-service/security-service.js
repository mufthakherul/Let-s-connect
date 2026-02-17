/**
 * Enterprise Security Service
 * IP whitelisting, security headers, CSP, and DDoS protection
 */

const { DataTypes, Op } = require('sequelize');
const crypto = require('crypto');

/**
 * Initialize security models
 */
function initializeSecurityModels(sequelize) {
  // IP Whitelist Model
  const IPWhitelist = sequelize.define('IPWhitelist', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Organization-specific whitelist'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: false,
      comment: 'IP address or CIDR range'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Optional expiration date'
    }
  });

  // Security Event Model
  const SecurityEvent = sequelize.define('SecurityEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    eventType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'e.g., blocked_ip, rate_limit_exceeded, suspicious_activity'
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    endpoint: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    details: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional event details'
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Action taken (e.g., blocked, warned, logged)'
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'security_events',
    timestamps: false,
    indexes: [
      { fields: ['eventType'] },
      { fields: ['severity'] },
      { fields: ['ipAddress'] },
      { fields: ['timestamp'] }
    ]
  });

  // Rate Limit Tracker Model
  const RateLimitTracker = sequelize.define('RateLimitTracker', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    identifier: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'IP address or user ID'
    },
    endpoint: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    requestCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    windowStart: {
      type: DataTypes.DATE,
      allowNull: false
    },
    windowEnd: {
      type: DataTypes.DATE,
      allowNull: false
    },
    isBlocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    blockedUntil: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'rate_limit_tracker',
    timestamps: false,
    indexes: [
      { fields: ['identifier'] },
      { fields: ['windowEnd'] },
      { fields: ['isBlocked'] }
    ]
  });

  // Session Management Model
  const Session = sequelize.define('Session', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    sessionToken: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    refreshToken: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    deviceInfo: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    lastActivityAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });

  return {
    IPWhitelist,
    SecurityEvent,
    RateLimitTracker,
    Session
  };
}

/**
 * Security Service Class
 */
class SecurityService {
  constructor(models) {
    this.IPWhitelist = models.IPWhitelist;
    this.SecurityEvent = models.SecurityEvent;
    this.RateLimitTracker = models.RateLimitTracker;
    this.Session = models.Session;
  }

  /**
   * Check if IP is whitelisted
   */
  async isIPWhitelisted(ipAddress, organizationId = null) {
    const whitelist = await this.IPWhitelist.findOne({
      where: {
        [Op.or]: [
          { ipAddress },
          { ipAddress: { [Op.like]: `${ipAddress.split('.').slice(0, 3).join('.')}.%` } }
        ],
        organizationId: organizationId || null,
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      }
    });

    return whitelist !== null;
  }

  /**
   * Add IP to whitelist
   */
  async addIPToWhitelist(ipAddress, options = {}) {
    return await this.IPWhitelist.create({
      ipAddress,
      organizationId: options.organizationId,
      description: options.description,
      createdBy: options.createdBy,
      expiresAt: options.expiresAt
    });
  }

  /**
   * Remove IP from whitelist
   */
  async removeIPFromWhitelist(id) {
    const entry = await this.IPWhitelist.findByPk(id);
    if (!entry) {
      throw new Error('Whitelist entry not found');
    }
    await entry.destroy();
    return true;
  }

  /**
   * Log security event
   */
  async logSecurityEvent(data) {
    return await this.SecurityEvent.create({
      eventType: data.eventType,
      severity: data.severity || 'medium',
      ipAddress: data.ipAddress,
      userId: data.userId,
      userAgent: data.userAgent,
      endpoint: data.endpoint,
      method: data.method,
      details: data.details || {},
      action: data.action,
      timestamp: new Date()
    });
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(identifier, endpoint, limit, windowSeconds) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowSeconds * 1000);

    // Find or create rate limit entry
    let tracker = await this.RateLimitTracker.findOne({
      where: {
        identifier,
        endpoint: endpoint || null,
        windowEnd: { [Op.gt]: now }
      }
    });

    if (!tracker) {
      // Create new tracker
      tracker = await this.RateLimitTracker.create({
        identifier,
        endpoint: endpoint || null,
        requestCount: 1,
        windowStart: now,
        windowEnd: new Date(now.getTime() + windowSeconds * 1000)
      });
      return { allowed: true, remaining: limit - 1 };
    }

    // Check if blocked
    if (tracker.isBlocked && tracker.blockedUntil && tracker.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: tracker.blockedUntil
      };
    }

    // Increment request count
    await tracker.increment('requestCount');
    await tracker.reload();

    const remaining = Math.max(0, limit - tracker.requestCount);

    if (tracker.requestCount > limit) {
      // Block identifier
      const blockedUntil = new Date(now.getTime() + windowSeconds * 1000);
      await tracker.update({
        isBlocked: true,
        blockedUntil
      });

      // Log security event
      await this.logSecurityEvent({
        eventType: 'rate_limit_exceeded',
        severity: 'medium',
        ipAddress: identifier.startsWith('ip:') ? identifier.substring(3) : null,
        endpoint,
        details: {
          requestCount: tracker.requestCount,
          limit,
          window: windowSeconds
        },
        action: 'blocked'
      });

      return { allowed: false, remaining: 0, resetTime: blockedUntil };
    }

    return { allowed: true, remaining };
  }

  /**
   * Clean up old rate limit entries
   */
  async cleanupRateLimitTrackers() {
    const now = new Date();
    const deleted = await this.RateLimitTracker.destroy({
      where: {
        windowEnd: { [Op.lt]: now },
        isBlocked: false
      }
    });
    console.log(`[Security] Cleaned up ${deleted} expired rate limit trackers`);
    return deleted;
  }

  /**
   * Create session
   */
  async createSession(userId, ipAddress, userAgent, options = {}) {
    const sessionToken = crypto.randomBytes(64).toString('hex');
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + (options.expiresInHours || 24) * 60 * 60 * 1000);

    return await this.Session.create({
      userId,
      sessionToken,
      refreshToken,
      ipAddress,
      userAgent,
      deviceInfo: options.deviceInfo || {},
      expiresAt
    });
  }

  /**
   * Validate session
   */
  async validateSession(sessionToken) {
    const session = await this.Session.findOne({
      where: {
        sessionToken,
        isActive: true,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!session) {
      return { valid: false, reason: 'Invalid or expired session' };
    }

    // Update last activity
    await session.update({ lastActivityAt: new Date() });

    return { valid: true, session };
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionToken) {
    const session = await this.Session.findOne({
      where: { sessionToken }
    });

    if (!session) {
      return false;
    }

    await session.update({ isActive: false });
    return true;
  }

  /**
   * Revoke all user sessions
   */
  async revokeUserSessions(userId, exceptSessionToken = null) {
    const where = { userId, isActive: true };
    if (exceptSessionToken) {
      where.sessionToken = { [Op.ne]: exceptSessionToken };
    }

    const count = await this.Session.update(
      { isActive: false },
      { where }
    );

    return count[0];
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId) {
    return await this.Session.findAll({
      where: {
        userId,
        isActive: true,
        expiresAt: { [Op.gt]: new Date() }
      },
      order: [['lastActivityAt', 'DESC']]
    });
  }

  /**
   * Detect suspicious activity
   */
  async detectSuspiciousActivity(userId, ipAddress, userAgent) {
    // Check for multiple IPs in short time
    const recentSessions = await this.Session.findAll({
      where: {
        userId,
        createdAt: { [Op.gte]: new Date(Date.now() - 60 * 60 * 1000) }
      }
    });

    const uniqueIPs = new Set(recentSessions.map(s => s.ipAddress));
    
    if (uniqueIPs.size > 5) {
      await this.logSecurityEvent({
        eventType: 'suspicious_activity',
        severity: 'high',
        userId,
        ipAddress,
        userAgent,
        details: {
          reason: 'multiple_ips',
          count: uniqueIPs.size
        },
        action: 'logged'
      });

      return {
        suspicious: true,
        reason: 'Multiple IP addresses detected',
        severity: 'high'
      };
    }

    return { suspicious: false };
  }

  /**
   * Get security events
   */
  async getSecurityEvents(filters = {}, options = {}) {
    const where = {};
    
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.severity) where.severity = filters.severity;
    if (filters.ipAddress) where.ipAddress = filters.ipAddress;
    if (filters.userId) where.userId = filters.userId;
    
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp[Op.gte] = new Date(filters.startDate);
      if (filters.endDate) where.timestamp[Op.lte] = new Date(filters.endDate);
    }

    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    const { count, rows } = await this.SecurityEvent.findAndCountAll({
      where,
      limit,
      offset,
      order: [['timestamp', 'DESC']]
    });

    return {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
      data: rows
    };
  }
}

/**
 * Security headers middleware
 */
function securityHeadersMiddleware(options = {}) {
  return (req, res, next) => {
    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // X-Frame-Options
    res.setHeader('X-Frame-Options', options.frameOptions || 'DENY');
    
    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Strict-Transport-Security (HSTS)
    if (options.hsts !== false) {
      res.setHeader(
        'Strict-Transport-Security',
        `max-age=${options.hstsMaxAge || 31536000}; includeSubDomains; preload`
      );
    }
    
    // Referrer-Policy
    res.setHeader('Referrer-Policy', options.referrerPolicy || 'strict-origin-when-cross-origin');
    
    // Permissions-Policy
    const permissionsPolicy = options.permissionsPolicy || {
      camera: [],
      microphone: [],
      geolocation: []
    };
    const policyString = Object.entries(permissionsPolicy)
      .map(([feature, allowList]) => `${feature}=(${allowList.join(' ')})`)
      .join(', ');
    res.setHeader('Permissions-Policy', policyString);

    next();
  };
}

/**
 * Content Security Policy middleware
 */
function cspMiddleware(options = {}) {
  return (req, res, next) => {
    const directives = {
      'default-src': options.defaultSrc || ["'self'"],
      'script-src': options.scriptSrc || ["'self'", "'unsafe-inline'"],
      'style-src': options.styleSrc || ["'self'", "'unsafe-inline'"],
      'img-src': options.imgSrc || ["'self'", 'data:', 'https:'],
      'font-src': options.fontSrc || ["'self'", 'data:'],
      'connect-src': options.connectSrc || ["'self'"],
      'frame-ancestors': options.frameAncestors || ["'none'"],
      'base-uri': options.baseUri || ["'self'"],
      'form-action': options.formAction || ["'self'"]
    };

    const cspString = Object.entries(directives)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');

    res.setHeader('Content-Security-Policy', cspString);
    next();
  };
}

/**
 * IP whitelist middleware
 */
function ipWhitelistMiddleware(securityService, organizationId = null) {
  return async (req, res, next) => {
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    try {
      const isWhitelisted = await securityService.isIPWhitelisted(ipAddress, organizationId);
      
      if (!isWhitelisted) {
        await securityService.logSecurityEvent({
          eventType: 'blocked_ip',
          severity: 'medium',
          ipAddress,
          userAgent: req.headers['user-agent'],
          endpoint: req.path,
          method: req.method,
          action: 'blocked'
        });

        return res.status(403).json({
          error: 'Access denied',
          message: 'Your IP address is not whitelisted'
        });
      }

      next();
    } catch (error) {
      console.error('[Security] IP whitelist check failed:', error);
      next();
    }
  };
}

/**
 * Advanced rate limiter middleware
 */
function advancedRateLimiter(securityService, options = {}) {
  const {
    limit = 100,
    windowSeconds = 60,
    keyGenerator = (req) => req.ip
  } = options;

  return async (req, res, next) => {
    const identifier = keyGenerator(req);
    const endpoint = options.perEndpoint ? req.path : null;

    try {
      const result = await securityService.checkRateLimit(
        identifier,
        endpoint,
        limit,
        windowSeconds
      );

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      if (result.resetTime) {
        res.setHeader('X-RateLimit-Reset', Math.floor(result.resetTime.getTime() / 1000));
      }

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded',
          retryAfter: result.resetTime
        });
      }

      next();
    } catch (error) {
      console.error('[Security] Rate limit check failed:', error);
      next();
    }
  };
}

module.exports = {
  initializeSecurityModels,
  SecurityService,
  securityHeadersMiddleware,
  cspMiddleware,
  ipWhitelistMiddleware,
  advancedRateLimiter
};
