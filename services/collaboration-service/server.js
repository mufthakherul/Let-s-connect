const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const crypto = require('crypto');
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
  contributors: DataTypes.ARRAY(DataTypes.UUID),
  // Phase 2: Categories/tags for wiki organization
  categories: DataTypes.ARRAY(DataTypes.STRING)
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
  milestoneId: DataTypes.UUID, // Reference to Milestone model
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'closed'),
    defaultValue: 'open'
  },
  labels: DataTypes.ARRAY(DataTypes.STRING),
  milestone: DataTypes.STRING, // Legacy field, kept for backward compatibility
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

// NEW: GitHub-inspired Milestones Model
const Milestone = sequelize.define('Milestone', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  dueDate: DataTypes.DATE,
  status: {
    type: DataTypes.ENUM('open', 'closed'),
    defaultValue: 'open'
  },
  completedIssues: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalIssues: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// NEW: Phase 2 - Document Version History (Notion/Drive-inspired)
const DocumentVersion = sequelize.define('DocumentVersion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  documentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  versionNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  title: DataTypes.STRING,
  content: DataTypes.TEXT,
  changedBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  changeDescription: DataTypes.TEXT,
  contentHash: DataTypes.STRING // For detecting actual content changes
});

// NEW: Phase 2 - Wiki Edit History (Wikipedia-inspired)
const WikiHistory = sequelize.define('WikiHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  wikiId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: DataTypes.STRING,
  content: DataTypes.TEXT,
  editedBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  editSummary: DataTypes.TEXT,
  contentHash: DataTypes.STRING
});

// Relationships
Issue.hasMany(IssueComment, { foreignKey: 'issueId' });
IssueComment.belongsTo(Issue, { foreignKey: 'issueId' });
Project.hasMany(Issue, { foreignKey: 'projectId' });
Project.hasMany(Task, { foreignKey: 'projectId' });
Project.hasMany(Milestone, { foreignKey: 'projectId' });
Milestone.hasMany(Issue, { foreignKey: 'milestoneId' });
Issue.belongsTo(Milestone, { foreignKey: 'milestoneId' });

// Phase 2: Document and Wiki history relationships
Document.hasMany(DocumentVersion, { foreignKey: 'documentId', as: 'versions' });
DocumentVersion.belongsTo(Document, { foreignKey: 'documentId' });
Wiki.hasMany(WikiHistory, { foreignKey: 'wikiId', as: 'history' });
WikiHistory.belongsTo(Wiki, { foreignKey: 'wikiId' });

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
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const doc = await Document.findByPk(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permission
    if (doc.ownerId !== userId && (!doc.collaborators || !doc.collaborators.includes(userId))) {
      return res.status(403).json({ error: 'Not authorized to edit this document' });
    }

    // Phase 2: Save version history before updating
    const contentHash = crypto.createHash('md5').update(doc.content || '').digest('hex');
    await DocumentVersion.create({
      documentId: doc.id,
      versionNumber: doc.version,
      title: doc.title,
      content: doc.content,
      changedBy: userId,
      changeDescription: req.body.changeDescription || 'Document updated',
      contentHash
    });

    // Update document - whitelist allowed fields
    const { title, content, visibility, collaborators, tags, changeDescription } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (collaborators !== undefined) updateData.collaborators = collaborators;
    if (tags !== undefined) updateData.tags = tags;

    await doc.update(updateData);
    await doc.increment('version');
    await doc.reload();

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

// Update task (for board movement)
app.put('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.update(req.body);
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update task' });
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

// ========== MILESTONE ENDPOINTS (GitHub-inspired) ==========

// Create a milestone
app.post('/milestones', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { projectId, title, description, dueDate } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({ error: 'projectId and title are required' });
    }

    // Verify project exists and user has access
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.ownerId !== userId && !(project.members || []).includes(userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const milestone = await Milestone.create({
      projectId,
      title,
      description,
      dueDate
    });

    res.json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create milestone' });
  }
});

// Get all milestones for a project
app.get('/projects/:projectId/milestones', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status } = req.query;

    const where = { projectId };
    if (status) {
      where.status = status;
    }

    const milestones = await Milestone.findAll({
      where,
      order: [['dueDate', 'ASC']],
      include: [{
        model: Issue,
        attributes: ['id', 'title', 'status']
      }]
    });

    res.json(milestones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch milestones' });
  }
});

