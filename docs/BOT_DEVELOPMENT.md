# Bot Development Guide

## Creating Custom Commands

### Basic Command

```javascript
// In lib/bot-service.js -> _setupCustomCommands()

this.bot.registerCommand({
  name: 'greet',
  description: 'Greet the user',
  category: 'custom',
  handler: async (ctx) => {
    return {
      text: `Hello, ${ctx.userId}! 👋`
    };
  }
});
```

### Command with Parameters

```javascript
this.bot.registerCommand({
  name: 'echo',
  description: 'Echo back your message',
  category: 'utility',
  parameters: [
    { name: 'message', required: true, type: 'string' }
  ],
  examples: ['/echo Hello World'],
  handler: async (ctx) => {
    const message = ctx.args.join(' ');
    return { text: `You said: ${message}` };
  }
});
```

### Command with Database Access

```javascript
this.bot.registerCommand({
  name: 'messagecount',
  description: 'Count your messages',
  category: 'stats',
  handler: async (ctx) => {
    const count = await this.models.Message.count({
      where: { senderId: ctx.userId }
    });

    return {
      text: `You have sent ${count} messages! 📊`
    };
  }
});
```

### Command with AI

```javascript
this.bot.registerCommand({
  name: 'analyze',
  description: 'Analyze text with AI',
  category: 'ai',
  parameters: [
    { name: 'text', required: true }
  ],
  handler: async (ctx) => {
    const text = ctx.args.join(' ');
    const analysis = await this.aiManager.analyze(text);

    return {
      text: `**Analysis**\n\n` +
            `Intent: ${analysis.intent}\n` +
            `Sentiment: ${analysis.sentiment}\n` +
            `Language: ${analysis.language}`,
      format: 'markdown'
    };
  }
});
```

### Command with Permissions

```javascript
this.bot.registerCommand({
  name: 'restart',
  description: 'Restart a service (admin only)',
  category: 'admin',
  permissions: { requireRole: 'admin' },
  parameters: [
    { name: 'service', required: true }
  ],
  handler: async (ctx) => {
    const service = ctx.args[0];

    // Only admins can execute this
    // Implement restart logic here

    return {
      text: `✅ Service ${service} restarted`
    };
  }
});
```

### Command with Cooldown

```javascript
this.bot.registerCommand({
  name: 'daily',
  description: 'Daily reward (24h cooldown)',
  category: 'fun',
  cooldown: 86400000, // 24 hours in milliseconds
  handler: async (ctx) => {
    const reward = Math.floor(Math.random() * 100);

    return {
      text: `🎁 Daily reward claimed: ${reward} coins!`
    };
  }
});
```

### Interactive Command with Buttons

```javascript
this.bot.registerCommand({
  name: 'menu',
  description: 'Show interactive menu',
  category: 'utility',
  handler: async (ctx) => {
    return {
      text: '📋 **Main Menu**\n\nChoose an option:',
      buttons: [
        ctx.createButton('Option 1', 'menu_opt1', 'primary'),
        ctx.createButton('Option 2', 'menu_opt2', 'secondary'),
        ctx.createButton('Cancel', 'menu_cancel', 'danger')
      ]
    };
  }
});

// Handle button clicks
this.bot.on('button:click', async (data) => {
  if (data.action === 'menu_opt1') {
    // Handle option 1
  }
});
```

## Creating Plugins

### Plugin Template

```javascript
// lib/bot-plugins/my-plugin.js

class MyPlugin {
  constructor(options = {}) {
    this.options = options;
    this.name = 'my-plugin';
    this.data = new Map(); // Plugin-specific data
  }

  init(bot) {
    // Register commands
    this._registerCommands(bot);

    // Add event listeners
    this._setupEventListeners(bot);

    // Add middleware
    this._setupMiddleware(bot);
  }

  _registerCommands(bot) {
    bot.registerCommand({
      name: 'myplugin',
      description: 'My plugin command',
      category: 'plugin',
      handler: async (ctx) => {
        return { text: 'Hello from my plugin!' };
      }
    });
  }

  _setupEventListeners(bot) {
    bot.on('command:executed', (data) => {
      console.log(`[MyPlugin] Command: ${data.command}`);
    });

    bot.on('message:send', (data) => {
      console.log(`[MyPlugin] Message sent`);
    });
  }

  _setupMiddleware(bot) {
    bot.use(async (ctx, next) => {
      // Before command execution
      console.log(`[MyPlugin] Before: ${ctx.command}`);

      await next();

      // After command execution
      console.log(`[MyPlugin] After: ${ctx.command}`);
    });
  }
}

module.exports = MyPlugin;
```

### Register Plugin

```javascript
// In lib/bot-service.js -> _setupPlugins()

const MyPlugin = require('./bot-plugins/my-plugin');

this.bot.registerPlugin('my-plugin', new MyPlugin({
  option1: 'value1',
  option2: 'value2'
}));
```

## Advanced Features

### Conversation Context

