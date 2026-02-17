/**
 * Advanced Analytics Service
 * Business intelligence, user behavior tracking, and performance monitoring
 */

const { DataTypes, Op } = require('sequelize');

/**
 * Initialize analytics models
 */
function initializeAnalyticsModels(sequelize) {
  // User Behavior Event Model
  const UserBehaviorEvent = sequelize.define('UserBehaviorEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    sessionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Session identifier'
    },
    eventType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'e.g., page_view, click, feature_usage'
    },
    eventCategory: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'e.g., navigation, interaction, conversion'
    },
    eventName: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    page: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    referrer: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    properties: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Event-specific properties'
    },
    device: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Device information'
    },
    location: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Geolocation data'
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'user_behavior_events',
    timestamps: false,
    indexes: [
      { fields: ['userId'] },
      { fields: ['sessionId'] },
      { fields: ['eventType'] },
      { fields: ['eventCategory'] },
      { fields: ['timestamp'] }
    ]
  });

  // Feature Adoption Metric Model
  const FeatureAdoptionMetric = sequelize.define('FeatureAdoptionMetric', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    featureName: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    featureCategory: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    totalUsers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total users who tried the feature'
    },
    activeUsers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Users who used it in last 30 days'
    },
    adoptionRate: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      comment: 'Percentage of total users'
    },
    averageUsagePerUser: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0
    },
    lastCalculated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  });

  // User Journey Model
  const UserJourney = sequelize.define('UserJourney', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    sessionId: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    startedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration in seconds'
    },
    steps: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of journey steps'
    },
    outcome: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'e.g., conversion, abandonment, completion'
    },
    conversionValue: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  });

  // Cohort Model
  const Cohort = sequelize.define('Cohort', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('acquisition', 'behavior', 'demographic', 'custom'),
      defaultValue: 'custom'
    },
    criteria: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Cohort definition criteria'
    },
    userCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastCalculated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  // Performance Metric Model
  const PerformanceMetric = sequelize.define('PerformanceMetric', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    metricType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'e.g., response_time, cpu_usage, memory_usage'
    },
    service: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    endpoint: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    value: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'e.g., ms, %, bytes'
    },
    tags: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional tags for filtering'
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'performance_metrics',
    timestamps: false,
    indexes: [
      { fields: ['metricType'] },
      { fields: ['service'] },
      { fields: ['timestamp'] }
    ]
  });

  // Dashboard Model
  const Dashboard = sequelize.define('Dashboard', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Dashboard owner'
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    layout: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Dashboard layout configuration'
    },
    widgets: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of widget configurations'
    },
    filters: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Default filters'
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sharedWith: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: []
    }
  });

  // Scheduled Report Model
  const ScheduledReport = sequelize.define('ScheduledReport', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    reportType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'e.g., user_activity, feature_adoption, performance'
    },
    schedule: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Cron expression or predefined (daily, weekly, monthly)'
    },
    recipients: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    config: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Report configuration'
    },
    lastRun: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nextRun: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });

  return {
    UserBehaviorEvent,
    FeatureAdoptionMetric,
    UserJourney,
    Cohort,
    PerformanceMetric,
    Dashboard,
    ScheduledReport
  };
}

/**
 * Analytics Service Class
 */
class AnalyticsService {
  constructor(models) {
    this.UserBehaviorEvent = models.UserBehaviorEvent;
    this.FeatureAdoptionMetric = models.FeatureAdoptionMetric;
    this.UserJourney = models.UserJourney;
    this.Cohort = models.Cohort;
    this.PerformanceMetric = models.PerformanceMetric;
    this.Dashboard = models.Dashboard;
    this.ScheduledReport = models.ScheduledReport;
  }

  /**
   * Track user behavior event
   */
  async trackEvent(data) {
    return await this.UserBehaviorEvent.create({
      userId: data.userId,
      sessionId: data.sessionId,
      eventType: data.eventType,
      eventCategory: data.eventCategory,
      eventName: data.eventName,
      page: data.page,
      referrer: data.referrer,
      properties: data.properties || {},
      device: data.device || {},
      location: data.location || {},
      timestamp: new Date()
    });
  }

