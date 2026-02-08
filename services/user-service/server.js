const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');
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

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
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
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
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

app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
});
