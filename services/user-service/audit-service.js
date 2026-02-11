/**
 * Audit Service
 * Comprehensive audit logging for compliance (GDPR, HIPAA)
 */

const { DataTypes } = require('sequelize');

/**
 * Initialize audit models
 */
function initializeAuditModels(sequelize) {
  // Audit Log Model
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User who performed the action'
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Action type (e.g., user.login, user.update, data.export)'
    },
    category: {
      type: DataTypes.ENUM(
        'authentication',
        'authorization',
        'data_access',
        'data_modification',
        'data_deletion',
        'admin_action',
        'security',
        'compliance',
        'system'
      ),
      defaultValue: 'system'
    },
    resource: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Resource affected (e.g., user, post, blog)'
    },
    resourceId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ID of the affected resource'
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'HTTP method (GET, POST, PUT, DELETE)'
    },
    endpoint: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'API endpoint accessed'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address of the requester'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent string'
    },
    status: {
      type: DataTypes.ENUM('success', 'failure', 'warning'),
      defaultValue: 'success'
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'HTTP status code'
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional details about the action'
    },
    changes: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Before/after values for modifications'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional metadata'
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'audit_logs',
    timestamps: false,
    indexes: [
      { fields: ['userId'] },
      { fields: ['action'] },
      { fields: ['category'] },
      { fields: ['timestamp'] },
      { fields: ['resource', 'resourceId'] },
      { fields: ['ipAddress'] }
    ]
  });

  // Data Retention Policy Model
  const DataRetentionPolicy = sequelize.define('DataRetentionPolicy', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    resourceType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Type of resource (e.g., user, post, audit_log)'
    },
    retentionPeriodDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Number of days to retain data (0 = indefinite)'
    },
    archiveAfterDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Days after which to archive data (null = no archiving)'
    },
    deleteAfterDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Days after which to delete data (null = no deletion)'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    complianceReasons: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Compliance requirements (e.g., GDPR, HIPAA)'
    }
  });

  // Right to be Forgotten Requests Model
  const DataDeletionRequest = sequelize.define('DataDeletionRequest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'User requesting data deletion'
    },
    requestType: {
      type: DataTypes.ENUM('right_to_be_forgotten', 'data_export', 'data_correction'),
      defaultValue: 'right_to_be_forgotten'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'cancelled'),
      defaultValue: 'pending'
    },
    requestedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    gracePeriodEnd: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '30-day grace period end date'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    deletedResources: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Track what was deleted'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });

  return { AuditLog, DataRetentionPolicy, DataDeletionRequest };
}

/**
 * Audit Logger Class
 */
class AuditLogger {
  constructor(AuditLog) {
    this.AuditLog = AuditLog;
  }

