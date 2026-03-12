'use strict';
const express = require('express');
const crypto = require('crypto');
const { Op } = require('sequelize');

/**
 * Governance routes: Phase 10.1 Trust & Safety, 10.2 Moderation, 10.3 Civic Templates.
 * @param {object} deps - { models, redis, helpers, io }
 */
function createGovernanceRouter({ models, redis, helpers, io }) {
  const {
    Meeting, MeetingParticipant, MeetingAgendaItem,
    MeetingRolePermission, AuditTrailEntry, ContentRedaction, ParticipantConsent,
    MeetingRuleset, ModerationAction, DisputeFlag,
    MeetingTemplate, RulingTemplate, ComplianceExport
  } = models;

  const { requireMeetingAccess, generateAccessCode } = helpers;
  const router = express.Router();

  // ==================== 10.1 TRUST AND SAFETY ====================

  // Role Permissions - Create or Update
  router.post('/meetings/:id/role-permissions', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const meeting = await requireMeetingAccess(req.params.id, userId);

      const participant = await MeetingParticipant.findOne({
        where: { meetingId: req.params.id, userId }
      });

      if (!participant || !['host', 'moderator'].includes(participant.role)) {
        return res.status(403).json({ error: 'Only hosts and moderators can manage permissions' });
      }

      const { role, permissions, restrictions } = req.body;

      const [rolePermission, created] = await MeetingRolePermission.findOrCreate({
        where: { meetingId: req.params.id, role },
        defaults: { permissions, restrictions }
      });

      if (!created) {
        await rolePermission.update({ permissions, restrictions });
      }

      await AuditTrailEntry.create({
        meetingId: req.params.id,
        sequenceNumber: await AuditTrailEntry.count({ where: { meetingId: req.params.id } }) + 1,
        action: 'update_role_permissions',
        userId,
        entityType: 'role_permission',
        entityId: rolePermission.id,
        details: { role, permissions, restrictions },
        currentHash: crypto.createHash('sha256')
          .update(JSON.stringify({ role, permissions, restrictions, timestamp: new Date() }))
          .digest('hex')
      });

      res.status(created ? 201 : 200).json(rolePermission);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to manage role permissions' });
    }
  });

  // Get Role Permissions
  router.get('/meetings/:id/role-permissions', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const permissions = await MeetingRolePermission.findAll({
        where: { meetingId: req.params.id }
      });

      res.json(permissions);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get role permissions' });
    }
  });

  // Check Permission - Utility endpoint
  router.post('/meetings/:id/check-permission', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { permission } = req.body;
      const participant = await MeetingParticipant.findOne({
        where: { meetingId: req.params.id, userId }
      });

      if (!participant) {
        return res.json({ allowed: false, reason: 'Not a participant' });
      }

      const rolePermission = await MeetingRolePermission.findOne({
        where: { meetingId: req.params.id, role: participant.role }
      });

      const allowed = rolePermission && rolePermission.permissions.includes(permission);
      res.json({ allowed, role: participant.role });
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to check permission' });
    }
  });

  // Tamper-Evident Audit Trail - Get Full Chain
  router.get('/meetings/:id/audit-trail', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const trail = await AuditTrailEntry.findAll({
        where: { meetingId: req.params.id },
        order: [['sequenceNumber', 'ASC']]
      });

      let isValid = true;
      for (let i = 1; i < trail.length; i++) {
        if (trail[i].previousHash !== trail[i - 1].currentHash) {
          isValid = false;
          break;
        }
      }

      res.json({ trail, isValid, count: trail.length });
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get audit trail' });
    }
  });

  // Verify Audit Trail Integrity
  router.get('/meetings/:id/audit-trail/verify', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const trail = await AuditTrailEntry.findAll({
        where: { meetingId: req.params.id },
        order: [['sequenceNumber', 'ASC']]
      });

      const verification = {
        totalEntries: trail.length,
        isValid: true,
        brokenChains: []
      };

      for (let i = 1; i < trail.length; i++) {
        if (trail[i].previousHash !== trail[i - 1].currentHash) {
          verification.isValid = false;
          verification.brokenChains.push({
            sequenceNumber: trail[i].sequenceNumber,
            expected: trail[i - 1].currentHash,
            actual: trail[i].previousHash
          });
        }
      }

      res.json(verification);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to verify audit trail' });
    }
  });

  // Content Redaction - Create
  router.post('/meetings/:id/redactions', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const participant = await MeetingParticipant.findOne({
        where: { meetingId: req.params.id, userId }
      });

      if (!participant || !['host', 'moderator'].includes(participant.role)) {
        return res.status(403).json({ error: 'Only hosts and moderators can redact content' });
      }

      const { contentType, contentId, reason, redactionType, originalContent, redactedContent, timeRanges } = req.body;

      const redaction = await ContentRedaction.create({
        meetingId: req.params.id,
        contentType,
        contentId,
        redactedBy: userId,
        reason,
        redactionType,
        originalContent,
        redactedContent,
        timeRanges
      });

      const sequenceNumber = await AuditTrailEntry.count({ where: { meetingId: req.params.id } }) + 1;
      const previousEntry = await AuditTrailEntry.findOne({
        where: { meetingId: req.params.id },
        order: [['sequenceNumber', 'DESC']]
      });

      await AuditTrailEntry.create({
        meetingId: req.params.id,
        sequenceNumber,
        previousHash: previousEntry?.currentHash || null,
        action: 'content_redacted',
        userId,
        entityType: 'redaction',
        entityId: redaction.id,
        details: { contentType, contentId, reason, redactionType },
        currentHash: crypto.createHash('sha256')
          .update(JSON.stringify({ sequenceNumber, contentType, contentId, userId, timestamp: new Date() }))
          .digest('hex')
      });

      res.status(201).json(redaction);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to create redaction' });
    }
  });

  // Get Redactions
  router.get('/meetings/:id/redactions', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { contentType, contentId } = req.query;
      const where = { meetingId: req.params.id };
      if (contentType) where.contentType = contentType;
      if (contentId) where.contentId = contentId;

      const redactions = await ContentRedaction.findAll({
        where,
        order: [['redactedAt', 'DESC']]
      });

      res.json(redactions);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get redactions' });
    }
  });

  // Participant Consent - Grant/Update
  router.post('/meetings/:id/consent', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { consentType, granted, expiresAt } = req.body;

      const [consent, created] = await ParticipantConsent.findOrCreate({
        where: {
          meetingId: req.params.id,
          participantId: userId,
          consentType
        },
        defaults: {
          granted,
          expiresAt,
          ipAddress: req.ip,
          userAgent: req.header('user-agent')
        }
      });

      if (!created) {
        await consent.update({
          granted,
          grantedAt: new Date(),
          expiresAt,
          ipAddress: req.ip,
          userAgent: req.header('user-agent')
        });
      }

      const sequenceNumber = await AuditTrailEntry.count({ where: { meetingId: req.params.id } }) + 1;
      const previousEntry = await AuditTrailEntry.findOne({
        where: { meetingId: req.params.id },
        order: [['sequenceNumber', 'DESC']]
      });

      await AuditTrailEntry.create({
        meetingId: req.params.id,
        sequenceNumber,
        previousHash: previousEntry?.currentHash || null,
        action: granted ? 'consent_granted' : 'consent_revoked',
        userId,
        entityType: 'consent',
        entityId: consent.id,
        details: { consentType, granted },
        currentHash: crypto.createHash('sha256')
          .update(JSON.stringify({ sequenceNumber, consentType, granted, userId, timestamp: new Date() }))
          .digest('hex')
      });

      res.status(created ? 201 : 200).json(consent);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to manage consent' });
    }
  });

  // Get Consents
  router.get('/meetings/:id/consent', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const participant = await MeetingParticipant.findOne({
        where: { meetingId: req.params.id, userId }
      });

      const where = { meetingId: req.params.id };
      if (participant && !['host', 'moderator'].includes(participant.role)) {
        where.participantId = userId;
      }

      const consents = await ParticipantConsent.findAll({
        where,
        order: [['grantedAt', 'DESC']]
      });

      res.json(consents);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get consents' });
    }
  });

  // ==================== 10.2 MODERATION AND RULE SYSTEMS ====================

  // Meeting Ruleset - Create
  router.post('/meetings/:id/rulesets', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const meeting = await requireMeetingAccess(req.params.id, userId);

      if (meeting.hostId !== userId) {
        return res.status(403).json({ error: 'Only the host can create rulesets' });
      }

      const { name, description, rules, isActive } = req.body;

      const ruleset = await MeetingRuleset.create({
        meetingId: req.params.id,
        name,
        description,
        rules,
        isActive,
        createdBy: userId
      });

      res.status(201).json(ruleset);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to create ruleset' });
    }
  });

  // Get Rulesets
  router.get('/meetings/:id/rulesets', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const rulesets = await MeetingRuleset.findAll({
        where: { meetingId: req.params.id },
        order: [['createdAt', 'DESC']]
      });

      res.json(rulesets);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get rulesets' });
    }
  });

  // Update Ruleset
  router.put('/meetings/:id/rulesets/:rulesetId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const meeting = await requireMeetingAccess(req.params.id, userId);

      if (meeting.hostId !== userId) {
        return res.status(403).json({ error: 'Only the host can update rulesets' });
      }

      const ruleset = await MeetingRuleset.findByPk(req.params.rulesetId);
      if (!ruleset || ruleset.meetingId !== req.params.id) {
        return res.status(404).json({ error: 'Ruleset not found' });
      }

      const { name, description, rules, isActive } = req.body;
      await ruleset.update({ name, description, rules, isActive });

      res.json(ruleset);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to update ruleset' });
    }
  });

  // Moderation Action - Issue
  router.post('/meetings/:id/moderation/actions', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const moderator = await MeetingParticipant.findOne({
        where: { meetingId: req.params.id, userId }
      });

      if (!moderator || !['host', 'moderator'].includes(moderator.role)) {
        return res.status(403).json({ error: 'Only hosts and moderators can issue moderation actions' });
      }

      const { targetUserId, actionType, reason, duration, newRole } = req.body;

      const target = await MeetingParticipant.findOne({
        where: { meetingId: req.params.id, userId: targetUserId }
      });

      if (!target) {
        return res.status(404).json({ error: 'Target participant not found' });
      }

      const action = await ModerationAction.create({
        meetingId: req.params.id,
        moderatorId: userId,
        targetUserId,
        actionType,
        reason,
        duration,
        previousRole: target.role,
        newRole,
        expiresAt: duration ? new Date(Date.now() + duration * 1000) : null
      });

      if (actionType === 'role_change' && newRole) {
        await target.update({ role: newRole });
      }

      const sequenceNumber = await AuditTrailEntry.count({ where: { meetingId: req.params.id } }) + 1;
      const previousEntry = await AuditTrailEntry.findOne({
        where: { meetingId: req.params.id },
        order: [['sequenceNumber', 'DESC']]
      });

      await AuditTrailEntry.create({
        meetingId: req.params.id,
        sequenceNumber,
        previousHash: previousEntry?.currentHash || null,
        action: 'moderation_action',
        userId,
        entityType: 'moderation_action',
        entityId: action.id,
        details: { actionType, targetUserId, reason },
        currentHash: crypto.createHash('sha256')
          .update(JSON.stringify({ sequenceNumber, actionType, targetUserId, userId, timestamp: new Date() }))
          .digest('hex')
      });

      if (io) io.to(req.params.id).emit('moderation-action', action);

      res.status(201).json(action);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to issue moderation action' });
    }
  });

  // Get Moderation Actions
  router.get('/meetings/:id/moderation/actions', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const actions = await ModerationAction.findAll({
        where: { meetingId: req.params.id },
        order: [['issuedAt', 'DESC']]
      });

      res.json(actions);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get moderation actions' });
    }
  });

  // Dispute Flag - Create
  router.post('/meetings/:id/disputes', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { targetType, targetId, reason, description } = req.body;

      const dispute = await DisputeFlag.create({
        meetingId: req.params.id,
        reportedBy: userId,
        targetType,
        targetId,
        reason,
        description
      });

      if (io) io.to(req.params.id).emit('dispute-flagged', dispute);

      res.status(201).json(dispute);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to create dispute flag' });
    }
  });

  // Get Disputes
  router.get('/meetings/:id/disputes', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { status } = req.query;
      const where = { meetingId: req.params.id };
      if (status) where.status = status;

      const disputes = await DisputeFlag.findAll({
        where,
        order: [['createdAt', 'DESC']]
      });

      res.json(disputes);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get disputes' });
    }
  });

  // Resolve Dispute
  router.put('/meetings/:id/disputes/:disputeId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const moderator = await MeetingParticipant.findOne({
        where: { meetingId: req.params.id, userId }
      });

      if (!moderator || !['host', 'moderator'].includes(moderator.role)) {
        return res.status(403).json({ error: 'Only hosts and moderators can resolve disputes' });
      }

      const dispute = await DisputeFlag.findByPk(req.params.disputeId);
      if (!dispute || dispute.meetingId !== req.params.id) {
        return res.status(404).json({ error: 'Dispute not found' });
      }

      const { status, resolution } = req.body;

      await dispute.update({
        status,
        resolution,
        reviewedBy: userId,
        resolvedAt: new Date()
      });

      res.json(dispute);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to resolve dispute' });
    }
  });

  // ==================== 10.3 CIVIC AND LEGAL TEMPLATES ====================

  // Meeting Template - Create
  router.post('/meeting-templates', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, category, description, mode, roleDefinitions, rulesetTemplate, agendaTemplate, documentTemplates, isPublic, organizationId } = req.body;

      const template = await MeetingTemplate.create({
        name,
        category,
        description,
        mode,
        roleDefinitions,
        rulesetTemplate,
        agendaTemplate,
        documentTemplates,
        isPublic,
        createdBy: userId,
        organizationId
      });

      res.status(201).json(template);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create meeting template' });
    }
  });

  // Get Meeting Templates
  router.get('/meeting-templates', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { category, mode } = req.query;
      const where = {
        [Op.or]: [
          { isPublic: true },
          { createdBy: userId }
        ]
      };

      if (category) where.category = category;
      if (mode) where.mode = mode;

      const templates = await MeetingTemplate.findAll({
        where,
        order: [['usageCount', 'DESC'], ['createdAt', 'DESC']]
      });

      res.json(templates);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get meeting templates' });
    }
  });

  // Get Single Template
  router.get('/meeting-templates/:id', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const template = await MeetingTemplate.findByPk(req.params.id);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      if (!template.isPublic && template.createdBy !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await template.increment('usageCount');

      res.json(template);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get template' });
    }
  });

  // Create Meeting from Template
  router.post('/meetings/from-template/:templateId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const template = await MeetingTemplate.findByPk(req.params.templateId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      if (!template.isPublic && template.createdBy !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { title, scheduledAt, durationMinutes } = req.body;

      const meeting = await Meeting.create({
        title,
        description: template.description,
        mode: template.mode,
        scheduledAt,
        durationMinutes,
        hostId: userId,
        accessCode: generateAccessCode(),
        settings: { templateId: template.id }
      });

      await MeetingParticipant.create({
        meetingId: meeting.id,
        userId,
        role: 'host'
      });

      for (const [role, perms] of Object.entries(template.roleDefinitions)) {
        await MeetingRolePermission.create({
          meetingId: meeting.id,
          role,
          permissions: perms.permissions || [],
          restrictions: perms.restrictions || {}
        });
      }

      if (template.rulesetTemplate) {
        await MeetingRuleset.create({
          meetingId: meeting.id,
          name: `${template.name} Rules`,
          rules: template.rulesetTemplate,
          isActive: true,
          createdBy: userId
        });
      }

      if (template.agendaTemplate && Array.isArray(template.agendaTemplate)) {
        for (let i = 0; i < template.agendaTemplate.length; i++) {
          const item = template.agendaTemplate[i];
          await MeetingAgendaItem.create({
            meetingId: meeting.id,
            title: item.title,
            description: item.description,
            orderIndex: i
          });
        }
      }

      await template.increment('usageCount');

      res.status(201).json(meeting);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create meeting from template' });
    }
  });

  // Ruling Template - Create
  router.post('/ruling-templates', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, templateType, category, structure, legalStandards, isStandard } = req.body;

      const template = await RulingTemplate.create({
        name,
        templateType,
        category,
        structure,
        legalStandards,
        isStandard,
        createdBy: userId
      });

      res.status(201).json(template);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create ruling template' });
    }
  });

  // Get Ruling Templates
  router.get('/ruling-templates', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { templateType, category } = req.query;
      const where = {};
      if (templateType) where.templateType = templateType;
      if (category) where.category = category;

      const templates = await RulingTemplate.findAll({
        where,
        order: [['isStandard', 'DESC'], ['createdAt', 'DESC']]
      });

      res.json(templates);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get ruling templates' });
    }
  });

  // Compliance Export - Request
  router.post('/meetings/:id/compliance-export', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { exportType, format, includeRedactions, includeAuditTrail } = req.body;

      const exportRecord = await ComplianceExport.create({
        meetingId: req.params.id,
        exportType: exportType || 'full',
        format: format || 'bundle',
        requestedBy: userId,
        includeRedactions: includeRedactions !== false,
        includeAuditTrail: includeAuditTrail !== false,
        status: 'pending'
      });

      setTimeout(async () => {
        try {
          await exportRecord.update({
            status: 'completed',
            fileUrl: `/exports/${exportRecord.id}.${format === 'pdf' ? 'pdf' : 'zip'}`,
            fileSize: Math.floor(Math.random() * 10000000),
            completedAt: new Date()
          });
        } catch (error) {
          console.error('Failed to complete export:', error);
        }
      }, 100);

      res.status(201).json(exportRecord);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to request compliance export' });
    }
  });

  // Get Compliance Exports
  router.get('/meetings/:id/compliance-exports', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const exports = await ComplianceExport.findAll({
        where: { meetingId: req.params.id },
        order: [['createdAt', 'DESC']]
      });

      res.json(exports);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get compliance exports' });
    }
  });

  // Get Single Export Status
  router.get('/compliance-exports/:id', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const exportRecord = await ComplianceExport.findByPk(req.params.id);
      if (!exportRecord) {
        return res.status(404).json({ error: 'Export not found' });
      }

      await requireMeetingAccess(exportRecord.meetingId, userId);

      res.json(exportRecord);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get export' });
    }
  });

  return router;
}

module.exports = createGovernanceRouter;