// Get a single milestone with details
app.get('/milestones/:id', async (req, res) => {
  try {
    const milestone = await Milestone.findByPk(req.params.id, {
      include: [{
        model: Issue,
        include: [{ model: IssueComment }]
      }]
    });

    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch milestone' });
  }
});

// Update a milestone
app.put('/milestones/:id', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const milestone = await Milestone.findByPk(req.params.id);
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    // Verify user has access to the project
    const project = await Project.findByPk(milestone.projectId);
    if (project.ownerId !== userId && !(project.members || []).includes(userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await milestone.update(req.body);
    res.json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update milestone' });
  }
});

// Delete a milestone
app.delete('/milestones/:id', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const milestone = await Milestone.findByPk(req.params.id);
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    // Verify user has access to the project
    const project = await Project.findByPk(milestone.projectId);
    if (project.ownerId !== userId && !(project.members || []).includes(userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Remove milestone from issues
    await Issue.update(
      { milestoneId: null },
      { where: { milestoneId: milestone.id } }
    );

    await milestone.destroy();
    res.json({ message: 'Milestone deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete milestone' });
  }
});

// Assign issue to milestone
app.post('/issues/:issueId/milestone', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { issueId } = req.params;
    const { milestoneId } = req.body;

    const issue = await Issue.findByPk(issueId);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Authorize user on the issue's project
    const project = await Project.findByPk(issue.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.ownerId !== userId && !(project.members || []).includes(userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Handle removing old milestone
    if (issue.milestoneId) {
      const oldMilestone = await Milestone.findByPk(issue.milestoneId);
      if (oldMilestone) {
        await oldMilestone.decrement('totalIssues');
        if (issue.status === 'closed') {
          await oldMilestone.decrement('completedIssues');
        }
      }
    }

    // Verify and assign new milestone
    if (milestoneId) {
      const milestone = await Milestone.findByPk(milestoneId);
      if (!milestone) {
        return res.status(404).json({ error: 'Milestone not found' });
      }

      if (milestone.projectId !== issue.projectId) {
        return res.status(400).json({ error: 'Milestone does not belong to the same project as the issue' });
      }

      await milestone.increment('totalIssues');
      if (issue.status === 'closed') {
        await milestone.increment('completedIssues');
      }
    }

    await issue.update({ milestoneId });
    res.json(issue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to assign milestone' });
  }
});

// ========== PHASE 2: DOCUMENT VERSION HISTORY ==========

// Get document version history
app.get('/documents/:id/versions', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const doc = await Document.findByPk(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permission
    if (doc.visibility === 'private' && doc.ownerId !== userId && (!doc.collaborators || !doc.collaborators.includes(userId))) {
      return res.status(403).json({ error: 'Not authorized to view this document' });
    }

    const versions = await DocumentVersion.findAll({
      where: { documentId: req.params.id },
      order: [['versionNumber', 'DESC']],
      attributes: ['id', 'versionNumber', 'title', 'changedBy', 'changeDescription', 'createdAt']
    });

    res.json(versions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document versions' });
  }
});

// Get specific document version
app.get('/documents/:id/versions/:versionNumber', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const doc = await Document.findByPk(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permission
    if (doc.visibility === 'private' && doc.ownerId !== userId && (!doc.collaborators || !doc.collaborators.includes(userId))) {
      return res.status(403).json({ error: 'Not authorized to view this document' });
    }

    const version = await DocumentVersion.findOne({
      where: {
        documentId: req.params.id,
        versionNumber: req.params.versionNumber
      }
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json(version);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document version' });
  }
});

// Restore document to a previous version
app.post('/documents/:id/versions/:versionNumber/restore', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const doc = await Document.findByPk(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permission - only owner or collaborators
    if (doc.ownerId !== userId && (!doc.collaborators || !doc.collaborators.includes(userId))) {
      return res.status(403).json({ error: 'Not authorized to edit this document' });
    }

    const version = await DocumentVersion.findOne({
      where: {
        documentId: req.params.id,
        versionNumber: req.params.versionNumber
      }
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Save current version before restoring
    const contentHash = crypto.createHash('md5').update(doc.content || '').digest('hex');
    await DocumentVersion.create({
      documentId: doc.id,
      versionNumber: doc.version,
      title: doc.title,
      content: doc.content,
      changedBy: userId,
      changeDescription: `Restored to version ${req.params.versionNumber}`,
      contentHash
    });

    // Restore from version
    await doc.update({
      title: version.title,
      content: version.content
    });
    await doc.increment('version');
    await doc.reload();

    res.json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to restore document version' });
  }
});

// ========== PHASE 2: WIKI ENHANCEMENTS ==========

// Update wiki page (with history tracking)
app.put('/wiki/:id', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const wiki = await Wiki.findByPk(req.params.id);
    if (!wiki) {
      return res.status(404).json({ error: 'Wiki page not found' });
    }

    // Check permission
    if (wiki.visibility === 'private' && wiki.ownerId !== userId && (!wiki.contributors || !wiki.contributors.includes(userId))) {
      return res.status(403).json({ error: 'Not authorized to edit this wiki page' });
    }

    // Phase 2: Save edit history before updating
    const contentHash = crypto.createHash('md5').update(wiki.content || '').digest('hex');
    await WikiHistory.create({
      wikiId: wiki.id,
      title: wiki.title,
      content: wiki.content,
      editedBy: userId,
      editSummary: req.body.editSummary || 'Wiki page updated',
      contentHash
    });

    // Update wiki - whitelist allowed fields
    const { title, content, visibility, contributors, editSummary } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (contributors !== undefined) updateData.contributors = contributors;

    // Update slug if title changed
    if (title && title !== wiki.title) {
      updateData.slug = title.toLowerCase().replace(/\s+/g, '-');
    }

    await wiki.update(updateData);
    await wiki.reload();

    res.json(wiki);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update wiki page' });
  }
});

// Get wiki page edit history
app.get('/wiki/:id/history', async (req, res) => {
  try {
    const wiki = await Wiki.findByPk(req.params.id);
    if (!wiki) {
      return res.status(404).json({ error: 'Wiki page not found' });
    }

    // Public wikis can be viewed by anyone, private need auth
    if (wiki.visibility === 'private') {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (wiki.ownerId !== userId && (!wiki.contributors || !wiki.contributors.includes(userId))) {
        return res.status(403).json({ error: 'Not authorized to view this wiki page' });
      }
    }

    const history = await WikiHistory.findAll({
      where: { wikiId: req.params.id },
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'title', 'editedBy', 'editSummary', 'createdAt']
    });

    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki history' });
  }
});

