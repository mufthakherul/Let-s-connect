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
const { AIManager, LocalNLPModel } = require('./ai-integration');
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

    // Initialize AI
    this.aiManager = new AIManager({
      useOpenAI: process.env.OPENAI_API_KEY ? true : false,
      openAIKey: process.env.OPENAI_API_KEY,
      openAIOptions: {
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
      }
    });

    // Initialize bot framework
    this.bot = new BotFramework({
      name: 'Let\'s Connect Bot',
      version: '2.0.0',
      description: 'Advanced messaging bot with AI capabilities',
      prefix: '/',
      aiEnabled: true,
      aiModel: this.aiManager.getModel(),
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

    // Summarize command
    this.bot.registerCommand({
      name: 'summarize',
      description: 'Summarize recent conversation',
      category: 'ai',
      handler: async (ctx) => {
        const messages = await this.models.Message.findAll({
          where: { conversationId: ctx.conversationId },
          limit: 20,
          order: [['createdAt', 'DESC']]
        });

        if (messages.length < 5) {
          return { text: '❌ Not enough messages to summarize (need at least 5)' };
        }

        const messageData = messages.map(m => ({
          role: m.senderId === this.BOT_SYSTEM_USER_ID ? 'bot' : 'user',
          content: m.content
        }));

        try {
          const summary = await this.aiManager.getModel().summarize(messageData);
          return {
            text: `📝 **Conversation Summary**\n\n${summary}`,
            format: 'markdown'
          };
        } catch (error) {
          return { text: '❌ Failed to generate summary' };
        }
      }
    });

    // Sentiment command
    this.bot.registerCommand({
      name: 'sentiment',
      description: 'Analyze sentiment of text',
      category: 'ai',
      parameters: [{ name: 'text', required: true }],
      handler: async (ctx) => {
        const text = ctx.args.join(' ');

        try {
          const analysis = await this.aiManager.analyze(text);

          let emoji = '😐';
          if (analysis.sentiment === 'positive') emoji = '😊';
          if (analysis.sentiment === 'negative') emoji = '😞';

          return {
            text: `${emoji} **Sentiment Analysis**\n\n` +
                  `Sentiment: ${analysis.sentiment}\n` +
                  `Intent: ${analysis.intent}\n` +
                  `Language: ${analysis.language}\n` +
                  `Entities: ${analysis.entities.length} found`
          };
        } catch (error) {
          return { text: '❌ Failed to analyze sentiment' };
        }
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
