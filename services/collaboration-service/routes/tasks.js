'use strict';
const express = require('express');
const { Op } = require('sequelize');

function createTasksRouter({ models, redis }) {
  const { Task, Issue, IssueComment, Project, Milestone } = models;

  const router = express.Router();

  // ==================== TASKS ====================

  router.post('/tasks', async (req, res) => {
    try {
      const task = await Task.create(req.body);
      res.status(201).json(task);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  router.get('/tasks', async (req, res) => {
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

  router.put('/tasks/:id', async (req, res) => {
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

  // ==================== ISSUES ====================

  router.post('/issues', async (req, res) => {
    try {
      const { projectId, title, description, assigneeId, labels, milestone } = req.body;

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

  router.get('/issues', async (req, res) => {
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

  router.get('/issues/:id', async (req, res) => {
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

  router.put('/issues/:id', async (req, res) => {
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

  router.post('/issues/:id/close', async (req, res) => {
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

  router.post('/issues/:issueId/comments', async (req, res) => {
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

  // ==================== PROJECTS ====================

  router.post('/projects', async (req, res) => {
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

  router.get('/projects', async (req, res) => {
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

  router.get('/projects/:id', async (req, res) => {
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

  router.put('/projects/:id', async (req, res) => {
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

  // ==================== MILESTONES ====================

  router.post('/milestones', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { projectId, title, description, dueDate } = req.body;

      if (!projectId || !title) {
        return res.status(400).json({ error: 'projectId and title are required' });
      }

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

  router.get('/projects/:projectId/milestones', async (req, res) => {
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

  router.get('/milestones/:id', async (req, res) => {
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

  router.put('/milestones/:id', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const milestone = await Milestone.findByPk(req.params.id);
      if (!milestone) {
        return res.status(404).json({ error: 'Milestone not found' });
      }

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

  router.delete('/milestones/:id', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const milestone = await Milestone.findByPk(req.params.id);
      if (!milestone) {
        return res.status(404).json({ error: 'Milestone not found' });
      }

      const project = await Project.findByPk(milestone.projectId);
      if (project.ownerId !== userId && !(project.members || []).includes(userId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

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

  router.post('/issues/:issueId/milestone', async (req, res) => {
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

      const project = await Project.findByPk(issue.projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.ownerId !== userId && !(project.members || []).includes(userId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (issue.milestoneId) {
        const oldMilestone = await Milestone.findByPk(issue.milestoneId);
        if (oldMilestone) {
          await oldMilestone.decrement('totalIssues');
          if (issue.status === 'closed') {
            await oldMilestone.decrement('completedIssues');
          }
        }
      }

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

  return router;
}

module.exports = createTasksRouter;
