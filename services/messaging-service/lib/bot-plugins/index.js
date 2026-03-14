'use strict';

/**
 * @fileoverview Bot Plugin Collection
 *
 * Provides ready-to-use plugins for the bot framework:
 * - Analytics Plugin
 * - Moderation Plugin
 * - Reminder Plugin
 * - Poll Plugin
 * - Game Plugin
 * - Weather Plugin
 * - Translation Plugin
 */

// ─── Analytics Plugin ────────────────────────────────────────────────────────

class AnalyticsPlugin {
  constructor(options = {}) {
    this.options = options;
    this.name = 'analytics';
  }

  init(bot) {
    // Track all commands
    bot.on('command:executed', (data) => {
      console.log(`[Analytics] Command executed: ${data.command} by user ${data.userId}`);
    });

    // Add analytics commands
    bot.registerCommand({
      name: 'analytics',
      description: 'View detailed analytics',
      category: 'admin',
      permissions: { requireRole: 'admin' },
      handler: async (ctx) => {
        const stats = bot.getAnalytics();

        return {
          text: `**Detailed Analytics**\n\n` +
                `📊 **Overview**\n` +
                `• Uptime: ${Math.floor(stats.uptime / 1000 / 60)} min\n` +
                `• Total Commands: ${stats.totalCommands}\n` +
                `• Success Rate: ${stats.successRate}\n` +
                `• Error Count: ${stats.errorCount}\n` +
                `• Commands/min: ${stats.commandsPerMinute}\n` +
                `• Active Users: ${stats.userCount}\n\n` +
                `📈 **Top Commands**\n` +
                this._formatTopCommands(stats.commandStats),
          format: 'markdown'
        };
      }
    });
  }

  _formatTopCommands(commandStats) {
    const sorted = Object.entries(commandStats)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);

    return sorted.map(([cmd, stats], i) =>
      `${i + 1}. ${cmd} - ${stats.total} uses (${stats.success} success)`
    ).join('\n') || 'No data';
  }
}

// ─── Moderation Plugin ───────────────────────────────────────────────────────

class ModerationPlugin {
  constructor(options = {}) {
    this.options = options;
    this.name = 'moderation';
    this.warnings = new Map(); // userId -> count
    this.bannedWords = new Set(options.bannedWords || []);
    this.autoModEnabled = options.autoMod !== false;
  }

  init(bot) {
    // Add moderation middleware
    if (this.autoModEnabled) {
      bot.use(async (ctx, next) => {
        const content = ctx.message.content.toLowerCase();

        // Check for banned words
        for (const word of this.bannedWords) {
          if (content.includes(word)) {
            throw new Error('Message contains inappropriate content');
          }
        }

        await next();
      });
    }

    // Warn command
    bot.registerCommand({
      name: 'warn',
      description: 'Warn a user',
      category: 'moderation',
      permissions: { requireRole: 'moderator' },
      parameters: [
        { name: 'userId', required: true },
        { name: 'reason', required: false }
      ],
      handler: async (ctx) => {
        const userId = ctx.args[0];
        const reason = ctx.args.slice(1).join(' ') || 'No reason provided';

        const count = (this.warnings.get(userId) || 0) + 1;
        this.warnings.set(userId, count);

        return {
          text: `⚠️ User ${userId} warned (${count} total warnings)\nReason: ${reason}`
        };
      }
    });

    // Ban command
    bot.registerCommand({
      name: 'ban',
      description: 'Ban a user',
      category: 'moderation',
      permissions: { requireRole: 'admin' },
      parameters: [
        { name: 'userId', required: true },
        { name: 'reason', required: false }
      ],
      handler: async (ctx) => {
        const userId = ctx.args[0];
        const reason = ctx.args.slice(1).join(' ') || 'No reason provided';

        // Emit ban event
        bot.emit('user:banned', { userId, reason, bannedBy: ctx.userId });

        return {
          text: `🔨 User ${userId} has been banned\nReason: ${reason}`
        };
      }
    });

    // Mute command
    bot.registerCommand({
      name: 'mute',
      description: 'Mute a user',
      category: 'moderation',
      permissions: { requireRole: 'moderator' },
      parameters: [
        { name: 'userId', required: true },
        { name: 'duration', required: false, type: 'number' }
      ],
      handler: async (ctx) => {
        const userId = ctx.args[0];
        const duration = parseInt(ctx.args[1]) || 60; // Default 60 minutes

        bot.emit('user:muted', { userId, duration, mutedBy: ctx.userId });

        return {
          text: `🔇 User ${userId} muted for ${duration} minutes`
        };
      }
    });

    // Clear warnings command
    bot.registerCommand({
      name: 'clearwarnings',
      description: 'Clear user warnings',
      category: 'moderation',
      permissions: { requireRole: 'admin' },
      parameters: [{ name: 'userId', required: true }],
      handler: async (ctx) => {
        const userId = ctx.args[0];
        this.warnings.delete(userId);
        return { text: `✅ Warnings cleared for user ${userId}` };
      }
    });
  }
}

