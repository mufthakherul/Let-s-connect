const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Sequelize, DataTypes } = require('sequelize');
const Redis = require('ioredis');
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
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  icon: DataTypes.STRING,
  members: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  inviteCode: DataTypes.STRING
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

// Relationships
Server.hasMany(Conversation, { foreignKey: 'serverId' });
Server.hasMany(Role, { foreignKey: 'serverId' });
Server.hasMany(ServerMember, { foreignKey: 'serverId' });

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
        attachments: data.attachments
      });

      await Conversation.update(
        { lastMessage: data.content, lastMessageAt: new Date() },
        { where: { id: data.conversationId } }
      );

      // Broadcast to conversation room
      io.to(data.conversationId).emit('new-message', message);

      // Publish to Redis for scaling
      redis.publish('messages', JSON.stringify(message));
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
      offset: parseInt(offset)
    });

    res.json(messages.reverse());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ========== DISCORD-INSPIRED: SERVERS ==========

// Create server
app.post('/servers', async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    const ownerId = req.user && req.user.id;

    if (!ownerId) {
      return res.status(401).json({ error: 'Authentication required to create a server' });
    }
    // Generate invite code
    const inviteCode = Math.random().toString(36).substring(7);

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
        { model: Role, order: [['position', 'DESC']] }
      ]
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

server.listen(PORT, () => {
  console.log(`Messaging service running on port ${PORT}`);
});
