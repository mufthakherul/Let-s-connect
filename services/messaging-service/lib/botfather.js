'use strict';

/**
 * @fileoverview BotFather - Master Bot for Creating and Managing Bots
 *
 * Similar to Telegram's @BotFather, this allows users to:
 * - Create new bots
 * - Configure bot settings
 * - Manage bot commands
 * - Get bot tokens
 * - Set bot descriptions
 * - Configure webhooks
 */

const crypto = require('crypto');

class BotFather {
  constructor(options = {}) {
    const { models, redis } = options;
    this.models = models;
    this.redis = redis;

    // In-memory bot registry (should be moved to database in production)
    this.userBots = new Map(); // userId -> [bot configs]
    this.botTokens = new Map(); // botToken -> bot config
  }

  /**
   * Create a new bot
   */
  async createBot(userId, botName) {
    const botToken = this._generateBotToken();
    const botId = crypto.randomUUID();

    const botConfig = {
      id: botId,
      name: botName,
      token: botToken,
      createdBy: userId,
      createdAt: Date.now(),
      description: '',
      about: '',
      commands: [],
      webhookUrl: null,
      isActive: true,
      username: botName.toLowerCase().replace(/\s+/g, '_') + '_bot'
    };

    // Store in user's bots
    if (!this.userBots.has(userId)) {
      this.userBots.set(userId, []);
    }
    this.userBots.get(userId).push(botConfig);

    // Store by token for quick lookup
    this.botTokens.set(botToken, botConfig);

    // Store in Redis for persistence
    await this.redis.set(`bot:${botId}`, JSON.stringify(botConfig));
    await this.redis.sadd(`user:${userId}:bots`, botId);

    return {
      success: true,
      bot: {
        id: botId,
        name: botName,
        username: botConfig.username,
        token: botToken
      },
      message: `Congratulations! You've created a new bot.\n\n` +
               `Bot: ${botName}\n` +
               `Username: @${botConfig.username}\n` +
               `Token: \`${botToken}\`\n\n` +
               `Keep your token secure! Anyone with your token can control your bot.\n\n` +
               `Next steps:\n` +
               `• Use /setdescription to set bot description\n` +
               `• Use /setcommands to configure bot commands\n` +
               `• Use /setwebhook to set webhook URL`
    };
  }

  /**
   * List user's bots
   */
  async listBots(userId) {
    const bots = this.userBots.get(userId) || [];

    if (bots.length === 0) {
      return {
        success: true,
        bots: [],
        message: 'You haven\'t created any bots yet.\nUse /newbot to create your first bot.'
      };
    }

    return {
      success: true,
      bots: bots.map(bot => ({
        id: bot.id,
        name: bot.name,
        username: bot.username,
        isActive: bot.isActive,
        commandCount: bot.commands.length
      })),
      message: `Your bots (${bots.length}):\n\n` +
               bots.map((b, i) =>
                 `${i + 1}. ${b.name} (@${b.username}) ${b.isActive ? '✅' : '❌'}`
               ).join('\n')
    };
  }

  /**
   * Delete a bot
   */
  async deleteBot(userId, botId) {
    const bots = this.userBots.get(userId) || [];
    const botIndex = bots.findIndex(b => b.id === botId);

    if (botIndex === -1) {
      return {
        success: false,
        message: '❌ Bot not found or you don\'t have permission to delete it.'
      };
    }

    const bot = bots[botIndex];

    // Remove from storage
    bots.splice(botIndex, 1);
    this.botTokens.delete(bot.token);
    await this.redis.del(`bot:${botId}`);
    await this.redis.srem(`user:${userId}:bots`, botId);

    return {
      success: true,
      message: `✅ Bot ${bot.name} (@${bot.username}) has been deleted.`
    };
  }

  /**
   * Set bot description
   */
  async setDescription(userId, botId, description) {
    const bot = await this._getUserBot(userId, botId);

    if (!bot) {
      return {
        success: false,
        message: '❌ Bot not found.'
      };
    }

    bot.description = description;
    await this._saveBot(bot);

    return {
      success: true,
      message: `✅ Description updated for ${bot.name}:\n\n${description}`
    };
  }