// ─── Reminder Plugin ─────────────────────────────────────────────────────────

class ReminderPlugin {
  constructor(options = {}) {
    this.options = options;
    this.name = 'reminder';
    this.reminders = new Map(); // reminderId -> reminder data
    this.userReminders = new Map(); // userId -> Set<reminderId>
  }

  init(bot) {
    // Set reminder command
    bot.registerCommand({
      name: 'remind',
      aliases: ['reminder', 'remindme'],
      description: 'Set a reminder',
      category: 'utility',
      parameters: [
        { name: 'time', required: true },
        { name: 'message', required: true }
      ],
      examples: [
        '/remind 30m Take a break',
        '/remind 2h Meeting with team'
      ],
      handler: async (ctx) => {
        const timeStr = ctx.args[0];
        const message = ctx.args.slice(1).join(' ');

        const minutes = this._parseTime(timeStr);
        if (minutes === null) {
          return { text: '❌ Invalid time format. Use: 5m, 2h, 1d, etc.' };
        }

        const reminderId = require('crypto').randomUUID();
        const reminderTime = Date.now() + (minutes * 60 * 1000);

        const reminder = {
          id: reminderId,
          userId: ctx.userId,
          conversationId: ctx.conversationId,
          message,
          time: reminderTime,
          created: Date.now()
        };

        this.reminders.set(reminderId, reminder);

        if (!this.userReminders.has(ctx.userId)) {
          this.userReminders.set(ctx.userId, new Set());
        }
        this.userReminders.get(ctx.userId).add(reminderId);

        // Schedule reminder
        setTimeout(() => this._triggerReminder(bot, reminderId), minutes * 60 * 1000);

        return {
          text: `⏰ Reminder set for ${minutes} minute(s) from now\nMessage: "${message}"`
        };
      }
    });

    // List reminders
    bot.registerCommand({
      name: 'reminders',
      description: 'List your active reminders',
      category: 'utility',
      handler: async (ctx) => {
        const userReminderIds = this.userReminders.get(ctx.userId) || new Set();

        if (userReminderIds.size === 0) {
          return { text: 'You have no active reminders' };
        }

        let text = '**Your Reminders**\n\n';
        let count = 1;

        for (const id of userReminderIds) {
          const reminder = this.reminders.get(id);
          if (reminder) {
            const remaining = Math.max(0, Math.ceil((reminder.time - Date.now()) / 60000));
            text += `${count}. In ${remaining} min: ${reminder.message}\n`;
            count++;
          }
        }

        return { text, format: 'markdown' };
      }
    });

    // Cancel reminder
    bot.registerCommand({
      name: 'cancelreminder',
      description: 'Cancel a reminder',
      category: 'utility',
      parameters: [{ name: 'index', required: true, type: 'number' }],
      handler: async (ctx) => {
        const index = parseInt(ctx.args[0]) - 1;
        const userReminderIds = Array.from(this.userReminders.get(ctx.userId) || []);

        if (index < 0 || index >= userReminderIds.length) {
          return { text: '❌ Invalid reminder index' };
        }

        const reminderId = userReminderIds[index];
        this.reminders.delete(reminderId);
        this.userReminders.get(ctx.userId).delete(reminderId);

        return { text: '✅ Reminder cancelled' };
      }
    });
  }

