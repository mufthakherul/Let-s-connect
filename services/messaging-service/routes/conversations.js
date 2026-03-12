'use strict';

/**
 * Conversation-level routes: list, create, messages (GET/POST),
 * pins, search, schedule, scheduled list, and conversation settings.
 *
 * Factory signature: createConversationsRouter(deps) → express.Router
 */
const express = require('express');

module.exports = function createConversationsRouter({ models, io }) {
  const {
    Conversation, Message, MessageReaction, PinnedMessage,
    ScheduledMessage, ConversationSettings, Sequelize, Op
  } = models;

  const router = express.Router();

  // ── List conversations for a user ──────────────────────────────────────────

  router.get('/conversations/:userId', async (req, res) => {
    try {
      const conversations = await Conversation.findAll({
        where: {
          participants: { [Sequelize.Op.contains]: [req.params.userId] }
        },
        order: [['lastMessageAt', 'DESC']]
      });
      res.json(conversations);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  // ── Create conversation ────────────────────────────────────────────────────

  router.post('/conversations', async (req, res) => {
    try {
      const { name, type, participants } = req.body;
      const conversation = await Conversation.create({ name, type, participants });
      res.status(201).json(conversation);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  });

  // ── List messages in a conversation ───────────────────────────────────────

  router.get('/conversations/:conversationId/messages', async (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      const messages = await Message.findAll({
        where: { conversationId: req.params.conversationId },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          { model: MessageReaction, as: 'reactions', attributes: ['id', 'userId', 'reactionType', 'createdAt'] },
          { model: Message, as: 'replyTo', attributes: ['id', 'senderId', 'content', 'createdAt'] },
          { model: Message, as: 'forwardedFrom', attributes: ['id', 'senderId', 'content', 'createdAt'] }
        ]
      });

      res.json(messages.reverse());
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // ── Send message via REST ──────────────────────────────────────────────────

  router.post('/conversations/:conversationId/messages', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const senderId = req.header('x-user-id');
      if (!senderId) return res.status(401).json({ error: 'Authentication required' });

      const { content, type = 'text', attachmentUrl, ephemeralTtl } = req.body;
      if (!content && !attachmentUrl) {
        return res.status(400).json({ error: 'content or attachmentUrl required' });
      }

      const msg = await Message.create({
        conversationId,
        senderId,
        content: content || '',
        type,
        attachmentUrl: attachmentUrl || null,
        expiresAt: ephemeralTtl ? new Date(Date.now() + ephemeralTtl * 1000) : null
      });

      io.to(conversationId).emit('new-message', msg);
      return res.status(201).json(msg);
    } catch (error) {
      console.error('[POST /conversations/:id/messages]', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // ── Pinned messages ────────────────────────────────────────────────────────

  router.get('/conversations/:conversationId/pins', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const pinnedMessages = await PinnedMessage.findAll({
        where: { conversationId },
        include: [{ model: Message, attributes: ['id', 'senderId', 'content', 'type', 'createdAt'] }],
        order: [['createdAt', 'DESC']]
      });
      res.json(pinnedMessages);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch pinned messages' });
    }
  });

  // ── Message search ─────────────────────────────────────────────────────────

  router.get('/conversations/:conversationId/search', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { conversationId } = req.params;
      const { query, type, limit = 50, offset = 0 } = req.query;

      if (!query) return res.status(400).json({ error: 'Search query is required' });

      const conversation = await Conversation.findByPk(conversationId);
      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

      if (!conversation.participants.includes(userId)) {
        return res.status(403).json({ error: 'Not a member of this conversation' });
      }

      const where = { conversationId, content: { [Op.iLike]: `%${query}%` } };
      if (type) where.type = type;

      const messages = await Message.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });

      res.json({ messages: messages.rows, total: messages.count });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to search messages' });
    }
  });

  // ── Scheduled messages ─────────────────────────────────────────────────────

  router.post('/conversations/:conversationId/schedule', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { conversationId } = req.params;
      const { content, type = 'text', attachments, scheduledFor } = req.body;

      if (!content || !scheduledFor) {
        return res.status(400).json({ error: 'content and scheduledFor are required' });
      }

      const conversation = await Conversation.findByPk(conversationId);
      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

      if (!conversation.participants.includes(userId)) {
        return res.status(403).json({ error: 'Not a member of this conversation' });
      }

      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ error: 'Scheduled time must be in the future' });
      }

      const scheduledMessage = await ScheduledMessage.create({
        conversationId,
        senderId: userId,
        content,
        type,
        attachments: attachments || [],
        scheduledFor: scheduledDate,
        status: 'pending'
      });

      res.status(201).json(scheduledMessage);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to schedule message' });
    }
  });

  router.get('/conversations/:conversationId/scheduled', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { conversationId } = req.params;
      const { status = 'pending' } = req.query;

      const conversation = await Conversation.findByPk(conversationId);
      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

      if (!conversation.participants.includes(userId)) {
        return res.status(403).json({ error: 'Not a member of this conversation' });
      }

      const scheduledMessages = await ScheduledMessage.findAll({
        where: { conversationId, senderId: userId, status },
        order: [['scheduledFor', 'ASC']]
      });

      res.json(scheduledMessages);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch scheduled messages' });
    }
  });

  // ── Conversation settings ──────────────────────────────────────────────────

  router.get('/conversations/:conversationId/settings', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { conversationId } = req.params;

      const conversation = await Conversation.findByPk(conversationId);
      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

      if (!conversation.participants.includes(userId)) {
        return res.status(403).json({ error: 'Not a member of this conversation' });
      }

      let settings = await ConversationSettings.findOne({ where: { conversationId, userId } });
      if (!settings) {
        settings = await ConversationSettings.create({ conversationId, userId, muteNotifications: false, pinned: false });
      }

      res.json(settings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch conversation settings' });
    }
  });

  router.put('/conversations/:conversationId/settings', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { conversationId } = req.params;
      const { muteNotifications, muteUntil, customNickname, theme, pinned } = req.body;

      const conversation = await Conversation.findByPk(conversationId);
      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

      if (!conversation.participants.includes(userId)) {
        return res.status(403).json({ error: 'Not a member of this conversation' });
      }

      let settings = await ConversationSettings.findOne({ where: { conversationId, userId } });
      if (!settings) {
        settings = await ConversationSettings.create({
          conversationId, userId,
          muteNotifications: muteNotifications || false,
          muteUntil, customNickname, theme,
          pinned: pinned || false
        });
      } else {
        if (muteNotifications !== undefined) settings.muteNotifications = muteNotifications;
        if (muteUntil !== undefined) settings.muteUntil = muteUntil;
        if (customNickname !== undefined) settings.customNickname = customNickname;
        if (theme !== undefined) settings.theme = theme;
        if (pinned !== undefined) settings.pinned = pinned;
        await settings.save();
      }

      res.json(settings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update conversation settings' });
    }
  });

  return router;
};
