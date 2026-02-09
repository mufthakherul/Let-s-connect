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

sequelize.sync();

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

    const calls = await Call.findAll({
      where: {
        [Op.or]: [
          { callerId: userId },
          { recipientId: userId }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ calls, total: calls.length });
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

server.listen(PORT, () => {
  console.log(`Messaging service running on port ${PORT}`);
});