```javascript
handler: async (ctx) => {
  // Get conversation history
  const history = ctx.conversation.getHistory(10);

  // Store data in conversation context
  ctx.conversation.set('userPreference', 'dark-mode');

  // Retrieve stored data
  const pref = ctx.conversation.get('userPreference');

  // Check conversation age
  const age = ctx.conversation.getAge();
  const idle = ctx.conversation.getIdleTime();

  return { text: `Context age: ${age}ms, idle: ${idle}ms` };
}
```

### Global Memory

```javascript
handler: async (ctx) => {
  // Store global data
  ctx.setMemory('globalSetting', 'value');

  // Retrieve global data
  const setting = ctx.getMemory('globalSetting');

  // Delete global data
  ctx.deleteMemory('globalSetting');

  return { text: `Setting: ${setting}` };
}
```

### Role Management

```javascript
handler: async (ctx) => {
  // Check if user has role
  if (ctx.hasRole('admin')) {
    // Admin-only logic
  }

  // Get all user roles
  const roles = ctx.getRoles();

  return { text: `Your roles: ${roles.join(', ')}` };
}
```

### Validation

```javascript
handler: async (ctx) => {
  // Validate arguments
  const validation = ctx.validateArgs();

  if (!validation.valid) {
    return {
      text: '❌ Validation errors:\n' + validation.errors.join('\n')
    };
  }

  // Continue with valid arguments
  return { text: 'All arguments are valid!' };
}
```

### Translation

```javascript
// Register translations
bot.translations.set('en', new Map([
  ['greeting', 'Hello {{name}}!'],
  ['goodbye', 'Goodbye {{name}}!']
]));

bot.translations.set('es', new Map([
  ['greeting', '¡Hola {{name}}!'],
  ['goodbye', '¡Adiós {{name}}!']
]));

// Use in command
handler: async (ctx) => {
  const greeting = ctx.t('greeting', { name: 'User' });
  return { text: greeting };
}
```

## Event System

### Available Events

```javascript
// Command events
bot.on('command:registered', (data) => {});
bot.on('command:executed', (data) => {});
bot.on('command:error', (data) => {});

// Plugin events
bot.on('plugin:registered', (data) => {});

// Message events
bot.on('message:send', (data) => {});
bot.on('typing:start', (data) => {});

// AI events
bot.on('ai:response', (data) => {});
bot.on('ai:error', (data) => {});

// User events
bot.on('user:role:added', (data) => {});
bot.on('user:role:removed', (data) => {});
bot.on('user:banned', (data) => {});
bot.on('user:muted', (data) => {});

// Poll events
bot.on('poll:updated', (data) => {});

// Button events
bot.on('button:click', (data) => {});

// Task events
bot.on('task:scheduled', (data) => {});

// Flow events
bot.on('flow:created', (data) => {});
```

### Emit Custom Events

```javascript
// In your plugin or command
bot.emit('custom:event', {
  userId: ctx.userId,
  data: 'some data'
});

// Listen for custom events
bot.on('custom:event', (data) => {
  console.log('Custom event:', data);
});
```

## Testing

### Test Commands Manually

```javascript
const message = {
  content: '/help',
  senderId: 'test-user-id',
  conversationId: 'test-conversation-id',
  id: 'test-message-id'
};

const result = await botService.processMessage(message);
console.log(result);
```

### Test with Mock Data

```javascript
// Create test user with roles
botService.addUserRole('test-user', 'admin');

// Test admin command
const result = await botService.processMessage({
  content: '/analytics',
  senderId: 'test-user',
  conversationId: 'test-conv',
  id: 'msg-id'
});

// Verify result
assert(result.success === true);
assert(result.data.analytics !== undefined);
```

## Best Practices

### 1. Error Handling

```javascript
handler: async (ctx) => {
  try {
    // Your logic here
    const result = await someAsyncOperation();
    return { text: `Success: ${result}` };

  } catch (error) {
    console.error('[MyCommand] Error:', error);
    return {
      text: '❌ An error occurred. Please try again later.'
    };
  }
}
```

### 2. Input Validation

```javascript
handler: async (ctx) => {
  // Validate parameter count
  if (ctx.args.length < 2) {
    return {
      text: '❌ Usage: /command <arg1> <arg2>'
    };
  }

  // Validate parameter types
  const number = parseInt(ctx.args[0]);
  if (isNaN(number)) {
    return {
      text: '❌ First argument must be a number'
    };
  }

  // Continue with validated input
  return { text: `Valid input: ${number}` };
}
```

### 3. User Feedback

```javascript
handler: async (ctx) => {
  // Show typing indicator
  await ctx.sendTyping();

  // Perform long operation
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Send result
  return {
    text: '✅ Operation completed!',
    format: 'markdown'
  };
}
```

### 4. Pagination

```javascript
handler: async (ctx) => {
  const page = parseInt(ctx.args[0]) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const results = await this.models.Message.findAll({
    limit,
    offset,
    order: [['createdAt', 'DESC']]
  });

  return {
    text: `**Page ${page}**\n\n` +
          results.map((r, i) => `${offset + i + 1}. ${r.content}`).join('\n') +
          `\n\nUse /command ${page + 1} for next page`
  };
}
```

