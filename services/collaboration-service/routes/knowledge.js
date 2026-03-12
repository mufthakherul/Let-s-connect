'use strict';
const express = require('express');
const { Op } = require('sequelize');

/**
 * Knowledge routes: Phase 11.1 Decision Intelligence, 11.2 Knowledge Graph,
 * 11.3 AI Assistance, Phase 12 UX/Accessibility/Performance.
 * @param {object} deps - { models, redis, helpers, io }
 */
function createKnowledgeRouter({ models, redis, helpers, io }) {
  const {
    Meeting, MeetingActionItem,
    DecisionLog, FollowUpTask, OutcomeTracker,
    KnowledgeEntity, KnowledgeRelation,
    MeetingTopic, TranscriptHighlight,
    AISummary, AIActionItem, MeetingBrief,
    UserExperienceProfile, OnboardingStep,
    LiveCaption, AccessibilitySettings,
    ThemeConfiguration,
    MeetingEdgeNode, MeetingRoute,
    MediaQualityProfile, LargeMeetingConfig
  } = models;

  const { requireMeetingAccess } = helpers;
  const router = express.Router();

  // ==================== 11.1 DECISION INTELLIGENCE ====================

  // Decision Log - Create
  router.post('/meetings/:id/decision-log', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { title, description, rationale, decision, alternatives, evidenceLinks, impactAssessment, tags } = req.body;

      const decisionLog = await DecisionLog.create({
        meetingId: req.params.id,
        title,
        description,
        rationale,
        decidedBy: userId,
        decision,
        alternatives,
        evidenceLinks,
        impactAssessment,
        tags
      });

      res.status(201).json(decisionLog);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to create decision log' });
    }
  });

  // Get Decision Logs
  router.get('/meetings/:id/decision-log', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { status } = req.query;
      const where = { meetingId: req.params.id };
      if (status) where.status = status;

      const decisionLogs = await DecisionLog.findAll({
        where,
        order: [['createdAt', 'DESC']],
        include: [
          { model: FollowUpTask, as: 'tasks' },
          { model: OutcomeTracker, as: 'trackers' }
        ]
      });

      res.json(decisionLogs);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get decision logs' });
    }
  });

  // Update Decision Log Status
  router.put('/meetings/:id/decision-log/:logId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const decisionLog = await DecisionLog.findByPk(req.params.logId);
      if (!decisionLog || decisionLog.meetingId !== req.params.id) {
        return res.status(404).json({ error: 'Decision log not found' });
      }

      const { status, implementationDate, reviewDate } = req.body;
      await decisionLog.update({ status, implementationDate, reviewDate });

      res.json(decisionLog);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to update decision log' });
    }
  });

  // Follow-Up Task - Create
  router.post('/meetings/:id/follow-up-tasks', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { title, description, assignedTo, dueDate, priority, decisionLogId, automationRules, dependencies } = req.body;

      const task = await FollowUpTask.create({
        meetingId: req.params.id,
        decisionLogId,
        title,
        description,
        assignedTo,
        dueDate,
        priority,
        automationRules,
        dependencies
      });

      res.status(201).json(task);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to create follow-up task' });
    }
  });

  // Get Follow-Up Tasks
  router.get('/meetings/:id/follow-up-tasks', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { status, assignedTo } = req.query;
      const where = { meetingId: req.params.id };
      if (status) where.status = status;
      if (assignedTo) where.assignedTo = assignedTo;

      const tasks = await FollowUpTask.findAll({
        where,
        order: [['dueDate', 'ASC']]
      });

      res.json(tasks);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get follow-up tasks' });
    }
  });

  // Update Follow-Up Task
  router.put('/meetings/:id/follow-up-tasks/:taskId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const task = await FollowUpTask.findByPk(req.params.taskId);
      if (!task || task.meetingId !== req.params.id) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const { status, blockedReason, completedAt } = req.body;
      await task.update({ status, blockedReason, completedAt: completedAt || (status === 'completed' ? new Date() : null) });

      res.json(task);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to update task' });
    }
  });

  // Outcome Tracker - Create
  router.post('/meetings/:id/outcomes', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { decisionLogId, followUpTaskId, metric, targetValue, actualValue, unit, measurementDate, notes, accountability } = req.body;

      const outcome = await OutcomeTracker.create({
        meetingId: req.params.id,
        decisionLogId,
        followUpTaskId,
        metric,
        targetValue,
        actualValue,
        unit,
        measurementDate,
        notes,
        accountability
      });

      if (actualValue && targetValue) {
        const percentage = (actualValue / targetValue) * 100;
        let status = 'on_track';
        if (percentage >= 100) status = 'achieved';
        else if (percentage >= 80) status = 'on_track';
        else if (percentage >= 60) status = 'at_risk';
        else status = 'delayed';
        await outcome.update({ status });
      }

      res.status(201).json(outcome);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to create outcome tracker' });
    }
  });

  // Get Outcomes
  router.get('/meetings/:id/outcomes', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const outcomes = await OutcomeTracker.findAll({
        where: { meetingId: req.params.id },
        order: [['measurementDate', 'DESC']]
      });

      res.json(outcomes);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get outcomes' });
    }
  });

  // ==================== 11.2 KNOWLEDGE GRAPH AND MEMORY ====================

  // Knowledge Entity - Create
  router.post('/knowledge/entities', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { entityType, name, description, metadata, tags } = req.body;

      const entity = await KnowledgeEntity.create({
        entityType,
        name,
        description,
        metadata,
        tags
      });

      res.status(201).json(entity);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create knowledge entity' });
    }
  });

  // Get Knowledge Entities
  router.get('/knowledge/entities', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { entityType, search } = req.query;
      const where = {};
      if (entityType) where.entityType = entityType;
      if (search) where.name = { [Op.iLike]: `%${search}%` };

      const entities = await KnowledgeEntity.findAll({
        where,
        order: [['importance', 'DESC'], ['mentionCount', 'DESC']]
      });

      res.json(entities);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get knowledge entities' });
    }
  });

  // Knowledge Relation - Create
  router.post('/knowledge/relations', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { sourceEntityId, targetEntityId, relationType, meetingId, strength, context } = req.body;

      const relation = await KnowledgeRelation.create({
        sourceEntityId,
        targetEntityId,
        relationType,
        meetingId,
        strength,
        context
      });

      res.status(201).json(relation);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create knowledge relation' });
    }
  });

  // Get Knowledge Graph
  router.get('/knowledge/graph', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { entityId, depth = 2 } = req.query;

      if (!entityId) {
        return res.status(400).json({ error: 'entityId is required' });
      }

      const entity = await KnowledgeEntity.findByPk(entityId);
      if (!entity) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      const relations = await KnowledgeRelation.findAll({
        where: {
          [Op.or]: [
            { sourceEntityId: entityId },
            { targetEntityId: entityId }
          ]
        }
      });

      const relatedEntityIds = new Set();
      relations.forEach(rel => {
        relatedEntityIds.add(rel.sourceEntityId);
        relatedEntityIds.add(rel.targetEntityId);
      });

      const relatedEntities = await KnowledgeEntity.findAll({
        where: { id: Array.from(relatedEntityIds) }
      });

      res.json({
        entity,
        relations,
        relatedEntities
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get knowledge graph' });
    }
  });

  // Meeting Topics - Create/Update
  router.post('/meetings/:id/topics', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { topic, description, sentiment, discussionTime, participants, keywords, relatedTopics } = req.body;

      const meetingTopic = await MeetingTopic.create({
        meetingId: req.params.id,
        topic,
        description,
        sentiment,
        discussionTime,
        participants,
        keywords,
        relatedTopics
      });

      res.status(201).json(meetingTopic);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to create meeting topic' });
    }
  });

  // Get Meeting Topics
  router.get('/meetings/:id/topics', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const topics = await MeetingTopic.findAll({
        where: { meetingId: req.params.id },
        order: [['discussionTime', 'DESC']]
      });

      res.json(topics);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get topics' });
    }
  });

  // Cross-Meeting Topic Analysis
  router.get('/topics/analysis', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { keyword } = req.query;

      const where = {};
      if (keyword) {
        where.keywords = { [Op.contains]: [keyword] };
      }

      const topics = await MeetingTopic.findAll({
        where,
        include: [{ model: Meeting, as: 'meeting', where: {} }],
        order: [['createdAt', 'DESC']],
        limit: 100
      });

      const topicClusters = {};
      topics.forEach(topic => {
        const key = topic.topic.toLowerCase();
        if (!topicClusters[key]) {
          topicClusters[key] = [];
        }
        topicClusters[key].push(topic);
      });

      res.json({
        clusters: topicClusters,
        totalTopics: topics.length,
        trends: Object.keys(topicClusters).map(key => ({
          topic: key,
          frequency: topicClusters[key].length,
          avgSentiment: topicClusters[key].reduce((sum, t) => sum + (t.sentiment || 0), 0) / topicClusters[key].length
        }))
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to analyze topics' });
    }
  });

  // Transcript Highlights - Create
  router.post('/meetings/:id/highlights', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { speakerId, timestamp, duration, content, highlightType, importance, citations } = req.body;

      const highlight = await TranscriptHighlight.create({
        meetingId: req.params.id,
        speakerId,
        timestamp,
        duration,
        content,
        highlightType,
        importance,
        citations
      });

      res.status(201).json(highlight);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to create highlight' });
    }
  });

  // Search Transcript Highlights
  router.get('/meetings/:id/highlights', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { search, highlightType } = req.query;
      const where = { meetingId: req.params.id };
      if (highlightType) where.highlightType = highlightType;
      if (search) where.content = { [Op.iLike]: `%${search}%` };

      const highlights = await TranscriptHighlight.findAll({
        where,
        order: [['timestamp', 'ASC']]
      });

      res.json(highlights);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to search highlights' });
    }
  });

  // ==================== 11.3 AI ASSISTANCE ====================

  // AI Summary - Generate
  router.post('/meetings/:id/ai-summary', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { agendaItemId, summaryType } = req.body;

      const meeting = await Meeting.findByPk(req.params.id);

      const summary = await AISummary.create({
        meetingId: req.params.id,
        agendaItemId,
        summaryType: summaryType || 'full_meeting',
        summary: `AI-generated summary for ${meeting.title}. This is a placeholder that would be replaced with actual AI-generated content.`,
        keyPoints: ['Key point 1', 'Key point 2', 'Key point 3'],
        sentiment: { overall: 0.7 },
        neutralityScore: 0.85,
        confidence: 0.8
      });

      res.status(201).json(summary);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to generate AI summary' });
    }
  });

  // Get AI Summaries
  router.get('/meetings/:id/ai-summary', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { summaryType } = req.query;
      const where = { meetingId: req.params.id };
      if (summaryType) where.summaryType = summaryType;

      const summaries = await AISummary.findAll({
        where,
        order: [['generatedAt', 'DESC']]
      });

      res.json(summaries);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get AI summaries' });
    }
  });

  // Update AI Summary Review Status
  router.put('/meetings/:id/ai-summary/:summaryId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const summary = await AISummary.findByPk(req.params.summaryId);
      if (!summary || summary.meetingId !== req.params.id) {
        return res.status(404).json({ error: 'Summary not found' });
      }

      const { reviewStatus, summary: editedSummary } = req.body;
      await summary.update({
        reviewStatus,
        summary: editedSummary || summary.summary
      });

      res.json(summary);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to update summary' });
    }
  });

  // AI Action Item Extraction
  router.post('/meetings/:id/ai-extract-actions', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { extractedFrom } = req.body;

      const actionItem = await AIActionItem.create({
        meetingId: req.params.id,
        extractedFrom: extractedFrom || 'Meeting transcript',
        title: 'AI-extracted action item',
        description: 'This is a placeholder for an AI-extracted action item',
        confidence: 0.85
      });

      res.status(201).json(actionItem);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to extract action items' });
    }
  });

  // Get AI Action Items
  router.get('/meetings/:id/ai-action-items', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { verificationStatus } = req.query;
      const where = { meetingId: req.params.id };
      if (verificationStatus) where.verificationStatus = verificationStatus;

      const actionItems = await AIActionItem.findAll({
        where,
        order: [['createdAt', 'DESC']]
      });

      res.json(actionItems);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get AI action items' });
    }
  });

  // Verify AI Action Item
  router.put('/meetings/:id/ai-action-items/:itemId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const actionItem = await AIActionItem.findByPk(req.params.itemId);
      if (!actionItem || actionItem.meetingId !== req.params.id) {
        return res.status(404).json({ error: 'Action item not found' });
      }

      const { verificationStatus, title, description } = req.body;
      await actionItem.update({
        verificationStatus,
        title: title || actionItem.title,
        description: description || actionItem.description,
        verifiedBy: userId
      });

      if (verificationStatus === 'verified' && req.body.convertToTask) {
        const task = await MeetingActionItem.create({
          meetingId: req.params.id,
          title: actionItem.title,
          description: actionItem.description,
          assigneeId: actionItem.suggestedAssignee,
          dueDate: actionItem.suggestedDueDate,
          status: 'open'
        });

        await actionItem.update({
          convertedToTask: true,
          taskId: task.id
        });
      }

      res.json(actionItem);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to verify action item' });
    }
  });

  // Meeting Brief - Generate
  router.post('/meetings/:id/brief', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const meeting = await Meeting.findByPk(req.params.id);

      const recentDecisions = await DecisionLog.findAll({
        where: { meetingId: { [Op.ne]: req.params.id } },
        order: [['createdAt', 'DESC']],
        limit: 5
      });

      const brief = await MeetingBrief.create({
        meetingId: req.params.id,
        generatedFor: userId,
        contextSummary: `Brief for ${meeting.title}. This is a placeholder for AI-generated contextual information.`,
        relevantDecisions: recentDecisions.map(d => d.id),
        relatedMeetings: [],
        backgroundTopics: {},
        suggestedPreparation: [
          'Review previous decisions',
          'Prepare agenda topics',
          'Gather relevant documents'
        ],
        participantProfiles: {}
      });

      res.status(201).json(brief);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to generate meeting brief' });
    }
  });

  // Get Meeting Brief
  router.get('/meetings/:id/brief', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const brief = await MeetingBrief.findOne({
        where: {
          meetingId: req.params.id,
          generatedFor: userId
        },
        order: [['generatedAt', 'DESC']]
      });

      if (!brief) {
        return res.status(404).json({ error: 'No brief found for this meeting' });
      }

      res.json(brief);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get meeting brief' });
    }
  });

  // ==================== PHASE 12: EXPERIENCE, ACCESSIBILITY, AND PERFORMANCE ====================

  // User Experience Profile - Get or Create
  router.get('/user/experience-profile', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      let profile = await UserExperienceProfile.findOne({ where: { userId } });

      if (!profile) {
        profile = await UserExperienceProfile.create({ userId });
      }

      res.json(profile);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get experience profile' });
    }
  });

  // Update Experience Profile
  router.put('/user/experience-profile', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { experienceLevel, preferredComplexity, interfacePreferences, roleSpecificSettings, meetingTypePreferences } = req.body;

      let profile = await UserExperienceProfile.findOne({ where: { userId } });

      if (!profile) {
        profile = await UserExperienceProfile.create({
          userId,
          experienceLevel,
          preferredComplexity,
          interfacePreferences,
          roleSpecificSettings,
          meetingTypePreferences
        });
      } else {
        await profile.update({
          experienceLevel,
          preferredComplexity,
          interfacePreferences,
          roleSpecificSettings,
          meetingTypePreferences
        });
      }

      res.json(profile);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update experience profile' });
    }
  });

  // Onboarding Steps - Create/Update
  router.post('/user/onboarding-step', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { stepType, context, completed, skipped } = req.body;

      const [step, created] = await OnboardingStep.findOrCreate({
        where: { userId, stepType, context },
        defaults: {
          completed: completed || false,
          skipped: skipped || false,
          completedAt: completed ? new Date() : null
        }
      });

      if (!created) {
        await step.update({
          completed,
          skipped,
          completedAt: completed ? new Date() : step.completedAt
        });
      }

      const profile = await UserExperienceProfile.findOne({ where: { userId } });
      if (profile && completed) {
        const allSteps = await OnboardingStep.findAll({ where: { userId } });
        const completedSteps = allSteps.filter(s => s.completed).length;
        const totalSteps = allSteps.length;

        await profile.update({
          completedOnboarding: completedSteps === totalSteps,
          onboardingProgress: { completedSteps, totalSteps }
        });
      }

      res.json(step);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update onboarding step' });
    }
  });

  // Get Onboarding Steps
  router.get('/user/onboarding-steps', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const steps = await OnboardingStep.findAll({
        where: { userId },
        order: [['createdAt', 'ASC']]
      });

      res.json(steps);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get onboarding steps' });
    }
  });

  // Live Captions - Create
  router.post('/meetings/:id/captions', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { speakerId, speakerName, content, duration, confidence, language, isFinal } = req.body;

      const caption = await LiveCaption.create({
        meetingId: req.params.id,
        speakerId,
        speakerName,
        content,
        duration,
        confidence,
        language,
        isFinal
      });

      if (io) io.to(req.params.id).emit('live-caption', caption);

      res.status(201).json(caption);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to create caption' });
    }
  });

  // Get Live Captions
  router.get('/meetings/:id/captions', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { startTime, endTime, speakerId } = req.query;
      const where = { meetingId: req.params.id };

      if (startTime) {
        where.timestamp = { [Op.gte]: new Date(startTime) };
      }
      if (endTime) {
        where.timestamp = { ...where.timestamp, [Op.lte]: new Date(endTime) };
      }
      if (speakerId) {
        where.speakerId = speakerId;
      }

      const captions = await LiveCaption.findAll({
        where,
        order: [['timestamp', 'ASC']]
      });

      res.json(captions);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get captions' });
    }
  });

  // Accessibility Settings - Get or Create
  router.get('/user/accessibility-settings', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      let settings = await AccessibilitySettings.findOne({ where: { userId } });

      if (!settings) {
        settings = await AccessibilitySettings.create({ userId });
      }

      res.json(settings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get accessibility settings' });
    }
  });

  // Update Accessibility Settings
  router.put('/user/accessibility-settings', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const updateData = req.body;

      let settings = await AccessibilitySettings.findOne({ where: { userId } });

      if (!settings) {
        settings = await AccessibilitySettings.create({ userId, ...updateData });
      } else {
        await settings.update(updateData);
      }

      res.json(settings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update accessibility settings' });
    }
  });

  // Theme Configurations - List
  router.get('/themes', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const themes = await ThemeConfiguration.findAll({
        where: {
          [Op.or]: [
            { isSystem: true },
            { isPublic: true },
            { createdBy: userId }
          ]
        },
        order: [['isSystem', 'DESC'], ['name', 'ASC']]
      });

      res.json(themes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get themes' });
    }
  });

  // Create Custom Theme
  router.post('/themes', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, themeType, colors, typography, spacing, isPublic } = req.body;

      const theme = await ThemeConfiguration.create({
        name,
        themeType: themeType || 'custom',
        colors,
        typography,
        spacing,
        createdBy: userId,
        isPublic: isPublic || false
      });

      res.status(201).json(theme);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create theme' });
    }
  });

  // Edge Nodes - List
  router.get('/edge-nodes', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { region, status } = req.query;
      const where = {};
      if (region) where.region = region;
      if (status) where.status = status;

      const nodes = await MeetingEdgeNode.findAll({
        where,
        order: [['region', 'ASC'], ['latencyMs', 'ASC']]
      });

      res.json(nodes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get edge nodes' });
    }
  });

  // Meeting Route - Get Optimal Route
  router.post('/meetings/:id/route', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { participantLocations, routingStrategy } = req.body;

      const activeNodes = await MeetingEdgeNode.findAll({
        where: { status: 'active' },
        order: [['currentLoad', 'ASC'], ['latencyMs', 'ASC']]
      });

      if (activeNodes.length === 0) {
        return res.status(503).json({ error: 'No edge nodes available' });
      }

      const selectedNode = activeNodes[0];

      const route = await MeetingRoute.create({
        meetingId: req.params.id,
        edgeNodeId: selectedNode.id,
        participantLocations,
        routingStrategy: routingStrategy || 'nearest'
      });

      await selectedNode.increment('currentLoad');

      const routeWithNode = await MeetingRoute.findByPk(route.id, {
        include: [{ model: MeetingEdgeNode, as: 'edgeNode' }]
      });

      res.status(201).json(routeWithNode);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to create route' });
    }
  });

  // Get Meeting Route
  router.get('/meetings/:id/route', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const route = await MeetingRoute.findOne({
        where: { meetingId: req.params.id },
        include: [{ model: MeetingEdgeNode, as: 'edgeNode' }],
        order: [['assignedAt', 'DESC']]
      });

      if (!route) {
        return res.status(404).json({ error: 'No route assigned' });
      }

      res.json(route);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get route' });
    }
  });

  // Media Quality Profile - Get or Create
  router.get('/user/media-quality', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { meetingId } = req.query;
      const where = { userId };
      if (meetingId) where.meetingId = meetingId;

      let profile = await MediaQualityProfile.findOne({ where });

      if (!profile) {
        profile = await MediaQualityProfile.create({ userId, meetingId });
      }

      res.json(profile);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get media quality profile' });
    }
  });

  // Update Media Quality Profile
  router.put('/user/media-quality', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { meetingId, bandwidth, videoQuality, audioQuality, adaptiveMode, currentBandwidthKbps, packetLoss, jitter } = req.body;

      const where = { userId };
      if (meetingId) where.meetingId = meetingId;

      let profile = await MediaQualityProfile.findOne({ where });

      if (!profile) {
        profile = await MediaQualityProfile.create({
          userId,
          meetingId,
          bandwidth,
          videoQuality,
          audioQuality,
          adaptiveMode,
          currentBandwidthKbps,
          packetLoss,
          jitter
        });
      } else {
        await profile.update({
          bandwidth,
          videoQuality,
          audioQuality,
          adaptiveMode,
          currentBandwidthKbps,
          packetLoss,
          jitter
        });
      }

      res.json(profile);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update media quality profile' });
    }
  });

  // Large Meeting Configuration - Create or Update
  router.post('/meetings/:id/large-meeting-config', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const meeting = await requireMeetingAccess(req.params.id, userId);

      if (meeting.hostId !== userId) {
        return res.status(403).json({ error: 'Only the host can configure large meeting settings' });
      }

      const { mode, maxStageParticipants, stageParticipants, viewMode, enableQA, moderationSettings } = req.body;

      let config = await LargeMeetingConfig.findOne({ where: { meetingId: req.params.id } });

      if (!config) {
        config = await LargeMeetingConfig.create({
          meetingId: req.params.id,
          mode,
          maxStageParticipants,
          stageParticipants,
          viewMode,
          enableQA,
          moderationSettings
        });
      } else {
        await config.update({
          mode,
          maxStageParticipants,
          stageParticipants,
          viewMode,
          enableQA,
          moderationSettings
        });
      }

      res.json(config);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to configure large meeting' });
    }
  });

  // Get Large Meeting Configuration
  router.get('/meetings/:id/large-meeting-config', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const config = await LargeMeetingConfig.findOne({
        where: { meetingId: req.params.id }
      });

      if (!config) {
        return res.status(404).json({ error: 'No large meeting configuration found' });
      }

      res.json(config);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to get large meeting config' });
    }
  });

  // Update Audience Size (for analytics)
  router.put('/meetings/:id/large-meeting-config/audience-size', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await requireMeetingAccess(req.params.id, userId);

      const { audienceSize } = req.body;

      const config = await LargeMeetingConfig.findOne({
        where: { meetingId: req.params.id }
      });

      if (!config) {
        return res.status(404).json({ error: 'No large meeting configuration found' });
      }

      await config.update({ audienceSize });

      res.json(config);
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ error: error.message || 'Failed to update audience size' });
    }
  });

  return router;
}

module.exports = createKnowledgeRouter;
