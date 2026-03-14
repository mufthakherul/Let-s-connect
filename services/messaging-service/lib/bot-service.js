'use strict';

/**
 * @fileoverview Bot Service Integration Layer
 *
 * Connects the bot framework with the messaging service,
 * providing a complete bot solution with:
 * - Message routing to bot
 * - Response handling
 * - Database integration
 * - Real-time updates
 * - Analytics tracking
 */

const { BotFramework } = require('./bot-framework');
const BotFather = require('./botfather');
const {
  AnalyticsPlugin,
  ModerationPlugin,
  ReminderPlugin,
  PollPlugin,
  GamePlugin
} = require('./bot-plugins');

class BotService {
  constructor(options = {}) {
    const {
      models,
      io,
      redis,
      publishEvent,
      BOT_SYSTEM_USER_ID
    } = options;

    this.models = models;
    this.io = io;
    this.redis = redis;
    this.publishEvent = publishEvent;
    this.BOT_SYSTEM_USER_ID = BOT_SYSTEM_USER_ID;

    // Initialize BotFather for bot creation
    this.botFather = new BotFather({ models, redis });

    // Initialize bot framework (Telegram-style, no AI)
    this.bot = new BotFramework({
      name: 'Let\'s Connect Bot',
      version: '2.0.0',
      description: 'Telegram-style messaging bot',
      prefix: '/',
      maxCommands: 20,
      rateLimitWindow: 60000
    });

    // Setup bot
    this._setupBot();
    this._setupPlugins();
    this._setupCustomCommands();
    this._setupEventHandlers();
  }

  _setupBot() {
    // Add middleware for logging
    this.bot.use(async (ctx, next) => {
      console.log(`[Bot] Command: ${ctx.command} | User: ${ctx.userId}`);
      await next();
    });

    // Add middleware for analytics
    this.bot.use(async (ctx, next) => {
      const start = Date.now();
      await next();
      const duration = Date.now() - start;
      console.log(`[Bot] Command ${ctx.command} completed in ${duration}ms`);
    });
  }

  _setupPlugins() {
    // Register plugins
    this.bot.registerPlugin('analytics', new AnalyticsPlugin());
    this.bot.registerPlugin('moderation', new ModerationPlugin({
      bannedWords: ['spam', 'offensive'],
      autoMod: true
    }));
    this.bot.registerPlugin('reminder', new ReminderPlugin());
    this.bot.registerPlugin('poll', new PollPlugin());
    this.bot.registerPlugin('game', new GamePlugin());
  }