// Get specific wiki revision
app.get('/wiki/:id/history/:historyId', async (req, res) => {
  try {
    const wiki = await Wiki.findByPk(req.params.id);
    if (!wiki) {
      return res.status(404).json({ error: 'Wiki page not found' });
    }

    // Check permission for private wikis
    if (wiki.visibility === 'private') {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (wiki.ownerId !== userId && (!wiki.contributors || !wiki.contributors.includes(userId))) {
        return res.status(403).json({ error: 'Not authorized to view this wiki page' });
      }
    }

    const revision = await WikiHistory.findByPk(req.params.historyId);
    if (!revision || revision.wikiId !== req.params.id) {
      return res.status(404).json({ error: 'Revision not found' });
    }

    res.json(revision);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki revision' });
  }
});

// Restore wiki to a previous revision
app.post('/wiki/:id/history/:historyId/restore', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const wiki = await Wiki.findByPk(req.params.id);
    if (!wiki) {
      return res.status(404).json({ error: 'Wiki page not found' });
    }

    // Check permission
    if (wiki.ownerId !== userId && (!wiki.contributors || !wiki.contributors.includes(userId))) {
      return res.status(403).json({ error: 'Not authorized to edit this wiki page' });
    }

    const revision = await WikiHistory.findByPk(req.params.historyId);
    if (!revision || revision.wikiId !== req.params.id) {
      return res.status(404).json({ error: 'Revision not found' });
    }

    // Save current state before restoring
    const contentHash = crypto.createHash('md5').update(wiki.content || '').digest('hex');
    await WikiHistory.create({
      wikiId: wiki.id,
      title: wiki.title,
      content: wiki.content,
      editedBy: userId,
      editSummary: `Restored to revision from ${revision.createdAt}`,
      contentHash
    });

    // Restore from revision
    await wiki.update({
      title: revision.title,
      content: revision.content
    });
    await wiki.reload();

    res.json(wiki);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to restore wiki revision' });
  }
});

