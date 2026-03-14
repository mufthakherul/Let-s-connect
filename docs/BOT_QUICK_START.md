# Bot Quick Start Guide

## 5-Minute Quick Start

### 1. Test the Bot Immediately

```bash
# No setup required! The bot works out of the box
# Just send any of these commands in the messaging app:

/help          # See all commands
/ping          # Test bot response
/stats         # View bot statistics
/quote         # Get inspirational quote
/roll 2d6      # Roll dice
/8ball Will it rain today?    # Ask magic 8-ball
```

### 2. Enable AI Features (Optional)

```bash
# Add to .env file
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
```

Then try AI commands:
```
/summarize          # Summarize recent conversation
/sentiment Hello!   # Analyze sentiment
```

### 3. Set Up Admin Access

```javascript
// In your app, add admin role to a user:
// POST /bot/users/{userId}/roles
{
  "role": "admin"
}
```

Now use admin commands:
```
/analytics                    # View detailed analytics
/broadcast Important message  # Send to all users
/warn userId123 Spam          # Warn a user
```

### 4. Create Custom Commands (Optional)

Edit `/services/messaging-service/lib/bot-service.js`:

```javascript
_setupCustomCommands() {
  // Add your custom commands here
  this.bot.registerCommand({
    name: 'hello',
    description: 'Say hello',
    handler: async (ctx) => {
      return { text: `Hello, ${ctx.userId}! 👋` };
    }
  });
}
```

## Common Use Cases

### Use Case 1: Team Productivity Bot

```javascript
// Set reminders
/remind 30m Team standup
/remind 2h Review PRs

// List tasks
/reminders

// Get quick info
/weather San Francisco
/calc 1250 * 0.15
```

### Use Case 2: Community Moderation

```javascript
// As moderator
/warn userId123 Please follow community guidelines
/mute userId456 60

// As admin
/ban userId789 Repeated violations
/analytics
```

### Use Case 3: Fun & Engagement

```javascript
// Create polls
/poll "What should we build next?" "Feature A" "Feature B" "Feature C"

// Start games
/trivia
/roll d20
/8ball Is this a good idea?

// Share quotes
/quote
```

### Use Case 4: AI-Powered Assistant

```javascript
// With OPENAI_API_KEY set
/summarize              # Summarize last 20 messages
/sentiment Very happy!  # Analyze sentiment

// Natural language (no command prefix needed)
"What's the weather like?"
"Remind me in 10 minutes"
"Tell me a joke"
```

## Available Commands Cheat Sheet

### General
| Command | Description | Example |
|---------|-------------|---------|
| `/help` | Show all commands | `/help` |
| `/stats` | Bot statistics | `/stats` |
| `/ping` | Response time | `/ping` |
| `/me` | Your profile | `/me` |

### Utility
| Command | Description | Example |
|---------|-------------|---------|
| `/search <query>` | Search messages | `/search important` |
| `/calc <expr>` | Calculate | `/calc 2 + 2` |
| `/translate <lang> <text>` | Translate | `/translate es Hello` |
| `/weather <location>` | Weather info | `/weather Tokyo` |

### Fun
| Command | Description | Example |
|---------|-------------|---------|
| `/quote` | Random quote | `/quote` |
| `/roll [dice]` | Roll dice | `/roll 2d6` |
| `/8ball <question>` | Magic 8-ball | `/8ball Will it work?` |
| `/trivia` | Trivia game | `/trivia` |

### Productivity
| Command | Description | Example |
|---------|-------------|---------|
| `/remind <time> <msg>` | Set reminder | `/remind 30m Break` |
| `/reminders` | List reminders | `/reminders` |
| `/cancelreminder <n>` | Cancel reminder | `/cancelreminder 1` |

### Polls
| Command | Description | Example |
|---------|-------------|---------|
| `/poll "<Q>" "<O1>" "<O2>"` | Create poll | `/poll "Favorite?" "A" "B"` |
| `/pollresults <id>` | Show results | `/pollresults abc123` |

