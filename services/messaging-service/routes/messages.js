'use strict';

/**
 * Message-level routes: reactions, reply, forward, pin, delete, read,
 * unread-count, push notifications, and scheduled-message cancellation.
 *
 * Factory signature: createMessagesRouter(deps) → express.Router
 */
const express = require('express');

module.exports = function createMessagesRouter({
  models,
  io,
  redis,
  pushNotificationsEnabled,
  webpush,
  VAPID_PUBLIC_KEY
}) {
  const {
    Message, MessageReaction, Conversation, PinnedMessage,
    Server, ScheduledMessage, Subscription, Sequelize, Op
  } = models;

  const router = express.Router();

  // ── Push Notifications ─────────────────────────────────────────────────────

  router.get('/push/public-key', (req, res) => {
    if (!pushNotificationsEnabled) {
      return res.status(503).json({ error: 'Push notifications are disabled (VAPID not configured)' });
    }
    return res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  router.post('/push/subscribe', async (req, res) => {
    if (!pushNotificationsEnabled) {
      return res.status(503).json({ error: 'Push notifications are disabled (VAPID not configured)' });
    }
    try {
      const userId = req.header('x-user-id') || req.body.userId;
      const { subscription } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Invalid subscription object' });
      }
      // findOrCreate to avoid duplicates; endpoint should have a unique constraint
      const [record, created] = await Subscription.findOrCreate({
        where: { endpoint: subscription.endpoint },
        defaults: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
      });
      if (!created) {
        // Update existing subscription with latest keys and userId
        await record.update({ userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth });
      }
      res.status(created ? 201 : 200).json({ message: created ? 'Subscribed to push notifications' : 'Subscription updated' });
    } catch (error) {
      console.error('Push subscribe error:', error);
      res.status(500).json({ error: 'Failed to subscribe' });
    }
  });

  // ── Unread Count (must come before /:messageId routes) ────────────────────

  router.get('/messages/unread-count', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      // Use array containment operator to find conversations where userId is a participant
      // This avoids LIKE cast false positives on UUID substrings
      const conversations = await Conversation.findAll({
        where: { participants: { [Op.contains]: [userId] } },
        attributes: ['id']
      });
      const convIds = conversations.map(c => c.id);

      const count = convIds.length > 0
        ? await Message.count({
            where: {
              conversationId: convIds,
              senderId: { [Op.ne]: userId },
              createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
          })
        : 0;

      return res.json({ unreadCount: count });
    } catch (error) {
      console.error('[GET /messages/unread-count]', error);
      return res.status(500).json({ error: 'Failed to get unread count' });
    }
  });

  // ── Message Reactions ──────────────────────────────────────────────────────

  router.post('/messages/:messageId/reactions', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { messageId } = req.params;
      const { reactionType } = req.body;

      if (!reactionType) return res.status(400).json({ error: 'Reaction type is required' });

      const message = await Message.findByPk(messageId);
      if (!message) return res.status(404).json({ error: 'Message not found' });

      let reaction = await MessageReaction.findOne({ where: { messageId, userId } });
      if (reaction) {
        reaction.reactionType = reactionType;
        await reaction.save();
      } else {
        reaction = await MessageReaction.create({ messageId, userId, reactionType });
        await message.increment('reactionCount');
      }

      io.to(message.conversationId).emit('message-reaction', { messageId, userId, reactionType, action: 'add' });
      res.json(reaction);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to add reaction' });
    }
  });

  router.delete('/messages/:messageId/reactions', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { messageId } = req.params;
      const message = await Message.findByPk(messageId);
      if (!message) return res.status(404).json({ error: 'Message not found' });

      const reaction = await MessageReaction.findOne({ where: { messageId, userId } });
      if (!reaction) return res.status(404).json({ error: 'Reaction not found' });

      await reaction.destroy();
      await message.decrement('reactionCount');
      io.to(message.conversationId).emit('message-reaction', { messageId, userId, action: 'remove' });
      res.json({ message: 'Reaction removed successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to remove reaction' });
    }
  });

  router.get('/messages/:messageId/reactions', async (req, res) => {
    try {
      const { messageId } = req.params;
      const reactions = await MessageReaction.findAll({ where: { messageId }, order: [['createdAt', 'ASC']] });

      const grouped = reactions.reduce((acc, reaction) => {
        const type = reaction.reactionType;
        if (!acc[type]) acc[type] = { reactionType: type, count: 0, users: [] };
        acc[type].count++;
        acc[type].users.push(reaction.userId);
        return acc;
      }, {});

      res.json({ reactions, summary: Object.values(grouped) });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch reactions' });
    }
  });

  // ── Reply & Forward ────────────────────────────────────────────────────────

  router.post('/messages/:messageId/reply', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { messageId } = req.params;
      const { content, attachments, type } = req.body;

      const originalMessage = await Message.findByPk(messageId);
      if (!originalMessage) return res.status(404).json({ error: 'Original message not found' });

      const replyMessage = await Message.create({
        conversationId: originalMessage.conversationId,
        senderId: userId,
        content,
        type: type || 'text',
        attachments: attachments || [],
        replyToId: messageId
      });

      const reply = await Message.findByPk(replyMessage.id, {
        include: [{ model: Message, as: 'replyTo', attributes: ['id', 'senderId', 'content', 'createdAt'] }]
      });

      io.to(originalMessage.conversationId).emit('new-message', reply);
      res.json(reply);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to send reply' });
    }
  });

  router.post('/messages/:messageId/forward', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { messageId } = req.params;
      const { conversationId, additionalContent } = req.body;

      if (!conversationId) return res.status(400).json({ error: 'Conversation ID is required' });

      const originalMessage = await Message.findByPk(messageId);
      if (!originalMessage) return res.status(404).json({ error: 'Original message not found' });

      const targetConversation = await Conversation.findByPk(conversationId);
      if (!targetConversation) return res.status(404).json({ error: 'Target conversation not found' });

      if (!targetConversation.participants.includes(userId)) {
        return res.status(403).json({ error: 'Not a member of target conversation' });
      }

      const forwardedMessage = await Message.create({
        conversationId,
        senderId: userId,
        content: additionalContent || originalMessage.content,
        type: originalMessage.type,
        attachments: originalMessage.attachments || [],
        forwardedFromId: messageId
      });

      const forwarded = await Message.findByPk(forwardedMessage.id, {
        include: [{ model: Message, as: 'forwardedFrom', attributes: ['id', 'senderId', 'content', 'createdAt'] }]
      });

      io.to(conversationId).emit('new-message', forwarded);
      res.json(forwarded);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to forward message' });
    }
  });

  // ── Pin / Unpin ────────────────────────────────────────────────────────────

  router.post('/messages/:messageId/pin', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { messageId } = req.params;
      const message = await Message.findByPk(messageId);
      if (!message) return res.status(404).json({ error: 'Message not found' });

      const conversation = await Conversation.findByPk(message.conversationId);
      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

      const isParticipant = (conversation.participants || []).includes(userId);

      if (conversation.serverId) {
        const server = await Server.findByPk(conversation.serverId);
        if (!server) return res.status(404).json({ error: 'Server not found' });
        if (server.ownerId !== userId) return res.status(403).json({ error: 'Only server owner can pin messages' });
      } else if (!isParticipant) {
        return res.status(403).json({ error: 'Not a participant in this conversation' });
      }

      const existingPin = await PinnedMessage.findOne({ where: { messageId, conversationId: message.conversationId } });
      if (existingPin) return res.status(400).json({ error: 'Message already pinned' });

      const pin = await PinnedMessage.create({ messageId, conversationId: message.conversationId, pinnedBy: userId });
      res.status(201).json(pin);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to pin message' });
    }
  });

  router.delete('/messages/:messageId/pin', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { messageId } = req.params;
      const message = await Message.findByPk(messageId);
      if (!message) return res.status(404).json({ error: 'Message not found' });

      const pin = await PinnedMessage.findOne({ where: { messageId, conversationId: message.conversationId } });
      if (!pin) return res.status(404).json({ error: 'Pinned message not found' });

      const conversation = await Conversation.findByPk(message.conversationId);
      if (conversation && conversation.serverId) {
        const server = await Server.findByPk(conversation.serverId);
        if (server && server.ownerId !== userId && pin.pinnedBy !== userId) {
          return res.status(403).json({ error: 'Not authorized to unpin this message' });
        }
      } else if (pin.pinnedBy !== userId) {
        return res.status(403).json({ error: 'Not authorized to unpin this message' });
      }

      await pin.destroy();
      res.json({ message: 'Message unpinned successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to unpin message' });
    }
  });

  // ── Mark Read ──────────────────────────────────────────────────────────────

  router.post('/messages/:messageId/read', async (req, res) => {
    try {
      const readerId = req.header('x-user-id');
      if (!readerId) return res.status(401).json({ error: 'Authentication required' });

      const msg = await Message.findByPk(req.params.messageId);
      if (!msg) return res.status(404).json({ error: 'Message not found' });

      io.to(msg.conversationId).emit('message-read-receipt', { messageId: msg.id, readerId });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[POST /messages/:id/read]', error);
      return res.status(500).json({ error: 'Failed to mark as read' });
    }
  });

  // ── Delete Message ─────────────────────────────────────────────────────────

  router.delete('/messages/:messageId', async (req, res) => {
    try {
      const senderId = req.header('x-user-id');
      if (!senderId) return res.status(401).json({ error: 'Authentication required' });

      const msg = await Message.findByPk(req.params.messageId);
      if (!msg) return res.status(404).json({ error: 'Message not found' });
      if (msg.senderId !== senderId) return res.status(403).json({ error: 'Not your message' });

      const ageMs = Date.now() - new Date(msg.createdAt).getTime();
      if (ageMs > 15 * 60 * 1000) {
        return res.status(403).json({ error: 'Cannot delete messages older than 15 minutes' });
      }

      await msg.destroy();
      io.to(msg.conversationId).emit('message-deleted', { messageId: msg.id });
      return res.status(204).send();
    } catch (error) {
      console.error('[DELETE /messages/:id]', error);
      return res.status(500).json({ error: 'Failed to delete message' });
    }
  });

  // ── Cancel Scheduled Message ───────────────────────────────────────────────

  router.delete('/scheduled/:id', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const scheduledMessage = await ScheduledMessage.findByPk(req.params.id);
      if (!scheduledMessage) return res.status(404).json({ error: 'Scheduled message not found' });
      if (scheduledMessage.senderId !== userId) {
        return res.status(403).json({ error: 'Not authorized to cancel this scheduled message' });
      }
      if (scheduledMessage.status !== 'pending') {
        return res.status(400).json({ error: 'Can only cancel pending scheduled messages' });
      }

      scheduledMessage.status = 'cancelled';
      await scheduledMessage.save();
      res.json({ message: 'Scheduled message cancelled' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to cancel scheduled message' });
    }
  });

  return router;
};