  /**
   * Set bot commands
   */
  async setCommands(userId, botId, commandsText) {
    const bot = await this._getUserBot(userId, botId);

    if (!bot) {
      return {
        success: false,
        message: '❌ Bot not found.'
      };
    }

    // Parse commands (format: command - description)
    const commands = commandsText.split('\n')
      .map(line => line.trim())
      .filter(line => line.includes(' - '))
      .map(line => {
        const [command, description] = line.split(' - ').map(s => s.trim());
        return { command: command.replace('/', ''), description };
      });

    bot.commands = commands;
    await this._saveBot(bot);

    return {
      success: true,
      message: `✅ Commands updated for ${bot.name}:\n\n` +
               commands.map(c => `/${c.command} - ${c.description}`).join('\n')
    };
  }

  /**
   * Set bot webhook
   */
  async setWebhook(userId, botId, webhookUrl) {
    const bot = await this._getUserBot(userId, botId);

    if (!bot) {
      return {
        success: false,
        message: '❌ Bot not found.'
      };
    }

    // Validate webhook URL
    try {
      const url = new URL(webhookUrl);
      if (url.protocol !== 'https:') {
        return {
          success: false,
          message: '❌ Webhook URL must use HTTPS protocol.'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: '❌ Invalid webhook URL.'
      };
    }

    bot.webhookUrl = webhookUrl;
    await this._saveBot(bot);

    return {
      success: true,
      message: `✅ Webhook set for ${bot.name}:\n${webhookUrl}\n\n` +
               `Your bot will now receive updates at this URL.`
    };
  }

  /**
   * Get bot info
   */
  async getBotInfo(userId, botId) {
    const bot = await this._getUserBot(userId, botId);

    if (!bot) {
      return {
        success: false,
        message: '❌ Bot not found.'
      };
    }

    return {
      success: true,
      bot: {
        id: bot.id,
        name: bot.name,
        username: bot.username,
        description: bot.description,
        about: bot.about,
        commands: bot.commands,
        webhookUrl: bot.webhookUrl,
        isActive: bot.isActive,
        createdAt: bot.createdAt
      },
      message: `**Bot Information**\n\n` +
               `Name: ${bot.name}\n` +
               `Username: @${bot.username}\n` +
               `Description: ${bot.description || '(not set)'}\n` +
               `Commands: ${bot.commands.length}\n` +
               `Webhook: ${bot.webhookUrl || '(not set)'}\n` +
               `Status: ${bot.isActive ? 'Active ✅' : 'Inactive ❌'}\n` +
               `Created: ${new Date(bot.createdAt).toLocaleDateString()}`
    };
  }

  /**
   * Toggle bot active status
   */
  async toggleBot(userId, botId) {
    const bot = await this._getUserBot(userId, botId);

    if (!bot) {
      return {
        success: false,
        message: '❌ Bot not found.'
      };
    }

    bot.isActive = !bot.isActive;
    await this._saveBot(bot);

    return {
      success: true,
      message: `${bot.isActive ? '✅ Activated' : '❌ Deactivated'} ${bot.name}`
    };
  }

  /**
   * Get bot by token
   */
  async getBotByToken(token) {
    return this.botTokens.get(token);
  }

  /**
   * Process incoming update for a bot
   */
  async processUpdate(botToken, update) {
    const bot = this.botTokens.get(botToken);

    if (!bot || !bot.isActive) {
      return {
        success: false,
        error: 'Bot not found or inactive'
      };
    }

    // If webhook is configured, forward the update
    if (bot.webhookUrl) {
      try {
        await fetch(bot.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update)
        });

        return {
          success: true,
          forwarded: true
        };
      } catch (error) {
        return {
          success: false,
          error: 'Failed to forward update to webhook'
        };
      }
    }

    // Store update in queue for polling
    await this.redis.lpush(`bot:${bot.id}:updates`, JSON.stringify(update));
    await this.redis.ltrim(`bot:${bot.id}:updates`, 0, 99); // Keep last 100 updates

    return {
      success: true,
      queued: true
    };
  }

  // ─── Helper Methods ──────────────────────────────────────────────────────

  async _getUserBot(userId, botId) {
    const bots = this.userBots.get(userId) || [];
    return bots.find(b => b.id === botId);
  }

  async _saveBot(bot) {
    await this.redis.set(`bot:${bot.id}`, JSON.stringify(bot));
  }

  _generateBotToken() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(24).toString('base64url');
    return `${timestamp}:${random}`;
  }
}

module.exports = BotFather;