  _setupCustomCommands() {
    // User info command
    this.bot.registerCommand({
      name: 'me',
      description: 'Show your user information',
      category: 'user',
      handler: async (ctx) => {
        const conversations = await this.models.Conversation.findAll({
          where: { participants: { [this.models.Op.contains]: [ctx.userId] } },
          limit: 5
        });

        return {
          text: `**Your Profile**\n\n` +
                `User ID: ${ctx.userId}\n` +
                `Active Conversations: ${conversations.length}\n` +
                `Roles: ${ctx.getRoles().join(', ') || 'None'}`
        };
      }
    });

    // BotFather commands - Bot creation and management
    this.bot.registerCommand({
      name: 'newbot',
      description: 'Create a new bot',
      category: 'botfather',
      handler: async (ctx) => {
        if (ctx.args.length === 0) {
          return {
            text: '🤖 **Create New Bot**\n\n' +
                  'Send me a name for your bot.\n\n' +
                  'Example: `/newbot My Awesome Bot`'
          };
        }

        const botName = ctx.args.join(' ');
        const result = await this.botFather.createBot(ctx.userId, botName);

        return {
          text: result.message,
          format: 'markdown'
        };
      }
    });

    this.bot.registerCommand({
      name: 'mybots',
      description: 'List your bots',
      category: 'botfather',
      handler: async (ctx) => {
        const result = await this.botFather.listBots(ctx.userId);
        return { text: result.message };
      }
    });

    this.bot.registerCommand({
      name: 'setdescription',
      description: 'Set bot description',
      category: 'botfather',
      parameters: [
        { name: 'botId', required: true },
        { name: 'description', required: true }
      ],
      handler: async (ctx) => {
        if (ctx.args.length < 2) {
          return {
            text: '❌ Usage: /setdescription <botId> <description>\n\n' +
                  'Use /mybots to get your bot IDs'
          };
        }

        const botId = ctx.args[0];
        const description = ctx.args.slice(1).join(' ');
        const result = await this.botFather.setDescription(ctx.userId, botId, description);

        return { text: result.message };
      }
    });

    this.bot.registerCommand({
      name: 'setcommands',
      description: 'Set bot commands',
      category: 'botfather',
      parameters: [
        { name: 'botId', required: true },
        { name: 'commands', required: true }
      ],
      examples: [
        '/setcommands <botId> start - Start the bot\\nhelp - Get help'
      ],
      handler: async (ctx) => {
        if (ctx.args.length < 2) {
          return {
            text: '❌ Usage: /setcommands <botId> <commands>\n\n' +
                  'Format: command - description (one per line)\n' +
                  'Example:\n' +
                  'start - Start the bot\n' +
                  'help - Get help\n\n' +
                  'Use /mybots to get your bot IDs'
          };
        }

        const botId = ctx.args[0];
        const commandsText = ctx.args.slice(1).join(' ').replace(/\\n/g, '\n');
        const result = await this.botFather.setCommands(ctx.userId, botId, commandsText);

        return { text: result.message };
      }
    });

    this.bot.registerCommand({
      name: 'setwebhook',
      description: 'Set bot webhook URL',
      category: 'botfather',
      parameters: [
        { name: 'botId', required: true },
        { name: 'url', required: true }
      ],
      handler: async (ctx) => {
        if (ctx.args.length < 2) {
          return {
            text: '❌ Usage: /setwebhook <botId> <https://your-webhook-url>\n\n' +
                  'Use /mybots to get your bot IDs'
          };
        }

        const botId = ctx.args[0];
        const webhookUrl = ctx.args[1];
        const result = await this.botFather.setWebhook(ctx.userId, botId, webhookUrl);

        return { text: result.message };
      }
    });

    this.bot.registerCommand({
      name: 'deletebot',
      description: 'Delete a bot',
      category: 'botfather',
      parameters: [{ name: 'botId', required: true }],
      handler: async (ctx) => {
        if (ctx.args.length === 0) {
          return {
            text: '❌ Usage: /deletebot <botId>\n\n' +
                  'Use /mybots to get your bot IDs'
          };
        }

        const botId = ctx.args[0];
        const result = await this.botFather.deleteBot(ctx.userId, botId);

        return { text: result.message };
      }
    });

    this.bot.registerCommand({
      name: 'botinfo',
      description: 'Get bot information',
      category: 'botfather',
      parameters: [{ name: 'botId', required: true }],
      handler: async (ctx) => {
        if (ctx.args.length === 0) {
          return {
            text: '❌ Usage: /botinfo <botId>\n\n' +
                  'Use /mybots to get your bot IDs'
          };
        }

        const botId = ctx.args[0];
        const result = await this.botFather.getBotInfo(ctx.userId, botId);

        return {
          text: result.message,
          format: 'markdown'
        };
      }
    });

    // Search command
    this.bot.registerCommand({
      name: 'search',
      aliases: ['find', 's'],
      description: 'Search messages',
      category: 'utility',
      parameters: [{ name: 'query', required: true }],
      handler: async (ctx) => {
        const query = ctx.args.join(' ');

        const messages = await this.models.Message.findAll({
          where: {
            content: { [this.models.Op.iLike]: `%${query}%` },
            senderId: ctx.userId
          },
          limit: 10,
          order: [['createdAt', 'DESC']]
        });

        if (messages.length === 0) {
          return { text: '🔍 No messages found matching your query' };
        }

        let text = `**Search Results** (${messages.length} found)\n\n`;
        messages.forEach((msg, i) => {
          const preview = msg.content.substring(0, 100);
          text += `${i + 1}. ${preview}...\n`;
        });

        return { text };
      }
    });

    // Quote command
    this.bot.registerCommand({
      name: 'quote',
      description: 'Get a random inspirational quote',
      category: 'fun',
      handler: async (ctx) => {
        const quotes = [
          { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
          { text: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs' },
          { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
          { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
          { text: 'It is during our darkest moments that we must focus to see the light.', author: 'Aristotle' }
        ];

        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        return {
          text: `💭 _"${quote.text}"_\n\n— ${quote.author}`,
          format: 'markdown'
        };
      }
    });

    // Weather command (mock)
    this.bot.registerCommand({
      name: 'weather',
      description: 'Get weather information',
      category: 'utility',
      parameters: [{ name: 'location', required: true }],
      handler: async (ctx) => {
        const location = ctx.args.join(' ');

        // Mock weather data
        const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        const temp = Math.floor(Math.random() * 30) + 10;

        return {
          text: `🌤️ **Weather in ${location}**\n\n` +
                `Condition: ${condition}\n` +
                `Temperature: ${temp}°C\n` +
                `Humidity: ${Math.floor(Math.random() * 40) + 40}%\n` +
                `Wind: ${Math.floor(Math.random() * 20)} km/h`
        };
      }
    });

    // Calculate command
    this.bot.registerCommand({
      name: 'calc',
      aliases: ['calculate', 'math'],
      description: 'Perform calculations',
      category: 'utility',
      parameters: [{ name: 'expression', required: true }],
      examples: ['/calc 2 + 2', '/calc 10 * 5'],
      handler: async (ctx) => {
        const expression = ctx.args.join(' ');

        try {
          // Safe eval alternative (only allow basic math)
          const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
          if (sanitized !== expression) {
            return { text: '❌ Invalid expression. Only numbers and +, -, *, /, () are allowed.' };
          }

          // eslint-disable-next-line no-eval
          const result = eval(sanitized);

          return {
            text: `🧮 **Calculation**\n\n${expression} = **${result}**`,
            format: 'markdown'
          };
        } catch (error) {
          return { text: '❌ Invalid mathematical expression' };
        }
      }
    });

    // Translate command
    this.bot.registerCommand({
      name: 'translate',
      aliases: ['trans', 't'],
      description: 'Translate text (mock)',
      category: 'utility',
      parameters: [
        { name: 'targetLang', required: true },
        { name: 'text', required: true }
      ],
      examples: ['/translate es Hello world', '/translate fr Good morning'],
      handler: async (ctx) => {
        const targetLang = ctx.args[0];
        const text = ctx.args.slice(1).join(' ');

        // Mock translation
        const translations = {
          es: 'Traducido al español',
          fr: 'Traduit en français',
          de: 'Ins Deutsche übersetzt',
          it: 'Tradotto in italiano',
          pt: 'Traduzido para português'
        };

        const translated = translations[targetLang] || text;

        return {
          text: `🌍 **Translation** (${targetLang})\n\n` +
                `Original: ${text}\n` +
                `Translated: ${translated}`
        };
      }
    });

    // Admin commands
    this.bot.registerCommand({
      name: 'broadcast',
      description: 'Send message to all users',
      category: 'admin',
      permissions: { requireRole: 'admin' },
      parameters: [{ name: 'message', required: true }],
      handler: async (ctx) => {
        const message = ctx.args.join(' ');

        // Get all conversations
        const conversations = await this.models.Conversation.findAll({
          where: { type: 'direct' },
          limit: 100
        });

        let sent = 0;
        for (const conv of conversations) {
          try {
            await this._sendBotMessage(conv.id, `📢 **Broadcast**\n\n${message}`);
            sent++;
          } catch (error) {
            console.error('Broadcast error:', error);
          }
        }

        return { text: `✅ Broadcast sent to ${sent} conversations` };
      }
    });
  }

  _setupEventHandlers() {
    // Handle message send events from bot
    this.bot.on('message:send', async (data) => {
      await this._sendBotMessage(data.conversationId, data.content, data.options);
    });

    // Handle typing events
    this.bot.on('typing:start', (data) => {
      this.io.to(data.conversationId).emit('typing', {
        userId: this.BOT_SYSTEM_USER_ID,
        conversationId: data.conversationId
      });
    });

    // Handle poll updates
    this.bot.on('poll:updated', (data) => {
      this.io.to(data.poll.conversationId).emit('poll-update', data.poll);
    });

    // Handle user ban events
    this.bot.on('user:banned', async (data) => {
      console.log(`[Bot] User banned:`, data);
      // Implement ban logic here
    });
  }

  async _sendBotMessage(conversationId, content, options = {}) {
    try {
      const message = await this.models.Message.create({
        conversationId,
        senderId: this.BOT_SYSTEM_USER_ID,
        content,
        type: options.type || 'text',
        attachments: options.attachments || []
      });

      await this.models.Conversation.update(
        { lastMessage: content, lastMessageAt: new Date() },
        { where: { id: conversationId } }
      );

      // Broadcast via Socket.IO
      this.io.to(conversationId).emit('new-message', message);

      // Publish to Redis
      this.redis.publish('messages', JSON.stringify(message));

      return message;
    } catch (error) {
      console.error('[Bot] Error sending message:', error);
      throw error;
    }
  }

  async processMessage(message) {
    const { content, senderId, conversationId, id } = message;

    // Don't process bot's own messages
    if (senderId === this.BOT_SYSTEM_USER_ID) {
      return null;
    }

    try {
      const result = await this.bot.processMessage({
        content,
        userId: senderId,
        conversationId,
        metadata: { messageId: id }
      });

      if (result && result.success && result.data) {
        // Send bot response
        const responseText = result.data.text || JSON.stringify(result.data);
        const responseMessage = await this._sendBotMessage(
          conversationId,
          responseText,
          result.data.options || {}
        );

        return {
          success: true,
          response: responseMessage,
          data: result.data
        };
      }

      return result;
    } catch (error) {
      console.error('[Bot] Error processing message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async handleButtonClick(data) {
    const { action, userId, conversationId } = data;
    this.bot.emit('button:click', data);

    return {
      success: true,
      action
    };
  }

  getBot() {
    return this.bot;
  }

  getAnalytics() {
    return this.bot.getAnalytics();
  }

  // User role management
  addUserRole(userId, role) {
    this.bot.addUserRole(userId, role);
  }

  removeUserRole(userId, role) {
    this.bot.removeUserRole(userId, role);
  }

  // Get bot commands for documentation
  getCommands() {
    const commands = [];

    for (const [name, cmd] of this.bot.commands) {
      if (cmd.hidden) continue;

      commands.push({
        name,
        aliases: cmd.aliases,
        description: cmd.description,
        category: cmd.category,
        parameters: cmd.parameters,
        examples: cmd.examples,
        usageCount: cmd.usageCount
      });
    }

    return commands.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }
}

module.exports = BotService;
