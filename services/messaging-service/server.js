const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Sequelize, DataTypes, Op } = require('sequelize');
const Redis = require('ioredis');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 8003;

app.use(express.json());

// Database
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/messages', {
  dialect: 'postgres',
  logging: false
});

// Redis for pub/sub
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
const redisSub = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// Models
const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  serverId: DataTypes.UUID, // Discord-inspired: conversations can belong to servers
  name: DataTypes.STRING,
  topic: DataTypes.TEXT, // Channel topic
  type: {
    type: DataTypes.ENUM('direct', 'group', 'channel'),
    defaultValue: 'direct'
  },
  participants: DataTypes.ARRAY(DataTypes.UUID),
  lastMessage: DataTypes.TEXT,
  lastMessageAt: DataTypes.DATE
});

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  content: DataTypes.TEXT,
  type: {
    type: DataTypes.ENUM('text', 'image', 'video', 'file', 'voice'),
    defaultValue: 'text'
  },
  attachments: DataTypes.ARRAY(DataTypes.STRING),
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Phase 2: Reply/Forward support
  replyToId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  forwardedFromId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  reactionCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

Conversation.hasMany(Message, { foreignKey: 'conversationId' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

// NEW: Discord-inspired Server Model
const Server = sequelize.define('Server', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  category: {
    type: DataTypes.STRING,
    defaultValue: 'general'
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  icon: DataTypes.STRING,
  members: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  inviteCode: DataTypes.STRING,
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// NEW: Discord-inspired Role Model
const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  serverId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  permissions: DataTypes.ARRAY(DataTypes.STRING),
  color: DataTypes.STRING,
  position: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// NEW: Server Member Model
const ServerMember = sequelize.define('ServerMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  serverId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  roleIds: DataTypes.ARRAY(DataTypes.UUID),
  nickname: DataTypes.STRING
});

// NEW: Phase 1 - Enhanced Text Channel Model (Discord-style)
const TextChannel = sequelize.define('TextChannel', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  serverId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  topic: DataTypes.TEXT,
  categoryId: DataTypes.UUID, // Channel category for organization
  position: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isPrivate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  slowModeSeconds: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// NEW: Phase 1 - Voice Channel Placeholder Model (Discord-style)
const VoiceChannel = sequelize.define('VoiceChannel', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  serverId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  categoryId: DataTypes.UUID,
  position: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  userLimit: {
    type: DataTypes.INTEGER,
    defaultValue: 0 // 0 means unlimited
  },
  bitrate: {
    type: DataTypes.INTEGER,
    defaultValue: 64000 // in bits per second
  }
});

// NEW: Phase 1 - Channel Category Model
const ChannelCategory = sequelize.define('ChannelCategory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  serverId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  position: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// NEW: Phase 1 - Pinned Message Model
const PinnedMessage = sequelize.define('PinnedMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  messageId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  pinnedBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['messageId', 'conversationId']
    }
  ]
});

// NEW: Phase 1 - Webhook Model (Discord-style)
const Webhook = sequelize.define('Webhook', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  serverId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  channelId: DataTypes.UUID,
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false
  },
  avatarUrl: DataTypes.STRING,
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
});

// NEW: Phase 2 - Message Reaction Model (WhatsApp/Telegram-inspired)
const MessageReaction = sequelize.define('MessageReaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  messageId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  reactionType: {
    type: DataTypes.STRING,
    allowNull: false,
    // Support: 👍 👎 ❤️ 😂 😮 😢 😡 🎉 🔥 etc.
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['messageId', 'userId']
    }
  ]
});

// Phase 4: WebRTC Call Model
const Call = sequelize.define('Call', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  callerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  recipientId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('audio', 'video'),
    allowNull: false,
    defaultValue: 'audio'
  },
  status: {
    type: DataTypes.ENUM('initiated', 'ringing', 'active', 'ended', 'rejected', 'missed'),
    allowNull: false,
    defaultValue: 'initiated'
  },
  offer: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  answer: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Call duration in seconds'
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Phase 6: Enhanced WebRTC features
  isScreenSharing: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether screen sharing is active'
  },
  isRecording: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether call is being recorded'
  },
  recordingUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL to recorded call file'
  },
  qualityMetrics: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Call quality metrics (bitrate, packet loss, jitter, latency)'
  },
  networkQuality: {
    type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor', 'disconnected'),
    defaultValue: 'good',
    comment: 'Overall network quality indicator'
  }
}, {
  indexes: [
    {
      fields: ['callerId']
    },
    {
      fields: ['recipientId']
    },
    {
      fields: ['status']
    }
  ]
});

// Phase 6: Notification System
const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'User who receives the notification'
  },
  type: {
    type: DataTypes.ENUM(
      'message', 'mention', 'reply', 'reaction',
      'call', 'friend_request', 'server_invite',
      'role_update', 'system', 'announcement'
    ),
    allowNull: false,
    defaultValue: 'system'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  actionUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL to navigate to when notification is clicked'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional data (senderId, serverId, channelId, etc.)'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When notification should be auto-deleted'
  }
}, {
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['userId', 'isRead']
    },
    {
      fields: ['type']
    },
    {
      fields: ['createdAt']
    }
  ]
});

