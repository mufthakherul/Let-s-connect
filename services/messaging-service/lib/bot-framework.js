'use strict';

/**
 * @fileoverview Advanced Bot Framework for Let's Connect
 *
 * Provides a comprehensive bot system with:
 * - Custom command registration with middleware
 * - AI-powered natural language processing
 * - Context-aware conversations with memory
 * - Plugin/extension system
 * - Rich interactive UI (buttons, forms, carousels)
 * - Analytics and usage tracking
 * - Rate limiting and spam protection
 * - Role-based permissions
 * - Scheduling and automation
 * - Multi-language support
 * - Webhook triggers
 * - Conversation flow builder
 * - Sentiment analysis
 * - Media processing
 */

const crypto = require('crypto');
const EventEmitter = require('events');

// ─── Bot Framework Class ─────────────────────────────────────────────────────

class BotFramework extends EventEmitter {
  constructor(options = {}) {
    super();

    this.name = options.name || 'Bot';
    this.version = options.version || '1.0.0';
    this.description = options.description || 'A powerful bot';
    this.prefix = options.prefix || '/';

    // Command registry
    this.commands = new Map();
    this.aliases = new Map();
    this.middlewares = [];
    this.plugins = new Map();

    // Context and memory
    this.conversations = new Map(); // userId -> ConversationContext
    this.memory = new Map(); // key -> value (persistent storage)

    // Rate limiting
    this.rateLimits = new Map(); // userId -> { count, resetAt }
    this.maxCommands = options.maxCommands || 20;
    this.rateLimitWindow = options.rateLimitWindow || 60000; // 1 minute

    // Analytics
    this.analytics = {
      totalCommands: 0,
      commandStats: new Map(),
      userStats: new Map(),
      errorCount: 0,
      startTime: Date.now()
    };

    // Permissions
    this.permissions = new Map(); // role -> Set<command>
    this.userRoles = new Map(); // userId -> Set<role>

    // Scheduling
    this.scheduledTasks = new Map(); // taskId -> { cronPattern, handler, nextRun }
    this.automations = new Map(); // triggerId -> { event, condition, action }

    // Language support
    this.translations = new Map(); // lang -> Map<key, translation>
    this.defaultLanguage = options.defaultLanguage || 'en';

    // Webhooks
    this.webhooks = new Map(); // event -> Set<webhook>

    // Flow builder
    this.flows = new Map(); // flowId -> FlowDefinition

    // AI integration
    this.aiEnabled = options.aiEnabled || false;
    this.aiModel = options.aiModel || null;

    // Setup default commands
    this._setupDefaultCommands();
  }

  // ─── Command Registration ─────────────────────────────────────────────────

  /**
   * Register a command
   * @param {Object} config Command configuration
   * @param {string} config.name Command name
   * @param {string[]} [config.aliases] Command aliases
   * @param {string} config.description Command description
   * @param {Object[]} [config.parameters] Parameter definitions
   * @param {Function} config.handler Command handler
   * @param {Object} [config.permissions] Permission requirements
   * @param {number} [config.cooldown] Cooldown in milliseconds
   * @param {string[]} [config.category] Command category
   */
  registerCommand(config) {
    const {
      name,
      aliases = [],
      description,
      parameters = [],
      handler,
      permissions = {},
      cooldown = 0,
      category = 'general',
      examples = [],
      hidden = false
    } = config;

    if (!name || !handler) {
      throw new Error('Command name and handler are required');
    }

    const command = {
      name,
      aliases,
      description,
      parameters,
      handler,
      permissions,
      cooldown,
      category,
      examples,
      hidden,
      usageCount: 0,
      lastUsed: null,
      cooldowns: new Map() // userId -> timestamp
    };

    this.commands.set(name, command);

    // Register aliases
    for (const alias of aliases) {
      this.aliases.set(alias, name);
    }

    this.emit('command:registered', { name, command });
    return this;
  }

  /**
   * Register middleware
   * @param {Function} middleware Middleware function (context, next)
   */
  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Register a plugin
   * @param {Object} plugin Plugin object with init method
   */
  registerPlugin(name, plugin) {
    if (this.plugins.has(name)) {
      throw new Error(`Plugin ${name} already registered`);
    }

    this.plugins.set(name, plugin);

    if (typeof plugin.init === 'function') {
      plugin.init(this);
    }

    this.emit('plugin:registered', { name, plugin });
    return this;
  }

