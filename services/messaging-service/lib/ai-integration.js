'use strict';

/**
 * @fileoverview AI Integration Module for Bot Framework
 *
 * Provides AI capabilities including:
 * - Natural language understanding
 * - Intent recognition
 * - Entity extraction
 * - Smart responses
 * - Conversation summarization
 * - Language detection
 */

const EventEmitter = require('events');

// ─── AI Model Base Class ─────────────────────────────────────────────────────

class AIModel extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.apiKey = options.apiKey || process.env.AI_API_KEY;
    this.model = options.model || 'gpt-3.5-turbo';
    this.temperature = options.temperature || 0.7;
    this.maxTokens = options.maxTokens || 500;
  }

  async generate(params) {
    throw new Error('generate() must be implemented by subclass');
  }

  async analyze(text) {
    throw new Error('analyze() must be implemented by subclass');
  }
}

// ─── OpenAI Integration ──────────────────────────────────────────────────────

class OpenAIModel extends AIModel {
  constructor(options = {}) {
    super(options);
    this.endpoint = options.endpoint || 'https://api.openai.com/v1/chat/completions';
  }

  async generate(params) {
    const { prompt, history = [], context = {} } = params;

    const messages = [];

    // System message
    messages.push({
      role: 'system',
      content: this._buildSystemPrompt(context)
    });

    // Conversation history
    for (const msg of history) {
      messages.push({
        role: msg.role === 'bot' ? 'assistant' : 'user',
        content: msg.content
      });
    }

    // Current prompt
    messages.push({
      role: 'user',
      content: prompt
    });

    try {
      const response = await this._callAPI(messages);
      return {
        text: response.message,
        confidence: response.confidence || 0.9,
        suggestions: response.suggestions || []
      };
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async analyze(text) {
    const prompt = `Analyze the following text and provide:
1. Intent (what the user wants to do)
2. Entities (important keywords, names, dates, etc.)
3. Sentiment (positive, negative, neutral)
4. Language
5. Suggested action

Text: "${text}"

Respond in JSON format.`;

    try {
      const response = await this._callAPI([
        { role: 'system', content: 'You are an AI assistant that analyzes text.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response.message);
    } catch (error) {
      this.emit('error', error);
      return {
        intent: 'unknown',
        entities: [],
        sentiment: 'neutral',
        language: 'en',
        suggestedAction: null
      };
    }
  }

  async summarize(messages) {
    const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    const prompt = `Summarize the following conversation in 2-3 sentences:\n\n${conversation}`;

    try {
      const response = await this._callAPI([
        { role: 'system', content: 'You are a helpful assistant that summarizes conversations.' },
        { role: 'user', content: prompt }
      ]);

      return response.message;
    } catch (error) {
      this.emit('error', error);
      return 'Unable to summarize conversation';
    }
  }

  async detectIntent(text) {
    const prompt = `What is the user's intent in this message? Choose one:
- question (asking for information)
- command (giving an instruction)
- statement (making a statement)
- greeting (saying hello)
- farewell (saying goodbye)
- help (asking for help)
- feedback (providing feedback)
- complaint (expressing dissatisfaction)

Message: "${text}"

Respond with just the intent word.`;

    try {
      const response = await this._callAPI([
        { role: 'system', content: 'You are an intent classifier.' },
        { role: 'user', content: prompt }
      ]);

      return response.message.toLowerCase().trim();
    } catch (error) {
      this.emit('error', error);
      return 'unknown';
    }
  }

  async extractEntities(text) {
    const prompt = `Extract important entities from this text (names, dates, locations, numbers, etc.):

"${text}"

Return as JSON array with format: [{"type": "person", "value": "John", "position": 0}]`;

    try {
      const response = await this._callAPI([
        { role: 'system', content: 'You are an entity extraction system.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response.message);
    } catch (error) {
      this.emit('error', error);
      return [];
    }
  }

  _buildSystemPrompt(context) {
    const { botName = 'Assistant', availableCommands = [], userContext = {} } = context;

    let prompt = `You are ${botName}, a helpful and friendly AI assistant.`;

    if (availableCommands.length > 0) {
      prompt += `\n\nAvailable commands: ${availableCommands.join(', ')}`;
      prompt += `\nWhen users ask about functionality, guide them to use these commands.`;
    }

    prompt += `\n\nGuidelines:
- Be helpful, friendly, and concise
- Use emojis occasionally to be engaging
- If you don't know something, admit it
- Suggest relevant commands when appropriate
- Keep responses under 200 words unless asked for more detail`;

    if (userContext && Object.keys(userContext).length > 0) {
      prompt += `\n\nUser context: ${JSON.stringify(userContext)}`;
    }

    return prompt;
  }

  async _callAPI(messages) {
    if (!this.apiKey) {
      throw new Error('AI API key not configured');
    }

    const payload = {
      model: this.model,
      messages,
      temperature: this.temperature,
      max_tokens: this.maxTokens
    };

    // Simulate API call (replace with actual implementation)
    // In production, use fetch or axios to call OpenAI API
    this.emit('api:call', { payload });

    // Placeholder response
    return {
      message: this._generateFallbackResponse(messages[messages.length - 1].content),
      confidence: 0.8
    };
  }

  _generateFallbackResponse(prompt) {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
      return 'Hello! How can I help you today?';
    }

    if (lowerPrompt.includes('help')) {
      return 'I\'m here to help! Try using commands like /help to see what I can do, or just ask me anything.';
    }

    if (lowerPrompt.includes('thank')) {
      return 'You\'re welcome! Let me know if you need anything else.';
    }

    if (lowerPrompt.includes('bye')) {
      return 'Goodbye! Have a great day!';
    }

    return 'I understand you\'re asking about: ' + prompt + '. Let me help you with that!';
  }
}

// ─── Local NLP Model (Lightweight) ───────────────────────────────────────────

class LocalNLPModel extends AIModel {
  constructor(options = {}) {
    super(options);
    this.intentPatterns = this._loadIntentPatterns();
    this.entityPatterns = this._loadEntityPatterns();
  }

  async generate(params) {
    const { prompt, history = [], context = {} } = params;

    // Detect intent
    const intent = this._detectIntent(prompt);

    // Extract entities
    const entities = this._extractEntities(prompt);

    // Generate response based on intent
    const response = this._generateResponse(intent, entities, prompt, context);

    return {
      text: response,
      confidence: 0.7,
      intent,
      entities,
      suggestions: this._getSuggestions(intent, context)
    };
  }

  async analyze(text) {
    return {
      intent: this._detectIntent(text),
      entities: this._extractEntities(text),
      sentiment: this._analyzeSentiment(text),
      language: this._detectLanguage(text),
      suggestedAction: this._suggestAction(text)
    };
  }

  _detectIntent(text) {
    const lower = text.toLowerCase();

    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (lower.match(pattern)) {
          return intent;
        }
      }
    }

    return 'unknown';
  }

  _extractEntities(text) {
    const entities = [];

    // Extract emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex) || [];
    for (const email of emails) {
      entities.push({ type: 'email', value: email, position: text.indexOf(email) });
    }

    // Extract URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    for (const url of urls) {
      entities.push({ type: 'url', value: url, position: text.indexOf(url) });
    }

    // Extract numbers
    const numberRegex = /\b\d+(?:\.\d+)?\b/g;
    const numbers = text.match(numberRegex) || [];
    for (const number of numbers) {
      entities.push({ type: 'number', value: parseFloat(number), position: text.indexOf(number) });
    }

    // Extract dates (simple)
    const dateRegex = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g;
    const dates = text.match(dateRegex) || [];
    for (const date of dates) {
      entities.push({ type: 'date', value: date, position: text.indexOf(date) });
    }

    return entities;
  }

  _analyzeSentiment(text) {
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'awesome', 'amazing', 'wonderful', 'fantastic', 'best', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'horrible', 'poor', 'worst', 'disappointing', 'sad', 'angry'];

    const words = text.toLowerCase().split(/\s+/);
    let score = 0;

    for (const word of words) {
      if (positiveWords.some(pw => word.includes(pw))) score++;
      if (negativeWords.some(nw => word.includes(nw))) score--;
    }

    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  _detectLanguage(text) {
    // Simple language detection (can be enhanced)
    const commonEnglishWords = ['the', 'is', 'are', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    const words = text.toLowerCase().split(/\s+/);

    const englishWordCount = words.filter(w => commonEnglishWords.includes(w)).length;

    if (englishWordCount > words.length * 0.1) {
      return 'en';
    }

    return 'unknown';
  }

  _suggestAction(text) {
    const intent = this._detectIntent(text);

    const actionMap = {
      greeting: 'respond_greeting',
      question: 'provide_answer',
      command: 'execute_command',
      help: 'show_help',
      farewell: 'respond_farewell',
      feedback: 'record_feedback',
      complaint: 'escalate_to_support'
    };

    return actionMap[intent] || 'respond_generic';
  }

  _generateResponse(intent, entities, prompt, context) {
    const responses = {
      greeting: [
        'Hello! How can I help you today?',
        'Hi there! What can I do for you?',
        'Hey! How are you doing?'
      ],
      question: [
        'That\'s a great question! Let me help you with that.',
        'I\'d be happy to help you find an answer to that.',
        'Let me provide some information about that.'
      ],
      command: [
        'I\'ll help you with that command.',
        'Let me execute that for you.',
        'Processing your request...'
      ],
      help: [
        'I\'m here to help! You can ask me questions or use commands like /help to see all available commands.',
        'Need assistance? Try /help to see what I can do, or just ask me anything!',
        'I can help you with various tasks. Use /help to see all commands or tell me what you need.'
      ],
      farewell: [
        'Goodbye! Have a great day!',
        'See you later! Feel free to come back anytime.',
        'Take care! I\'ll be here if you need me.'
      ],
      feedback: [
        'Thank you for your feedback! We really appreciate it.',
        'Thanks for sharing your thoughts with us!',
        'Your feedback is valuable to us. Thank you!'
      ],
      complaint: [
        'I\'m sorry you\'re experiencing this issue. Let me help you resolve it.',
        'I understand your concern. I\'ll do my best to help.',
        'I apologize for the inconvenience. Let\'s work on fixing this.'
      ],
      unknown: [
        'I\'m not sure I understand. Could you rephrase that?',
        'Could you tell me more about what you need help with?',
        'I\'m here to help! Try using /help to see available commands.'
      ]
    };

    const intentResponses = responses[intent] || responses.unknown;
    return intentResponses[Math.floor(Math.random() * intentResponses.length)];
  }

  _getSuggestions(intent, context) {
    const suggestions = [];

    if (intent === 'help') {
      suggestions.push('/help - Show all commands');
      suggestions.push('/stats - View bot statistics');
    }

    if (intent === 'question' && context.availableCommands) {
      suggestions.push(...context.availableCommands.slice(0, 3).map(cmd => `/${cmd}`));
    }

    return suggestions;
  }

  _loadIntentPatterns() {
    return {
      greeting: [
        /^(hi|hello|hey|greetings|good (morning|afternoon|evening))/i,
        /^sup\b/i,
        /^howdy/i
      ],
      farewell: [
        /^(bye|goodbye|see you|later|farewell)/i,
        /^(good ?night|take care)/i
      ],
      question: [
        /^(what|when|where|who|why|how|can|could|would|should|is|are|do|does)/i,
        /\?$/
      ],
      command: [
        /^(please |could you |can you )?[a-z]+ (me |the |my |this |that )/i,
        /^(start|stop|pause|resume|create|delete|update|get|set|show|list)/i
      ],
      help: [
        /\b(help|assist|support|how to|guide|tutorial|explain)/i
      ],
      feedback: [
        /\b(feedback|suggestion|recommend|think|opinion|review)/i
      ],
      complaint: [
        /\b(problem|issue|bug|error|broken|not working|doesn't work)/i,
        /\b(complain|dissatisfied|unhappy|frustrat)/i
      ]
    };
  }

  _loadEntityPatterns() {
    return {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      url: /https?:\/\/[^\s]+/g,
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      date: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
      time: /\b\d{1,2}:\d{2}(?:\s*[AP]M)?\b/gi,
      number: /\b\d+(?:\.\d+)?\b/g,
      currency: /\$\d+(?:\.\d{2})?/g
    };
  }
}

// ─── AI Manager ──────────────────────────────────────────────────────────────

class AIManager {
  constructor(options = {}) {
    this.options = options;
    this.models = new Map();
    this.activeModel = null;

    // Register default models
    if (options.useOpenAI && options.openAIKey) {
      this.registerModel('openai', new OpenAIModel({
        apiKey: options.openAIKey,
        ...options.openAIOptions
      }));
      this.setActiveModel('openai');
    } else {
      // Use local NLP as fallback
      this.registerModel('local', new LocalNLPModel());
      this.setActiveModel('local');
    }
  }

  registerModel(name, model) {
    this.models.set(name, model);
  }

  setActiveModel(name) {
    if (!this.models.has(name)) {
      throw new Error(`Model ${name} not found`);
    }
    this.activeModel = name;
  }

  getModel(name) {
    return name ? this.models.get(name) : this.models.get(this.activeModel);
  }

  async generate(params, modelName = null) {
    const model = this.getModel(modelName);
    if (!model) {
      throw new Error('No AI model available');
    }
    return await model.generate(params);
  }

  async analyze(text, modelName = null) {
    const model = this.getModel(modelName);
    if (!model) {
      throw new Error('No AI model available');
    }
    return await model.analyze(text);
  }
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  AIModel,
  OpenAIModel,
  LocalNLPModel,
  AIManager
};
