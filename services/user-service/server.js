const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes, Op } = require('sequelize');
const Joi = require('joi');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Phase 4: Caching integration
let cacheEnabled = false;
let cacheUserProfile, cacheUserSkills, cacheUserSearch, invalidateUserCaches;

try {
  const cacheIntegration = require('./cache-integration');
  cacheUserProfile = cacheIntegration.cacheUserProfile;
  cacheUserSkills = cacheIntegration.cacheUserSkills;
  cacheUserSearch = cacheIntegration.cacheUserSearch;
  invalidateUserCaches = cacheIntegration.invalidateUserCaches;
  cacheEnabled = true;
  console.log('[Cache] Redis caching enabled for user-service');
} catch (error) {
  console.log('[Cache] Redis caching disabled (ioredis not available or Redis not running)');
  // Create no-op middleware for when caching is disabled
  cacheUserProfile = (req, res, next) => next();
  cacheUserSkills = (req, res, next) => next();
  cacheUserSearch = (req, res, next) => next();
  invalidateUserCaches = async () => {};
}

app.use(express.json());

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/users', {
  dialect: 'postgres',
  logging: false
});

// Phase 4: Monitoring and health checks
let healthChecker;
try {
  const { HealthChecker, checkDatabase } = require('../shared/monitoring');
  healthChecker = new HealthChecker('user-service');
  
  // Register database health check
  healthChecker.registerCheck('database', () => checkDatabase(sequelize));
  
  // Add metrics middleware
  app.use(healthChecker.metricsMiddleware());
  
  console.log('[Monitoring] Health checks and metrics enabled');
} catch (error) {
  console.log('[Monitoring] Advanced monitoring disabled');
}


// User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: DataTypes.STRING,
  lastName: DataTypes.STRING,
  bio: DataTypes.TEXT,
  avatar: DataTypes.STRING,
  role: {
    type: DataTypes.ENUM('user', 'moderator', 'admin'),
    defaultValue: 'user'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  twoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  twoFactorSecret: {
    type: DataTypes.STRING,
    comment: 'Encrypted 2FA secret for TOTP'
  },
  backupCodes: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    comment: 'Hashed backup codes for 2FA recovery'
  }
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

// Profile Model (Extended user information)
const Profile = sequelize.define('Profile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    references: { model: 'Users', key: 'id' }
  },
  phoneNumber: DataTypes.STRING,
  dateOfBirth: DataTypes.DATE,
  location: DataTypes.STRING,
  website: DataTypes.STRING,
  company: DataTypes.STRING,
  jobTitle: DataTypes.STRING,
  skills: DataTypes.ARRAY(DataTypes.STRING),
  interests: DataTypes.ARRAY(DataTypes.STRING),
  socialLinks: DataTypes.JSONB
});

User.hasOne(Profile, { foreignKey: 'userId' });
Profile.belongsTo(User, { foreignKey: 'userId' });

// NEW: LinkedIn-inspired Skills Model
const Skill = sequelize.define('Skill', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  level: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
    defaultValue: 'intermediate'
  },
  endorsements: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// NEW: LinkedIn-inspired Endorsements Model
const Endorsement = sequelize.define('Endorsement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  skillId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  endorserId: {
    type: DataTypes.UUID,
    allowNull: false
  }
});

// NEW: Facebook-inspired Pages Model
const Page = sequelize.define('Page', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  category: DataTypes.STRING,
  avatarUrl: DataTypes.STRING,
  coverUrl: DataTypes.STRING,
  followers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// NEW: Phase 1 - Page Admin Roles Model (Facebook-style)
const PageAdmin = sequelize.define('PageAdmin', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  pageId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('owner', 'admin', 'editor', 'moderator'),
    defaultValue: 'moderator'
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['pageId', 'userId']
    }
  ]
});

// PHASE 3: Notification System Models
const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Recipient user ID'
  },
  type: {
    type: DataTypes.ENUM(
      'like', 'comment', 'follow', 'mention', 'message',
      'friend_request', 'group_invite', 'page_invite',
      'post_share', 'video_upload', 'order_status',
      'system', 'other'
    ),
    allowNull: false,
    defaultValue: 'other'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  actionUrl: {
    type: DataTypes.STRING,
    comment: 'URL to navigate when notification is clicked'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional data like actorId, resourceId, etc.'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal'
  },
  expiresAt: {
    type: DataTypes.DATE,
    comment: 'Optional expiration date for time-sensitive notifications'
  }
}, {
  indexes: [
    { fields: ['userId', 'isRead'] },
    { fields: ['userId', 'createdAt'] },
    { fields: ['type'] }
  ]
});