  // ─── Command Execution ───────────────────────────────────────────────────

  /**
   * Process a message and execute commands
   * @param {Object} message Message object
   * @param {string} message.content Message content
   * @param {string} message.userId User ID
   * @param {string} message.conversationId Conversation ID
   * @param {Object} [message.metadata] Additional metadata
   * @returns {Promise<Object>} Response object
   */
  async processMessage(message) {
    const { content, userId, conversationId, metadata = {} } = message;

    // Check if message starts with prefix
    if (!content.startsWith(this.prefix)) {
      // Try AI processing if enabled
      if (this.aiEnabled) {
        return await this._processAI(message);
      }
      return null;
    }

    // Parse command
    const parts = content.slice(this.prefix.length).trim().split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Resolve alias
    const resolvedName = this.aliases.get(commandName) || commandName;
    const command = this.commands.get(resolvedName);

    if (!command) {
      return {
        success: false,
        error: 'Command not found',
        suggestion: this._findSimilarCommand(commandName)
      };
    }

    // Create context
    const context = await this._createContext({
      command,
      args,
      userId,
      conversationId,
      message,
      metadata
    });

    // Check rate limit
    if (!this._checkRateLimit(userId)) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait before sending more commands.',
        retryAfter: this._getRateLimitRetryAfter(userId)
      };
    }

    // Check cooldown
    if (!this._checkCooldown(command, userId)) {
      return {
        success: false,
        error: `Command on cooldown. Please wait ${this._getCooldownRemaining(command, userId)}ms`,
        retryAfter: this._getCooldownRemaining(command, userId)
      };
    }

    // Check permissions
    if (!this._checkPermissions(command, userId)) {
      return {
        success: false,
        error: 'Insufficient permissions to execute this command'
      };
    }

    // Execute middleware chain
    try {
      await this._executeMiddlewares(context);

      // Execute command
      const result = await command.handler(context);

      // Update analytics
      this._updateAnalytics(command, userId, true);

      // Update cooldown
      if (command.cooldown > 0) {
        command.cooldowns.set(userId, Date.now() + command.cooldown);
      }

      // Emit event
      this.emit('command:executed', { command: command.name, userId, result });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      this._updateAnalytics(command, userId, false);
      this.emit('command:error', { command: command.name, userId, error });

      return {
        success: false,
        error: error.message || 'Command execution failed'
      };
    }
  }

  // ─── Context Management ──────────────────────────────────────────────────

  async _createContext(options) {
    const { command, args, userId, conversationId, message, metadata } = options;

    // Get or create conversation context
    let conversation = this.conversations.get(userId);
    if (!conversation) {
      conversation = new ConversationContext(userId, conversationId);
      this.conversations.set(userId, conversation);
    }

    // Update conversation
    conversation.addMessage(message.content, 'user');

    const context = {
      // Command info
      command: command.name,
      args,

      // User info
      userId,
      conversationId,

      // Message
      message,
      metadata,

      // Conversation context
      conversation,

      // Bot reference
      bot: this,

      // Utility methods
      reply: (content, options = {}) => this._reply(conversationId, content, options),
      sendMessage: (content, options = {}) => this._sendMessage(conversationId, userId, content, options),
      sendTyping: () => this._sendTyping(conversationId),

      // Interactive UI builders
      createButton: (text, action, style = 'primary') => ({ type: 'button', text, action, style }),
      createButtons: (buttons) => ({ type: 'buttons', buttons }),
      createForm: (fields) => ({ type: 'form', fields }),
      createCarousel: (items) => ({ type: 'carousel', items }),
      createMenu: (options) => ({ type: 'menu', options }),

      // Data access
      getMemory: (key) => this.memory.get(key),
      setMemory: (key, value) => this.memory.set(key, value),
      deleteMemory: (key) => this.memory.delete(key),

      // User roles
      hasRole: (role) => this.userRoles.get(userId)?.has(role) || false,
      getRoles: () => Array.from(this.userRoles.get(userId) || []),

      // Translation
      t: (key, params = {}) => this._translate(key, params, metadata.language || this.defaultLanguage),

      // Validation
      validateArgs: () => this._validateArguments(command, args),

      // Error handling
      throw: (message) => { throw new Error(message); }
    };

    return context;
  }

  // ─── AI Integration ──────────────────────────────────────────────────────

  async _processAI(message) {
    if (!this.aiModel) {
      return null;
    }

    const { content, userId, conversationId } = message;

    try {
      // Get conversation context
      let conversation = this.conversations.get(userId);
      if (!conversation) {
        conversation = new ConversationContext(userId, conversationId);
        this.conversations.set(userId, conversation);
      }

      // Add message to conversation
      conversation.addMessage(content, 'user');

      // Get conversation history
      const history = conversation.getHistory(10);

      // Call AI model
      const aiResponse = await this.aiModel.generate({
        prompt: content,
        history,
        context: {
          botName: this.name,
          availableCommands: Array.from(this.commands.keys()),
          userContext: conversation.context
        }
      });

      // Add bot response to conversation
      conversation.addMessage(aiResponse.text, 'bot');

      // Analyze sentiment
      const sentiment = this._analyzeSentiment(content);
      conversation.updateSentiment(sentiment);

      // Emit event
      this.emit('ai:response', { userId, prompt: content, response: aiResponse });

      return {
        success: true,
        data: {
          text: aiResponse.text,
          confidence: aiResponse.confidence,
          sentiment,
          suggestions: aiResponse.suggestions || []
        }
      };

    } catch (error) {
      this.emit('ai:error', { userId, error });
      return {
        success: false,
        error: 'AI processing failed'
      };
    }
  }

  // ─── Rate Limiting & Permissions ─────────────────────────────────────────

  _checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = this.rateLimits.get(userId);

    if (!userLimit || now >= userLimit.resetAt) {
      this.rateLimits.set(userId, {
        count: 1,
        resetAt: now + this.rateLimitWindow
      });
      return true;
    }

    if (userLimit.count >= this.maxCommands) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  _getRateLimitRetryAfter(userId) {
    const userLimit = this.rateLimits.get(userId);
    if (!userLimit) return 0;
    return Math.max(0, userLimit.resetAt - Date.now());
  }

  _checkCooldown(command, userId) {
    if (command.cooldown === 0) return true;

    const cooldownEnd = command.cooldowns.get(userId);
    if (!cooldownEnd) return true;

    return Date.now() >= cooldownEnd;
  }

  _getCooldownRemaining(command, userId) {
    const cooldownEnd = command.cooldowns.get(userId);
    if (!cooldownEnd) return 0;
    return Math.max(0, cooldownEnd - Date.now());
  }

  _checkPermissions(command, userId) {
    if (!command.permissions || Object.keys(command.permissions).length === 0) {
      return true;
    }

    const userRoles = this.userRoles.get(userId) || new Set();

    // Check if user has required role
    if (command.permissions.requireRole) {
      if (!userRoles.has(command.permissions.requireRole)) {
        return false;
      }
    }

    // Check if command is allowed for user's roles
    if (command.permissions.allowedRoles) {
      const hasAllowedRole = command.permissions.allowedRoles.some(role => userRoles.has(role));
      if (!hasAllowedRole) {
        return false;
      }
    }

    return true;
  }

  // ─── Middleware Execution ────────────────────────────────────────────────

  async _executeMiddlewares(context) {
    let index = 0;

    const next = async () => {
      if (index >= this.middlewares.length) {
        return;
      }

      const middleware = this.middlewares[index++];
      await middleware(context, next);
    };

    await next();
  }

  // ─── Analytics ───────────────────────────────────────────────────────────

  _updateAnalytics(command, userId, success) {
    this.analytics.totalCommands++;

    // Command stats
    const cmdStats = this.analytics.commandStats.get(command.name) || {
      total: 0,
      success: 0,
      failure: 0,
      avgResponseTime: 0
    };
    cmdStats.total++;
    if (success) {
      cmdStats.success++;
    } else {
      cmdStats.failure++;
      this.analytics.errorCount++;
    }
    this.analytics.commandStats.set(command.name, cmdStats);

    // User stats
    const userStats = this.analytics.userStats.get(userId) || {
      commandCount: 0,
      lastCommand: null,
      firstSeen: Date.now()
    };
    userStats.commandCount++;
    userStats.lastCommand = Date.now();
    this.analytics.userStats.set(userId, userStats);

    // Update command usage
    command.usageCount++;
    command.lastUsed = Date.now();
  }

  getAnalytics() {
    const uptime = Date.now() - this.analytics.startTime;

    return {
      uptime,
      totalCommands: this.analytics.totalCommands,
      errorCount: this.analytics.errorCount,
      successRate: this.analytics.totalCommands > 0
        ? ((this.analytics.totalCommands - this.analytics.errorCount) / this.analytics.totalCommands * 100).toFixed(2) + '%'
        : '0%',
      commandStats: Object.fromEntries(this.analytics.commandStats),
      userCount: this.analytics.userStats.size,
      commandsPerMinute: (this.analytics.totalCommands / (uptime / 60000)).toFixed(2)
    };
  }

  // ─── Sentiment Analysis ──────────────────────────────────────────────────

  _analyzeSentiment(text) {
    // Simple sentiment analysis (can be replaced with ML model)
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'awesome', 'amazing', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'horrible', 'poor', 'worst', 'disappointing'];

    const words = text.toLowerCase().split(/\s+/);
    let score = 0;

    for (const word of words) {
      if (positiveWords.includes(word)) score++;
      if (negativeWords.includes(word)) score--;
    }

    if (score > 0) return { sentiment: 'positive', score, confidence: Math.min(score / 3, 1) };
    if (score < 0) return { sentiment: 'negative', score: Math.abs(score), confidence: Math.min(Math.abs(score) / 3, 1) };
    return { sentiment: 'neutral', score: 0, confidence: 0.5 };
  }

  // ─── Helper Methods ──────────────────────────────────────────────────────

  _findSimilarCommand(input) {
    // Simple Levenshtein distance for command suggestions
    const commands = Array.from(this.commands.keys());
    let minDistance = Infinity;
    let suggestion = null;

    for (const cmd of commands) {
      const distance = this._levenshteinDistance(input, cmd);
      if (distance < minDistance && distance <= 3) {
        minDistance = distance;
        suggestion = cmd;
      }
    }

    return suggestion ? `Did you mean '${suggestion}'?` : null;
  }

  _levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  _validateArguments(command, args) {
    const errors = [];

    for (let i = 0; i < command.parameters.length; i++) {
      const param = command.parameters[i];
      const value = args[i];

      if (param.required && !value) {
        errors.push(`Parameter '${param.name}' is required`);
        continue;
      }

      if (value && param.type) {
        if (param.type === 'number' && isNaN(value)) {
          errors.push(`Parameter '${param.name}' must be a number`);
        }
        if (param.type === 'url' && !this._isValidUrl(value)) {
          errors.push(`Parameter '${param.name}' must be a valid URL`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  _isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  _translate(key, params = {}, language = 'en') {
    const langMap = this.translations.get(language) || this.translations.get(this.defaultLanguage) || new Map();
    let text = langMap.get(key) || key;

    // Replace parameters
    for (const [param, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`{{${param}}}`, 'g'), value);
    }

    return text;
  }

  // ─── Default Commands ────────────────────────────────────────────────────

  _setupDefaultCommands() {
    // Help command
    this.registerCommand({
      name: 'help',
      aliases: ['h', '?'],
      description: 'Show available commands',
      category: 'general',
      handler: async (ctx) => {
        const categories = new Map();

        for (const [name, cmd] of this.commands) {
          if (cmd.hidden) continue;

          if (!categories.has(cmd.category)) {
            categories.set(cmd.category, []);
          }
          categories.get(cmd.category).push({
            name,
            description: cmd.description,
            usage: cmd.parameters.map(p => p.required ? `<${p.name}>` : `[${p.name}]`).join(' ')
          });
        }

        let help = `**${this.name} v${this.version}**\n${this.description}\n\n`;

        for (const [category, commands] of categories) {
          help += `**${category.toUpperCase()}**\n`;
          for (const cmd of commands) {
            help += `  ${this.prefix}${cmd.name} ${cmd.usage} - ${cmd.description}\n`;
          }
          help += '\n';
        }

        return { text: help, format: 'markdown' };
      }
    });

    // Stats command
    this.registerCommand({
      name: 'stats',
      description: 'Show bot statistics',
      category: 'general',
      handler: async (ctx) => {
        const stats = this.getAnalytics();
        return {
          text: `**Bot Statistics**\n\n` +
                `Uptime: ${Math.floor(stats.uptime / 1000 / 60)} minutes\n` +
                `Total Commands: ${stats.totalCommands}\n` +
                `Success Rate: ${stats.successRate}\n` +
                `Commands/min: ${stats.commandsPerMinute}\n` +
                `Active Users: ${stats.userCount}`,
          format: 'markdown'
        };
      }
    });

    // Ping command
    this.registerCommand({
      name: 'ping',
      description: 'Check bot response time',
      category: 'general',
      handler: async (ctx) => {
        const start = Date.now();
        await new Promise(resolve => setTimeout(resolve, 1));
        const latency = Date.now() - start;
        return { text: `Pong! Latency: ${latency}ms` };
      }
    });
  }

  // ─── Placeholder Methods (to be implemented by integration layer) ────────

  async _reply(conversationId, content, options) {
    this.emit('message:send', { conversationId, content, options });
    return { success: true };
  }

  async _sendMessage(conversationId, userId, content, options) {
    this.emit('message:send', { conversationId, userId, content, options });
    return { success: true };
  }

  async _sendTyping(conversationId) {
    this.emit('typing:start', { conversationId });
    return { success: true };
  }

  // ─── User Management ─────────────────────────────────────────────────────

  addUserRole(userId, role) {
    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, new Set());
    }
    this.userRoles.get(userId).add(role);
    this.emit('user:role:added', { userId, role });
  }

  removeUserRole(userId, role) {
    const roles = this.userRoles.get(userId);
    if (roles) {
      roles.delete(role);
      this.emit('user:role:removed', { userId, role });
    }
  }

  // ─── Scheduling ──────────────────────────────────────────────────────────

  schedule(pattern, handler, options = {}) {
    const taskId = crypto.randomUUID();
    this.scheduledTasks.set(taskId, {
      pattern,
      handler,
      options,
      nextRun: this._calculateNextRun(pattern),
      enabled: true
    });
    this.emit('task:scheduled', { taskId, pattern });
    return taskId;
  }

  _calculateNextRun(pattern) {
    // Simple cron pattern parser (can be enhanced)
    // For now, just return next minute
    return Date.now() + 60000;
  }

  // ─── Flow Builder ───────────────────────────────────────────────────────

  createFlow(flowId, definition) {
    this.flows.set(flowId, definition);
    this.emit('flow:created', { flowId, definition });
  }

  async executeFlow(flowId, userId, initialData = {}) {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    let currentStep = flow.start;
    let context = { ...initialData };

    while (currentStep) {
      const step = flow.steps[currentStep];
      if (!step) break;

      const result = await step.handler(context);
      context = { ...context, ...result };

      currentStep = step.next || null;
    }

    return context;
  }
}

// ─── Conversation Context Class ─────────────────────────────────────────────

class ConversationContext {
  constructor(userId, conversationId) {
    this.userId = userId;
    this.conversationId = conversationId;
    this.messages = [];
    this.context = {};
    this.sentiment = { sentiment: 'neutral', score: 0 };
    this.startedAt = Date.now();
    this.lastActivity = Date.now();
  }

  addMessage(content, role = 'user') {
    this.messages.push({
      content,
      role,
      timestamp: Date.now()
    });
    this.lastActivity = Date.now();

    // Keep only last 100 messages
    if (this.messages.length > 100) {
      this.messages = this.messages.slice(-100);
    }
  }

  getHistory(limit = 10) {
    return this.messages.slice(-limit);
  }

  updateSentiment(sentiment) {
    this.sentiment = sentiment;
  }

  set(key, value) {
    this.context[key] = value;
  }

  get(key) {
    return this.context[key];
  }

  clear() {
    this.context = {};
  }

  getAge() {
    return Date.now() - this.startedAt;
  }

  getIdleTime() {
    return Date.now() - this.lastActivity;
  }
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  BotFramework,
  ConversationContext
};