// Add wiki categories/tags
app.post('/wiki/:id/categories', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const wiki = await Wiki.findByPk(req.params.id);
    if (!wiki) {
      return res.status(404).json({ error: 'Wiki page not found' });
    }

    // Check permission
    if (wiki.ownerId !== userId && (!wiki.contributors || !wiki.contributors.includes(userId))) {
      return res.status(403).json({ error: 'Not authorized to edit this wiki page' });
    }

    const { categories } = req.body;
    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'Categories must be an array' });
    }

    // Add categories field to wiki if not exists
    await wiki.update({
      categories: categories
    });

    res.json(wiki);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add categories' });
  }
});

// Get wikis by category
app.get('/wiki/category/:category', async (req, res) => {
  try {
    const { category } = req.params;

    // Only return public wikis for category browsing
    const wikis = await Wiki.findAll({
      where: {
        visibility: 'public',
        categories: {
          [Op.contains]: [category]
        }
      },
      attributes: ['id', 'title', 'slug', 'ownerId', 'categories', 'createdAt', 'updatedAt']
    });

    res.json(wikis);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wikis by category' });
  }
});

// ==================== WIKI DIFF COMPARISON ====================
const DiffMatchPatch = require('diff-match-patch');
const dmp = new DiffMatchPatch();

// Wiki Diff Model
const WikiDiff = sequelize.define('WikiDiff', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  wikiId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  fromVersionId: DataTypes.UUID,
  toVersionId: DataTypes.UUID,
  diff: DataTypes.TEXT, // Serialized diff format
  stats: DataTypes.JSONB // { additions, deletions, changes }
});