### 5. Scheduled Tasks

```javascript
// In plugin init
bot.schedule('0 9 * * *', async () => {
  // Runs daily at 9 AM
  console.log('[MyPlugin] Daily task running');

  // Send reminder to all users
  const conversations = await this.models.Conversation.findAll({
    where: { type: 'direct' },
    limit: 100
  });

  for (const conv of conversations) {
    await bot.emit('message:send', {
      conversationId: conv.id,
      content: '☀️ Good morning! Don\'t forget to check your tasks.'
    });
  }
});
```

## Debugging

### Enable Debug Logging

```javascript
// In bot-service.js
this.bot.on('command:executed', (data) => {
  console.log('[DEBUG] Command executed:', {
    command: data.command,
    user: data.userId,
    result: data.result
  });
});

this.bot.on('command:error', (data) => {
  console.error('[DEBUG] Command error:', {
    command: data.command,
    user: data.userId,
    error: data.error.message
  });
});
```

### Inspect Context

```javascript
handler: async (ctx) => {
  // Log context for debugging
  console.log('[DEBUG] Context:', {
    command: ctx.command,
    args: ctx.args,
    userId: ctx.userId,
    conversationId: ctx.conversationId,
    roles: ctx.getRoles()
  });

  return { text: 'Check logs for context details' };
}
```

## Performance Optimization

### Cache Results

```javascript
const cache = new Map();

handler: async (ctx) => {
  const cacheKey = `weather:${ctx.args[0]}`;

  // Check cache
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < 300000) { // 5 min
      return cached.data;
    }
  }

  // Fetch fresh data
  const data = await fetchWeatherData(ctx.args[0]);
  const result = { text: `Weather: ${data.temp}°C` };

  // Store in cache
  cache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  });

  return result;
}
```

### Batch Operations

```javascript
handler: async (ctx) => {
  // Instead of this (N queries):
  // for (const id of ids) {
  //   const user = await User.findByPk(id);
  // }

  // Do this (1 query):
  const users = await this.models.User.findAll({
    where: { id: { [Op.in]: ids } }
  });

  return { text: `Found ${users.length} users` };
}
```

## Complete Example: Todo Plugin

```javascript
class TodoPlugin {
  constructor(options = {}) {
    this.options = options;
    this.name = 'todo';
    this.todos = new Map(); // userId -> [todos]
  }

  init(bot) {
    // Add todo
    bot.registerCommand({
      name: 'todo',
      aliases: ['addtodo'],
      description: 'Add a todo item',
      category: 'productivity',
      parameters: [{ name: 'task', required: true }],
      handler: async (ctx) => {
        const task = ctx.args.join(' ');

        if (!this.todos.has(ctx.userId)) {
          this.todos.set(ctx.userId, []);
        }

        this.todos.get(ctx.userId).push({
          id: Date.now(),
          task,
          completed: false,
          createdAt: new Date()
        });

        return { text: `✅ Todo added: ${task}` };
      }
    });

    // List todos
    bot.registerCommand({
      name: 'todos',
      aliases: ['listtodos'],
      description: 'List your todos',
      category: 'productivity',
      handler: async (ctx) => {
        const userTodos = this.todos.get(ctx.userId) || [];

        if (userTodos.length === 0) {
          return { text: 'No todos yet! Use /todo <task> to add one.' };
        }

        let text = '**Your Todos**\n\n';
        userTodos.forEach((todo, i) => {
          const status = todo.completed ? '✅' : '⬜';
          text += `${i + 1}. ${status} ${todo.task}\n`;
        });

        return { text, format: 'markdown' };
      }
    });

    // Complete todo
    bot.registerCommand({
      name: 'completetodo',
      description: 'Mark todo as complete',
      category: 'productivity',
      parameters: [{ name: 'index', required: true, type: 'number' }],
      handler: async (ctx) => {
        const index = parseInt(ctx.args[0]) - 1;
        const userTodos = this.todos.get(ctx.userId) || [];

        if (index < 0 || index >= userTodos.length) {
          return { text: '❌ Invalid todo index' };
        }

        userTodos[index].completed = true;
        return { text: `✅ Todo completed: ${userTodos[index].task}` };
      }
    });

    // Delete todo
    bot.registerCommand({
      name: 'deletetodo',
      description: 'Delete a todo',
      category: 'productivity',
      parameters: [{ name: 'index', required: true, type: 'number' }],
      handler: async (ctx) => {
        const index = parseInt(ctx.args[0]) - 1;
        const userTodos = this.todos.get(ctx.userId) || [];

        if (index < 0 || index >= userTodos.length) {
          return { text: '❌ Invalid todo index' };
        }

        const deleted = userTodos.splice(index, 1)[0];
        return { text: `🗑️ Todo deleted: ${deleted.task}` };
      }
    });
  }
}

module.exports = TodoPlugin;
```

---

For more information, see the [Bot Features Documentation](./BOT_FEATURES.md).
