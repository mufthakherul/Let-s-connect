/**
 * Phase 8: Enterprise Features - API Endpoints
 * All Phase 8 endpoints integrated into user-service
 */

const express = require('express');

/**
 * Setup all Phase 8 endpoints
 */
function setupPhase8Endpoints(app, models, services) {
  const {
    enterpriseAuth,
    auditService,
    organizationService,
    analyticsService,
    workflowEngine,
    securityService,
    integrationManager
  } = services;

  // ==================== ENTERPRISE AUTHENTICATION ====================
  
  // SAML SSO - Initiate authentication
  app.get('/auth/saml/login', async (req, res) => {
    try {
      const authRequest = enterpriseAuth.saml.generateAuthRequest(req.query.relayState);
      
      res.json({
        authUrl: `${enterpriseAuth.saml.config.identityProviderUrl}?SAMLRequest=${authRequest.request}`,
        requestId: authRequest.id,
        relayState: authRequest.relayState
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to initiate SAML authentication' });
    }
  });

  // SAML SSO - Callback
  app.post('/auth/saml/callback', async (req, res) => {
    try {
      const { SAMLResponse } = req.body;
      
      const samlData = await enterpriseAuth.saml.validateResponse(SAMLResponse);
      
      // Find or create user
      let user = await models.User.findOne({ where: { email: samlData.email } });
      
      if (!user) {
        user = await models.User.create({
          email: samlData.email,
          username: samlData.email.split('@')[0],
          firstName: samlData.attributes.firstName || samlData.name.split(' ')[0],
          lastName: samlData.attributes.lastName || samlData.name.split(' ').slice(1).join(' '),
          password: require('crypto').randomBytes(32).toString('hex'),
          role: 'user'
        });
      }

      // Create SSO session
      const sessionId = enterpriseAuth.sso.createSession(user.id, 'saml', samlData);
      
      // Log authentication
      await auditService.logAuth(user.id, 'saml.login', req.ip, req.headers['user-agent'], true);

      res.json({
        success: true,
        user: { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}` },
        sessionId
      });
    } catch (error) {
      await auditService.logAuth(null, 'saml.login', req.ip, req.headers['user-agent'], false, { error: error.message });
      res.status(401).json({ error: 'SAML authentication failed' });
    }
  });

  // LDAP Authentication
  app.post('/auth/ldap/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const result = await enterpriseAuth.ldap.authenticate(username, password);
      
      if (!result.success) {
        await auditService.logAuth(null, 'ldap.login', req.ip, req.headers['user-agent'], false);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Find or create user
      let user = await models.User.findOne({ where: { email: result.user.email } });
      
      if (!user) {
        user = await models.User.create({
          email: result.user.email,
          username: result.user.username,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          password: require('crypto').randomBytes(32).toString('hex'),
          role: 'user'
        });
      }

      // Create SSO session
      const sessionId = enterpriseAuth.sso.createSession(user.id, 'ldap', result.user);
      
      await auditService.logAuth(user.id, 'ldap.login', req.ip, req.headers['user-agent'], true);

      res.json({
        success: true,
        user: { id: user.id, email: user.email },
        sessionId,
        groups: result.groups
      });
    } catch (error) {
      res.status(500).json({ error: 'LDAP authentication failed' });
    }
  });

  // SSO Session Management
  app.get('/auth/sso/sessions', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const sessions = enterpriseAuth.sso.getUserSessions(userId);
      res.json({ sessions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  });

  app.delete('/auth/sso/sessions/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const deleted = enterpriseAuth.sso.destroySession(sessionId);
      res.json({ success: deleted });
    } catch (error) {
      res.status(500).json({ error: 'Failed to destroy session' });
    }
  });

  // ==================== AUDIT & COMPLIANCE ====================

  // Get audit logs
  app.get('/audit/logs', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      const user = await models.User.findByPk(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const filters = {
        userId: req.query.userId,
        action: req.query.action,
        category: req.query.category,
        resource: req.query.resource,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        status: req.query.status,
        ipAddress: req.query.ipAddress
      };

      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      const logs = await auditService.getLogs(filters, options);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get audit logs' });
    }
  });

  // Generate compliance report
  app.post('/audit/compliance-report', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      const user = await models.User.findByPk(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { startDate, endDate, complianceType } = req.body;
      
      const report = await auditService.generateComplianceReport(startDate, endDate, complianceType);
      
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate compliance report' });
    }
  });

  // Data retention policies
  app.get('/audit/retention-policies', async (req, res) => {
    try {
      const policies = await models.DataRetentionPolicy.findAll();
      res.json({ policies });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get retention policies' });
    }
  });

  app.post('/audit/retention-policies', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      const user = await models.User.findByPk(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const policy = await models.DataRetentionPolicy.create(req.body);
      res.json({ success: true, policy });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create retention policy' });
    }
  });

  // Right to be forgotten (enhanced)
  app.post('/audit/deletion-request', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { reason } = req.body;
      
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30);

      const request = await models.DataDeletionRequest.create({
        userId,
        requestType: 'right_to_be_forgotten',
        status: 'pending',
        reason,
        gracePeriodEnd
      });

      await auditService.logComplianceEvent(userId, 'data_deletion_requested', { requestId: request.id });

      res.json({
        success: true,
        request: {
          id: request.id,
          gracePeriodEnd,
          message: '30-day grace period started'
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create deletion request' });
    }
  });

  // ==================== ORGANIZATION MANAGEMENT ====================

  // Create organization
  app.post('/organizations', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const organization = await organizationService.createOrganization(req.body, userId);
      
      res.json({ success: true, organization });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create organization' });
    }
  });

  // Get organization hierarchy
  app.get('/organizations/:id/hierarchy', async (req, res) => {
    try {
      const hierarchy = await organizationService.getOrganizationHierarchy(req.params.id);
      res.json({ hierarchy });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get organization hierarchy' });
    }
  });

  // Create team
  app.post('/organizations/:orgId/teams', async (req, res) => {
    try {
      const team = await models.Team.create({
        ...req.body,
        organizationId: req.params.orgId
      });
      res.json({ success: true, team });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create team' });
    }
  });

  // Create workspace
  app.post('/organizations/:orgId/workspaces', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const workspace = await models.Workspace.create({
        ...req.body,
        organizationId: req.params.orgId,
        ownerId: userId
      });

      // Add owner as admin
      await models.WorkspaceMember.create({
        workspaceId: workspace.id,
        userId,
        role: 'admin'
      });

      res.json({ success: true, workspace });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create workspace' });
    }
  });

  // Create workspace from template
  app.post('/workspaces/from-template', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { templateId, organizationId, ...customData } = req.body;
      
      const workspace = await organizationService.createWorkspaceFromTemplate(
        templateId,
        organizationId,
        userId,
        customData
      );

      res.json({ success: true, workspace });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create workspace from template' });
    }
  });

  // Workspace analytics
  app.get('/workspaces/:id/analytics', async (req, res) => {
    try {
      const analytics = await organizationService.getWorkspaceAnalytics(req.params.id);
      res.json({ analytics });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get workspace analytics' });
    }
  });

  // Cross-workspace search
  app.get('/workspaces/search', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { query, limit } = req.query;
      
      const results = await organizationService.crossWorkspaceSearch(userId, query, { limit: parseInt(limit) || 20 });
      
      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: 'Failed to search workspaces' });
    }
  });

  // Custom roles
  app.post('/organizations/:orgId/roles', async (req, res) => {
    try {
      const role = await models.CustomRole.create({
        ...req.body,
        organizationId: req.params.orgId
      });
      res.json({ success: true, role });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create custom role' });
    }
  });

  app.get('/organizations/:orgId/roles', async (req, res) => {
    try {
      const roles = await models.CustomRole.findAll({
        where: { organizationId: req.params.orgId, isActive: true }
      });
      res.json({ roles });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get roles' });
    }
  });

  // Check permission
  app.post('/organizations/:orgId/check-permission', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { permission } = req.body;
      
      const hasPermission = await organizationService.checkPermission(
        userId,
        req.params.orgId,
        permission
      );

      res.json({ hasPermission });
    } catch (error) {
      res.status(500).json({ error: 'Failed to check permission' });
    }
  });

  // ==================== ANALYTICS ====================

  // Track event
  app.post('/analytics/events', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      
      const event = await analyticsService.trackEvent({
        ...req.body,
        userId
      });

      res.json({ success: true, eventId: event.id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to track event' });
    }
  });

  // Feature adoption metrics
  app.get('/analytics/features/adoption', async (req, res) => {
    try {
      const { featureName } = req.query;
      const totalUsers = await models.User.count();
      
      const metrics = await analyticsService.calculateFeatureAdoption(featureName, totalUsers);
      
      res.json({ metrics });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get feature adoption metrics' });
    }
  });

  // User journey analysis
  app.get('/analytics/journey/:sessionId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      
      const journey = await analyticsService.analyzeUserJourney(userId, req.params.sessionId);
      
      res.json({ journey });
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze user journey' });
    }
  });

  // Cohort management
  app.post('/analytics/cohorts', async (req, res) => {
    try {
      const cohort = await analyticsService.createCohort(req.body);
      res.json({ success: true, cohort });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create cohort' });
    }
  });

  app.get('/analytics/cohorts/:id/analysis', async (req, res) => {
    try {
      const analysis = await analyticsService.performCohortAnalysis(req.params.id);
      res.json({ analysis });
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze cohort' });
    }
  });

  // Performance tracking
  app.post('/analytics/performance', async (req, res) => {
    try {
      await analyticsService.trackPerformance(req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to track performance' });
    }
  });

  app.get('/analytics/performance/:service', async (req, res) => {
    try {
      const hours = parseInt(req.query.hours) || 24;
      const summary = await analyticsService.getPerformanceSummary(req.params.service, hours);
      res.json({ summary });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get performance summary' });
    }
  });

  // Custom dashboards
  app.post('/analytics/dashboards', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const dashboard = await analyticsService.createDashboard(req.body, userId);
      res.json({ success: true, dashboard });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create dashboard' });
    }
  });

  app.get('/analytics/dashboards', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const dashboards = await models.Dashboard.findAll({
        where: {
          $or: [
            { userId },
            { isPublic: true },
            { sharedWith: { $contains: [userId] } }
          ]
        }
      });

      res.json({ dashboards });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get dashboards' });
    }
  });

  // Scheduled reports
  app.post('/analytics/reports', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const report = await analyticsService.createScheduledReport(req.body, userId);
      res.json({ success: true, report });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create scheduled report' });
    }
  });

  app.post('/analytics/reports/:id/generate', async (req, res) => {
    try {
      const report = await analyticsService.generateReport(req.params.id);
      res.json({ report });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });

  // ==================== WORKFLOWS & AUTOMATION ====================

  // Create workflow
  app.post('/workflows', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const workflow = await workflowEngine.createWorkflow(req.body, userId);
      res.json({ success: true, workflow });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create workflow' });
    }
  });

  // Execute workflow
  app.post('/workflows/:id/execute', async (req, res) => {
    try {
      const result = await workflowEngine.executeWorkflow(req.params.id, req.body.triggerData);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to execute workflow' });
    }
  });

  // Get workflow executions
  app.get('/workflows/:id/executions', async (req, res) => {
    try {
      const executions = await models.WorkflowExecution.findAll({
        where: { workflowId: req.params.id },
        order: [['createdAt', 'DESC']],
        limit: parseInt(req.query.limit) || 50
      });
      res.json({ executions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get executions' });
    }
  });

  // Scheduled tasks
  app.post('/scheduled-tasks', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const task = await workflowEngine.createScheduledTask(req.body, userId);
      res.json({ success: true, task });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create scheduled task' });
    }
  });

  // Data pipelines
  app.post('/data-pipelines', async (req, res) => {
    try {
      const pipeline = await workflowEngine.createDataPipeline(req.body);
      res.json({ success: true, pipeline });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create data pipeline' });
    }
  });

  app.post('/data-pipelines/:id/execute', async (req, res) => {
    try {
      const result = await workflowEngine.executeDataPipeline(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to execute data pipeline' });
    }
  });

  // ==================== INTEGRATIONS ====================

  // Create integration
  app.post('/integrations', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const integration = await workflowEngine.createIntegration(req.body, userId);
      res.json({ success: true, integration });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create integration' });
    }
  });

  // Execute integration action
  app.post('/integrations/:provider/:action', async (req, res) => {
    try {
      const result = await integrationManager.execute(
        req.params.provider,
        req.params.action,
        req.body
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to execute integration action' });
    }
  });

  // List available integrations
  app.get('/integrations/available', (req, res) => {
    const integrations = integrationManager.list();
    res.json({ integrations });
  });

  // Check integration health
  app.get('/integrations/:provider/health', async (req, res) => {
    try {
      const health = await integrationManager.checkHealth(req.params.provider);
      res.json({ health });
    } catch (error) {
      res.status(500).json({ error: 'Failed to check integration health' });
    }
  });

  // ==================== SECURITY ====================

  // IP Whitelist management
  app.post('/security/whitelist', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      const user = await models.User.findByPk(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const entry = await securityService.addIPToWhitelist(req.body.ipAddress, {
        ...req.body,
        createdBy: userId
      });

      res.json({ success: true, entry });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add IP to whitelist' });
    }
  });

  app.get('/security/whitelist', async (req, res) => {
    try {
      const entries = await models.IPWhitelist.findAll({
        where: { isActive: true }
      });
      res.json({ entries });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get whitelist' });
    }
  });

  app.delete('/security/whitelist/:id', async (req, res) => {
    try {
      await securityService.removeIPFromWhitelist(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove IP from whitelist' });
    }
  });

  // Security events
  app.get('/security/events', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      const user = await models.User.findByPk(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const filters = {
        eventType: req.query.eventType,
        severity: req.query.severity,
        ipAddress: req.query.ipAddress,
        userId: req.query.userId,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      const events = await securityService.getSecurityEvents(filters, options);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get security events' });
    }
  });

  // Session management
  app.get('/security/sessions', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const sessions = await securityService.getUserSessions(userId);
      res.json({ sessions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  });

  app.delete('/security/sessions/:sessionToken', async (req, res) => {
    try {
      const success = await securityService.revokeSession(req.params.sessionToken);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: 'Failed to revoke session' });
    }
  });

  app.delete('/security/sessions', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const count = await securityService.revokeUserSessions(userId);
      res.json({ success: true, revokedCount: count });
    } catch (error) {
      res.status(500).json({ error: 'Failed to revoke sessions' });
    }
  });

  console.log('[Phase 8] All enterprise endpoints registered successfully');
}

module.exports = { setupPhase8Endpoints };