### AI (requires OPENAI_API_KEY)
| Command | Description | Example |
|---------|-------------|---------|
| `/summarize` | Summarize chat | `/summarize` |
| `/sentiment <text>` | Analyze sentiment | `/sentiment Great job!` |

### Moderation (Moderator role required)
| Command | Description | Example |
|---------|-------------|---------|
| `/warn <user> [reason]` | Warn user | `/warn abc123 Spam` |
| `/mute <user> [mins]` | Mute user | `/mute abc123 60` |
| `/clearwarnings <user>` | Clear warnings | `/clearwarnings abc123` |

### Admin (Admin role required)
| Command | Description | Example |
|---------|-------------|---------|
| `/ban <user> [reason]` | Ban user | `/ban abc123 ToS violation` |
| `/broadcast <message>` | Send to all | `/broadcast Important update` |
| `/analytics` | Detailed stats | `/analytics` |

## API Usage Examples

### Get All Commands
```bash
curl http://localhost:8003/bot/commands
```

### Send Bot Message
```bash
curl -X POST http://localhost:8003/bot/message \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-user-id" \
  -d '{
    "content": "/help",
    "conversationId": "conversation-id"
  }'
```

### Get Bot Status
```bash
curl http://localhost:8003/bot/status
```

### Get Bot Analytics (Admin)
```bash
curl http://localhost:8003/bot/analytics \
  -H "x-user-id: admin-user-id"
```

### Add User Role (Admin)
```bash
curl -X POST http://localhost:8003/bot/users/user-id/roles \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin-user-id" \
  -d '{"role": "moderator"}'
```

## Environment Variables

```bash
# Required
BOT_SYSTEM_USER_ID=00000000-0000-0000-0000-000000000001

# Optional - AI Features
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_TEMPERATURE=0.7

# Optional - Bot Configuration
BOT_MAX_COMMANDS_PER_MINUTE=20
BOT_COMMAND_PREFIX=/
```

## Testing

### Test Basic Commands
```bash
# In your messaging app:
/ping                    # Should respond with latency
/help                    # Should show command list
/stats                   # Should show statistics
```

### Test AI (if configured)
```bash
/sentiment I love this!  # Should return positive sentiment
/summarize               # Should summarize recent messages
```

### Test Admin Commands
```bash
# First, give yourself admin role via API
# Then:
/analytics               # Should show detailed stats
```

## Troubleshooting

### Bot not responding?
1. Check the messaging service is running: `docker compose ps messaging-service`
2. Check logs: `docker compose logs messaging-service -f`
3. Verify command starts with `/`
4. Try `/ping` to test basic connectivity

### AI not working?
1. Check OPENAI_API_KEY is set correctly
2. Verify API key is valid
3. Bot will fall back to local NLP if OpenAI fails
4. Check logs for API errors

### Permission errors?
1. Verify user has required role
2. Use API to add role: `POST /bot/users/:userId/roles`
3. Only admins can view analytics
4. Only moderators can use moderation commands

### Rate limited?
1. Default limit is 20 commands per minute
2. Wait 60 seconds to reset
3. Adjust BOT_MAX_COMMANDS_PER_MINUTE if needed

## Next Steps

1. **Explore commands**: Try different commands to see what they do
2. **Enable AI**: Add OpenAI API key for smarter responses
3. **Create custom commands**: Edit bot-service.js to add your own
4. **Set up roles**: Configure admin and moderator users
5. **Build plugins**: Create custom plugins for your specific needs

## Support

- **Documentation**: See `/docs/BOT_FEATURES.md` for full documentation
- **Examples**: Check `/services/messaging-service/lib/bot-service.js`
- **API Reference**: See BOT_FEATURES.md API section
- **Issues**: Report bugs on GitHub

---

**Remember**: The bot works immediately without any configuration. Just start sending commands prefixed with `/` !

For more details, see the full [Bot Features Documentation](./BOT_FEATURES.md).