// Notification Preferences Model
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
  emailNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  pushNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  inAppNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notificationTypes: {
    type: DataTypes.JSONB,
    defaultValue: {
      like: true,
      comment: true,
      follow: true,
      mention: true,
      message: true,
      friend_request: true,
      group_invite: true,
      page_invite: true,
      post_share: true,
      video_upload: true,
      order_status: true,
      system: true
    },
    comment: 'Per-type notification preferences'
  },
  quietHoursEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  quietHoursStart: {
    type: DataTypes.STRING,
    comment: 'Format: HH:mm (e.g., "22:00")'
  },
  quietHoursEnd: {
    type: DataTypes.STRING,
    comment: 'Format: HH:mm (e.g., "08:00")'
  }
});

// PHASE 3: Admin Dashboard - Audit Log Model
const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  adminId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Admin user who performed the action'
  },
  action: {
    type: DataTypes.ENUM(
      'user_ban', 'user_unban', 'user_role_change',
      'content_delete', 'content_moderate', 'content_flag',
      'system_config_change', 'data_export', 'other'
    ),
    allowNull: false
  },
  targetType: {
    type: DataTypes.STRING,
    comment: 'Type of target: user, post, comment, etc.'
  },
  targetId: {
    type: DataTypes.UUID,
    comment: 'ID of the affected resource'
  },
  details: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional context about the action'
  },
  ipAddress: {
    type: DataTypes.STRING
  },
  userAgent: {
    type: DataTypes.TEXT
  }
}, {
  indexes: [
    { fields: ['adminId'] },
    { fields: ['action'] },
    { fields: ['createdAt'] }
  ]
});

// PHASE 3: Admin Dashboard - Content Moderation Model
const ContentFlag = sequelize.define('ContentFlag', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  contentType: {
    type: DataTypes.ENUM('post', 'comment', 'message', 'user', 'page', 'video'),
    allowNull: false
  },
  contentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  reporterId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'User who reported the content'
  },
  reason: {
    type: DataTypes.ENUM(
      'spam', 'harassment', 'hate_speech', 'violence',
      'adult_content', 'misinformation', 'copyright', 'other'
    ),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('pending', 'under_review', 'resolved', 'dismissed'),
    defaultValue: 'pending'
  },
  reviewedBy: {
    type: DataTypes.UUID,
    comment: 'Admin who reviewed the flag'
  },
  resolution: {
    type: DataTypes.TEXT,
    comment: 'Admin notes on resolution'
  },
  resolvedAt: {
    type: DataTypes.DATE
  }
}, {
  indexes: [
    { fields: ['status'] },
    { fields: ['contentType', 'contentId'] },
    { fields: ['reporterId'] }
  ]
});

// Relationships
User.hasMany(Skill, { foreignKey: 'userId' });
Skill.belongsTo(User, { foreignKey: 'userId' });
Skill.hasMany(Endorsement, { foreignKey: 'skillId' });
Endorsement.belongsTo(Skill, { foreignKey: 'skillId' });
User.hasMany(Page, { foreignKey: 'userId' });
Page.belongsTo(User, { foreignKey: 'userId' });
Page.hasMany(PageAdmin, { foreignKey: 'pageId' });
PageAdmin.belongsTo(Page, { foreignKey: 'pageId' });
User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(NotificationPreference, { foreignKey: 'userId' });
NotificationPreference.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(AuditLog, { as: 'AdminActions', foreignKey: 'adminId' });
AuditLog.belongsTo(User, { as: 'Admin', foreignKey: 'adminId' });
User.hasMany(ContentFlag, { as: 'Reports', foreignKey: 'reporterId' });

// Initialize database
sequelize.sync();

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string(),
  lastName: Joi.string()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Routes

// Health check
// Health check (basic liveness probe)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'user-service' });
});

