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

server.listen(PORT, () => {
  console.log(`Messaging service running on port ${PORT}`);
});
