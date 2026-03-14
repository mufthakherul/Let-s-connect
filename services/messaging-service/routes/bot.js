'use strict';

/**
 * @fileoverview Bot-specific routes for the messaging service
 *
 * Provides endpoints for:
 * - Bot command management
 * - Bot analytics
 * - Bot configuration
 * - Custom bot interactions
 */

const express = require('express');

module.exports = function createBotRouter({ botService, models }) {
  const router = express.Router();

  // ─── Bot Commands ────────────────────────────────────────────────────────

  /**
   * GET /bot/commands
   * Get all available bot commands
   */
  router.get('/commands', async (req, res) => {
    try {
      const commands = botService.getCommands();
      res.json({
        success: true,
        commands,
        totalCommands: commands.length,
        categories: [...new Set(commands.map(c => c.category))]
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch bot commands' });
    }
  });

  /**
   * GET /bot/commands/:commandName
   * Get details of a specific command
   */
  router.get('/commands/:commandName', async (req, res) => {
    try {
      const bot = botService.getBot();
      const command = bot.commands.get(req.params.commandName);

      if (!command) {
        return res.status(404).json({ error: 'Command not found' });
      }

      res.json({
        success: true,
        command: {
          name: command.name,
          aliases: command.aliases,
          description: command.description,
          category: command.category,
          parameters: command.parameters,
          examples: command.examples,
          cooldown: command.cooldown,
          usageCount: command.usageCount,
          lastUsed: command.lastUsed
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch command details' });
    }
  });

  // ─── Bot Analytics ───────────────────────────────────────────────────────

  /**
   * GET /bot/analytics
   * Get bot analytics and statistics
   */
  router.get('/analytics', async (req, res) => {
    try {
      const userId = req.header('x-user-id');

      // Check if user has admin role
      const bot = botService.getBot();
      const userRoles = bot.userRoles.get(userId) || new Set();

      if (!userRoles.has('admin')) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const analytics = botService.getAnalytics();
      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  /**
   * GET /bot/analytics/commands
   * Get command usage statistics
   */
  router.get('/analytics/commands', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      const bot = botService.getBot();
      const userRoles = bot.userRoles.get(userId) || new Set();

      if (!userRoles.has('admin')) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const analytics = botService.getAnalytics();
      const commandStats = Object.entries(analytics.commandStats || {})
        .map(([name, stats]) => ({
          name,
          ...stats,
          successRate: stats.total > 0
            ? ((stats.success / stats.total) * 100).toFixed(2) + '%'
            : '0%'
        }))
        .sort((a, b) => b.total - a.total);

      res.json({
        success: true,
        commandStats,
        totalCommands: analytics.totalCommands
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch command analytics' });
    }
  });

  // ─── Bot Interactions ────────────────────────────────────────────────────

  /**
   * POST /bot/message
   * Send a message to the bot
   */
  router.post('/message', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { content, conversationId } = req.body;

      if (!content || !conversationId) {
        return res.status(400).json({ error: 'content and conversationId are required' });
      }

      const result = await botService.processMessage({
        content,
        senderId: userId,
        conversationId,
        id: require('crypto').randomUUID()
      });

      res.json({
        success: result?.success || false,
        response: result?.response || null,
        data: result?.data || null,
        error: result?.error || null
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  /**
   * POST /bot/button-click
   * Handle button click interactions
   */
  router.post('/button-click', async (req, res) => {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { action, conversationId, metadata } = req.body;

      if (!action || !conversationId) {
        return res.status(400).json({ error: 'action and conversationId are required' });
      }

      const result = await botService.handleButtonClick({
        action,
        userId,
        conversationId,
        metadata
      });

      res.json({
        success: result.success,
        action: result.action
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to handle button click' });
    }
  });

  // ─── Bot Configuration ───────────────────────────────────────────────────

  /**
   * GET /bot/config
   * Get bot configuration
   */
  router.get('/config', async (req, res) => {
    try {
      const bot = botService.getBot();

      res.json({
        success: true,
        config: {
          name: bot.name,
          version: bot.version,
          description: bot.description,
          prefix: bot.prefix,
          aiEnabled: bot.aiEnabled,
          maxCommands: bot.maxCommands,
          rateLimitWindow: bot.rateLimitWindow,
          pluginCount: bot.plugins.size,
          commandCount: bot.commands.size
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch bot configuration' });
    }
  });

  /**
   * GET /bot/plugins
   * Get list of loaded plugins
   */
  router.get('/plugins', async (req, res) => {
    try {
      const bot = botService.getBot();
      const plugins = Array.from(bot.plugins.keys());

      res.json({
        success: true,
        plugins,
        count: plugins.length
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch plugins' });
    }
  });

  // ─── User Management ─────────────────────────────────────────────────────

  /**
   * POST /bot/users/:userId/roles
   * Add role to user
   */
  router.post('/users/:userId/roles', async (req, res) => {
    try {
      const adminUserId = req.header('x-user-id');
      if (!adminUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const bot = botService.getBot();
      const adminRoles = bot.userRoles.get(adminUserId) || new Set();

      if (!adminRoles.has('admin')) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { userId } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ error: 'role is required' });
      }

      botService.addUserRole(userId, role);

      res.json({
        success: true,
        message: `Role '${role}' added to user ${userId}`
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to add user role' });
    }
  });

  /**
   * DELETE /bot/users/:userId/roles/:role
   * Remove role from user
   */
  router.delete('/users/:userId/roles/:role', async (req, res) => {
    try {
      const adminUserId = req.header('x-user-id');
      if (!adminUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const bot = botService.getBot();
      const adminRoles = bot.userRoles.get(adminUserId) || new Set();

      if (!adminRoles.has('admin')) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { userId, role } = req.params;
      botService.removeUserRole(userId, role);

      res.json({
        success: true,
        message: `Role '${role}' removed from user ${userId}`
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to remove user role' });
    }
  });

  /**
   * GET /bot/users/:userId/roles
   * Get user roles
   */
  router.get('/users/:userId/roles', async (req, res) => {
    try {
      const bot = botService.getBot();
      const roles = Array.from(bot.userRoles.get(req.params.userId) || []);

      res.json({
        success: true,
        userId: req.params.userId,
        roles
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch user roles' });
    }
  });

  // ─── Bot Help & Documentation ────────────────────────────────────────────

  /**
   * GET /bot/help
   * Get bot help information
   */
  router.get('/help', async (req, res) => {
    try {
      const { category } = req.query;
      const commands = botService.getCommands();

      let filteredCommands = commands;
      if (category) {
        filteredCommands = commands.filter(c => c.category === category);
      }

      const categories = [...new Set(commands.map(c => c.category))];

      let helpText = `# ${botService.getBot().name}\n\n`;
      helpText += `${botService.getBot().description}\n\n`;
      helpText += `## Available Commands\n\n`;

      for (const cat of categories) {
        if (category && cat !== category) continue;

        const catCommands = filteredCommands.filter(c => c.category === cat);
        if (catCommands.length === 0) continue;

        helpText += `### ${cat.toUpperCase()}\n\n`;

        for (const cmd of catCommands) {
          helpText += `**/${cmd.name}**`;
          if (cmd.aliases.length > 0) {
            helpText += ` (aliases: ${cmd.aliases.join(', ')})`;
          }
          helpText += `\n`;
          helpText += `${cmd.description}\n`;

          if (cmd.parameters.length > 0) {
            const params = cmd.parameters.map(p =>
              p.required ? `<${p.name}>` : `[${p.name}]`
            ).join(' ');
            helpText += `Usage: /${cmd.name} ${params}\n`;
          }

          if (cmd.examples && cmd.examples.length > 0) {
            helpText += `Examples: ${cmd.examples.join(', ')}\n`;
          }

          helpText += `\n`;
        }
      }

      res.json({
        success: true,
        helpText,
        commands: filteredCommands,
        categories
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate help' });
    }
  });

  /**
   * GET /bot/status
   * Get bot status and health
   */
  router.get('/status', async (req, res) => {
    try {
      const analytics = botService.getAnalytics();
      const bot = botService.getBot();

      res.json({
        success: true,
        status: 'online',
        uptime: analytics.uptime,
        name: bot.name,
        version: bot.version,
        totalCommands: analytics.totalCommands,
        successRate: analytics.successRate,
        activeUsers: analytics.userCount,
        commandsPerMinute: analytics.commandsPerMinute
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch bot status' });
    }
  });

  return router;
};
