'use strict';

const { Sequelize, DataTypes, Op } = require('sequelize');
const { getPoolConfig } = require('../../shared/pool-config');
require('dotenv').config({ quiet: true });

const dbPoolProfile = process.env.DB_POOL_PROFILE || 'heavy';

const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/messages',
  {
    dialect: 'postgres',
    logging: false,
    ...getPoolConfig(dbPoolProfile)
  }
);

// ─── Model Definitions ───────────────────────────────────────────────────────

const Conversation = sequelize.define('Conversation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  serverId: DataTypes.UUID,
  name: DataTypes.STRING,
  topic: DataTypes.TEXT,
  type: { type: DataTypes.ENUM('direct', 'group', 'channel'), defaultValue: 'direct' },
  participants: DataTypes.ARRAY(DataTypes.UUID),
  lastMessage: DataTypes.TEXT,
  lastMessageAt: DataTypes.DATE
});

const Message = sequelize.define('Message', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  conversationId: { type: DataTypes.UUID, allowNull: false },
  senderId: { type: DataTypes.UUID, allowNull: false },
  content: DataTypes.TEXT,
  type: { type: DataTypes.ENUM('text', 'image', 'video', 'file', 'voice'), defaultValue: 'text' },
  attachments: DataTypes.ARRAY(DataTypes.STRING),
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  replyToId: { type: DataTypes.UUID, allowNull: true },
  forwardedFromId: { type: DataTypes.UUID, allowNull: true },
  reactionCount: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const Server = sequelize.define('Server', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  category: { type: DataTypes.STRING, defaultValue: 'general' },
  ownerId: { type: DataTypes.UUID, allowNull: false },
  icon: DataTypes.STRING,
  members: { type: DataTypes.INTEGER, defaultValue: 1 },
  inviteCode: DataTypes.STRING,
  isPublic: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const Role = sequelize.define('Role', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  serverId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  permissions: DataTypes.ARRAY(DataTypes.STRING),
  color: DataTypes.STRING,
  position: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const ServerMember = sequelize.define('ServerMember', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  serverId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  roleIds: DataTypes.ARRAY(DataTypes.UUID),
  nickname: DataTypes.STRING
});

const TextChannel = sequelize.define('TextChannel', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  serverId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  topic: DataTypes.TEXT,
  categoryId: DataTypes.UUID,
  position: { type: DataTypes.INTEGER, defaultValue: 0 },
  isPrivate: { type: DataTypes.BOOLEAN, defaultValue: false },
  slowModeSeconds: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const VoiceChannel = sequelize.define('VoiceChannel', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  serverId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  categoryId: DataTypes.UUID,
  position: { type: DataTypes.INTEGER, defaultValue: 0 },
  userLimit: { type: DataTypes.INTEGER, defaultValue: 0 },
  bitrate: { type: DataTypes.INTEGER, defaultValue: 64000 }
});

const ChannelCategory = sequelize.define('ChannelCategory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  serverId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  position: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const PinnedMessage = sequelize.define('PinnedMessage', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  messageId: { type: DataTypes.UUID, allowNull: false },
  conversationId: { type: DataTypes.UUID, allowNull: false },
  pinnedBy: { type: DataTypes.UUID, allowNull: false }
}, {
  indexes: [{ unique: true, fields: ['messageId', 'conversationId'] }]
});

const Webhook = sequelize.define('Webhook', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  serverId: { type: DataTypes.UUID, allowNull: false },
  channelId: DataTypes.UUID,
  name: { type: DataTypes.STRING, allowNull: false },
  token: { type: DataTypes.STRING, allowNull: false },
  avatarUrl: DataTypes.STRING,
  createdBy: { type: DataTypes.UUID, allowNull: false }
});

const MessageReaction = sequelize.define('MessageReaction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  messageId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  reactionType: { type: DataTypes.STRING, allowNull: false }
}, {
  indexes: [{ unique: true, fields: ['messageId', 'userId'] }]
});

const Call = sequelize.define('Call', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  callerId: { type: DataTypes.UUID, allowNull: false },
  recipientId: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.ENUM('audio', 'video'), allowNull: false, defaultValue: 'audio' },
  status: {
    type: DataTypes.ENUM('initiated', 'ringing', 'active', 'ended', 'rejected', 'missed'),
    allowNull: false,
    defaultValue: 'initiated'
  },
  offer: { type: DataTypes.JSONB, allowNull: true },
  answer: { type: DataTypes.JSONB, allowNull: true },
  duration: { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Call duration in seconds' },
  startedAt: { type: DataTypes.DATE, allowNull: true },
  endedAt: { type: DataTypes.DATE, allowNull: true },
  isScreenSharing: { type: DataTypes.BOOLEAN, defaultValue: false },
  isRecording: { type: DataTypes.BOOLEAN, defaultValue: false },
  recordingUrl: { type: DataTypes.STRING, allowNull: true },
  qualityMetrics: { type: DataTypes.JSONB, allowNull: true },
  networkQuality: {
    type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor', 'disconnected'),
    defaultValue: 'good'
  }
}, {
  indexes: [{ fields: ['callerId'] }, { fields: ['recipientId'] }, { fields: ['status'] }]
});