// Get diff between two wiki versions
app.get('/wikis/:wikiId/diff', async (req, res) => {
  try {
    const { wikiId } = req.params;
    const { from, to } = req.query;

    const wiki = await Wiki.findByPk(wikiId);
    if (!wiki) {
      return res.status(404).json({ error: 'Wiki not found' });
    }

    // Get version contents
    let fromContent = '';
    let toContent = '';

    if (from) {
      const fromHistory = await WikiHistory.findByPk(from);
      fromContent = fromHistory?.content || '';
    } else {
      fromContent = wiki.content || '';
    }

    if (to) {
      const toHistory = await WikiHistory.findByPk(to);
      toContent = toHistory?.content || '';
    } else {
      toContent = wiki.content || '';
    }

    // Compute diff
    const diffs = dmp.diff_main(fromContent, toContent);
    dmp.diff_cleanupSemantic(diffs);

    // Calculate statistics
    let additions = 0,
      deletions = 0;
    diffs.forEach(([type, text]) => {
      if (type === 1) additions += text.length;
      if (type === -1) deletions += text.length;
    });

    res.json({
      wikiId,
      diffs,
      stats: {
        additions,
        deletions,
        changes: additions + deletions
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to compute diff' });
  }
});

// Get patch format of diff (for applying changes)
app.get('/wikis/:wikiId/patch', async (req, res) => {
  try {
    const { wikiId } = req.params;
    const { from, to } = req.query;

    const wiki = await Wiki.findByPk(wikiId);
    if (!wiki) {
      return res.status(404).json({ error: 'Wiki not found' });
    }

    let fromContent = wiki.content || '';
    if (from) {
      const history = await WikiHistory.findByPk(from);
      fromContent = history?.content || '';
    }

    const toContent = wiki.content || '';

    // Compute diff and create patch
    const diffs = dmp.diff_main(fromContent, toContent);
    dmp.diff_cleanupSemantic(diffs);
    const patches = dmp.patch_make(fromContent, diffs);
    const patchText = dmp.patch_toText(patches);

    res.json({
      wikiId,
      patch: patchText,
      appliedTo: from ? 'specific_version' : 'current'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate patch' });
  }
});

// ==================== DOCUMENT FOLDER HIERARCHY ====================

// Update Document model with parent folder support
const DocumentFolder = sequelize.define('DocumentFolder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  parentId: DataTypes.UUID, // Reference to parent folder
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// Create folder
app.post('/folders', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, parentId, description, isPublic } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Folder name required' });
    }

    const folder = await DocumentFolder.create({
      ownerId: userId,
      parentId: parentId || null,
      name,
      description,
      isPublic: isPublic || false
    });

    res.status(201).json(folder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Get folder contents (documents and subfolders)
app.get('/folders/:folderId/contents', async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.header('x-user-id');

    const folder = await DocumentFolder.findByPk(folderId, {
      where: {
        [Op.or]: [
          { ownerId: userId },
          { isPublic: true }
        ]
      }
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Get subfolders
    const subfolders = await DocumentFolder.findAll({
      where: { parentId: folderId }
    });

    // Get documents in folder
    const documents = await Document.findAll({
      where: { parentFolderId: folderId }
    });

    res.json({
      folder,
      subfolders,
      documents
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch folder contents' });
  }
});

// Get folder tree (recursive)
app.get('/folders/tree/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.header('x-user-id');

    async function buildFolderTree(parentId) {
      const folders = await DocumentFolder.findAll({
        where: { parentId }
      });

      const tree = [];
      for (const folder of folders) {
        tree.push({
          ...folder.toJSON(),
          children: await buildFolderTree(folder.id)
        });
      }
      return tree;
    }

    const treeData = await buildFolderTree(folderId);
    res.json({ tree: treeData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch folder tree' });
  }
});

// Get folders (root level or by parent)
app.get('/folders', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    const { parentId } = req.query;

    const where = {
      [Op.or]: [
        { ownerId: userId },
        { isPublic: true }
      ]
    };

    // If parentId is provided, filter by it (null for root level)
    if (parentId !== undefined) {
      where.parentId = parentId === 'null' || parentId === null ? null : parentId;
    }

    const folders = await DocumentFolder.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.json(folders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Update folder
app.put('/folders/:folderId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { folderId } = req.params;

    // Whitelist allowed fields
    const allowedFields = ['name', 'description', 'isPublic'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const folder = await DocumentFolder.findByPk(folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Only owner can update
    if (folder.ownerId !== userId) {
      return res.status(403).json({ error: 'Only folder owner can update' });
    }

    await folder.update(updates);
    res.json(folder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// Delete folder
app.delete('/folders/:folderId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { folderId } = req.params;

    const folder = await DocumentFolder.findByPk(folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Only owner can delete
    if (folder.ownerId !== userId) {
      return res.status(403).json({ error: 'Only folder owner can delete' });
    }

    // Check if folder has contents
    const subfolders = await DocumentFolder.count({ where: { parentId: folderId } });
    const documents = await Document.count({ where: { parentFolderId: folderId } });

    if (subfolders > 0 || documents > 0) {
      return res.status(400).json({ 
        error: 'Folder must be empty before deletion',
        subfolders,
        documents
      });
    }

    await folder.destroy();
    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// ==================== NOTION DATABASE VIEWS ====================

// Database View Model
const DatabaseView = sequelize.define('DatabaseView', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  parentId: DataTypes.UUID, // Reference to parent document (database)
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  viewType: {
    type: DataTypes.ENUM('table', 'gallery', 'list', 'board'),
    defaultValue: 'table'
  },
  filters: DataTypes.JSONB, // Filter conditions
  sorts: DataTypes.JSONB, // Sort configurations
  properties: DataTypes.JSONB, // Visible properties/columns
  groupBy: DataTypes.STRING // Property to group by (for board/list views)
});

// Database Property Model (for typed properties)
const DatabaseProperty = sequelize.define('DatabaseProperty', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  databaseId: DataTypes.UUID,
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('text', 'number', 'select', 'multiselect', 'date', 'checkbox', 'url', 'email'),
    defaultValue: 'text'
  },
  options: DataTypes.JSONB // For select/multiselect types
});

// Create a database view
app.post('/databases/:dbId/views', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { dbId } = req.params;
    const { name, viewType, filters, sorts, properties, groupBy } = req.body;

    // Verify database (document) exists and user has access
    const doc = await Document.findOne({
      where: { id: dbId, ownerId: userId }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Database not found' });
    }

    const view = await DatabaseView.create({
      parentId: dbId,
      name: name || `${viewType} View`,
      viewType: viewType || 'table',
      filters: filters || {},
      sorts: sorts || {},
      properties: properties || {},
      groupBy: groupBy || null
    });

    res.status(201).json(view);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create database view' });
  }
});

// Get database views
app.get('/databases/:dbId/views', async (req, res) => {
  try {
    const { dbId } = req.params;

    const views = await DatabaseView.findAll({
      where: { parentId: dbId }
    });

    res.json(views);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch views' });
  }
});

// Update database view
app.put('/databases/views/:viewId', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { viewId } = req.params;
    const { name, viewType, filters, sorts, properties, groupBy } = req.body;

    const view = await DatabaseView.findByPk(viewId);
    if (!view) {
      return res.status(404).json({ error: 'View not found' });
    }

    // Verify ownership
    const doc = await Document.findOne({
      where: { id: view.parentId, ownerId: userId }
    });
    if (!doc) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await view.update({
      name: name || view.name,
      viewType: viewType || view.viewType,
      filters: filters !== undefined ? filters : view.filters,
      sorts: sorts !== undefined ? sorts : view.sorts,
      properties: properties !== undefined ? properties : view.properties,
      groupBy: groupBy !== undefined ? groupBy : view.groupBy
    });

    res.json(view);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update view' });
  }
});

// Create database property
app.post('/databases/:dbId/properties', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { dbId } = req.params;
    const { name, type, options } = req.body;

    // Verify ownership
    const doc = await Document.findOne({
      where: { id: dbId, ownerId: userId }
    });
    if (!doc) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const property = await DatabaseProperty.create({
      databaseId: dbId,
      name,
      type: type || 'text',
      options: options || {}
    });

    res.status(201).json(property);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// Get database properties
app.get('/databases/:dbId/properties', async (req, res) => {
  try {
    const { dbId } = req.params;

    const properties = await DatabaseProperty.findAll({
      where: { databaseId: dbId }
    });

    res.json(properties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// ==================== BASIC WEBRTC SIGNALING ====================

// WebRTC Call Model
const WebRTCCall = sequelize.define('WebRTCCall', {
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
    defaultValue: 'video'
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'missed', 'ended'),
    defaultValue: 'pending'
  },
  offer: DataTypes.TEXT, // WebRTC offer (JSON stringified)
  answer: DataTypes.TEXT, // WebRTC answer (JSON stringified)
  duration: DataTypes.INTEGER // Call duration in seconds
});

// Initiate WebRTC call
app.post('/calls/initiate', async (req, res) => {
  try {
    const callerId = req.header('x-user-id');
    if (!callerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { recipientId, type, offer } = req.body;

    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID required' });
    }

    const call = await WebRTCCall.create({
      callerId,
      recipientId,
      type: type || 'video',
      offer: typeof offer === 'string' ? offer : JSON.stringify(offer),
      status: 'pending'
    });

    // Emit socket event to notify recipient
    // io.to(recipientId).emit('incomingCall', { call });

    res.status(201).json(call);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

// Accept WebRTC call
app.post('/calls/:callId/accept', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { callId } = req.params;
    const { answer } = req.body;

    const call = await WebRTCCall.findByPk(callId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    if (call.recipientId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await call.update({
      status: 'accepted',
      answer: typeof answer === 'string' ? answer : JSON.stringify(answer)
    });

    // Emit socket event to notify caller
    // io.to(call.callerId).emit('callAccepted', { call });

    res.json(call);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to accept call' });
  }
});

// Reject WebRTC call
app.post('/calls/:callId/reject', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { callId } = req.params;

    const call = await WebRTCCall.findByPk(callId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    if (call.recipientId !== userId && call.callerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await call.update({ status: 'rejected' });

    res.json(call);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject call' });
  }
});

// End WebRTC call
app.post('/calls/:callId/end', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { callId } = req.params;
    const { duration } = req.body;

    const call = await WebRTCCall.findByPk(callId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    await call.update({
      status: 'ended',
      duration: duration || 0
    });

    res.json(call);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to end call' });
  }
});

// Get call history
app.get('/calls/history', async (req, res) => {
  try {
    const userId = req.header('x-user-id');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const calls = await WebRTCCall.findAll({
      where: {
        [Op.or]: [{ callerId: userId }, { recipientId: userId }]
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(calls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
});

// Get ICE candidates (placeholder for STUN/TURN servers)
app.get('/webrtc/ice-servers', (req, res) => {
  try {
    res.json({
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] },
        { urls: ['stun:stun1.l.google.com:19302'] },
        {
          urls: [process.env.TURN_SERVER || 'turn:your-turn-server.com:3478'],
          username: process.env.TURN_USERNAME || 'user',
          credential: process.env.TURN_PASSWORD || 'pass'
        }
      ]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ICE servers' });
  }
});

app.listen(PORT, () => {
  console.log(`Collaboration service running on port ${PORT}`);
});
