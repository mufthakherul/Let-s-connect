'use strict';

/**
 * Channel, server, role, webhook, call, notification, presence, and
 * event-replay routes.
 *
 * Factory signature: createChannelsRouter(deps) → express.Router
 */
const express = require('express');
const crypto = require('crypto');

module.exports = function createChannelsRouter({
  models,
  io,
  redis,
  publishEvent,
  triggerWebhooks,
  getUserPresence,
  sendDigestEmail,
  EVENT_STREAM_KEY,
  BOT_SYSTEM_USER_ID,
  TELEGRAM_BOT_WEBHOOK_TOKEN
}) {
  const {
    Conversation, Message, Server, Role, ServerMember,
    TextChannel, VoiceChannel, ChannelCategory, Webhook,
    Call, Notification, NotificationPreference, Op
  } = models;

  const router = express.Router();

  // ── Helper: generate invite code ───────────────────────────────────────────

  function generateInviteCode() {
    return crypto.randomBytes(6).toString('base64').replace(/[+/=]/g, '').substring(0, 8);
  }

  // ── Helper: persist external/bot messages ─────────────────────────────────

  async function persistExternalMessage({ conversationId, senderId, content, type = 'text', attachments = [] }) {
    const message = await Message.create({ conversationId, senderId, content, type, attachments });
    await Conversation.update(
      { lastMessage: content, lastMessageAt: new Date() },
      { where: { id: conversationId } }
    );
    io.to(conversationId).emit('new-message', message);
    redis.publish('messages', JSON.stringify(message));
    return message;
  }

  // ── Servers ────────────────────────────────────────────────────────────────

  router.post('/servers', async (req, res) => {
    try {
      const { name, description, icon } = req.body;
      const ownerId = req.header('x-user-id');
      if (!ownerId) return res.status(401).json({ error: 'Authentication required to create a server' });

      let inviteCode;
      let attempts = 0;
      while (attempts < 5) {
        inviteCode = generateInviteCode();
        const existing = await Server.findOne({ where: { inviteCode } });
        if (!existing) break;
        attempts++;
      }
      if (attempts === 5) return res.status(500).json({ error: 'Failed to generate unique invite code' });

      const server = await Server.create({ name, description, ownerId, icon, inviteCode });
      await ServerMember.create({ serverId: server.id, userId: ownerId });
      await Role.create({ serverId: server.id, name: '@everyone', permissions: ['read_messages', 'send_messages'], position: 0 });

      res.status(201).json(server);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create server' });
    }
  });

  router.get('/servers/:id', async (req, res) => {
    try {
      const server = await Server.findByPk(req.params.id, {
        include: [{ model: Conversation }, { model: Role }],
        order: [[Role, 'position', 'DESC']]
      });
      if (!server) return res.status(404).json({ error: 'Server not found' });
      res.json(server);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch server' });
    }
  });

  router.get('/users/:userId/servers', async (req, res) => {
    try {
      const members = await ServerMember.findAll({ where: { userId: req.params.userId } });
      const serverIds = members.map(m => m.serverId);
      const servers = await Server.findAll({ where: { id: serverIds }, order: [['createdAt', 'ASC']] });
      res.json(servers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch servers' });
    }
  });

  router.post('/servers/join', async (req, res) => {
    try {
      const { userId, inviteCode } = req.body;
      const server = await Server.findOne({ where: { inviteCode } });
      if (!server) return res.status(404).json({ error: 'Invalid invite code' });

      const existing = await ServerMember.findOne({ where: { serverId: server.id, userId } });
      if (existing) return res.status(400).json({ error: 'Already a member' });

      await ServerMember.create({ serverId: server.id, userId });
      await server.increment('members');
      res.json({ message: 'Joined server successfully', server });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to join server' });
    }
  });

  router.post('/servers/:serverId/channels', async (req, res) => {
    try {
      const { name, type = 'channel' } = req.body;
      const { serverId } = req.params;
      const channel = await Conversation.create({ serverId, name, type, participants: [] });
      res.status(201).json(channel);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create channel' });
    }
  });

  // ── Roles ──────────────────────────────────────────────────────────────────

  router.post('/servers/:serverId/roles', async (req, res) => {
    try {
      const { name, permissions, color, position } = req.body;
      const { serverId } = req.params;
      const role = await Role.create({ serverId, name, permissions, color, position });
      res.status(201).json(role);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create role' });
    }
  });

  router.post('/servers/:serverId/members/:userId/roles', async (req, res) => {
    try {
      const { roleId } = req.body;
      const { serverId, userId } = req.params;

      const member = await ServerMember.findOne({ where: { serverId, userId } });
      if (!member) return res.status(404).json({ error: 'Member not found' });

      const roleIds = member.roleIds || [];
      if (!roleIds.includes(roleId)) {
        roleIds.push(roleId);
        await member.update({ roleIds });
      }
      res.json({ message: 'Role assigned', member });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to assign role' });
    }
  });

  // ── Server Discovery ───────────────────────────────────────────────────────

  router.get('/servers/discover', async (req, res) => {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const offset = (page - 1) * limit;
      const where = { isPublic: true };
      if (search) where.name = { [Op.iLike]: `%${search}%` };

      const servers = await Server.findAll({
        where,
        order: [['members', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        attributes: ['id', 'name', 'description', 'icon', 'members', 'inviteCode']
      });
      res.json(servers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch servers' });
    }
  });

  router.get('/servers/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ error: 'Search query is required' });

      const servers = await Server.findAll({
        where: {
          isPublic: true,
          [Op.or]: [
            { name: { [Op.iLike]: `%${q}%` } },
            { description: { [Op.iLike]: `%${q}%` } }
          ]
        },
        order: [['members', 'DESC']],
        limit: 50,
        attributes: ['id', 'name', 'description', 'icon', 'members', 'inviteCode']
      });
      res.json(servers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to search servers' });
    }
  });

  router.get('/servers/popular', async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const servers = await Server.findAll({
        where: { isPublic: true },
        order: [['members', 'DESC']],
        limit: parseInt(limit),
        attributes: ['id', 'name', 'description', 'icon', 'members', 'inviteCode']
      });
      res.json(servers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch popular servers' });
    }
  });

  router.get('/servers/categories', async (req, res) => {
    try {
      const categories = [
        { name: 'Gaming', count: 0 }, { name: 'Technology', count: 0 },
        { name: 'Entertainment', count: 0 }, { name: 'Education', count: 0 },
        { name: 'Community', count: 0 }, { name: 'Art', count: 0 }
      ];
      res.json(categories);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // ── Text Channels ──────────────────────────────────────────────────────────

  router.get('/servers/:serverId/channels/text', async (req, res) => {
    try {
      const channels = await TextChannel.findAll({
        where: { serverId: req.params.serverId },
        order: [['position', 'ASC'], ['createdAt', 'ASC']]
      });
      res.json(channels);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch text channels' });
    }
  });

  router.post('/servers/:serverId/channels/text', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { serverId } = req.params;
      const { name, topic, categoryId, isPrivate } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });

      const server = await Server.findByPk(serverId);
      if (!server) return res.status(404).json({ error: 'Server not found' });
      if (server.ownerId !== userId) return res.status(403).json({ error: 'Only the server owner can create channels' });

      const channel = await TextChannel.create({ serverId, name, topic, categoryId, isPrivate: isPrivate || false });
      res.status(201).json(channel);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create text channel' });
    }
  });

  router.put('/channels/text/:channelId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { channelId } = req.params;
      const allowedFields = ['name', 'topic', 'position', 'slowModeSeconds'];
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

      const channel = await TextChannel.findByPk(channelId);
      if (!channel) return res.status(404).json({ error: 'Channel not found' });

      const server = await Server.findByPk(channel.serverId);
      if (server.ownerId !== userId) return res.status(403).json({ error: 'Only server owner can update channels' });

      await channel.update(updates);
      res.json(channel);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update text channel' });
    }
  });

  router.delete('/channels/text/:channelId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const channel = await TextChannel.findByPk(req.params.channelId);
      if (!channel) return res.status(404).json({ error: 'Channel not found' });

      const server = await Server.findByPk(channel.serverId);
      if (server.ownerId !== userId) return res.status(403).json({ error: 'Only server owner can delete channels' });

      await channel.destroy();
      res.json({ message: 'Channel deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete text channel' });
    }
  });

  // ── Voice Channels ─────────────────────────────────────────────────────────

  router.get('/servers/:serverId/channels/voice', async (req, res) => {
    try {
      const channels = await VoiceChannel.findAll({
        where: { serverId: req.params.serverId },
        order: [['position', 'ASC'], ['createdAt', 'ASC']]
      });
      res.json(channels);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch voice channels' });
    }
  });

  router.post('/servers/:serverId/channels/voice', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { serverId } = req.params;
      const { name, categoryId, userLimit, bitrate } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });

      const server = await Server.findByPk(serverId);
      if (!server) return res.status(404).json({ error: 'Server not found' });

      if (server.ownerId !== userId) {
        const member = await ServerMember.findOne({ where: { serverId, userId } });
        if (!member) return res.status(403).json({ error: 'Only server members can create channels' });
      }

      const channel = await VoiceChannel.create({ serverId, name, categoryId, userLimit: userLimit || 0, bitrate: bitrate || 64000 });
      res.status(201).json({ ...channel.toJSON(), note: 'Voice channel created. Actual voice functionality requires WebRTC implementation.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create voice channel' });
    }
  });

  router.put('/channels/voice/:channelId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { channelId } = req.params;
      const allowedFields = ['name', 'position', 'userLimit', 'bitrate'];
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

      const channel = await VoiceChannel.findByPk(channelId);
      if (!channel) return res.status(404).json({ error: 'Channel not found' });

      const server = await Server.findByPk(channel.serverId);
      if (server.ownerId !== userId) return res.status(403).json({ error: 'Only server owner can update channels' });

      await channel.update(updates);
      res.json(channel);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update voice channel' });
    }
  });

  router.delete('/channels/voice/:channelId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const channel = await VoiceChannel.findByPk(req.params.channelId);
      if (!channel) return res.status(404).json({ error: 'Channel not found' });

      const server = await Server.findByPk(channel.serverId);
      if (server.ownerId !== userId) return res.status(403).json({ error: 'Only server owner can delete channels' });

      await channel.destroy();
      res.json({ message: 'Channel deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete voice channel' });
    }
  });

  // ── Channel Categories ─────────────────────────────────────────────────────

  router.get('/servers/:serverId/categories', async (req, res) => {
    try {
      const categories = await ChannelCategory.findAll({
        where: { serverId: req.params.serverId },
        order: [['position', 'ASC'], ['createdAt', 'ASC']]
      });
      res.json(categories);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch channel categories' });
    }
  });

  router.post('/servers/:serverId/categories', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { serverId } = req.params;
      const { name, position } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });

      const server = await Server.findByPk(serverId);
      if (!server) return res.status(404).json({ error: 'Server not found' });
      if (server.ownerId !== userId) return res.status(403).json({ error: 'Only server owner can create categories' });

      const category = await ChannelCategory.create({ serverId, name, position: position || 0 });
      res.status(201).json(category);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  });

  router.delete('/categories/:categoryId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const category = await ChannelCategory.findByPk(req.params.categoryId);
      if (!category) return res.status(404).json({ error: 'Category not found' });

      const server = await Server.findByPk(category.serverId);
      if (server.ownerId !== userId) return res.status(403).json({ error: 'Only server owner can delete categories' });

      await category.destroy();
      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  });

  // ── Server Webhooks ────────────────────────────────────────────────────────

  router.get('/servers/:serverId/webhooks', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { serverId } = req.params;
      const server = await Server.findByPk(serverId);
      if (!server) return res.status(404).json({ error: 'Server not found' });
      if (server.ownerId !== userId) return res.status(403).json({ error: 'Only server owner can view webhooks' });

      const webhooks = await Webhook.findAll({ where: { serverId }, order: [['createdAt', 'DESC']] });
      const sanitizedWebhooks = webhooks.map((webhook) => {
        const data = webhook.toJSON ? webhook.toJSON() : webhook;
        if ('token' in data) data.token = '***masked***';
        return data;
      });
      res.json(sanitizedWebhooks);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch webhooks' });
    }
  });

  router.post('/servers/:serverId/webhooks', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { serverId } = req.params;
      const { name, channelId, avatarUrl } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });

      const server = await Server.findByPk(serverId);
      if (!server) return res.status(404).json({ error: 'Server not found' });
      if (server.ownerId !== userId) return res.status(403).json({ error: 'Only server owner can create webhooks' });

      const token = crypto.randomBytes(32).toString('hex');
      const webhook = await Webhook.create({ serverId, channelId, name, token, avatarUrl, createdBy: userId });
      res.status(201).json(webhook);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create webhook' });
    }
  });

  // ── Roles (server-level) ───────────────────────────────────────────────────

  router.get('/servers/:serverId/roles', async (req, res) => {
    try {
      const roles = await Role.findAll({
        where: { serverId: req.params.serverId },
        order: [['position', 'DESC'], ['createdAt', 'ASC']]
      });
      res.json(roles);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  });

  router.put('/roles/:roleId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const allowedFields = ['name', 'color', 'position', 'permissions'];
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

      const role = await Role.findByPk(req.params.roleId);
      if (!role) return res.status(404).json({ error: 'Role not found' });

      const server = await Server.findByPk(role.serverId);
      if (server.ownerId !== userId) return res.status(403).json({ error: 'Only server owner can update roles' });

      await role.update(updates);
      res.json(role);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update role' });
    }
  });

  router.delete('/roles/:roleId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const role = await Role.findByPk(req.params.roleId);
      if (!role) return res.status(404).json({ error: 'Role not found' });

      const server = await Server.findByPk(role.serverId);
      if (server.ownerId !== userId) return res.status(403).json({ error: 'Only server owner can delete roles' });

      await role.destroy();
      res.json({ message: 'Role deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete role' });
    }
  });

  // ── Server CRUD ────────────────────────────────────────────────────────────

  router.put('/servers/:serverId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { serverId } = req.params;
      const allowedFields = ['name', 'description', 'category', 'isPublic', 'icon'];
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

      const server = await Server.findByPk(serverId);
      if (!server) return res.status(404).json({ error: 'Server not found' });
      if (server.ownerId !== userId) return res.status(403).json({ error: 'Only server owner can update server settings' });

      await server.update(updates);
      res.json(server);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update server' });
    }
  });

  router.delete('/servers/:serverId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const server = await Server.findByPk(req.params.serverId);
      if (!server) return res.status(404).json({ error: 'Server not found' });
      if (server.ownerId !== userId) return res.status(403).json({ error: 'Only server owner can delete server' });

      await server.destroy();
      res.json({ message: 'Server deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete server' });
    }
  });

  // ── Webhook Execution & Bot Ingestion ─────────────────────────────────────

  router.post('/webhooks/:webhookId/:token', async (req, res) => {
    try {
      const { webhookId, token } = req.params;
      const {
        content,
        embeds,
        channelId,
        username,
        avatar_url,
        tts = false,
        allowed_mentions
      } = req.body || {};

      // Validate that at least content or embeds is provided
      if (!content && (!Array.isArray(embeds) || embeds.length === 0)) {
        return res.status(400).json({ error: 'content or embeds is required' });
      }

      // Verify webhook exists and token matches
      const webhook = await Webhook.findByPk(webhookId);
      if (!webhook || webhook.token !== token) {
        return res.status(401).json({ error: 'Invalid webhook token' });
      }

      // Find target conversation/channel
      let conversation = null;
      if (channelId) conversation = await Conversation.findByPk(channelId);
      if (!conversation && webhook.channelId) conversation = await Conversation.findByPk(webhook.channelId);
      if (!conversation) {
        conversation = await Conversation.findOne({ where: { serverId: webhook.serverId } });
        if (!conversation) {
          conversation = await Conversation.create({
            serverId: webhook.serverId,
            name: `${webhook.name || 'Webhook'} Channel`,
            type: 'channel',
            participants: []
          });
        }
      }

      // Process Discord embeds if present
      let messageData = {
        conversationId: conversation.id,
        senderId: webhook.createdBy || BOT_SYSTEM_USER_ID,
        type: 'text',
        content: '',
        attachments: []
      };

      // Format Discord-style embeds
      if (Array.isArray(embeds) && embeds.length > 0) {
        const formattedEmbeds = embeds.slice(0, 10).map(embed => {
          const formatted = {};

          // Discord embed properties
          if (embed.title) formatted.title = String(embed.title).substring(0, 256);
          if (embed.description) formatted.description = String(embed.description).substring(0, 4096);
          if (embed.url) formatted.url = embed.url;
          if (embed.timestamp) formatted.timestamp = embed.timestamp;
          if (embed.color) formatted.color = embed.color;

          // Footer
          if (embed.footer) {
            formatted.footer = {
              text: String(embed.footer.text || '').substring(0, 2048),
              icon_url: embed.footer.icon_url
            };
          }

          // Image
          if (embed.image) {
            formatted.image = { url: embed.image.url };
          }

          // Thumbnail
          if (embed.thumbnail) {
            formatted.thumbnail = { url: embed.thumbnail.url };
          }

          // Video
          if (embed.video) {
            formatted.video = { url: embed.video.url };
          }

          // Author
          if (embed.author) {
            formatted.author = {
              name: String(embed.author.name || '').substring(0, 256),
              url: embed.author.url,
              icon_url: embed.author.icon_url
            };
          }

          // Fields
          if (Array.isArray(embed.fields)) {
            formatted.fields = embed.fields.slice(0, 25).map(field => ({
              name: String(field.name || '').substring(0, 256),
              value: String(field.value || '').substring(0, 1024),
              inline: Boolean(field.inline)
            }));
          }

          return formatted;
        });

        // Store embeds in attachments array
        messageData.attachments = [{
          type: 'discord_embeds',
          embeds: formattedEmbeds
        }];
      }

      // Set message content
      if (content) {
        messageData.content = String(content).trim().substring(0, 2000);
      } else if (messageData.attachments.length > 0) {
        // If only embeds, create a preview text
        const embed = messageData.attachments[0].embeds[0];
        messageData.content = embed.title || embed.description || '[Embedded content]';
      }

      // Validate content
      if (!messageData.content) {
        return res.status(400).json({ error: 'message content is empty' });
      }

      // Override webhook username/avatar if provided
      if (username) {
        messageData.webhookUsername = String(username).substring(0, 80);
      } else if (webhook.name) {
        messageData.webhookUsername = webhook.name;
      }

      if (avatar_url) {
        messageData.webhookAvatar = avatar_url;
      } else if (webhook.avatarUrl) {
        messageData.webhookAvatar = webhook.avatarUrl;
      }

      // Store TTS flag
      if (tts) {
        messageData.tts = true;
      }

      // Store allowed mentions
      if (allowed_mentions) {
        messageData.allowedMentions = allowed_mentions;
      }

      // Create message
      const message = await Message.create(messageData);

      // Update conversation
      await Conversation.update(
        { lastMessage: messageData.content, lastMessageAt: new Date() },
        { where: { id: conversation.id } }
      );

      // Emit real-time event with full embed data
      io.to(conversation.id).emit('new-message', {
        ...message.toJSON(),
        webhookUsername: messageData.webhookUsername,
        webhookAvatar: messageData.webhookAvatar
      });

      // Publish to Redis
      redis.publish('messages', JSON.stringify({
        ...message.toJSON(),
        webhookUsername: messageData.webhookUsername,
        webhookAvatar: messageData.webhookAvatar
      }));

      return res.status(200).json({
        id: message.id,
        conversationId: conversation.id,
        channelId: conversation.id,
        delivered: true,
        timestamp: message.createdAt
      });
    } catch (error) {
      console.error('Discord webhook execution failed:', error);
      return res.status(500).json({ error: 'Failed to execute webhook' });
    }
  });

  router.post('/bots/telegram/webhook/:botToken', async (req, res) => {
    try {
      const { botToken } = req.params;
      if (!TELEGRAM_BOT_WEBHOOK_TOKEN || botToken !== TELEGRAM_BOT_WEBHOOK_TOKEN) {
        return res.status(401).json({ error: 'Invalid bot token' });
      }

      const update = req.body || {};
      const messageUpdate = update.message || update.edited_message || null;
      if (!messageUpdate) return res.status(200).json({ ok: true, ignored: true });

      const chatId = String(messageUpdate?.chat?.id || '').trim();
      const text = String(messageUpdate?.text || messageUpdate?.caption || '').trim();
      if (!chatId || !text) return res.status(400).json({ error: 'chat.id and text are required in update payload' });
      if (text.length > 4000) return res.status(400).json({ error: 'message text too long' });

      const conversationName = `tg:${chatId}`;
      let conversation = await Conversation.findOne({ where: { name: conversationName, type: 'group' } });
      if (!conversation) {
        conversation = await Conversation.create({ name: conversationName, type: 'group', participants: [BOT_SYSTEM_USER_ID] });
      }

      const persisted = await persistExternalMessage({
        conversationId: conversation.id,
        senderId: BOT_SYSTEM_USER_ID,
        content: text,
        type: 'text'
      });

      return res.status(200).json({ ok: true, messageId: persisted.id, conversationId: conversation.id });
    } catch (error) {
      console.error('Telegram webhook ingestion failed:', error);
      return res.status(500).json({ error: 'Failed to process telegram webhook payload' });
    }
  });

  // ── Webhook Management (Phase 14.3) ───────────────────────────────────────

  router.get('/webhooks', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const webhooks = await Webhook.findAll({ where: { createdBy: userId } });
      res.json(webhooks.map(w => ({ ...w.toJSON(), token: w.token ? `${w.token.substring(0, 8)}...` : null })));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to list webhooks' });
    }
  });

  router.post('/webhooks', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { name, endpoint, serverId, channelId } = req.body;
      if (!name || !endpoint) return res.status(400).json({ error: 'name and endpoint required' });

      try {
        const url = new URL(endpoint);
        if (url.protocol !== 'https:') return res.status(400).json({ error: 'Endpoint must use HTTPS' });
      } catch {
        return res.status(400).json({ error: 'Invalid endpoint URL' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const webhook = await Webhook.create({
        name, serverId, channelId, token, createdBy: userId,
        avatarUrl: endpoint
      });
      res.status(201).json({ ...webhook.toJSON(), token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create webhook' });
    }
  });

  router.delete('/webhooks/:webhookId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const webhook = await Webhook.findByPk(req.params.webhookId);
      if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

      // Allow deletion by server owner OR webhook creator
      const server = await Server.findByPk(webhook.serverId);
      const isServerOwner = server && server.ownerId === userId;
      const isCreator = webhook.createdBy === userId;

      if (!isServerOwner && !isCreator) return res.status(403).json({ error: 'Not authorized' });

      await webhook.destroy();
      res.json({ message: 'Webhook deleted' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete webhook' });
    }
  });

  router.post('/webhooks/:webhookId/test', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const webhook = await Webhook.findByPk(req.params.webhookId);
      if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
      if (webhook.createdBy !== userId) return res.status(403).json({ error: 'Not authorized' });

      await triggerWebhooks('webhook.test', { webhookId: webhook.id, message: 'Test delivery from Milonexa' });
      res.json({ message: 'Test webhook dispatched' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to test webhook' });
    }
  });

  // ── Calls ──────────────────────────────────────────────────────────────────

  router.get('/calls/ice-servers', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ];
      res.json({ iceServers });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch ICE servers' });
    }
  });

  router.get('/calls/history', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { limit = 20, offset = 0 } = req.query;
      const whereClause = { [Op.or]: [{ callerId: userId }, { recipientId: userId }] };
      const calls = await Call.findAll({ where: whereClause, order: [['createdAt', 'DESC']], limit: parseInt(limit), offset: parseInt(offset) });
      const total = await Call.count({ where: whereClause });
      res.json({ calls, total });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch call history' });
    }
  });

  router.post('/calls/initiate', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { recipientId, type, offer } = req.body;
      if (!recipientId || !type) return res.status(400).json({ error: 'recipientId and type are required' });
      if (!['audio', 'video'].includes(type)) return res.status(400).json({ error: 'type must be audio or video' });

      const call = await Call.create({ callerId: userId, recipientId, type, status: 'initiated', offer: offer || null, startedAt: new Date() });
      io.emit(`incoming-call-${recipientId}`, { callId: call.id, callerId: userId, type, offer });
      res.json({ callId: call.id, status: call.status });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to initiate call' });
    }
  });

  router.post('/calls/:callId/accept', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const call = await Call.findByPk(req.params.callId);
      if (!call) return res.status(404).json({ error: 'Call not found' });
      if (call.recipientId !== userId) return res.status(403).json({ error: 'Not authorized to accept this call' });

      await call.update({ status: 'active', answer: req.body.answer || null, startedAt: new Date() });
      io.emit(`call-accepted-${call.callerId}`, { callId: call.id, answer: req.body.answer });
      res.json({ callId: call.id, status: call.status });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to accept call' });
    }
  });

  router.post('/calls/:callId/reject', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const call = await Call.findByPk(req.params.callId);
      if (!call) return res.status(404).json({ error: 'Call not found' });
      if (call.recipientId !== userId) return res.status(403).json({ error: 'Not authorized to reject this call' });

      await call.update({ status: 'rejected', endedAt: new Date() });
      io.emit(`call-rejected-${call.callerId}`, { callId: call.id });
      res.json({ callId: call.id, status: call.status });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to reject call' });
    }
  });

  router.post('/calls/:callId/end', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const call = await Call.findByPk(req.params.callId);
      if (!call) return res.status(404).json({ error: 'Call not found' });
      if (call.callerId !== userId && call.recipientId !== userId) {
        return res.status(403).json({ error: 'Not authorized to end this call' });
      }

      await call.update({ status: 'ended', duration: req.body.duration || 0, endedAt: new Date() });
      io.emit(`call-ended-${call.callerId}`, { callId: call.id });
      io.emit(`call-ended-${call.recipientId}`, { callId: call.id });
      res.json({ callId: call.id, status: call.status, duration: call.duration });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to end call' });
    }
  });

  router.post('/calls/:callId/screen-sharing', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const call = await Call.findByPk(req.params.callId);
      if (!call) return res.status(404).json({ error: 'Call not found' });
      if (call.callerId !== userId && call.recipientId !== userId) {
        return res.status(403).json({ error: 'Not authorized to modify this call' });
      }

      const { enabled } = req.body;
      await call.update({ isScreenSharing: enabled });
      const otherPartyId = call.callerId === userId ? call.recipientId : call.callerId;
      io.emit(`screen-sharing-${otherPartyId}`, { callId: call.id, enabled, userId });
      res.json({ callId: call.id, isScreenSharing: call.isScreenSharing });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to toggle screen sharing' });
    }
  });

  router.post('/calls/:callId/recording', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const call = await Call.findByPk(req.params.callId);
      if (!call) return res.status(404).json({ error: 'Call not found' });
      if (call.callerId !== userId && call.recipientId !== userId) {
        return res.status(403).json({ error: 'Not authorized to record this call' });
      }

      const { action } = req.body;
      if (action === 'start') {
        await call.update({ isRecording: true });
        const otherPartyId = call.callerId === userId ? call.recipientId : call.callerId;
        io.emit(`recording-started-${otherPartyId}`, { callId: call.id, startedBy: userId });
        res.json({ callId: call.id, isRecording: true, message: 'Recording started. Other party has been notified.' });
      } else if (action === 'stop') {
        const recordingUrl = `recordings/${call.id}-${Date.now()}.webm`;
        await call.update({ isRecording: false, recordingUrl });
        res.json({ callId: call.id, isRecording: false, recordingUrl: call.recordingUrl, message: 'Recording stopped and saved.' });
      } else {
        return res.status(400).json({ error: 'action must be start or stop' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to manage recording' });
    }
  });

  router.post('/calls/:callId/quality', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const call = await Call.findByPk(req.params.callId);
      if (!call) return res.status(404).json({ error: 'Call not found' });
      if (call.callerId !== userId && call.recipientId !== userId) {
        return res.status(403).json({ error: 'Not authorized to update this call' });
      }

      const { bitrate, packetLoss, jitter, latency } = req.body;

      let networkQuality = 'excellent';
      if (packetLoss > 5 || latency > 300 || jitter > 50) networkQuality = 'poor';
      else if (packetLoss > 2 || latency > 200 || jitter > 30) networkQuality = 'fair';
      else if (packetLoss > 0.5 || latency > 100 || jitter > 15) networkQuality = 'good';

      const qualityMetrics = { bitrate: bitrate || 0, packetLoss: packetLoss || 0, jitter: jitter || 0, latency: latency || 0, timestamp: new Date() };
      await call.update({ qualityMetrics, networkQuality });

      const otherPartyId = call.callerId === userId ? call.recipientId : call.callerId;
      io.emit(`quality-update-${otherPartyId}`, { callId: call.id, networkQuality, qualityMetrics });
      res.json({ callId: call.id, networkQuality: call.networkQuality, qualityMetrics: call.qualityMetrics });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update call quality' });
    }
  });

  router.get('/calls/:callId/recording', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const call = await Call.findByPk(req.params.callId);
      if (!call) return res.status(404).json({ error: 'Call not found' });
      if (call.callerId !== userId && call.recipientId !== userId) {
        return res.status(403).json({ error: 'Not authorized to access this recording' });
      }
      if (!call.recordingUrl) return res.status(404).json({ error: 'No recording available for this call' });

      res.json({ callId: call.id, recordingUrl: call.recordingUrl, duration: call.duration, createdAt: call.createdAt });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch recording' });
    }
  });

  // ── Notifications ──────────────────────────────────────────────────────────

  router.get('/notifications/replay', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const notifications = await Notification.findAll({
        where: { userId, createdAt: { [Op.gte]: since } },
        order: [['createdAt', 'ASC']],
        limit: 200
      });
      res.json({ notifications, replayed: notifications.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to replay notifications' });
    }
  });

  router.get('/notifications/preferences', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      let preferences = await NotificationPreference.findOne({ where: { userId } });
      if (!preferences) preferences = await NotificationPreference.create({ userId });
      res.json({ preferences });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch preferences' });
    }
  });

  router.put('/notifications/preferences', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const allowedFields = [
        'enableMessages', 'enableMentions', 'enableReplies', 'enableReactions',
        'enableCalls', 'enableFriendRequests', 'enableServerInvites',
        'enableRoleUpdates', 'enableSystem', 'enableAnnouncements',
        'enablePushNotifications', 'enableEmailDigest', 'digestFrequency',
        'quietHoursStart', 'quietHoursEnd'
      ];
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

      let preferences = await NotificationPreference.findOne({ where: { userId } });
      if (!preferences) preferences = await NotificationPreference.create({ userId, ...updates });
      else await preferences.update(updates);

      res.json({ preferences });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  router.put('/notifications/read-all', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      await Notification.update({ isRead: true, readAt: new Date() }, { where: { userId, isRead: false } });
      res.json({ message: 'All notifications marked as read', unreadCount: 0 });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to mark all as read' });
    }
  });

  router.delete('/notifications/clear-read', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const deleted = await Notification.destroy({ where: { userId, isRead: true } });
      res.json({ message: 'Read notifications cleared', deletedCount: deleted });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to clear notifications' });
    }
  });

  router.post('/notifications/digest/trigger', async (req, res) => {
    const internalToken = req.header('x-internal-token');
    if (!internalToken || internalToken !== process.env.INTERNAL_NOTIFICATION_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized — internal token required' });
    }
    try {
      const { userId, email } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId required' });

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const notifications = await Notification.findAll({
        where: { userId, isRead: false, createdAt: { [Op.gte]: since } },
        limit: 20
      });
      const sent = await sendDigestEmail(userId, email, notifications);
      res.json({ sent, count: notifications.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Digest trigger failed' });
    }
  });

  router.get('/notifications', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { limit = 50, offset = 0, unreadOnly = false, type } = req.query;
      const whereClause = { userId };
      if (unreadOnly === 'true') whereClause.isRead = false;
      if (type) whereClause.type = type;

      const notifications = await Notification.findAll({ where: whereClause, order: [['createdAt', 'DESC']], limit: parseInt(limit), offset: parseInt(offset) });
      const total = await Notification.count({ where: whereClause });
      const unreadCount = await Notification.count({ where: { userId, isRead: false } });
      res.json({ notifications, total, unreadCount, hasMore: total > parseInt(offset) + parseInt(limit) });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  router.post('/notifications', async (req, res) => {
    try {
      const internalToken = req.header('x-internal-token');
      if (!internalToken || internalToken !== process.env.INTERNAL_NOTIFICATION_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized - internal service token required' });
      }

      const { userId, type, title, body, actionUrl, metadata, priority } = req.body;
      if (!userId || !type || !title || !body) {
        return res.status(400).json({ error: 'userId, type, title, and body are required' });
      }

      let preferences = await NotificationPreference.findOne({ where: { userId } });
      if (!preferences) preferences = await NotificationPreference.create({ userId });

      const typeFieldMap = {
        message: 'enableMessages', mention: 'enableMentions', reply: 'enableReplies',
        reaction: 'enableReactions', call: 'enableCalls', friend_request: 'enableFriendRequests',
        server_invite: 'enableServerInvites', role_update: 'enableRoleUpdates',
        system: 'enableSystem', announcement: 'enableAnnouncements'
      };

      const typeKey = typeFieldMap[type];
      if (typeKey && preferences[typeKey] === false) {
        return res.json({ message: 'Notification blocked by user preferences', delivered: false });
      }

      const notification = await Notification.create({ userId, type, title, body, actionUrl, metadata, priority: priority || 'normal' });
      io.to(`user-${userId}`).emit('notification', {
        id: notification.id, type: notification.type, title: notification.title,
        body: notification.body, actionUrl: notification.actionUrl, metadata: notification.metadata,
        priority: notification.priority, createdAt: notification.createdAt
      });

      res.json({ notification, delivered: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create notification' });
    }
  });

  router.put('/notifications/:notificationId/read', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const notification = await Notification.findByPk(req.params.notificationId);
      if (!notification) return res.status(404).json({ error: 'Notification not found' });
      if (notification.userId !== userId) return res.status(403).json({ error: 'Not authorized' });

      await notification.update({ isRead: true, readAt: new Date() });
      const unreadCount = await Notification.count({ where: { userId, isRead: false } });
      res.json({ notification, unreadCount });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  router.delete('/notifications/:notificationId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const notification = await Notification.findByPk(req.params.notificationId);
      if (!notification) return res.status(404).json({ error: 'Notification not found' });
      if (notification.userId !== userId) return res.status(403).json({ error: 'Not authorized' });

      await notification.destroy();
      res.json({ message: 'Notification deleted' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  });

  // ── Presence ───────────────────────────────────────────────────────────────

  router.get('/presence/:userId', async (req, res) => {
    try {
      const presence = await getUserPresence(req.params.userId);
      res.json(presence);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get presence' });
    }
  });

  router.post('/presence/batch', async (req, res) => {
    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds)) return res.status(400).json({ error: 'userIds array required' });

      const result = {};
      await Promise.all(userIds.map(async (id) => { result[id] = await getUserPresence(id); }));
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get batch presence' });
    }
  });

  // ── Event Replay ───────────────────────────────────────────────────────────

  router.get('/events/replay', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const lastEventId = req.query.lastEventId || '0';
      const count = Math.min(parseInt(req.query.count || '100'), 500);
      const entries = await redis.xrange(EVENT_STREAM_KEY, lastEventId === '0' ? '-' : lastEventId, '+', 'COUNT', count);

      const events = (entries || []).map(([id, fields]) => {
        const obj = { id };
        for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1];
        try { obj.data = JSON.parse(obj.payload || '{}'); } catch { obj.data = {}; }
        return obj;
      });

      res.json({ events, count: events.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to replay events' });
    }
  });

  return router;
};