const ScheduledMessage = sequelize.define('ScheduledMessage', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  conversationId: { type: DataTypes.UUID, allowNull: false },
  senderId: { type: DataTypes.UUID, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.ENUM('text', 'image', 'video', 'file'), defaultValue: 'text' },
  attachments: DataTypes.ARRAY(DataTypes.STRING),
  scheduledFor: { type: DataTypes.DATE, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'sent', 'cancelled', 'failed'), defaultValue: 'pending' },
  sentAt: DataTypes.DATE,
  messageId: { type: DataTypes.UUID, comment: 'ID of the sent message after scheduling completes' }
}, {
  indexes: [
    { fields: ['conversationId'] },
    { fields: ['senderId'] },
    { fields: ['status', 'scheduledFor'] }
  ]
});

const ConversationSettings = sequelize.define('ConversationSettings', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  conversationId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  muteNotifications: { type: DataTypes.BOOLEAN, defaultValue: false },
  muteUntil: { type: DataTypes.DATE, comment: 'Null for indefinite mute' },
  customNickname: { type: DataTypes.STRING, comment: 'Custom nickname for the conversation' },
  theme: { type: DataTypes.STRING, comment: 'Custom theme color or emoji' },
  pinned: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  indexes: [{ unique: true, fields: ['conversationId', 'userId'] }]
});

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, comment: 'User who receives the notification' },
  type: {
    type: DataTypes.ENUM(
      'message', 'mention', 'reply', 'reaction',
      'call', 'friend_request', 'server_invite',
      'role_update', 'system', 'announcement'
    ),
    allowNull: false,
    defaultValue: 'system'
  },
  title: { type: DataTypes.STRING, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  actionUrl: { type: DataTypes.STRING, allowNull: true },
  metadata: { type: DataTypes.JSONB, allowNull: true },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  readAt: { type: DataTypes.DATE, allowNull: true },
  priority: { type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'), defaultValue: 'normal' },
  expiresAt: { type: DataTypes.DATE, allowNull: true }
}, {
  indexes: [
    { fields: ['userId'] },
    { fields: ['userId', 'isRead'] },
    { fields: ['type'] },
    { fields: ['createdAt'] }
  ]
});

const NotificationPreference = sequelize.define('NotificationPreference', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, unique: true },
  enableMessages: { type: DataTypes.BOOLEAN, defaultValue: true },
  enableMentions: { type: DataTypes.BOOLEAN, defaultValue: true },
  enableReplies: { type: DataTypes.BOOLEAN, defaultValue: true },
  enableReactions: { type: DataTypes.BOOLEAN, defaultValue: true },
  enableCalls: { type: DataTypes.BOOLEAN, defaultValue: true },
  enableFriendRequests: { type: DataTypes.BOOLEAN, defaultValue: true },
  enableServerInvites: { type: DataTypes.BOOLEAN, defaultValue: true },
  enableRoleUpdates: { type: DataTypes.BOOLEAN, defaultValue: true },
  enableSystem: { type: DataTypes.BOOLEAN, defaultValue: true },
  enableAnnouncements: { type: DataTypes.BOOLEAN, defaultValue: true },
  enablePushNotifications: { type: DataTypes.BOOLEAN, defaultValue: false },
  enableEmailDigest: { type: DataTypes.BOOLEAN, defaultValue: false },
  digestFrequency: { type: DataTypes.ENUM('daily', 'weekly', 'never'), defaultValue: 'never' },
  quietHoursStart: { type: DataTypes.TIME, allowNull: true },
  quietHoursEnd: { type: DataTypes.TIME, allowNull: true }
}, {
  indexes: [{ fields: ['userId'] }]
});

const Subscription = sequelize.define('Subscription', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  endpoint: { type: DataTypes.TEXT, allowNull: false },
  p256dh: DataTypes.STRING,
  auth: DataTypes.STRING
});

// ─── Associations ────────────────────────────────────────────────────────────

Conversation.hasMany(Message, { foreignKey: 'conversationId' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

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

Message.hasMany(MessageReaction, { foreignKey: 'messageId', as: 'reactions' });
MessageReaction.belongsTo(Message, { foreignKey: 'messageId' });
Message.belongsTo(Message, { as: 'replyTo', foreignKey: 'replyToId' });
Message.belongsTo(Message, { as: 'forwardedFrom', foreignKey: 'forwardedFromId' });

Conversation.hasMany(ScheduledMessage, { foreignKey: 'conversationId' });
ScheduledMessage.belongsTo(Conversation, { foreignKey: 'conversationId' });
Conversation.hasMany(ConversationSettings, { foreignKey: 'conversationId' });
ConversationSettings.belongsTo(Conversation, { foreignKey: 'conversationId' });

module.exports = {
  sequelize,
  Sequelize,
  Op,
  Conversation,
  Message,
  Server,
  Role,
  ServerMember,
  TextChannel,
  VoiceChannel,
  ChannelCategory,
  PinnedMessage,
  Webhook,
  MessageReaction,
  Call,
  ScheduledMessage,
  ConversationSettings,
  Notification,
  NotificationPreference,
  Subscription
};