// Phase 6: Notification Preferences
const NotificationPreference = sequelize.define('NotificationPreference', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true
  },
  enableMessages: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  enableMentions: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  enableReplies: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  enableReactions: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  enableCalls: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  enableFriendRequests: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  enableServerInvites: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  enableRoleUpdates: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  enableSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  enableAnnouncements: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  enablePushNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Web Push API notifications'
  },
  enableEmailDigest: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  digestFrequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'never'),
    defaultValue: 'never'
  },
  quietHoursStart: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Start time for quiet hours (HH:MM)'
  },
  quietHoursEnd: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'End time for quiet hours (HH:MM)'
  }
}, {
  indexes: [
    {
      fields: ['userId']
    }
  ]
});

// Relationships
Server.hasMany(Conversation, { foreignKey: 'serverId' });
Server.hasMany(Role, { foreignKey: 'serverId' });
Server.hasMany(ServerMember, { foreignKey: 'serverId' });
Server.hasMany(TextChannel, { foreignKey: 'serverId' });
Server.hasMany(VoiceChannel, { foreignKey: 'serverId' });
Server.hasMany(ChannelCategory, { foreignKey: 'serverId' });
Server.hasMany(Webhook, { foreignKey: 'serverId' });
ChannelCategory.hasMany(TextChannel, { foreignKey: 'categoryId' });
ChannelCategory.hasMany(VoiceChannel, { foreignKey: 'categoryId' });
Conversation.hasMany(PinnedMessage, { foreignKey: 'conversationId' });
Message.hasOne(PinnedMessage, { foreignKey: 'messageId' });
PinnedMessage.belongsTo(Message, { foreignKey: 'messageId' });
PinnedMessage.belongsTo(Conversation, { foreignKey: 'conversationId' });

// Phase 2: Message reactions and reply/forward relationships
Message.hasMany(MessageReaction, { foreignKey: 'messageId', as: 'reactions' });
MessageReaction.belongsTo(Message, { foreignKey: 'messageId' });
Message.belongsTo(Message, { as: 'replyTo', foreignKey: 'replyToId' });
Message.belongsTo(Message, { as: 'forwardedFrom', foreignKey: 'forwardedFromId' });

const shouldAlterSchema = process.env.DB_SYNC_ALTER === 'true' || process.env.NODE_ENV !== 'production';
const shouldForceSchema = process.env.DB_SYNC_FORCE === 'true';

