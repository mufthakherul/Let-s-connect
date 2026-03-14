# Advanced Bot Features Documentation

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Getting Started](#getting-started)
5. [Bot Commands](#bot-commands)
6. [AI Integration](#ai-integration)
7. [Plugins](#plugins)
8. [Custom Development](#custom-development)
9. [API Reference](#api-reference)
10. [Best Practices](#best-practices)

---

## Overview

The Let's Connect Bot is an advanced, AI-powered chatbot system built for the messaging platform. It provides a comprehensive framework for creating intelligent, interactive bot experiences with support for custom commands, plugins, AI capabilities, and rich UI elements.

### Key Capabilities

- **Command System**: Flexible command registration with aliases, parameters, and validation
- **AI Integration**: Natural language processing with OpenAI or local NLP models
- **Plugin Architecture**: Modular plugin system for extending functionality
- **Rich UI Elements**: Buttons, forms, carousels, and interactive menus
- **Context Awareness**: Conversation memory and user context tracking
- **Rate Limiting**: Built-in protection against spam and abuse
- **Role-Based Access**: Permission system for command authorization
- **Analytics**: Comprehensive usage tracking and statistics
- **Multi-Language**: Translation support for international users
- **Real-Time**: Integration with Socket.IO for instant responses

---

## Features

### 1. Command System

The bot supports a rich command system with:

- **Aliases**: Multiple names for the same command
- **Parameters**: Required and optional parameters with type validation
- **Cooldowns**: Per-user cooldown periods
- **Permissions**: Role-based access control
- **Categories**: Organized command grouping
- **Examples**: Usage examples for documentation

### 2. Built-in Commands

#### General Commands
- `/help` - Show all available commands
- `/stats` - View bot statistics
- `/ping` - Check bot response time
- `/me` - Show your user profile

#### Utility Commands
- `/search <query>` - Search messages
- `/calc <expression>` - Perform calculations
- `/translate <lang> <text>` - Translate text
- `/weather <location>` - Get weather information
- `/quote` - Get inspirational quote

#### AI Commands
- `/summarize` - Summarize recent conversation
- `/sentiment <text>` - Analyze text sentiment

#### Fun Commands
- `/roll [dice]` - Roll dice (e.g., /roll 2d6)
- `/8ball <question>` - Ask the magic 8-ball
- `/trivia` - Start a trivia game
- `/quote` - Get random quote

#### Moderation Commands (Admin/Mod only)
- `/warn <userId> [reason]` - Warn a user
- `/mute <userId> [duration]` - Mute a user
- `/ban <userId> [reason]` - Ban a user
- `/clearwarnings <userId>` - Clear user warnings
- `/broadcast <message>` - Send message to all users

#### Reminder Commands
- `/remind <time> <message>` - Set a reminder (e.g., /remind 30m Meeting)
- `/reminders` - List active reminders
- `/cancelreminder <index>` - Cancel a reminder

#### Poll Commands
- `/poll "question" "option1" "option2"...` - Create a poll
- `/pollresults <pollId>` - Show poll results

### 3. AI Features

#### Natural Language Understanding
- Intent recognition (question, command, greeting, etc.)
- Entity extraction (emails, URLs, numbers, dates)
- Sentiment analysis
- Language detection

#### Smart Responses
- Context-aware conversations
- Conversation memory (up to 100 messages)
- Conversation summarization
- Suggested actions based on intent

#### AI Models

**OpenAI Integration**
```javascript
// Set environment variables
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_TEMPERATURE=0.7
```

**Local NLP (Fallback)**
- Lightweight intent detection
- Pattern-based entity extraction
- Rule-based sentiment analysis
- No external API required

### 4. Plugins

The bot includes several built-in plugins:

#### Analytics Plugin
- Tracks command usage
- User activity statistics
- Performance metrics
- `/analytics` command for admins

#### Moderation Plugin
- Automatic content filtering
- Warning system
- Ban/mute management
- Banned word detection

#### Reminder Plugin
- Scheduled reminders
- Time parsing (5m, 2h, 1d)
- Reminder management
- Automatic notifications

#### Poll Plugin
- Interactive polls
- Real-time vote tracking
- Results visualization
- Multiple choice support

#### Game Plugin
- Trivia questions
- Magic 8-ball
- Dice rolling
- Extensible game system

### 5. Interactive UI Elements

The bot supports rich interactive elements:

```javascript
// Buttons
ctx.createButton('Click Me', 'action_id', 'primary')

// Button Groups
ctx.createButtons([
  { text: 'Option 1', action: 'opt1' },
  { text: 'Option 2', action: 'opt2' }
])

// Forms
ctx.createForm([
  { name: 'username', label: 'Username', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true }
])

// Carousels
ctx.createCarousel([
  { title: 'Item 1', description: 'Description', image: 'url' },
  { title: 'Item 2', description: 'Description', image: 'url' }
])

// Menus
ctx.createMenu([
  { text: 'Option 1', value: '1' },
  { text: 'Option 2', value: '2' }
])
```

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Messaging Service                      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Bot Service Layer                    │  │
│  │  - Message Processing                             │  │
│  │  - Command Routing                                │  │
│  │  - Response Generation                            │  │
│  └────────────┬─────────────────────────────────────┘  │
│               │                                          │
│  ┌────────────▼─────────────────────────────────────┐  │
│  │           Bot Framework Core                      │  │
│  │  - Command Registry                               │  │
│  │  - Middleware Pipeline                            │  │
│  │  - Context Management                             │  │
│  │  - Rate Limiting                                  │  │
│  │  - Permission System                              │  │
│  └────┬───────────────────────┬─────────────────────┘  │
│       │                       │                         │
│  ┌────▼──────────┐  ┌────────▼─────────────────────┐  │
│  │   Plugins     │  │    AI Integration            │  │
│  │  - Analytics  │  │  - OpenAI Model              │  │
│  │  - Moderation │  │  - Local NLP Model           │  │
│  │  - Reminder   │  │  - Intent Recognition        │  │
│  │  - Poll       │  │  - Entity Extraction         │  │
│  │  - Game       │  │  - Sentiment Analysis        │  │
│  └───────────────┘  └──────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### File Structure

```
services/messaging-service/
├── lib/
│   ├── bot-framework.js          # Core bot framework
│   ├── bot-service.js             # Service integration layer
│   ├── ai-integration.js          # AI models and manager
│   └── bot-plugins/
│       └── index.js               # Plugin collection
├── routes/
│   └── bot.js                     # Bot API routes
└── server.js                      # Service initialization
```

### Data Flow

1. **User sends message** → Socket.IO / HTTP POST
2. **Message router** → Check if message is bot command (starts with /)
3. **Bot service** → Process message through framework
4. **Framework** → Execute middleware chain
5. **Command handler** → Generate response
6. **Bot service** → Send response to conversation
7. **Socket.IO** → Broadcast to connected clients

---

## Getting Started

### Basic Setup

1. **Environment Variables**

```bash
# Required
BOT_SYSTEM_USER_ID=00000000-0000-0000-0000-000000000001

# Optional - AI Integration
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_TEMPERATURE=0.7

# Optional - Bot Configuration
BOT_MAX_COMMANDS_PER_MINUTE=20
BOT_COMMAND_PREFIX=/
```

2. **Start the Messaging Service**

```bash
cd services/messaging-service
npm install
npm start
```

3. **Test the Bot**

Send a message starting with `/` to trigger bot commands:

```
/help
/ping
/stats
```

### API Integration

#### Send Message to Bot

```bash
POST /bot/message
Content-Type: application/json
x-user-id: user-uuid-here

{
  "content": "/help",
  "conversationId": "conversation-uuid-here"
}
```

#### Get Bot Commands

```bash
GET /bot/commands
```

#### Get Bot Analytics

```bash
GET /bot/analytics
x-user-id: admin-user-uuid
```

---

## Bot Commands

### Command Syntax

```
/<command> [parameters]

Examples:
/help
/search keyword
/remind 30m Take a break
/poll "What's your favorite color?" "Red" "Blue" "Green"
```

### Parameter Types

- **String**: Plain text
- **Number**: Integer or decimal
- **URL**: Valid URL
- **Time**: Duration (5m, 2h, 1d)
- **Quoted**: Text in quotes for multi-word arguments

### Command Categories

- **general**: Basic commands (help, stats, ping)
- **utility**: Useful tools (search, calc, translate)
- **ai**: AI-powered features (summarize, sentiment)
- **fun**: Entertainment (games, quotes, 8ball)
- **moderation**: Moderation tools (warn, ban, mute)
- **admin**: Admin-only commands (broadcast, analytics)

---

## AI Integration

### OpenAI Setup

1. Get API key from [OpenAI](https://platform.openai.com/)
2. Set environment variable:

```bash
export OPENAI_API_KEY=sk-...
```

3. Configure model (optional):

```bash
export OPENAI_MODEL=gpt-4
export OPENAI_TEMPERATURE=0.8
```

### Local NLP (No API Required)

The bot automatically falls back to local NLP if OpenAI is not configured:

- Intent detection using pattern matching
- Entity extraction with regex
- Simple sentiment analysis
- No external dependencies

### AI Capabilities

```javascript
// In command handlers, you can use AI:

async handler(ctx) {
  // Analyze text
  const analysis = await ctx.bot.aiManager.analyze(ctx.args.join(' '));

  return {
    text: `Intent: ${analysis.intent}\n` +
          `Sentiment: ${analysis.sentiment}\n` +
          `Entities: ${analysis.entities.length} found`
  };
}
```

---

## Plugins

### Using Plugins

Plugins are automatically loaded when the bot service initializes. To enable/disable plugins, modify `lib/bot-service.js`:

```javascript
_setupPlugins() {
  // Enable desired plugins
  this.bot.registerPlugin('analytics', new AnalyticsPlugin());
  this.bot.registerPlugin('moderation', new ModerationPlugin({
    bannedWords: ['spam'],
    autoMod: true
  }));
  this.bot.registerPlugin('reminder', new ReminderPlugin());
  this.bot.registerPlugin('poll', new PollPlugin());
  this.bot.registerPlugin('game', new GamePlugin());
}
```

### Creating Custom Plugins

```javascript
class MyCustomPlugin {
  constructor(options = {}) {
    this.options = options;
    this.name = 'my-plugin';
  }

  init(bot) {
    // Register commands
    bot.registerCommand({
      name: 'mycommand',
      description: 'My custom command',
      category: 'custom',
      handler: async (ctx) => {
        return { text: 'Hello from my plugin!' };
      }
    });

    // Listen to events
    bot.on('command:executed', (data) => {
      console.log('Command executed:', data.command);
    });

    // Add middleware
    bot.use(async (ctx, next) => {
      // Do something before command execution
      await next();
      // Do something after command execution
    });
  }
}

// Register plugin
bot.registerPlugin('my-plugin', new MyCustomPlugin());
```

---

## Custom Development

### Creating Custom Commands

Add to `lib/bot-service.js` in `_setupCustomCommands()`:

```javascript
this.bot.registerCommand({
  name: 'mycommand',
  aliases: ['mc', 'mycmd'],
  description: 'My custom command',
  category: 'custom',
  parameters: [
    { name: 'arg1', required: true, type: 'string' },
    { name: 'arg2', required: false, type: 'number' }
  ],
  examples: [
    '/mycommand hello',
    '/mycommand hello 42'
  ],
  cooldown: 5000, // 5 seconds
  permissions: { requireRole: 'user' },
  handler: async (ctx) => {
    const arg1 = ctx.args[0];
    const arg2 = parseInt(ctx.args[1]) || 0;

    // Access conversation context
    const history = ctx.conversation.getHistory(5);

    // Use AI
    const analysis = await ctx.bot.aiManager.analyze(arg1);

    // Access database
    const messages = await ctx.bot.models.Message.findAll({
      where: { conversationId: ctx.conversationId },
      limit: 10
    });

    // Return response
    return {
      text: `You said: ${arg1}\nNumber: ${arg2}\nIntent: ${analysis.intent}`,
      format: 'markdown'
    };
  }
});
```

### Context Object Reference

The command handler receives a context object with:

```javascript
{
  // Command info
  command: 'command-name',
  args: ['arg1', 'arg2'],

  // User info
  userId: 'user-uuid',
  conversationId: 'conversation-uuid',

  // Message
  message: { content, ...},
  metadata: {},

  // Conversation context
  conversation: ConversationContext,

  // Bot reference
  bot: BotFramework,

  // Helper methods
  reply(content, options),
  sendMessage(content, options),
  sendTyping(),
  createButton(text, action, style),
  createButtons(buttons),
  createForm(fields),
  createCarousel(items),
  createMenu(options),
  getMemory(key),
  setMemory(key, value),
  deleteMemory(key),
  hasRole(role),
  getRoles(),
  t(key, params),
  validateArgs(),
  throw(message)
}
```

---

## API Reference

### Bot Endpoints

#### GET /bot/commands
Get all available bot commands.

**Response:**
```json
{
  "success": true,
  "commands": [...],
  "totalCommands": 25,
  "categories": ["general", "utility", "fun", "moderation", "admin"]
}
```

#### GET /bot/commands/:commandName
Get details of a specific command.

**Response:**
```json
{
  "success": true,
  "command": {
    "name": "help",
    "aliases": ["h", "?"],
    "description": "Show available commands",
    "category": "general",
    "usageCount": 150
  }
}
```

#### POST /bot/message
Send a message to the bot.

**Request:**
```json
{
  "content": "/help",
  "conversationId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "response": { ... },
  "data": { ... }
}
```

#### GET /bot/analytics
Get bot analytics (admin only).

**Response:**
```json
{
  "success": true,
  "analytics": {
    "uptime": 3600000,
    "totalCommands": 1250,
    "successRate": "98.5%",
    "userCount": 45,
    "commandsPerMinute": "2.50"
  }
}
```

#### GET /bot/help
Get bot help documentation.

**Query Parameters:**
- `category` (optional): Filter by category

**Response:**
```json
{
  "success": true,
  "helpText": "markdown formatted help",
  "commands": [...],
  "categories": [...]
}
```

#### GET /bot/status
Get bot status and health.

**Response:**
```json
{
  "success": true,
  "status": "online",
  "uptime": 3600000,
  "name": "Let's Connect Bot",
  "version": "2.0.0"
}
```

---

## Best Practices

### 1. Command Design

- **Keep commands simple**: One command, one purpose
- **Use descriptive names**: Clear and self-explanatory
- **Provide examples**: Show users how to use commands
- **Validate input**: Check parameters before processing
- **Handle errors gracefully**: Provide helpful error messages

### 2. Performance

- **Use cooldowns**: Prevent command spam
- **Implement rate limiting**: Protect against abuse
- **Cache results**: Store frequently accessed data
- **Optimize database queries**: Use indexes and limits
- **Stream large responses**: Don't load everything in memory

### 3. Security

- **Validate permissions**: Check user roles before execution
- **Sanitize input**: Prevent injection attacks
- **Rate limit**: Prevent DoS attacks
- **Audit logging**: Track admin actions
- **Secure secrets**: Use environment variables

### 4. User Experience

- **Provide feedback**: Use loading indicators
- **Clear messages**: Write concise, helpful responses
- **Use rich UI**: Buttons and forms improve interaction
- **Context awareness**: Remember user preferences
- **Multi-language support**: Use translation system

### 5. Development

- **Modular design**: Use plugins for new features
- **Event-driven**: Emit events for extensibility
- **Test thoroughly**: Write tests for commands
- **Document everything**: Keep docs up to date
- **Version control**: Use git for changes

---

## Examples

### Example 1: Weather Command with API

```javascript
this.bot.registerCommand({
  name: 'weather',
  description: 'Get weather for a location',
  category: 'utility',
  parameters: [{ name: 'location', required: true }],
  handler: async (ctx) => {
    const location = ctx.args.join(' ');

    try {
      // Call weather API
      const response = await fetch(
        `https://api.weather.com/v1/location/${location}`
      );
      const data = await response.json();

      return {
        text: `🌤️ **Weather in ${location}**\n\n` +
              `Temperature: ${data.temp}°C\n` +
              `Condition: ${data.condition}\n` +
              `Humidity: ${data.humidity}%`,
        format: 'markdown'
      };
    } catch (error) {
      return { text: '❌ Failed to fetch weather data' };
    }
  }
});
```

### Example 2: Interactive Form

```javascript
this.bot.registerCommand({
  name: 'feedback',
  description: 'Submit feedback',
  category: 'general',
  handler: async (ctx) => {
    return {
      text: '📝 **Feedback Form**',
      form: ctx.createForm([
        { name: 'category', label: 'Category', type: 'select',
          options: ['Bug', 'Feature', 'General'] },
        { name: 'message', label: 'Message', type: 'textarea',
          required: true },
        { name: 'email', label: 'Email', type: 'email' }
      ])
    };
  }
});
```

### Example 3: Scheduled Task

```javascript
// In plugin init
bot.schedule('0 */1 * * *', async () => {
  // Run every hour
  const stats = bot.getAnalytics();

  // Send summary to admin channel
  bot.emit('message:send', {
    conversationId: 'admin-channel-id',
    content: `Hourly Stats: ${stats.totalCommands} commands processed`
  });
});
```

---

## Troubleshooting

### Bot not responding

1. Check bot service is initialized in `routes/index.js`
2. Verify BOT_SYSTEM_USER_ID is set
3. Check logs for errors
4. Ensure message starts with command prefix (/)

### AI features not working

1. Check OPENAI_API_KEY is set (if using OpenAI)
2. Verify API key is valid
3. Check rate limits on OpenAI account
4. Falls back to local NLP if OpenAI fails

### Permission errors

1. Check user has required role
2. Use `/bot/users/:userId/roles` to manage roles
3. Verify admin users are set up correctly

### Performance issues

1. Enable rate limiting
2. Use command cooldowns
3. Optimize database queries
4. Check Redis connection

---

## Support

For questions or issues:

1. Check this documentation
2. Review the code in `services/messaging-service/lib/`
3. Check logs for errors
4. Create an issue on GitHub

---

## Version History

### v2.0.0 (Current)
- Complete bot framework rewrite
- AI integration with OpenAI and local NLP
- Plugin system with 5 built-in plugins
- Rich UI elements support
- Enhanced command system
- Role-based permissions
- Analytics and monitoring
- Multi-language support
- Comprehensive API

### v1.0.0 (Legacy)
- Basic Telegram admin bot
- Simple command handling
- Admin CLI integration

---

*Last updated: March 14, 2026*