  _parseTime(str) {
    const match = str.match(/^(\d+)([mhd])$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm': return value;
      case 'h': return value * 60;
      case 'd': return value * 60 * 24;
      default: return null;
    }
  }

  async _triggerReminder(bot, reminderId) {
    const reminder = this.reminders.get(reminderId);
    if (!reminder) return;

    // Send reminder message
    bot.emit('message:send', {
      conversationId: reminder.conversationId,
      content: `⏰ **Reminder**\n${reminder.message}`,
      userId: reminder.userId
    });

    // Clean up
    this.reminders.delete(reminderId);
    this.userReminders.get(reminder.userId)?.delete(reminderId);
  }
}

// ─── Poll Plugin ─────────────────────────────────────────────────────────────

class PollPlugin {
  constructor(options = {}) {
    this.options = options;
    this.name = 'poll';
    this.polls = new Map(); // pollId -> poll data
  }

  init(bot) {
    bot.registerCommand({
      name: 'poll',
      description: 'Create a poll',
      category: 'utility',
      parameters: [
        { name: 'question', required: true },
        { name: 'options', required: true }
      ],
      examples: [
        '/poll "What should we do?" "Option A" "Option B" "Option C"'
      ],
      handler: async (ctx) => {
        const args = this._parseQuotedArgs(ctx.message.content);

        if (args.length < 3) {
          return { text: '❌ Please provide a question and at least 2 options' };
        }

        const question = args[1];
        const options = args.slice(2);

        const pollId = require('crypto').randomUUID();
        const poll = {
          id: pollId,
          question,
          options: options.map(opt => ({ text: opt, votes: 0, voters: new Set() })),
          createdBy: ctx.userId,
          createdAt: Date.now(),
          conversationId: ctx.conversationId
        };

        this.polls.set(pollId, poll);

        const buttons = poll.options.map((opt, i) => ({
          text: `${i + 1}. ${opt.text} (0)`,
          action: `poll_vote_${pollId}_${i}`
        }));

        return {
          text: `📊 **Poll**\n${question}`,
          buttons,
          pollId
        };
      }
    });

    // Handle poll votes
    bot.on('button:click', (data) => {
      if (data.action.startsWith('poll_vote_')) {
        const [, , pollId, optionIndex] = data.action.split('_');
        this._recordVote(bot, pollId, parseInt(optionIndex), data.userId);
      }
    });

    // Show poll results
    bot.registerCommand({
      name: 'pollresults',
      description: 'Show poll results',
      category: 'utility',
      parameters: [{ name: 'pollId', required: true }],
      handler: async (ctx) => {
        const pollId = ctx.args[0];
        const poll = this.polls.get(pollId);

        if (!poll) {
          return { text: '❌ Poll not found' };
        }

        const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
        let text = `📊 **Poll Results**\n${poll.question}\n\n`;

        for (const [i, opt] of poll.options.entries()) {
          const percentage = totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(1) : 0;
          const bar = '█'.repeat(Math.floor(percentage / 5));
          text += `${i + 1}. ${opt.text}\n`;
          text += `   ${bar} ${opt.votes} votes (${percentage}%)\n\n`;
        }

        text += `Total votes: ${totalVotes}`;

        return { text, format: 'markdown' };
      }
    });
  }

  _parseQuotedArgs(text) {
    const regex = /"([^"]*)"|(\S+)/g;
    const args = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      args.push(match[1] || match[2]);
    }

    return args;
  }

  _recordVote(bot, pollId, optionIndex, userId) {
    const poll = this.polls.get(pollId);
    if (!poll || optionIndex < 0 || optionIndex >= poll.options.length) {
      return;
    }

    // Remove previous vote if exists
    for (const opt of poll.options) {
      if (opt.voters.has(userId)) {
        opt.voters.delete(userId);
        opt.votes--;
      }
    }

    // Add new vote
    poll.options[optionIndex].voters.add(userId);
    poll.options[optionIndex].votes++;

    // Update poll display
    bot.emit('poll:updated', { pollId, poll });
  }
}

// ─── Game Plugin ─────────────────────────────────────────────────────────────

