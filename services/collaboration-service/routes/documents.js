'use strict';
const express = require('express');
const crypto = require('crypto');
const { Op } = require('sequelize');
const DiffMatchPatch = require('diff-match-patch');

function createDocumentsRouter({ models, redis }) {
  const {
    Document, DocumentVersion, CollaborativeSession, CollaborativeOperation,
    UserPresence, DocumentFolder, DatabaseView, DatabaseProperty, Wiki,
    WebRTCCall
  } = models;

  const router = express.Router();

  // ==================== PUBLIC ENDPOINTS ====================

  router.get('/public/docs', async (req, res) => {
    try {
      const docs = await Document.findAll({
        where: { visibility: 'public' },
        order: [['updatedAt', 'DESC']],
        limit: 50
      });
      res.json(docs);
    } catch (error) {
      console.error('Error fetching public docs:', error);
      res.status(500).json({ error: 'Failed to fetch public documents' });
    }
  });

  router.get('/public/wiki', async (req, res) => {
    try {
      const pages = await Wiki.findAll({
        where: { visibility: 'public' },
        order: [['updatedAt', 'DESC']],
        limit: 50
      });
      res.json(pages);
    } catch (error) {
      console.error('Error fetching wiki pages:', error);
      res.status(500).json({ error: 'Failed to fetch wiki pages' });
    }
  });

  router.get('/public/wiki/:slug', async (req, res) => {
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

  // ==================== DOCUMENT CRUD ====================

  router.post('/documents', async (req, res) => {
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

  router.get('/documents/:userId', async (req, res) => {
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

  router.put('/documents/:id', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const doc = await Document.findByPk(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      if (doc.ownerId !== userId && (!doc.collaborators || !doc.collaborators.includes(userId))) {
        return res.status(403).json({ error: 'Not authorized to edit this document' });
      }

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

      const { title, content, visibility, collaborators, tags } = req.body;
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

  // ==================== DOCUMENT VERSION HISTORY ====================

  router.get('/documents/:id/versions', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const doc = await Document.findByPk(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

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

  router.get('/documents/:id/versions/:versionNumber', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const doc = await Document.findByPk(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

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

  router.post('/documents/:id/versions/:versionNumber/restore', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const doc = await Document.findByPk(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

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

  // ==================== DOCUMENT FOLDER HIERARCHY ====================

  router.post('/folders', async (req, res) => {
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

  router.get('/folders/:folderId/contents', async (req, res) => {
    try {
      const { folderId } = req.params;
      const userId = req.header('x-user-id');

      // findByPk ignores the where clause — use findOne with explicit access conditions
      const folder = await DocumentFolder.findOne({
        where: {
          id: folderId,
          [Op.or]: [
            { ownerId: userId },
            { isPublic: true }
          ]
        }
      });

      if (!folder) {
        return res.status(404).json({ error: 'Folder not found or access denied' });
      }

      const subfolders = await DocumentFolder.findAll({
        where: { parentId: folderId }
      });

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

  router.get('/folders/tree/:folderId', async (req, res) => {
    try {
      const { folderId } = req.params;

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

  router.get('/folders', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      const { parentId } = req.query;

      const where = {
        [Op.or]: [
          { ownerId: userId },
          { isPublic: true }
        ]
      };

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

  router.put('/folders/:folderId', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { folderId } = req.params;

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

  router.delete('/folders/:folderId', async (req, res) => {
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

      if (folder.ownerId !== userId) {
        return res.status(403).json({ error: 'Only folder owner can delete' });
      }

      const subfolders = await DocumentFolder.count({ where: { parentId: folderId } });
      const documents = await Document.count({ where: { parentFolderId: folderId } });

      if (subfolders > 0 || documents > 0) {
        return res.status(400).json({
          error: 'Cannot delete folder: folder must be empty before deletion',
          details: `This folder contains ${subfolders} subfolder(s) and ${documents} document(s)`,
          subfolders,
          documents,
          suggestion: 'Please remove all contents before deleting this folder'
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

  router.post('/databases/:dbId/views', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { dbId } = req.params;
      const { name, viewType, filters, sorts, properties, groupBy } = req.body;

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

  router.get('/databases/:dbId/views', async (req, res) => {
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

  router.put('/databases/views/:viewId', async (req, res) => {
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

  router.post('/databases/:dbId/properties', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { dbId } = req.params;
      const { name, type, options } = req.body;

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

  router.get('/databases/:dbId/properties', async (req, res) => {
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

  router.post('/calls/initiate', async (req, res) => {
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

      res.status(201).json(call);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to initiate call' });
    }
  });

  router.post('/calls/:callId/accept', async (req, res) => {
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

      res.json(call);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to accept call' });
    }
  });

  router.post('/calls/:callId/reject', async (req, res) => {
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

  router.post('/calls/:callId/end', async (req, res) => {
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

  router.get('/calls/history', async (req, res) => {
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

  router.get('/webrtc/ice-servers', (req, res) => {
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

  // ==================== COLLABORATIVE SESSIONS ====================

  router.post('/collaborative/sessions', async (req, res) => {
    try {
      const { documentId, documentType, userId } = req.body;

      if (!documentId || !userId) {
        return res.status(400).json({ error: 'documentId and userId are required' });
      }

      let session = await CollaborativeSession.findOne({ where: { documentId } });

      if (session) {
        if (!session.activeUsers.includes(userId)) {
          session.activeUsers = [...session.activeUsers, userId];
          session.lastActivity = new Date();
          await session.save();
        }
      } else {
        session = await CollaborativeSession.create({
          documentId,
          documentType: documentType || 'document',
          activeUsers: [userId]
        });
      }

      res.status(201).json(session);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create/join session' });
    }
  });

  router.get('/collaborative/sessions/:documentId', async (req, res) => {
    try {
      const session = await CollaborativeSession.findOne({
        where: { documentId: req.params.documentId },
        include: [
          { model: UserPresence, as: 'presences' },
          {
            model: CollaborativeOperation,
            as: 'operations',
            limit: 100,
            order: [['createdAt', 'DESC']]
          }
        ]
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json(session);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch session' });
    }
  });

  router.delete('/collaborative/sessions/:documentId/users/:userId', async (req, res) => {
    try {
      const { documentId, userId } = req.params;

      const session = await CollaborativeSession.findOne({ where: { documentId } });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      session.activeUsers = session.activeUsers.filter(id => id !== userId);
      await session.save();

      await UserPresence.destroy({
        where: { sessionId: session.id, userId }
      });

      if (session.activeUsers.length === 0) {
        await session.destroy();
      }

      res.json({ message: 'Left session successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to leave session' });
    }
  });

  router.get('/collaborative/sessions/:documentId/operations', async (req, res) => {
    try {
      const { documentId } = req.params;
      const { fromRevision, limit = 100 } = req.query;

      const session = await CollaborativeSession.findOne({ where: { documentId } });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const whereClause = { sessionId: session.id };
      if (fromRevision) {
        whereClause.baseRevision = { [Op.gte]: parseInt(fromRevision) };
      }

      const operations = await CollaborativeOperation.findAll({
        where: whereClause,
        order: [['createdAt', 'ASC']],
        limit: parseInt(limit)
      });

      res.json({ operations, currentRevision: session.operationCount });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch operations' });
    }
  });

  router.get('/collaborative/sessions/:documentId/users', async (req, res) => {
    try {
      const { documentId } = req.params;

      const session = await CollaborativeSession.findOne({
        where: { documentId },
        include: [{ model: UserPresence, as: 'presences' }]
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found', activeUsers: [] });
      }

      res.json({
        activeUsers: session.activeUsers,
        presences: session.presences
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch active users' });
    }
  });

  router.put('/collaborative/sessions/:documentId/cursor', async (req, res) => {
    try {
      const { documentId } = req.params;
      const { userId, cursorPosition, selectionStart, selectionEnd, color } = req.body;

      const session = await CollaborativeSession.findOne({ where: { documentId } });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      let presence = await UserPresence.findOne({
        where: { sessionId: session.id, userId }
      });

      if (presence) {
        presence.cursorPosition = cursorPosition;
        presence.selectionStart = selectionStart;
        presence.selectionEnd = selectionEnd;
        presence.lastSeen = new Date();
        if (color) presence.color = color;
        await presence.save();
      } else {
        presence = await UserPresence.create({
          sessionId: session.id,
          userId,
          cursorPosition,
          selectionStart,
          selectionEnd,
          color: color || `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
        });
      }

      res.json(presence);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update cursor' });
    }
  });

  return router;
}

module.exports = createDocumentsRouter;