// Readiness check (detailed health with dependencies)
app.get('/health/ready', async (req, res) => {
  if (!healthChecker) {
    return res.json({ status: 'healthy', service: 'user-service', message: 'Basic health check' });
  }
  
  try {
    const health = await healthChecker.runChecks();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Metrics endpoint (Prometheus format)
app.get('/metrics', (req, res) => {
  if (!healthChecker) {
    return res.type('text/plain').send('# Metrics not available\n');
  }
  
  const metrics = healthChecker.getPrometheusMetrics();
  res.type('text/plain').send(metrics);
});

// Register
app.post('/register', async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, email, password, firstName, lastName } = req.body;

    // Check for existing email
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Check for existing username
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName
    });

    await Profile.create({ userId: user.id });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get user profile
app.get('/profile/:userId', cacheUserProfile, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      include: [Profile],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
app.put('/profile/:userId', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { firstName, lastName, bio, avatar } = req.body;
    await user.update({ firstName, lastName, bio, avatar });

    const profile = await Profile.findOne({ where: { userId: req.params.userId } });
    if (profile && req.body.profile) {
      await profile.update(req.body.profile);
    }

    // Invalidate cache after successful update
    if (cacheEnabled) {
      await invalidateUserCaches(req.params.userId);
    }

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Search users
app.get('/search', cacheUserSearch, async (req, res) => {
  try {
    const { q } = req.query;
    const users = await User.findAll({
      where: {
        [Sequelize.Op.or]: [
          { username: { [Sequelize.Op.iLike]: `%${q}%` } },
          { firstName: { [Sequelize.Op.iLike]: `%${q}%` } },
          { lastName: { [Sequelize.Op.iLike]: `%${q}%` } }
        ]
      },
      attributes: { exclude: ['password'] },
      limit: 20
    });

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ========== LINKEDIN-INSPIRED: SKILLS ==========

// Add skill to user profile
app.post('/users/:userId/skills', async (req, res) => {
  try {
    const { name, level } = req.body;
    const { userId } = req.params;

    // Check if skill already exists
    const existing = await Skill.findOne({ where: { userId, name } });
    if (existing) {
      return res.status(400).json({ error: 'Skill already exists' });
    }

    const skill = await Skill.create({ userId, name, level });
    
    // Invalidate cache after successful creation
    if (cacheEnabled) {
      await invalidateUserCaches(userId);
    }
    
    res.status(201).json(skill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

// Get user skills
app.get('/users/:userId/skills', cacheUserSkills, async (req, res) => {
  try {
    const skills = await Skill.findAll({
      where: { userId: req.params.userId },
      order: [['endorsements', 'DESC']]
    });

    res.json(skills);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// Delete skill
app.delete('/skills/:id', async (req, res) => {
  try {
    const skill = await Skill.findByPk(req.params.id);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    await skill.destroy();
    res.json({ message: 'Skill deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

// Endorse skill
app.post('/skills/:skillId/endorse', async (req, res) => {
  try {
    const { skillId } = req.params;

    // Get authenticated user ID from header set by gateway
    const endorserId = req.header('x-user-id');
    if (!endorserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify skill exists first
    const skill = await Skill.findByPk(skillId);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Check if already endorsed
    const existing = await Endorsement.findOne({ where: { skillId, endorserId } });
    if (existing) {
      return res.status(400).json({ error: 'Already endorsed' });
    }

    // Create endorsement
    await Endorsement.create({ skillId, endorserId });

    // Increment endorsement count
    await skill.increment('endorsements');

    res.status(201).json({ message: 'Skill endorsed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to endorse skill' });
  }
});

// Get skill endorsements
app.get('/skills/:skillId/endorsements', async (req, res) => {
  try {
    const endorsements = await Endorsement.findAll({
      where: { skillId: req.params.skillId }
    });

    res.json(endorsements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch endorsements' });
  }
});

// ========== FACEBOOK-INSPIRED: PAGES ==========

// Create page
app.post('/pages', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, description, category, avatarUrl, coverUrl } = req.body;

    const page = await Page.create({
      userId,
      name,
      description,
      category,
      avatarUrl,
      coverUrl
    });

    res.status(201).json(page);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create page' });
  }
});

// Get page
app.get('/pages/:id', async (req, res) => {
  try {
    const page = await Page.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['id', 'username', 'firstName', 'lastName'] }]
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json(page);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

// Get user's pages
app.get('/users/:userId/pages', async (req, res) => {
  try {
    const pages = await Page.findAll({
      where: { userId: req.params.userId },
      order: [['createdAt', 'DESC']]
    });

    res.json(pages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// Update page
app.put('/pages/:id', async (req, res) => {
  try {
    const page = await Page.findByPk(req.params.id);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    await page.update(req.body);
    res.json(page);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

// Follow/like page (increment followers)
app.post('/pages/:id/follow', async (req, res) => {
  try {
    const page = await Page.findByPk(req.params.id);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    await page.increment('followers');
    res.json({ message: 'Page followed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to follow page' });
  }
});

// ============================================
// Phase 1 New Endpoints - Page Admin Management
// ============================================

// Get page admins
app.get('/pages/:pageId/admins', async (req, res) => {
  try {
    const { pageId } = req.params;

    const admins = await PageAdmin.findAll({
      where: { pageId },
      order: [
        [sequelize.literal("CASE WHEN role = 'owner' THEN 1 WHEN role = 'admin' THEN 2 WHEN role = 'editor' THEN 3 ELSE 4 END"), 'ASC']
      ]
    });

    res.json(admins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch page admins' });
  }
});

// Add page admin
app.post('/pages/:pageId/admins', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { pageId } = req.params;
    const { adminUserId, role } = req.body;

    if (!adminUserId || !role) {
      return res.status(400).json({ error: 'adminUserId and role are required' });
    }

    if (!['admin', 'editor', 'moderator'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, editor, or moderator' });
    }

    // Verify requesting user is page owner or admin
    const page = await Page.findByPk(pageId);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const requesterAdmin = await PageAdmin.findOne({
      where: { pageId, userId, role: { [Op.in]: ['owner', 'admin'] } }
    });

    if (page.userId !== userId && !requesterAdmin) {
      return res.status(403).json({ error: 'Only page owner or admins can add admins' });
    }

    // Create page admin
    const [admin, created] = await PageAdmin.findOrCreate({
      where: { pageId, userId: adminUserId },
      defaults: { role }
    });

    if (!created) {
      admin.role = role;
      await admin.save();
    }

    res.status(created ? 201 : 200).json(admin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add page admin' });
  }
});

// Update page admin role
app.put('/pages/:pageId/admins/:adminId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { pageId, adminId } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'editor', 'moderator'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Verify requesting user is page owner or admin
    const page = await Page.findByPk(pageId);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    if (page.userId !== userId) {
      const requesterAdmin = await PageAdmin.findOne({
        where: { pageId, userId, role: { [Op.in]: ['owner', 'admin'] } }
      });
      if (!requesterAdmin) {
        return res.status(403).json({ error: 'Only page owner or admins can update roles' });
      }
    }

    const admin = await PageAdmin.findByPk(adminId);
    if (!admin || admin.pageId !== pageId) {
      return res.status(404).json({ error: 'Page admin not found' });
    }

    admin.role = role;
    await admin.save();

    res.json(admin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update page admin' });
  }
});

// Remove page admin
app.delete('/pages/:pageId/admins/:adminId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { pageId, adminId } = req.params;

    // Verify requesting user is page owner or admin
    const page = await Page.findByPk(pageId);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    if (page.userId !== userId) {
      return res.status(403).json({ error: 'Only page owner can remove admins' });
    }

    const admin = await PageAdmin.findByPk(adminId);
    if (!admin || admin.pageId !== pageId) {
      return res.status(404).json({ error: 'Page admin not found' });
    }

    if (admin.role === 'owner') {
      return res.status(403).json({ error: 'Cannot remove page owner' });
    }

    await admin.destroy();
    res.json({ message: 'Page admin removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove page admin' });
  }
});

// ==================== PHASE 3: ADMIN DASHBOARD APIs ====================

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findByPk(userId);
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

// Get system statistics
app.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    const totalPages = await Page.count();
    const totalNotifications = await Notification.count();
    const unreadNotifications = await Notification.count({ where: { isRead: false } });
    const pendingFlags = await ContentFlag.count({ where: { status: 'pending' } });

    // User role distribution
    const usersByRole = await User.findAll({
      attributes: ['role', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['role']
    });

    // Recent signups (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSignups = await User.count({
      where: {
        createdAt: { [Op.gte]: sevenDaysAgo }
      }
    });

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        recentSignups,
        byRole: usersByRole.reduce((acc, r) => {
          acc[r.role] = parseInt(r.dataValues.count);
          return acc;
        }, {})
      },
      pages: {
        total: totalPages
      },
      notifications: {
        total: totalNotifications,
        unread: unreadNotifications
      },
      moderation: {
        pendingFlags
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch system stats' });
  }
});

// Get all users (with pagination and filters)
app.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      isActive,
      search
    } = req.query;

    const where = {};

    if (role) {
      where.role = role;
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (search) {
      where[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password'] }
    });

    res.json({
      users: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role
app.put('/admin/users/:userId/role', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // Create audit log
    await AuditLog.create({
      adminId: req.adminUser.id,
      action: 'user_role_change',
      targetType: 'user',
      targetId: userId,
      details: { oldRole, newRole: role },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Ban/Unban user
app.put('/admin/users/:userId/active', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ error: 'isActive is required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isActive = isActive;
    await user.save();

    // Create audit log
    await AuditLog.create({
      adminId: req.adminUser.id,
      action: isActive ? 'user_unban' : 'user_ban',
      targetType: 'user',
      targetId: userId,
      details: { reason: req.body.reason || 'No reason provided' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Get content flags/reports
app.get('/admin/flags', requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'pending',
      contentType
    } = req.query;

    const where = { status };

    if (contentType) {
      where.contentType = contentType;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await ContentFlag.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      flags: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch content flags' });
  }
});

// Create content flag (report)
app.post('/admin/flags', async (req, res) => {
  try {
    const reporterId = req.header('x-user-id');
    if (!reporterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { contentType, contentId, reason, description } = req.body;

    if (!contentType || !contentId || !reason) {
      return res.status(400).json({ error: 'contentType, contentId, and reason are required' });
    }

    const flag = await ContentFlag.create({
      contentType,
      contentId,
      reporterId,
      reason,
      description
    });

    // Notify admins
    const admins = await User.findAll({ where: { role: { [Op.in]: ['admin', 'moderator'] } } });
    for (const admin of admins) {
      await Notification.create({
        userId: admin.id,
        type: 'system',
        title: 'New Content Flag',
        message: `A ${contentType} has been flagged for ${reason}`,
        actionUrl: `/admin/flags/${flag.id}`,
        priority: 'high',
        metadata: { flagId: flag.id, contentType, reason }
      });
    }

    res.status(201).json(flag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create content flag' });
  }
});

// Update flag status (resolve/dismiss)
app.put('/admin/flags/:flagId', requireAdmin, async (req, res) => {
  try {
    const { flagId } = req.params;
    const { status, resolution } = req.body;

    if (!['under_review', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const flag = await ContentFlag.findByPk(flagId);
    if (!flag) {
      return res.status(404).json({ error: 'Flag not found' });
    }

    flag.status = status;
    flag.reviewedBy = req.adminUser.id;
    flag.resolution = resolution;
    flag.resolvedAt = new Date();
    await flag.save();

    // Create audit log
    await AuditLog.create({
      adminId: req.adminUser.id,
      action: 'content_moderate',
      targetType: flag.contentType,
      targetId: flag.contentId,
      details: { flagId, status, resolution },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Notify reporter
    await Notification.create({
      userId: flag.reporterId,
      type: 'system',
      title: 'Report Status Updated',
      message: `Your report has been ${status}`,
      metadata: { flagId, status }
    });

    res.json(flag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update flag' });
  }
});

// Get audit logs
app.get('/admin/audit-logs', requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      adminId
    } = req.query;

    const where = {};

    if (action) {
      where.action = action;
    }
    if (adminId) {
      where.adminId = adminId;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'Admin',
        attributes: ['id', 'username', 'email']
      }]
    });

    res.json({
      logs: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ==================== END ADMIN DASHBOARD ====================

// ==================== PHASE 3: ADVANCED SECURITY (2FA) APIs ====================

// Generate 2FA secret (setup)
app.post('/2fa/setup', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate random secret (base32 encoded)
    const secret = Array.from({ length: 32 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]
    ).join('');

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    // Hash backup codes before storing
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    user.twoFactorSecret = secret;
    user.backupCodes = hashedBackupCodes;
    await user.save();

    // Return secret and backup codes (backup codes should be shown only once)
    const otpauthUrl = `otpauth://totp/LetsConnect:${user.email}?secret=${secret}&issuer=LetsConnect`;

    res.json({
      secret,
      otpauthUrl,
      backupCodes,
      qrCode: otpauthUrl // Can be used to generate QR code on frontend
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// Enable 2FA (verify and activate)
app.post('/2fa/enable', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const user = await User.findByPk(userId);
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ error: 'Please setup 2FA first' });
    }

    // Verify TOTP code (simple implementation without external library)
    const isValid = verifyTOTP(user.twoFactorSecret, code);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.json({ message: '2FA enabled successfully', enabled: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
});

// Disable 2FA
app.post('/2fa/disable', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { code, password } = req.body;
    if (!code || !password) {
      return res.status(400).json({ error: 'Code and password are required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Verify 2FA code
    const isValid = verifyTOTP(user.twoFactorSecret, code);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.backupCodes = [];
    await user.save();

    res.json({ message: '2FA disabled successfully', enabled: false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// Verify 2FA code
app.post('/2fa/verify', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const user = await User.findByPk(userId);
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA not enabled' });
    }

    // Try TOTP first
    const isValidTOTP = verifyTOTP(user.twoFactorSecret, code);
    if (isValidTOTP) {
      return res.json({ valid: true, method: 'totp' });
    }

    // Try backup codes
    for (let i = 0; i < user.backupCodes.length; i++) {
      const isValidBackup = await bcrypt.compare(code, user.backupCodes[i]);
      if (isValidBackup) {
        // Remove used backup code
        user.backupCodes.splice(i, 1);
        await user.save();
        return res.json({ valid: true, method: 'backup', remainingCodes: user.backupCodes.length });
      }
    }

    res.status(400).json({ valid: false, error: 'Invalid code' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify 2FA code' });
  }
});

// Get 2FA status
app.get('/2fa/status', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      enabled: user.twoFactorEnabled,
      backupCodesRemaining: user.backupCodes?.length || 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
});

// Regenerate backup codes
app.post('/2fa/regenerate-backup-codes', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const user = await User.findByPk(userId);
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA not enabled' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate new backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    // Hash backup codes
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    user.backupCodes = hashedBackupCodes;
    await user.save();

    res.json({ backupCodes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to regenerate backup codes' });
  }
});

// Simple TOTP verification (30-second window)
function verifyTOTP(secret, token) {
  try {
    const window = 30; // 30 seconds
    const time = Math.floor(Date.now() / 1000 / window);

    // Check current time and ±1 window for clock drift
    for (let i = -1; i <= 1; i++) {
      const code = generateTOTP(secret, time + i);
      if (code === token) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}

// Simple TOTP generator
function generateTOTP(secret, time) {
  try {
    // Simplified TOTP: In production, use a library like speakeasy
    // This is a basic implementation for demonstration
    const crypto = require('crypto');

    // Convert base32 secret to buffer (simplified)
    const buffer = Buffer.from(secret);

    // Create time buffer
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigUInt64BE(BigInt(time));

    // HMAC-SHA1
    const hmac = crypto.createHmac('sha1', buffer);
    hmac.update(timeBuffer);
    const digest = hmac.digest();

    // Get 6-digit code
    const offset = digest[digest.length - 1] & 0xf;
    const code = (
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff)
    ) % 1000000;

    return code.toString().padStart(6, '0');
  } catch (error) {
    console.error('TOTP generation error:', error);
    return null;
  }
}

// ==================== END ADVANCED SECURITY ====================

// ==================== PHASE 3: NOTIFICATION SYSTEM APIs ====================

// Create notification
app.post('/notifications', async (req, res) => {
  try {
    const { userId, type, title, message, actionUrl, metadata, priority, expiresAt } = req.body;

    if (!userId || !type || !title || !message) {
      return res.status(400).json({ error: 'userId, type, title, and message are required' });
    }

    // Check user preferences before creating notification
    const prefs = await NotificationPreference.findOne({ where: { userId } });
    if (prefs && prefs.notificationTypes && !prefs.notificationTypes[type]) {
      return res.status(200).json({ message: 'Notification blocked by user preferences', blocked: true });
    }

    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      actionUrl,
      metadata: metadata || {},
      priority: priority || 'normal',
      expiresAt
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Get user notifications (with pagination and filters)
app.get('/notifications', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      page = 1,
      limit = 20,
      isRead,
      type,
      priority
    } = req.query;

    const where = { userId };

    // Add filters
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }
    if (type) {
      where.type = type;
    }
    if (priority) {
      where.priority = priority;
    }

    // Filter out expired notifications
    where[Op.or] = [
      { expiresAt: null },
      { expiresAt: { [Op.gt]: new Date() } }
    ];

    const offset = (page - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    const unreadCount = await Notification.count({
      where: { userId, isRead: false }
    });

    res.json({
      notifications: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      unreadCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread count
app.get('/notifications/unread-count', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const count = await Notification.count({
      where: {
        userId,
        isRead: false,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      }
    });

    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Mark notification as read
app.put('/notifications/:id/read', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.json(notification);
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
      { isRead: true },
      { where: { userId, isRead: false } }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Delete notification
app.delete('/notifications/:id', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notification.destroy();
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Delete all read notifications
app.delete('/notifications/read', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const deletedCount = await Notification.destroy({
      where: { userId, isRead: true }
    });

    res.json({ message: 'Read notifications deleted successfully', count: deletedCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete read notifications' });
  }
});

// Get notification preferences
app.get('/notifications/preferences', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let prefs = await NotificationPreference.findOne({ where: { userId } });

    // Create default preferences if none exist
    if (!prefs) {
      prefs = await NotificationPreference.create({ userId });
    }

    res.json(prefs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// Update notification preferences
app.put('/notifications/preferences', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      emailNotifications,
      pushNotifications,
      inAppNotifications,
      notificationTypes,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd
    } = req.body;

    let prefs = await NotificationPreference.findOne({ where: { userId } });

    if (!prefs) {
      prefs = await NotificationPreference.create({
        userId,
        emailNotifications,
        pushNotifications,
        inAppNotifications,
        notificationTypes,
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd
      });
    } else {
      await prefs.update({
        emailNotifications: emailNotifications !== undefined ? emailNotifications : prefs.emailNotifications,
        pushNotifications: pushNotifications !== undefined ? pushNotifications : prefs.pushNotifications,
        inAppNotifications: inAppNotifications !== undefined ? inAppNotifications : prefs.inAppNotifications,
        notificationTypes: notificationTypes || prefs.notificationTypes,
        quietHoursEnabled: quietHoursEnabled !== undefined ? quietHoursEnabled : prefs.quietHoursEnabled,
        quietHoursStart: quietHoursStart || prefs.quietHoursStart,
        quietHoursEnd: quietHoursEnd || prefs.quietHoursEnd
      });
    }

    res.json(prefs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// ==================== END NOTIFICATION SYSTEM ====================

// ==================== EMAIL NOTIFICATIONS (MAILGUN) ====================
// Email notification configuration using Mailgun API
const mailgun = require('mailgun.js');
const FormData = require('form-data');

// Initialize Mailgun client
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || 'your-mailgun-api-key',
  public_key: process.env.MAILGUN_PUBLIC_KEY || 'your-mailgun-public-key',
  url: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'
});

const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'sandbox.mailgun.org';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@letconnect.com';

// Helper function to send email notification via Mailgun
async function sendEmailNotification(userEmail, notification) {
  try {
    const emailData = {
      from: EMAIL_FROM,
      to: userEmail,
      subject: notification.title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
            <h2 style="color: #333; margin-top: 0;">${notification.title}</h2>
            <p style="color: #666; line-height: 1.6;">${notification.message}</p>
            ${notification.actionUrl ? `
              <div style="margin-top: 20px;">
                <a href="${notification.actionUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  View More
                </a>
              </div>
            ` : ''}
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 20px; text-align: center;">
            © 2026 Let's Connect. All rights reserved.
          </p>
        </div>
      `
    };

    const result = await mg.messages.create(MAILGUN_DOMAIN, emailData);
    console.log(`Email notification sent to ${userEmail}:`, result.id);
    return result;
  } catch (error) {
    console.error('Mailgun email sending failed:', error);
    throw error;
  }
}

// Send email notification endpoint
app.post('/notifications/:userId/email', async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, message, actionUrl } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create notification record
    const notification = await Notification.create({
      userId,
      type: 'email',
      title,
      message,
      actionUrl
    });

    // Send email
    await sendEmailNotification(user.email, notification);

    res.json({ message: 'Email notification sent', notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send email notification' });
  }
});

// Batch email notifications
app.post('/notifications/email/batch', async (req, res) => {
  try {
    const { userIds, title, message, actionUrl } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array required' });
    }

    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } }
    });

    const results = [];
    for (const user of users) {
      try {
        const notification = await Notification.create({
          userId: user.id,
          type: 'batch_email',
          title,
          message,
          actionUrl
        });

        await sendEmailNotification(user.email, notification);
        results.push({ userId: user.id, status: 'sent' });
      } catch (err) {
        results.push({ userId: user.id, status: 'failed', error: err.message });
      }
    }

    res.json({ message: 'Batch emails processed', results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Batch email failed' });
  }
});

// ==================== OAUTH PROVIDERS (Google & GitHub) ====================
// OAuth configuration endpoints
const oauth2 = require('simple-oauth2');

// Google OAuth setup
const googleOAuth = oauth2.create({
  client: {
    id: process.env.GOOGLE_CLIENT_ID || 'your-client-id',
    secret: process.env.GOOGLE_CLIENT_SECRET || 'your-client-secret'
  },
  auth: {
    tokenHost: 'https://oauth2.googleapis.com',
    tokenPath: '/token',
    authorizePath: '/o/oauth2/v2/auth'
  }
});

// GitHub OAuth setup
const githubOAuth = oauth2.create({
  client: {
    id: process.env.GITHUB_CLIENT_ID || 'your-client-id',
    secret: process.env.GITHUB_CLIENT_SECRET || 'your-client-secret'
  },
  auth: {
    tokenHost: 'https://github.com',
    tokenPath: '/login/oauth/access_token',
    authorizePath: '/login/oauth/authorize'
  }
});

// Get OAuth authorization URL (Google)
app.get('/oauth/google/authorize', (req, res) => {
  try {
    const authorizationUri = googleOAuth.authorizationCode.authorizeURL({
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8001/oauth/google/callback',
      scope: ['profile', 'email'],
      state: 'random-state-string'
    });

    res.json({ authorizationUri });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get Google authorization URL' });
  }
});

// Google OAuth callback
app.post('/oauth/google/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    const token = await googleOAuth.authorizationCode.getToken({
      code,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8001/oauth/google/callback'
    });

    // Fetch user info from Google
    const googleUser = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    }).then(r => r.json());

    // Find or create user
    let user = await User.findOne({ where: { email: googleUser.email } });

    if (!user) {
      user = await User.create({
        email: googleUser.email,
        username: googleUser.email.split('@')[0],
        firstName: googleUser.given_name,
        lastName: googleUser.family_name,
        avatar: googleUser.picture,
        password: bcrypt.hashSync(require('crypto').randomBytes(32).toString('hex'), 10)
      });
    }

    // Generate JWT token
    const jwtToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Google OAuth successful',
      user: { id: user.id, email: user.email, firstName: user.firstName },
      token: jwtToken
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Google OAuth failed' });
  }
});

// GitHub OAuth callback
app.post('/oauth/github/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    const token = await githubOAuth.authorizationCode.getToken({
      code,
      redirect_uri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:8001/oauth/github/callback'
    });

    // Fetch user info from GitHub
    const githubUser = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    }).then(r => r.json());

    // Get email if available
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    }).then(r => r.json());

    const primaryEmail = emailResponse.find(e => e.primary)?.email || githubUser.email || `${githubUser.login}@github.local`;

    // Find or create user
    let user = await User.findOne({
      where: { [Op.or]: [{ email: primaryEmail }, { username: githubUser.login }] }
    });

    if (!user) {
      user = await User.create({
        email: primaryEmail,
        username: githubUser.login,
        firstName: githubUser.name?.split(' ')[0] || githubUser.login,
        lastName: githubUser.name?.split(' ').slice(1).join(' ') || '',
        avatar: githubUser.avatar_url,
        password: bcrypt.hashSync(require('crypto').randomBytes(32).toString('hex'), 10)
      });
    }

    // Generate JWT token
    const jwtToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'GitHub OAuth successful',
      user: { id: user.id, email: user.email, firstName: user.firstName },
      token: jwtToken
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'GitHub OAuth failed' });
  }
});

// ==================== END EMAIL & OAUTH ====================

app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
});
