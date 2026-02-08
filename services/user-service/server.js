const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes, Op } = require('sequelize');
const Joi = require('joi');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.use(express.json());

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/users', {
  dialect: 'postgres',
  logging: false
});

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

// Relationships
User.hasMany(Skill, { foreignKey: 'userId' });
Skill.belongsTo(User, { foreignKey: 'userId' });
Skill.hasMany(Endorsement, { foreignKey: 'skillId' });
Endorsement.belongsTo(Skill, { foreignKey: 'skillId' });
User.hasMany(Page, { foreignKey: 'userId' });
Page.belongsTo(User, { foreignKey: 'userId' });
Page.hasMany(PageAdmin, { foreignKey: 'pageId' });
PageAdmin.belongsTo(Page, { foreignKey: 'pageId' });

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
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'user-service' });
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
app.get('/profile/:userId', async (req, res) => {
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

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Search users
app.get('/search', async (req, res) => {
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
    res.status(201).json(skill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

// Get user skills
app.get('/users/:userId/skills', async (req, res) => {
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
    const { userId, name, description, category, avatarUrl, coverUrl } = req.body;

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

app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
});
