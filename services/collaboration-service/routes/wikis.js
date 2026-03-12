'use strict';
const express = require('express');
const crypto = require('crypto');
const { Op } = require('sequelize');
const DiffMatchPatch = require('diff-match-patch');

function createWikisRouter({ models }) {
  const { Wiki, WikiHistory } = models;

  const dmp = new DiffMatchPatch();
  const router = express.Router();

  // Create wiki page
  router.post('/wiki', async (req, res) => {
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

  // Update wiki page (with history tracking)
  router.put('/wiki/:id', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const wiki = await Wiki.findByPk(req.params.id);
      if (!wiki) {
        return res.status(404).json({ error: 'Wiki page not found' });
      }

      if (wiki.visibility === 'private' && wiki.ownerId !== userId && (!wiki.contributors || !wiki.contributors.includes(userId))) {
        return res.status(403).json({ error: 'Not authorized to edit this wiki page' });
      }

      const contentHash = crypto.createHash('md5').update(wiki.content || '').digest('hex');
      await WikiHistory.create({
        wikiId: wiki.id,
        title: wiki.title,
        content: wiki.content,
        editedBy: userId,
        editSummary: req.body.editSummary || 'Wiki page updated',
        contentHash
      });

      const { title, content, visibility, contributors } = req.body;
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (visibility !== undefined) updateData.visibility = visibility;
      if (contributors !== undefined) updateData.contributors = contributors;

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
  router.get('/wiki/:id/history', async (req, res) => {
    try {
      const wiki = await Wiki.findByPk(req.params.id);
      if (!wiki) {
        return res.status(404).json({ error: 'Wiki page not found' });
      }

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
  router.get('/wiki/:id/history/:historyId', async (req, res) => {
    try {
      const wiki = await Wiki.findByPk(req.params.id);
      if (!wiki) {
        return res.status(404).json({ error: 'Wiki page not found' });
      }

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
  router.post('/wiki/:id/history/:historyId/restore', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const wiki = await Wiki.findByPk(req.params.id);
      if (!wiki) {
        return res.status(404).json({ error: 'Wiki page not found' });
      }

      if (wiki.ownerId !== userId && (!wiki.contributors || !wiki.contributors.includes(userId))) {
        return res.status(403).json({ error: 'Not authorized to edit this wiki page' });
      }

      const revision = await WikiHistory.findByPk(req.params.historyId);
      if (!revision || revision.wikiId !== req.params.id) {
        return res.status(404).json({ error: 'Revision not found' });
      }

      const contentHash = crypto.createHash('md5').update(wiki.content || '').digest('hex');
      await WikiHistory.create({
        wikiId: wiki.id,
        title: wiki.title,
        content: wiki.content,
        editedBy: userId,
        editSummary: `Restored to revision from ${revision.createdAt}`,
        contentHash
      });

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
  router.post('/wiki/:id/categories', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const wiki = await Wiki.findByPk(req.params.id);
      if (!wiki) {
        return res.status(404).json({ error: 'Wiki page not found' });
      }

      if (wiki.ownerId !== userId && (!wiki.contributors || !wiki.contributors.includes(userId))) {
        return res.status(403).json({ error: 'Not authorized to edit this wiki page' });
      }

      const { categories } = req.body;
      if (!categories || !Array.isArray(categories)) {
        return res.status(400).json({ error: 'Categories must be an array' });
      }

      await wiki.update({ categories });

      res.json(wiki);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to add categories' });
    }
  });

  // Get wikis by category
  router.get('/wiki/category/:category', async (req, res) => {
    try {
      const { category } = req.params;

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

  // Get diff between two wiki versions
  router.get('/wikis/:wikiId/diff', async (req, res) => {
    try {
      const { wikiId } = req.params;
      const { from, to } = req.query;

      const wiki = await Wiki.findByPk(wikiId);
      if (!wiki) {
        return res.status(404).json({ error: 'Wiki not found' });
      }

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

      const diffs = dmp.diff_main(fromContent, toContent);
      dmp.diff_cleanupSemantic(diffs);

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
  router.get('/wikis/:wikiId/patch', async (req, res) => {
    try {
      const { wikiId } = req.params;
      const { from } = req.query;

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

  return router;
}

module.exports = createWikisRouter;