  /**
   * Log an audit event
   */
  async log({
    userId,
    action,
    category = 'system',
    resource,
    resourceId,
    method,
    endpoint,
    ipAddress,
    userAgent,
    status = 'success',
    statusCode,
    details,
    changes,
    metadata
  }) {
    try {
      await this.AuditLog.create({
        userId,
        action,
        category,
        resource,
        resourceId,
        method,
        endpoint,
        ipAddress,
        userAgent,
        status,
        statusCode,
        details,
        changes,
        metadata,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[Audit] Failed to log event:', error);
    }
  }

  /**
   * Log authentication event
   */
  async logAuth(userId, action, ipAddress, userAgent, success, details = {}) {
    await this.log({
      userId,
      action,
      category: 'authentication',
      ipAddress,
      userAgent,
      status: success ? 'success' : 'failure',
      details
    });
  }

  /**
   * Log data access
   */
  async logDataAccess(userId, resource, resourceId, method, endpoint, ipAddress) {
    await this.log({
      userId,
      action: `${resource}.read`,
      category: 'data_access',
      resource,
      resourceId,
      method,
      endpoint,
      ipAddress,
      status: 'success'
    });
  }

  /**
   * Log data modification
   */
  async logDataModification(userId, resource, resourceId, changes, ipAddress) {
    await this.log({
      userId,
      action: `${resource}.update`,
      category: 'data_modification',
      resource,
      resourceId,
      ipAddress,
      status: 'success',
      changes
    });
  }

  /**
   * Log data deletion
   */
  async logDataDeletion(userId, resource, resourceId, ipAddress, details = {}) {
    await this.log({
      userId,
      action: `${resource}.delete`,
      category: 'data_deletion',
      resource,
      resourceId,
      ipAddress,
      status: 'success',
      details
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(action, ipAddress, userAgent, details) {
    await this.log({
      action,
      category: 'security',
      ipAddress,
      userAgent,
      status: 'warning',
      details
    });
  }

  /**
   * Log compliance event
   */
  async logComplianceEvent(userId, action, details) {
    await this.log({
      userId,
      action,
      category: 'compliance',
      status: 'success',
      details
    });
  }

  /**
   * Get audit logs with filtering
   */
  async getLogs(filters = {}, options = {}) {
    const {
      userId,
      action,
      category,
      resource,
      startDate,
      endDate,
      status,
      ipAddress
    } = filters;

    const where = {};
    
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (category) where.category = category;
    if (resource) where.resource = resource;
    if (status) where.status = status;
    if (ipAddress) where.ipAddress = ipAddress;
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.$gte = new Date(startDate);
      if (endDate) where.timestamp.$lte = new Date(endDate);
    }

    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    const { count, rows } = await this.AuditLog.findAndCountAll({
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

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate, endDate, complianceType = 'GDPR') {
    const logs = await this.AuditLog.findAll({
      where: {
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        },
        category: ['data_access', 'data_modification', 'data_deletion', 'compliance']
      },
      order: [['timestamp', 'DESC']]
    });

    const report = {
      complianceType,
      period: { startDate, endDate },
      generatedAt: new Date(),
      summary: {
        totalEvents: logs.length,
        dataAccess: logs.filter(l => l.category === 'data_access').length,
        dataModifications: logs.filter(l => l.category === 'data_modification').length,
        dataDeletions: logs.filter(l => l.category === 'data_deletion').length,
        uniqueUsers: new Set(logs.map(l => l.userId).filter(Boolean)).size
      },
      events: logs,
      recommendations: this.generateRecommendations(logs, complianceType)
    };

    return report;
  }

  /**
   * Generate compliance recommendations
   */
  generateRecommendations(logs, complianceType) {
    const recommendations = [];

    // Check for excessive failed login attempts
    const failedLogins = logs.filter(
      l => l.action === 'user.login' && l.status === 'failure'
    );
    if (failedLogins.length > 100) {
      recommendations.push({
        type: 'security',
        severity: 'high',
        message: 'High number of failed login attempts detected. Consider implementing additional security measures.'
      });
    }

    // Check for data exports (GDPR Article 20)
    const dataExports = logs.filter(l => l.action === 'data.export');
    if (dataExports.length === 0 && complianceType === 'GDPR') {
      recommendations.push({
        type: 'compliance',
        severity: 'info',
        message: 'No data export requests in this period. Ensure users are aware of their data portability rights.'
      });
    }

    return recommendations;
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  async cleanupOldLogs(retentionDays = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deleted = await this.AuditLog.destroy({
      where: {
        timestamp: {
          $lt: cutoffDate
        }
      }
    });

    console.log(`[Audit] Cleaned up ${deleted} audit logs older than ${retentionDays} days`);
    return deleted;
  }
}

/**
 * Express middleware for automatic audit logging
 */
function auditMiddleware(auditLogger) {
  return (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send to capture response
    res.send = function (data) {
      // Log the request/response
      auditLogger.log({
        userId: req.user?.id,
        action: `${req.method}.${req.path}`,
        category: 'data_access',
        method: req.method,
        endpoint: req.path,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: res.statusCode < 400 ? 'success' : 'failure',
        statusCode: res.statusCode,
        details: {
          query: req.query,
          params: req.params
        }
      }).catch(err => console.error('[Audit] Middleware error:', err));

      // Call original send
      return originalSend.call(this, data);
    };

    next();
  };
}

module.exports = {
  initializeAuditModels,
  AuditLogger,
  auditMiddleware
};