  /**
   * Calculate feature adoption metrics
   */
  async calculateFeatureAdoption(featureName, totalUserCount) {
    const { fn, col } = require('sequelize');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Count unique users who used the feature
    const totalUsersQuery = await this.UserBehaviorEvent.findAll({
      where: {
        eventName: featureName,
        userId: { [Op.ne]: null }
      },
      attributes: [[fn('COUNT', fn('DISTINCT', col('userId'))), 'count']],
      raw: true
    });

    // Count active users (last 30 days)
    const activeUsersQuery = await this.UserBehaviorEvent.findAll({
      where: {
        eventName: featureName,
        userId: { [Op.ne]: null },
        timestamp: { [Op.gte]: thirtyDaysAgo }
      },
      attributes: [[sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('userId'))), 'count']],
      raw: true
    });

    const totalUsers = parseInt(totalUsersQuery[0]?.count || 0);
    const activeUsers = parseInt(activeUsersQuery[0]?.count || 0);
    const adoptionRate = totalUserCount > 0 ? (totalUsers / totalUserCount) * 100 : 0;

    // Update or create metric
    await this.FeatureAdoptionMetric.upsert({
      featureName,
      totalUsers,
      activeUsers,
      adoptionRate,
      lastCalculated: new Date()
    });

    return {
      featureName,
      totalUsers,
      activeUsers,
      adoptionRate: adoptionRate.toFixed(2)
    };
  }

  /**
   * Analyze user journey
   */
  async analyzeUserJourney(userId, sessionId) {
    // Get all events for this session
    const events = await this.UserBehaviorEvent.findAll({
      where: { userId, sessionId },
      order: [['timestamp', 'ASC']]
    });

    if (events.length === 0) {
      return null;
    }

    const steps = events.map(e => ({
      eventName: e.eventName,
      eventType: e.eventType,
      page: e.page,
      timestamp: e.timestamp,
      properties: e.properties
    }));

    const startedAt = events[0].timestamp;
    const endedAt = events[events.length - 1].timestamp;
    const duration = Math.floor((endedAt - startedAt) / 1000);

    // Determine outcome (simplified)
    const lastEvent = events[events.length - 1];
    let outcome = 'in_progress';
    if (lastEvent.eventType === 'conversion') {
      outcome = 'conversion';
    } else if (duration > 1800) { // 30 minutes
      outcome = 'abandonment';
    }

    // Create or update journey
    await this.UserJourney.upsert({
      userId,
      sessionId,
      startedAt,
      endedAt,
      duration,
      steps,
      outcome
    });

    return { userId, sessionId, steps, duration, outcome };
  }

  /**
   * Create cohort
   */
  async createCohort(data) {
    return await this.Cohort.create({
      name: data.name,
      description: data.description,
      type: data.type || 'custom',
      criteria: data.criteria || {},
      startDate: data.startDate,
      endDate: data.endDate
    });
  }

  /**
   * Perform cohort analysis
   */
  async performCohortAnalysis(cohortId) {
    const cohort = await this.Cohort.findByPk(cohortId);
    if (!cohort) {
      throw new Error('Cohort not found');
    }

    // This is a simplified implementation
    // In production, you'd query users based on criteria and analyze their behavior

    const analysis = {
      cohortId,
      name: cohort.name,
      userCount: cohort.userCount,
      retentionRate: {},
      engagementMetrics: {},
      conversionMetrics: {}
    };

    // Calculate weekly retention (simplified)
    for (let week = 0; week < 12; week++) {
      analysis.retentionRate[`week_${week}`] = Math.max(0, 100 - week * 5);
    }

    return analysis;
  }

  /**
   * Track performance metric
   */
  async trackPerformance(data) {
    return await this.PerformanceMetric.create({
      metricType: data.metricType,
      service: data.service,
      endpoint: data.endpoint,
      value: data.value,
      unit: data.unit,
      tags: data.tags || {},
      timestamp: new Date()
    });
  }

  /**
   * Get performance summary
   */
  async getPerformanceSummary(service, hours = 24) {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const metrics = await this.PerformanceMetric.findAll({
      where: {
        service,
        timestamp: { [Op.gte]: since }
      },
      order: [['timestamp', 'DESC']]
    });

    // Calculate statistics by metric type
    const summary = {};

    const metricTypes = [...new Set(metrics.map(m => m.metricType))];

    for (const type of metricTypes) {
      const typeMetrics = metrics.filter(m => m.metricType === type);
      const values = typeMetrics.map(m => m.value);

      summary[type] = {
        count: values.length,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        p95: this.percentile(values, 95),
        p99: this.percentile(values, 99)
      };
    }

    return summary;
  }

  /**
   * Calculate percentile
   */
  percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Create custom dashboard
   */
  async createDashboard(data, userId) {
    return await this.Dashboard.create({
      userId,
      organizationId: data.organizationId,
      name: data.name,
      description: data.description,
      layout: data.layout || [],
      widgets: data.widgets || [],
      filters: data.filters || {},
      isPublic: data.isPublic || false,
      sharedWith: data.sharedWith || []
    });
  }

  /**
   * Create scheduled report
   */
  async createScheduledReport(data, userId) {
    const nextRun = this.calculateNextRun(data.schedule);

    return await this.ScheduledReport.create({
      userId,
      organizationId: data.organizationId,
      name: data.name,
      reportType: data.reportType,
      schedule: data.schedule,
      recipients: data.recipients || [],
      config: data.config || {},
      nextRun
    });
  }

  /**
   * Calculate next run time for scheduled report
   */
  calculateNextRun(schedule) {
    const now = new Date();

    switch (schedule) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      default:
        // For cron expressions, return 1 day ahead (simplified)
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Generate report data
   */
  async generateReport(reportId) {
    const report = await this.ScheduledReport.findByPk(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    let data = {};

    switch (report.reportType) {
      case 'user_activity':
        data = await this.generateUserActivityReport(report.config);
        break;
      case 'feature_adoption':
        data = await this.generateFeatureAdoptionReport(report.config);
        break;
      case 'performance':
        data = await this.generatePerformanceReport(report.config);
        break;
      default:
        throw new Error('Unknown report type');
    }

    // Update last run
    await report.update({
      lastRun: new Date(),
      nextRun: this.calculateNextRun(report.schedule)
    });

    return {
      reportId,
      name: report.name,
      type: report.reportType,
      generatedAt: new Date(),
      data
    };
  }

  /**
   * Generate user activity report
   */
  async generateUserActivityReport(config) {
    const { startDate, endDate } = config;

    const events = await this.UserBehaviorEvent.findAll({
      where: {
        timestamp: {
          [Op.gte]: new Date(startDate),
          [Op.lte]: new Date(endDate)
        }
      }
    });

    return {
      totalEvents: events.length,
      uniqueUsers: new Set(events.map(e => e.userId).filter(Boolean)).size,
      topEvents: this.getTopEvents(events, 10),
      dailyActivity: this.aggregateByDay(events)
    };
  }

  /**
   * Generate feature adoption report
   */
  async generateFeatureAdoptionReport(config) {
    const metrics = await this.FeatureAdoptionMetric.findAll({
      order: [['adoptionRate', 'DESC']],
      limit: config.limit || 20
    });

    return {
      totalFeatures: metrics.length,
      features: metrics.map(m => ({
        name: m.featureName,
        category: m.featureCategory,
        totalUsers: m.totalUsers,
        activeUsers: m.activeUsers,
        adoptionRate: m.adoptionRate
      }))
    };
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(config) {
    const { service, hours = 24 } = config;

    const summary = await this.getPerformanceSummary(service, hours);

    return {
      service,
      period: `${hours} hours`,
      metrics: summary
    };
  }

  /**
   * Helper: Get top events
   */
  getTopEvents(events, limit) {
    const eventCounts = {};

    events.forEach(e => {
      eventCounts[e.eventName] = (eventCounts[e.eventName] || 0) + 1;
    });

    return Object.entries(eventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  }

  /**
   * Helper: Aggregate events by day
   */
  aggregateByDay(events) {
    const byDay = {};

    events.forEach(e => {
      const day = e.timestamp.toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    return byDay;
  }
}

module.exports = {
  initializeAnalyticsModels,
  AnalyticsService
};
