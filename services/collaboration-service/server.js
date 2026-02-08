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

// NEW: GitHub-inspired Issues Model
const Issue = sequelize.define('Issue', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: DataTypes.UUID,
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  creatorId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  assigneeId: DataTypes.UUID,
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'closed'),
    defaultValue: 'open'
  },
  labels: DataTypes.ARRAY(DataTypes.STRING),
  milestone: DataTypes.STRING,
  comments: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// NEW: Issue Comments
const IssueComment = sequelize.define('IssueComment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  issueId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  }
});

// NEW: GitHub-inspired Projects Model
const Project = sequelize.define('Project', {
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
  visibility: {
    type: DataTypes.ENUM('public', 'private'),
    defaultValue: 'private'
  },
  members: DataTypes.ARRAY(DataTypes.UUID)
});

// Relationships
Issue.hasMany(IssueComment, { foreignKey: 'issueId' });
IssueComment.belongsTo(Issue, { foreignKey: 'issueId' });
Project.hasMany(Issue, { foreignKey: 'projectId' });
Project.hasMany(Task, { foreignKey: 'projectId' });

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

// ========== GITHUB-INSPIRED: ISSUES ==========

// Create issue
app.post('/issues', async (req, res) => {
  try {
    const { projectId, title, description, assigneeId, labels, milestone } = req.body;
    
    // Get authenticated user ID from header set by gateway
    const creatorId = req.header('x-user-id');
    if (!creatorId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const issue = await Issue.create({
      projectId,
      title,
      description,
      creatorId,
      assigneeId,
      labels,
      milestone
    });

    res.status(201).json(issue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create issue' });
  }
});

// Get issues
app.get('/issues', async (req, res) => {
  try {
    const { projectId, status, assigneeId, label } = req.query;
    const where = {};

    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    if (label) where.labels = { [Op.contains]: [label] };

    const issues = await Issue.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json(issues);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// Get single issue
app.get('/issues/:id', async (req, res) => {
  try {
    const issue = await Issue.findByPk(req.params.id, {
      include: [{ model: IssueComment }],
      order: [[IssueComment, 'createdAt', 'ASC']]
    });

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json(issue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch issue' });
  }
});

// Update issue
app.put('/issues/:id', async (req, res) => {
  try {
    const issue = await Issue.findByPk(req.params.id);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    await issue.update(req.body);
    res.json(issue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

// Close issue
app.post('/issues/:id/close', async (req, res) => {
  try {
    const issue = await Issue.findByPk(req.params.id);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    await issue.update({ status: 'closed' });
    res.json({ message: 'Issue closed', issue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to close issue' });
  }
});

// Add comment to issue
app.post('/issues/:issueId/comments', async (req, res) => {
  try {
    const { userId, content } = req.body;
    const { issueId } = req.params;

    const comment = await IssueComment.create({
      issueId,
      userId,
      content
    });

    await Issue.increment('comments', { where: { id: issueId } });

    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ========== GITHUB-INSPIRED: PROJECTS ==========

// Create project
app.post('/projects', async (req, res) => {
  try {
    const { name, description, ownerId, visibility, members } = req.body;

    const project = await Project.create({
      name,
      description,
      ownerId,
      visibility,
      members
    });

    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get projects
app.get('/projects', async (req, res) => {
  try {
    const { ownerId, visibility } = req.query;
    const where = {};

    if (ownerId) where.ownerId = ownerId;
    if (visibility) where.visibility = visibility;

    const projects = await Project.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project with issues and tasks
app.get('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: Issue },
        { model: Task }
      ],
      order: [
        [Issue, 'createdAt', 'DESC'],
        [Task, 'createdAt', 'DESC']
      ]
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Update project
app.put('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await project.update(req.body);
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.listen(PORT, () => {
  console.log(`Collaboration service running on port ${PORT}`);
});