// Socket.IO for real-time messaging
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-conversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`User ${socket.id} joined conversation ${conversationId}`);
  });

  socket.on('send-message', async (data) => {
    try {
      const message = await Message.create({
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: data.content,
        type: data.type,
        attachments: data.attachments,
        // Phase 2: Support reply and forward
        replyToId: data.replyToId || null,
        forwardedFromId: data.forwardedFromId || null
      });

      await Conversation.update(
        { lastMessage: data.content, lastMessageAt: new Date() },
        { where: { id: data.conversationId } }
      );

      // Fetch message with relations for reply/forward
      const messageWithRelations = await Message.findByPk(message.id, {
        include: [
          {
            model: Message,
            as: 'replyTo',
            attributes: ['id', 'senderId', 'content', 'createdAt']
          },
          {
            model: Message,
            as: 'forwardedFrom',
            attributes: ['id', 'senderId', 'content', 'createdAt']
          }
        ]
      });

      // Broadcast to conversation room
      io.to(data.conversationId).emit('new-message', messageWithRelations);

      // Publish to Redis for scaling
      redis.publish('messages', JSON.stringify(messageWithRelations));
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  socket.on('typing', (data) => {
    socket.to(data.conversationId).emit('user-typing', {
      userId: data.userId,
      conversationId: data.conversationId
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Subscribe to Redis messages for scaling
redisSub.subscribe('messages');
redisSub.on('message', (channel, message) => {
  if (channel === 'messages') {
    const msg = JSON.parse(message);
    io.to(msg.conversationId).emit('new-message', msg);
  }
});

// REST API Routes

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'messaging-service' });
});

// Get conversations for user
app.get('/conversations/:userId', async (req, res) => {
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

// Create conversation
app.post('/conversations', async (req, res) => {
  try {
    const { name, type, participants } = req.body;

    const conversation = await Conversation.create({
      name,
      type,
      participants
    });

    res.status(201).json(conversation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get messages in conversation
app.get('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const messages = await Message.findAll({
      where: { conversationId: req.params.conversationId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      // Phase 2: Include reactions and reply/forward data
      include: [
        {
          model: MessageReaction,
          as: 'reactions',
          attributes: ['id', 'userId', 'reactionType', 'createdAt']
        },
        {
          model: Message,
          as: 'replyTo',
          attributes: ['id', 'senderId', 'content', 'createdAt']
        },
        {
          model: Message,
          as: 'forwardedFrom',
          attributes: ['id', 'senderId', 'content', 'createdAt']
        }
      ]
    });

    res.json(messages.reverse());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ========== DISCORD-INSPIRED: SERVERS ==========

// Helper: Generate secure invite code
function generateInviteCode() {
  return crypto.randomBytes(6).toString('base64').replace(/[+/=]/g, '').substring(0, 8);
}

// Create server
app.post('/servers', async (req, res) => {
  try {
    const { name, description, icon } = req.body;

    // Get authenticated user ID from header set by gateway
    const ownerId = req.header('x-user-id');
    if (!ownerId) {
      return res.status(401).json({ error: 'Authentication required to create a server' });
    }

    // Generate secure invite code with uniqueness check
    let inviteCode;
    let attempts = 0;
    while (attempts < 5) {
      inviteCode = generateInviteCode();
      const existing = await Server.findOne({ where: { inviteCode } });
      if (!existing) break;
      attempts++;
    }

    if (attempts === 5) {
      return res.status(500).json({ error: 'Failed to generate unique invite code' });
    }

    const server = await Server.create({
      name,
      description,
      ownerId,
      icon,
      inviteCode
    });

    // Add owner as member
    await ServerMember.create({
      serverId: server.id,
      userId: ownerId
    });

    // Create default role
    await Role.create({
      serverId: server.id,
      name: '@everyone',
      permissions: ['read_messages', 'send_messages'],
      position: 0
    });

    res.status(201).json(server);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create server' });
  }
});

// Get server
app.get('/servers/:id', async (req, res) => {
  try {
    const server = await Server.findByPk(req.params.id, {
      include: [
        { model: Conversation },
        { model: Role }
      ],
      order: [[Role, 'position', 'DESC']]
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    res.json(server);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch server' });
  }
});

// Get user's servers
app.get('/users/:userId/servers', async (req, res) => {
  try {
    const members = await ServerMember.findAll({
      where: { userId: req.params.userId }
    });

    const serverIds = members.map(m => m.serverId);
    const servers = await Server.findAll({
      where: { id: serverIds },
      order: [['createdAt', 'ASC']]
    });

    res.json(servers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch servers' });
  }
});

// Join server by invite code
app.post('/servers/join', async (req, res) => {
  try {
    const { userId, inviteCode } = req.body;

    const server = await Server.findOne({ where: { inviteCode } });
    if (!server) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Check if already member
    const existing = await ServerMember.findOne({
      where: { serverId: server.id, userId }
    });

    if (existing) {
      return res.status(400).json({ error: 'Already a member' });
    }

    await ServerMember.create({
      serverId: server.id,
      userId
    });

    await server.increment('members');

    res.json({ message: 'Joined server successfully', server });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to join server' });
  }
});

// Create channel in server
app.post('/servers/:serverId/channels', async (req, res) => {
  try {
    const { name, type = 'channel' } = req.body;
    const { serverId } = req.params;

    const channel = await Conversation.create({
      serverId,
      name,
      type,
      participants: []
    });

    res.status(201).json(channel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// ========== DISCORD-INSPIRED: ROLES ==========

// Create role
app.post('/servers/:serverId/roles', async (req, res) => {
  try {
    const { name, permissions, color, position } = req.body;
    const { serverId } = req.params;

    const role = await Role.create({
      serverId,
      name,
      permissions,
      color,
      position
    });

    res.status(201).json(role);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Assign role to member
app.post('/servers/:serverId/members/:userId/roles', async (req, res) => {
  try {
    const { roleId } = req.body;
    const { serverId, userId } = req.params;

    const member = await ServerMember.findOne({
      where: { serverId, userId }
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Add role if not already assigned
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

// ========== SERVER DISCOVERY ENDPOINTS (Discord-inspired) ==========

// Get all public servers (discovery)
app.get('/servers/discover', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    const where = { isPublic: true };
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    const servers = await Server.findAll({
      where,
      order: [['members', 'DESC']], // Sort by popularity
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

// Search servers
app.get('/servers/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

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

// Get popular servers
app.get('/servers/popular', async (req, res) => {
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

// Get server categories (simplified - using description as category for now)
app.get('/servers/categories', async (req, res) => {
  try {
    // This is a simplified implementation
    // In a full implementation, you'd have a separate categories table
    const categories = [
      { name: 'Gaming', count: 0 },
      { name: 'Technology', count: 0 },
      { name: 'Entertainment', count: 0 },
      { name: 'Education', count: 0 },
      { name: 'Community', count: 0 },
      { name: 'Art', count: 0 }
    ];

    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ============================================
// Phase 1 New Endpoints - Enhanced Discord Channels
// ============================================

// Text Channels - Get all text channels in a server
app.get('/servers/:serverId/channels/text', async (req, res) => {
  try {
    const { serverId } = req.params;

    const channels = await TextChannel.findAll({
      where: { serverId },
      order: [['position', 'ASC'], ['createdAt', 'ASC']]
    });

    res.json(channels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch text channels' });
  }
});

// Create a text channel
app.post('/servers/:serverId/channels/text', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { serverId } = req.params;
    const { name, topic, categoryId, isPrivate } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // Verify user is server owner
    const server = await Server.findByPk(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only the server owner can create channels' });
    }

    const channel = await TextChannel.create({
      serverId,
      name,
      topic,
      categoryId,
      isPrivate: isPrivate || false
    });

    res.status(201).json(channel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create text channel' });
  }
});

// Update text channel
app.put('/channels/text/:channelId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { channelId } = req.params;

    // Whitelist allowed fields
    const allowedFields = ['name', 'topic', 'position', 'slowModeSeconds'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const channel = await TextChannel.findByPk(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Verify permissions (simplified - in production check roles)
    const server = await Server.findByPk(channel.serverId);
    if (server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only server owner can update channels' });
    }

    await channel.update(updates);
    res.json(channel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update text channel' });
  }
});

// Voice Channels - Get all voice channels in a server
app.get('/servers/:serverId/channels/voice', async (req, res) => {
  try {
    const { serverId } = req.params;

    const channels = await VoiceChannel.findAll({
      where: { serverId },
      order: [['position', 'ASC'], ['createdAt', 'ASC']]
    });

    res.json(channels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch voice channels' });
  }
});

// Create a voice channel (placeholder)
app.post('/servers/:serverId/channels/voice', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { serverId } = req.params;
    const { name, categoryId, userLimit, bitrate } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // Verify permissions
    const server = await Server.findByPk(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.ownerId !== userId) {
      const member = await ServerMember.findOne({
        where: { serverId, userId }
      });
      if (!member) {
        return res.status(403).json({ error: 'Only server members can create channels' });
      }
    }

    const channel = await VoiceChannel.create({
      serverId,
      name,
      categoryId,
      userLimit: userLimit || 0,
      bitrate: bitrate || 64000
    });

    res.status(201).json({
      ...channel.toJSON(),
      note: 'Voice channel created. Actual voice functionality requires WebRTC implementation.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create voice channel' });
  }
});

// Channel Categories - Get all categories in a server
app.get('/servers/:serverId/categories', async (req, res) => {
  try {
    const { serverId } = req.params;

    const categories = await ChannelCategory.findAll({
      where: { serverId },
      order: [['position', 'ASC'], ['createdAt', 'ASC']]
    });

    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch channel categories' });
  }
});

// Create a channel category
app.post('/servers/:serverId/categories', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { serverId } = req.params;
    const { name, position } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // Verify permissions
    const server = await Server.findByPk(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only server owner can create categories' });
    }

    const category = await ChannelCategory.create({
      serverId,
      name,
      position: position || 0
    });

    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Pinned Messages - Get pinned messages in a conversation
app.get('/conversations/:conversationId/pins', async (req, res) => {
  try {
    const { conversationId } = req.params;

    const pinnedMessages = await PinnedMessage.findAll({
      where: { conversationId },
      include: [{
        model: Message,
        attributes: ['id', 'senderId', 'content', 'type', 'createdAt']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(pinnedMessages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch pinned messages' });
  }
});

// Pin a message
app.post('/messages/:messageId/pin', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messageId } = req.params;

    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify user is a participant in the conversation or server member
    const conversation = await Conversation.findByPk(message.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check if user is a participant (for direct/group chats) or server member (for channels)
    const isParticipant = (conversation.participants || []).includes(userId);

    if (conversation.serverId) {
      // For server channels, check server membership
      const server = await Server.findByPk(conversation.serverId);
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }

      // Only server owner can pin messages in server channels
      if (server.ownerId !== userId) {
        return res.status(403).json({ error: 'Only server owner can pin messages' });
      }
    } else if (!isParticipant) {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    // Check if already pinned
    const existingPin = await PinnedMessage.findOne({
      where: { messageId, conversationId: message.conversationId }
    });

    if (existingPin) {
      return res.status(400).json({ error: 'Message already pinned' });
    }

    const pin = await PinnedMessage.create({
      messageId,
      conversationId: message.conversationId,
      pinnedBy: userId
    });

    res.status(201).json(pin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to pin message' });
  }
});

// Unpin a message
app.delete('/messages/:messageId/pin', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messageId } = req.params;

    // Ensure the message exists and retrieve its conversation for scoping
    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Scope the pin lookup by both message and conversation
    const pin = await PinnedMessage.findOne({
      where: {
        messageId,
        conversationId: message.conversationId
      }
    });

    if (!pin) {
      return res.status(404).json({ error: 'Pinned message not found' });
    }

    // Authorization: only the user who pinned the message can unpin it
    // or server owner for server channels
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

// Webhooks - Get webhooks for a server
app.get('/servers/:serverId/webhooks', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { serverId } = req.params;

    // Verify permissions
    const server = await Server.findByPk(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only server owner can view webhooks' });
    }

    const webhooks = await Webhook.findAll({
      where: { serverId },
      order: [['createdAt', 'DESC']]
    });

    // Mask webhook tokens to reduce blast radius
    const sanitizedWebhooks = webhooks.map((webhook) => {
      const data = webhook.toJSON ? webhook.toJSON() : webhook;
      if ('token' in data) {
        // Always use consistent masking regardless of token length
        data.token = '***masked***';
      }
      return data;
    });

    res.json(sanitizedWebhooks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

// Create a webhook
app.post('/servers/:serverId/webhooks', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { serverId } = req.params;
    const { name, channelId, avatarUrl } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // Verify permissions
    const server = await Server.findByPk(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only server owner can create webhooks' });
    }

    // Generate webhook token using cryptographically secure random
    const token = crypto.randomBytes(32).toString('hex');

    const webhook = await Webhook.create({
      serverId,
      channelId,
      name,
      token,
      avatarUrl,
      createdBy: userId
    });

    res.status(201).json(webhook);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

// Delete a webhook
app.delete('/webhooks/:webhookId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { webhookId } = req.params;

    const webhook = await Webhook.findByPk(webhookId);
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    // Verify permissions
    const server = await Server.findByPk(webhook.serverId);
    if (server.ownerId !== userId && webhook.createdBy !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this webhook' });
    }

    await webhook.destroy();
    res.json({ message: 'Webhook deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// ========== PHASE 2: MESSAGE REACTIONS (WhatsApp/Telegram-inspired) ==========

// Add or update reaction to a message
app.post('/messages/:messageId/reactions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messageId } = req.params;
    const { reactionType } = req.body;

    if (!reactionType) {
      return res.status(400).json({ error: 'Reaction type is required' });
    }

    // Check if message exists
    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user already reacted - update if exists, create if not
    let reaction = await MessageReaction.findOne({
      where: { messageId, userId }
    });

    if (reaction) {
      // Update existing reaction
      reaction.reactionType = reactionType;
      await reaction.save();
    } else {
      // Create new reaction
      reaction = await MessageReaction.create({
        messageId,
        userId,
        reactionType
      });

      // Increment reaction count on message
      await message.increment('reactionCount');
    }

    // Emit real-time event
    io.to(message.conversationId).emit('message-reaction', {
      messageId,
      userId,
      reactionType,
      action: 'add'
    });

    res.json(reaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Remove reaction from a message
app.delete('/messages/:messageId/reactions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messageId } = req.params;

    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const reaction = await MessageReaction.findOne({
      where: { messageId, userId }
    });

    if (!reaction) {
      return res.status(404).json({ error: 'Reaction not found' });
    }

    await reaction.destroy();
    await message.decrement('reactionCount');

    // Emit real-time event
    io.to(message.conversationId).emit('message-reaction', {
      messageId,
      userId,
      action: 'remove'
    });

    res.json({ message: 'Reaction removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

// Get reactions for a message
app.get('/messages/:messageId/reactions', async (req, res) => {
  try {
    const { messageId } = req.params;

    const reactions = await MessageReaction.findAll({
      where: { messageId },
      order: [['createdAt', 'ASC']]
    });

    // Group reactions by type with counts
    const grouped = reactions.reduce((acc, reaction) => {
      const type = reaction.reactionType;
      if (!acc[type]) {
        acc[type] = {
          reactionType: type,
          count: 0,
          users: []
        };
      }
      acc[type].count++;
      acc[type].users.push(reaction.userId);
      return acc;
    }, {});

    res.json({
      reactions,
      summary: Object.values(grouped)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reactions' });
  }
});

// ========== PHASE 2: MESSAGE REPLY & FORWARD ==========

// Reply to a message
app.post('/messages/:messageId/reply', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messageId } = req.params;
    const { content, attachments, type } = req.body;

    // Check if original message exists
    const originalMessage = await Message.findByPk(messageId);
    if (!originalMessage) {
      return res.status(404).json({ error: 'Original message not found' });
    }

    // Create reply message
    const replyMessage = await Message.create({
      conversationId: originalMessage.conversationId,
      senderId: userId,
      content,
      type: type || 'text',
      attachments: attachments || [],
      replyToId: messageId
    });

    // Fetch reply with related data
    const reply = await Message.findByPk(replyMessage.id, {
      include: [
        {
          model: Message,
          as: 'replyTo',
          attributes: ['id', 'senderId', 'content', 'createdAt']
        }
      ]
    });

    // Emit real-time event
    io.to(originalMessage.conversationId).emit('new-message', reply);

    res.json(reply);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Forward a message
app.post('/messages/:messageId/forward', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messageId } = req.params;
    const { conversationId, additionalContent } = req.body;

    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    // Check if original message exists
    const originalMessage = await Message.findByPk(messageId);
    if (!originalMessage) {
      return res.status(404).json({ error: 'Original message not found' });
    }

    // Check if target conversation exists
    const targetConversation = await Conversation.findByPk(conversationId);
    if (!targetConversation) {
      return res.status(404).json({ error: 'Target conversation not found' });
    }

    // Verify user is a participant in target conversation
    if (!targetConversation.participants.includes(userId)) {
      return res.status(403).json({ error: 'Not a member of target conversation' });
    }

    // Create forwarded message
    const forwardedMessage = await Message.create({
      conversationId,
      senderId: userId,
      content: additionalContent || originalMessage.content,
      type: originalMessage.type,
      attachments: originalMessage.attachments || [],
      forwardedFromId: messageId
    });

    // Fetch forwarded message with related data
    const forwarded = await Message.findByPk(forwardedMessage.id, {
      include: [
        {
          model: Message,
          as: 'forwardedFrom',
          attributes: ['id', 'senderId', 'content', 'createdAt']
        }
      ]
    });

    // Emit real-time event
    io.to(conversationId).emit('new-message', forwarded);

    res.json(forwarded);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to forward message' });
  }
});

// ========== PHASE 4: WEBRTC VOICE/VIDEO CALLS ==========

// Get ICE server configuration
app.get('/calls/ice-servers', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // ICE servers configuration for WebRTC
    const iceServers = [
      {
        urls: 'stun:stun.l.google.com:19302'
      },
      {
        urls: 'stun:stun1.l.google.com:19302'
      },
      {
        urls: 'stun:stun2.l.google.com:19302'
      }
    ];

    // In production, add TURN servers for NAT traversal:
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'username',
    //   credential: 'password'
    // }

    res.json({ iceServers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ICE servers' });
  }
});

// Get call history
app.get('/calls/history', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit = 20, offset = 0 } = req.query;

    const whereClause = {
      [Op.or]: [
        { callerId: userId },
        { recipientId: userId }
      ]
    };

    const calls = await Call.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await Call.count({ where: whereClause });

    res.json({ calls, total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
});

// Initiate a call
app.post('/calls/initiate', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { recipientId, type, offer } = req.body;

    if (!recipientId || !type) {
      return res.status(400).json({ error: 'recipientId and type are required' });
    }

    if (!['audio', 'video'].includes(type)) {
      return res.status(400).json({ error: 'type must be audio or video' });
    }

    // Create call record
    const call = await Call.create({
      callerId: userId,
      recipientId,
      type,
      status: 'initiated',
      offer: offer || null,
      startedAt: new Date()
    });

    // Emit real-time event to recipient
    io.emit(`incoming-call-${recipientId}`, {
      callId: call.id,
      callerId: userId,
      type,
      offer
    });

    res.json({
      callId: call.id,
      status: call.status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

// Accept a call
app.post('/calls/:callId/accept', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { callId } = req.params;
    const { answer } = req.body;

    const call = await Call.findByPk(callId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Verify user is the recipient
    if (call.recipientId !== userId) {
      return res.status(403).json({ error: 'Not authorized to accept this call' });
    }

    // Update call status
    await call.update({
      status: 'active',
      answer: answer || null,
      startedAt: new Date()
    });

    // Emit real-time event to caller
    io.emit(`call-accepted-${call.callerId}`, {
      callId: call.id,
      answer
    });

    res.json({
      callId: call.id,
      status: call.status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to accept call' });
  }
});

// Reject a call
app.post('/calls/:callId/reject', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { callId } = req.params;

    const call = await Call.findByPk(callId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Verify user is the recipient
    if (call.recipientId !== userId) {
      return res.status(403).json({ error: 'Not authorized to reject this call' });
    }

    // Update call status
    await call.update({
      status: 'rejected',
      endedAt: new Date()
    });

    // Emit real-time event to caller
    io.emit(`call-rejected-${call.callerId}`, {
      callId: call.id
    });

    res.json({
      callId: call.id,
      status: call.status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject call' });
  }
});

// End a call
app.post('/calls/:callId/end', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { callId } = req.params;
    const { duration } = req.body;

    const call = await Call.findByPk(callId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Verify user is either caller or recipient
    if (call.callerId !== userId && call.recipientId !== userId) {
      return res.status(403).json({ error: 'Not authorized to end this call' });
    }

    // Update call status
    await call.update({
      status: 'ended',
      duration: duration || 0,
      endedAt: new Date()
    });

    // Emit real-time event to both parties
    io.emit(`call-ended-${call.callerId}`, { callId: call.id });
    io.emit(`call-ended-${call.recipientId}`, { callId: call.id });

    res.json({
      callId: call.id,
      status: call.status,
      duration: call.duration
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to end call' });
  }
});

// Phase 6: Toggle screen sharing
app.post('/calls/:callId/screen-sharing', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { callId } = req.params;
    const { enabled } = req.body;

    const call = await Call.findByPk(callId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Verify user is part of the call
    if (call.callerId !== userId && call.recipientId !== userId) {
      return res.status(403).json({ error: 'Not authorized to modify this call' });
    }

    // Update screen sharing status
    await call.update({
      isScreenSharing: enabled
    });

    // Emit real-time event to other party
    const otherPartyId = call.callerId === userId ? call.recipientId : call.callerId;
    io.emit(`screen-sharing-${otherPartyId}`, {
      callId: call.id,
      enabled,
      userId
    });

    res.json({
      callId: call.id,
      isScreenSharing: call.isScreenSharing
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to toggle screen sharing' });
  }
});

// Phase 6: Start/stop call recording
app.post('/calls/:callId/recording', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { callId } = req.params;
    const { action } = req.body; // 'start' or 'stop'

    const call = await Call.findByPk(callId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Verify user is part of the call
    if (call.callerId !== userId && call.recipientId !== userId) {
      return res.status(403).json({ error: 'Not authorized to record this call' });
    }

    if (action === 'start') {
      await call.update({
        isRecording: true
      });

      // Emit notification to other party (legal requirement in many jurisdictions)
      const otherPartyId = call.callerId === userId ? call.recipientId : call.callerId;
      io.emit(`recording-started-${otherPartyId}`, {
        callId: call.id,
        startedBy: userId
      });

      res.json({
        callId: call.id,
        isRecording: true,
        message: 'Recording started. Other party has been notified.'
      });
    } else if (action === 'stop') {
      // In production, this would save the recording to MinIO/S3
      const recordingUrl = `recordings/${callId}-${Date.now()}.webm`;

      await call.update({
        isRecording: false,
        recordingUrl
      });

      res.json({
        callId: call.id,
        isRecording: false,
        recordingUrl: call.recordingUrl,
        message: 'Recording stopped and saved.'
      });
    } else {
      return res.status(400).json({ error: 'action must be start or stop' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to manage recording' });
  }
});

// Phase 6: Update call quality metrics
app.post('/calls/:callId/quality', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { callId } = req.params;
    const { bitrate, packetLoss, jitter, latency } = req.body;

    const call = await Call.findByPk(callId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Verify user is part of the call
    if (call.callerId !== userId && call.recipientId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this call' });
    }

    // Determine network quality based on metrics
    let networkQuality = 'excellent';
    if (packetLoss > 5 || latency > 300 || jitter > 50) {
      networkQuality = 'poor';
    } else if (packetLoss > 2 || latency > 200 || jitter > 30) {
      networkQuality = 'fair';
    } else if (packetLoss > 0.5 || latency > 100 || jitter > 15) {
      networkQuality = 'good';
    }

    // Update quality metrics
    const qualityMetrics = {
      bitrate: bitrate || 0,
      packetLoss: packetLoss || 0,
      jitter: jitter || 0,
      latency: latency || 0,
      timestamp: new Date()
    };

    await call.update({
      qualityMetrics,
      networkQuality
    });

    // Emit real-time quality update to other party
    const otherPartyId = call.callerId === userId ? call.recipientId : call.callerId;
    io.emit(`quality-update-${otherPartyId}`, {
      callId: call.id,
      networkQuality,
      qualityMetrics
    });

    res.json({
      callId: call.id,
      networkQuality: call.networkQuality,
      qualityMetrics: call.qualityMetrics
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update call quality' });
  }
});

// Phase 6: Get call recording
app.get('/calls/:callId/recording', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { callId } = req.params;

    const call = await Call.findByPk(callId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Verify user is part of the call
    if (call.callerId !== userId && call.recipientId !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this recording' });
    }

    if (!call.recordingUrl) {
      return res.status(404).json({ error: 'No recording available for this call' });
    }

    res.json({
      callId: call.id,
      recordingUrl: call.recordingUrl,
      duration: call.duration,
      createdAt: call.createdAt
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch recording' });
  }
});

// Phase 6: Notification System Endpoints

// Get user notifications
app.get('/notifications', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit = 50, offset = 0, unreadOnly = false, type } = req.query;

    const whereClause = { userId };
    if (unreadOnly === 'true') {
      whereClause.isRead = false;
    }
    if (type) {
      whereClause.type = type;
    }

    const notifications = await Notification.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await Notification.count({ where: whereClause });
    const unreadCount = await Notification.count({
      where: { userId, isRead: false }
    });

    res.json({
      notifications,
      total,
      unreadCount,
      hasMore: total > parseInt(offset) + parseInt(limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Create notification (system/internal use only)
app.post('/notifications', async (req, res) => {
  try {
    // Restrict this endpoint to trusted internal callers
    const internalToken = req.header('x-internal-token');
    if (!internalToken || internalToken !== process.env.INTERNAL_NOTIFICATION_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized - internal service token required' });
    }

    const { userId, type, title, body, actionUrl, metadata, priority } = req.body;

    if (!userId || !type || !title || !body) {
      return res.status(400).json({
        error: 'userId, type, title, and body are required'
      });
    }

    // Get user's notification preferences
    let preferences = await NotificationPreference.findOne({ where: { userId } });
    if (!preferences) {
      // Create default preferences if not exist
      preferences = await NotificationPreference.create({ userId });
    }

    // Check if user wants this type of notification - fix field name mapping
    const typeFieldMap = {
      'message': 'enableMessages',
      'mention': 'enableMentions',
      'reply': 'enableReplies',
      'reaction': 'enableReactions',
      'call': 'enableCalls',
      'friend_request': 'enableFriendRequests',
      'server_invite': 'enableServerInvites',
      'role_update': 'enableRoleUpdates',
      'system': 'enableSystem',
      'announcement': 'enableAnnouncements'
    };

    const typeKey = typeFieldMap[type];
    if (typeKey && preferences[typeKey] === false) {
      return res.json({
        message: 'Notification blocked by user preferences',
        delivered: false
      });
    }

    const notification = await Notification.create({
      userId,
      type,
      title,
      body,
      actionUrl,
      metadata,
      priority: priority || 'normal'
    });

    // Emit real-time notification via WebSocket to specific user room
    io.to(`user-${userId}`).emit('notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      actionUrl: notification.actionUrl,
      metadata: notification.metadata,
      priority: notification.priority,
      createdAt: notification.createdAt
    });

    res.json({
      notification,
      delivered: true
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Mark notification as read
app.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { notificationId } = req.params;

    const notification = await Notification.findByPk(notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await notification.update({
      isRead: true,
      readAt: new Date()
    });

    // Get updated unread count
    const unreadCount = await Notification.count({
      where: { userId, isRead: false }
    });

    res.json({
      notification,
      unreadCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
app.put('/notifications/read-all', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await Notification.update(
      {
        isRead: true,
        readAt: new Date()
      },
      {
        where: {
          userId,
          isRead: false
        }
      }
    );

    res.json({
      message: 'All notifications marked as read',
      unreadCount: 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Delete notification
app.delete('/notifications/:notificationId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { notificationId } = req.params;

    const notification = await Notification.findByPk(notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await notification.destroy();

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Delete all read notifications
app.delete('/notifications/clear-read', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const deleted = await Notification.destroy({
      where: {
        userId,
        isRead: true
      }
    });

    res.json({
      message: 'Read notifications cleared',
      deletedCount: deleted
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// Get notification preferences
app.get('/notifications/preferences', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let preferences = await NotificationPreference.findOne({ where: { userId } });

    if (!preferences) {
      // Create default preferences
      preferences = await NotificationPreference.create({ userId });
    }

    res.json({ preferences });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update notification preferences
app.put('/notifications/preferences', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const allowedFields = [
      'enableMessages', 'enableMentions', 'enableReplies', 'enableReactions',
      'enableCalls', 'enableFriendRequests', 'enableServerInvites',
      'enableRoleUpdates', 'enableSystem', 'enableAnnouncements',
      'enablePushNotifications', 'enableEmailDigest', 'digestFrequency',
      'quietHoursStart', 'quietHoursEnd'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    let preferences = await NotificationPreference.findOne({ where: { userId } });

    if (!preferences) {
      preferences = await NotificationPreference.create({ userId, ...updates });
    } else {
      await preferences.update(updates);
    }

    res.json({ preferences });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Update server settings
app.put('/servers/:serverId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { serverId } = req.params;

    // Whitelist allowed fields
    const allowedFields = ['name', 'description', 'category', 'isPublic', 'icon'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const server = await Server.findByPk(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Only server owner can update
    if (server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only server owner can update server settings' });
    }

    await server.update(updates);
    res.json(server);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update server' });
  }
});

// Delete server
app.delete('/servers/:serverId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { serverId } = req.params;

    const server = await Server.findByPk(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Only server owner can delete
    if (server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only server owner can delete server' });
    }

    await server.destroy();
    res.json({ message: 'Server deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

// Get roles for a server
app.get('/servers/:serverId/roles', async (req, res) => {
  try {
    const { serverId } = req.params;

    const roles = await Role.findAll({
      where: { serverId },
      order: [['position', 'DESC'], ['createdAt', 'ASC']]
    });

    res.json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Update role
app.put('/roles/:roleId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { roleId } = req.params;

    // Whitelist allowed fields
    const allowedFields = ['name', 'color', 'position', 'permissions'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Verify permissions
    const server = await Server.findByPk(role.serverId);
    if (server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only server owner can update roles' });
    }

    await role.update(updates);
    res.json(role);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete role
app.delete('/roles/:roleId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { roleId } = req.params;

    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Verify permissions
    const server = await Server.findByPk(role.serverId);
    if (server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only server owner can delete roles' });
    }

    await role.destroy();
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// Delete text channel
app.delete('/channels/text/:channelId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { channelId } = req.params;

    const channel = await TextChannel.findByPk(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Verify permissions
    const server = await Server.findByPk(channel.serverId);
    if (server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only server owner can delete channels' });
    }

    await channel.destroy();
    res.json({ message: 'Channel deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete text channel' });
  }
});

// Update voice channel
app.put('/channels/voice/:channelId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { channelId } = req.params;

    // Whitelist allowed fields
    const allowedFields = ['name', 'position', 'userLimit', 'bitrate'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const channel = await VoiceChannel.findByPk(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Verify permissions
    const server = await Server.findByPk(channel.serverId);
    if (server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only server owner can update channels' });
    }

    await channel.update(updates);
    res.json(channel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update voice channel' });
  }
});

// Delete voice channel
app.delete('/channels/voice/:channelId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { channelId } = req.params;

    const channel = await VoiceChannel.findByPk(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Verify permissions
    const server = await Server.findByPk(channel.serverId);
    if (server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only server owner can delete channels' });
    }

    await channel.destroy();
    res.json({ message: 'Channel deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete voice channel' });
  }
});

// Delete category
app.delete('/categories/:categoryId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { categoryId } = req.params;

    const category = await ChannelCategory.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Verify permissions
    const server = await Server.findByPk(category.serverId);
    if (server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only server owner can delete categories' });
    }

    await category.destroy();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

async function startServer() {
  try {
    await sequelize.sync({ alter: shouldAlterSchema, force: shouldForceSchema });
    server.listen(PORT, () => {
      console.log(`Messaging service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

startServer();