class GamePlugin {
  constructor(options = {}) {
    this.options = options;
    this.name = 'game';
    this.activeGames = new Map();
  }

  init(bot) {
    // Trivia game
    bot.registerCommand({
      name: 'trivia',
      description: 'Start a trivia game',
      category: 'fun',
      handler: async (ctx) => {
        const questions = this._getTriviaQuestions();
        const question = questions[Math.floor(Math.random() * questions.length)];

        const gameId = require('crypto').randomUUID();
        this.activeGames.set(gameId, {
          type: 'trivia',
          question,
          userId: ctx.userId,
          startTime: Date.now()
        });

        return {
          text: `🎮 **Trivia Time!**\n\n${question.question}`,
          buttons: question.options.map((opt, i) => ({
            text: opt,
            action: `trivia_answer_${gameId}_${i}`
          }))
        };
      }
    });

    // Handle trivia answers
    bot.on('button:click', (data) => {
      if (data.action.startsWith('trivia_answer_')) {
        const [, , gameId, answerIndex] = data.action.split('_');
        this._checkTriviaAnswer(bot, gameId, parseInt(answerIndex), data.userId);
      }
    });

    // 8ball command
    bot.registerCommand({
      name: '8ball',
      description: 'Ask the magic 8-ball',
      category: 'fun',
      parameters: [{ name: 'question', required: true }],
      handler: async (ctx) => {
        const responses = [
          'Yes, definitely', 'It is certain', 'Without a doubt',
          'Most likely', 'Outlook good', 'Signs point to yes',
          'Reply hazy, try again', 'Ask again later', 'Cannot predict now',
          'Don\'t count on it', 'My reply is no', 'Outlook not so good'
        ];

        const response = responses[Math.floor(Math.random() * responses.length)];
        return { text: `🎱 ${response}` };
      }
    });

    // Roll dice
    bot.registerCommand({
      name: 'roll',
      description: 'Roll dice',
      category: 'fun',
      parameters: [{ name: 'dice', required: false }],
      examples: ['/roll', '/roll 2d6', '/roll d20'],
      handler: async (ctx) => {
        const diceStr = ctx.args[0] || '1d6';
        const match = diceStr.match(/^(\d*)d(\d+)$/i);

        if (!match) {
          return { text: '❌ Invalid dice format. Use: d6, 2d20, etc.' };
        }

        const count = parseInt(match[1]) || 1;
        const sides = parseInt(match[2]);

        if (count > 10 || sides > 100) {
          return { text: '❌ Maximum 10 dice with 100 sides each' };
        }

        const rolls = [];
        let total = 0;

        for (let i = 0; i < count; i++) {
          const roll = Math.floor(Math.random() * sides) + 1;
          rolls.push(roll);
          total += roll;
        }

        return {
          text: `🎲 Rolling ${diceStr}:\n` +
                `Rolls: ${rolls.join(', ')}\n` +
                `Total: ${total}`
        };
      }
    });
  }

  _getTriviaQuestions() {
    return [
      {
        question: 'What is the capital of France?',
        options: ['London', 'Paris', 'Berlin', 'Madrid'],
        correct: 1
      },
      {
        question: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
        correct: 1
      },
      {
        question: 'Which planet is known as the Red Planet?',
        options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
        correct: 1
      }
    ];
  }

  _checkTriviaAnswer(bot, gameId, answerIndex, userId) {
    const game = this.activeGames.get(gameId);
    if (!game || game.type !== 'trivia') return;

    const isCorrect = answerIndex === game.question.correct;
    const timeTaken = Math.floor((Date.now() - game.startTime) / 1000);

    bot.emit('message:send', {
      conversationId: game.conversationId,
      content: isCorrect
        ? `✅ Correct! You answered in ${timeTaken} seconds.`
        : `❌ Wrong! The correct answer was: ${game.question.options[game.question.correct]}`
    });

    this.activeGames.delete(gameId);
  }
}

// ─── Export All Plugins ──────────────────────────────────────────────────────

module.exports = {
  AnalyticsPlugin,
  ModerationPlugin,
  ReminderPlugin,
  PollPlugin,
  GamePlugin
};
