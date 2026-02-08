const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8004;

app.use(express.json());

// Database
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/collaboration', {
  dialect: 'postgres',
  logging: false
});

// Models
const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: DataTypes.TEXT,
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('doc', 'wiki', 'note', 'kanban'),
    defaultValue: 'doc'
  },
  visibility: {
    type: DataTypes.ENUM('public', 'private', 'shared'),
    defaultValue: 'private'
  },
  collaborators: DataTypes.ARRAY(DataTypes.UUID),
  tags: DataTypes.ARRAY(DataTypes.STRING),
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
});

const Wiki = sequelize.define('Wiki', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    unique: true
  },
  content: DataTypes.TEXT,
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  parentId: DataTypes.UUID,
  visibility: {
    type: DataTypes.ENUM('public', 'private'),
    defaultValue: 'public'
  },
  contributors: DataTypes.ARRAY(DataTypes.UUID)
});

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  assigneeId: DataTypes.UUID,
  status: {
    type: DataTypes.ENUM('todo', 'in_progress', 'review', 'done'),
    defaultValue: 'todo'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  dueDate: DataTypes.DATE,
  projectId: DataTypes.UUID
});

sequelize.sync();

// Routes

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'collaboration-service' });
});

// Public: Get public documents
app.get('/public/docs', async (req, res) => {
  try {
    const docs = await Document.findAll({
      where: { visibility: 'public' },
      order: [['updatedAt', 'DESC']],
      limit: 20
    });

    res.json(docs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Public: Get public wiki pages
app.get('/public/wiki', async (req, res) => {
  try {
    const pages = await Wiki.findAll({
      where: { visibility: 'public' },
      order: [['updatedAt', 'DESC']],
      limit: 50
    });

    res.json(pages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki pages' });
  }
});

// Public: Get single wiki page
app.get('/public/wiki/:slug', async (req, res) => {
  try {
    const page = await Wiki.findOne({
      where: { slug: req.params.slug, visibility: 'public' }
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

// Create document
app.post('/documents', async (req, res) => {
  try {
    const { title, content, ownerId, type, visibility, collaborators, tags } = req.body;

    const doc = await Document.create({
      title,
      content,
      ownerId,
      type,
      visibility,
      collaborators,
      tags
    });

    res.status(201).json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Get user documents
app.get('/documents/:userId', async (req, res) => {
  try {
    const docs = await Document.findAll({
      where: {
        [Op.or]: [
          { ownerId: req.params.userId },
          { collaborators: { [Op.contains]: [req.params.userId] } }
        ]
      },
      order: [['updatedAt', 'DESC']]
    });

    res.json(docs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Update document
app.put('/documents/:id', async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await doc.update(req.body);
    await doc.increment('version');

    res.json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Create wiki page
app.post('/wiki', async (req, res) => {
  try {
    const { title, slug, content, ownerId, parentId, visibility } = req.body;

    const page = await Wiki.create({
      title,
      slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
      content,
      ownerId,
      parentId,
      visibility
    });

    res.status(201).json(page);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create wiki page' });
  }
});

// Create task
app.post('/tasks', async (req, res) => {
  try {
    const task = await Task.create(req.body);
    res.status(201).json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get tasks
app.get('/tasks', async (req, res) => {
  try {
    const { projectId, assigneeId, status } = req.query;
    const where = {};

    if (projectId) where.projectId = projectId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (status) where.status = status;

    const tasks = await Task.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.listen(PORT, () => {
  console.log(`Collaboration service running on port ${PORT}`);
});
