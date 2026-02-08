const express = require('express');
const OpenAI = require('openai');
const Redis = require('ioredis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8007;

app.use(express.json());

// OpenAI Configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Redis for caching
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// Routes

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'ai-service' });
});

// Chat completion
app.post('/chat', async (req, res) => {
  try {
    const { messages, userId } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    // Check cache
    const cacheKey = `ai:chat:${JSON.stringify(messages)}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return res.json({ response: cached, cached: true });
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 500
    });

    const response = completion.choices[0].message.content;

    // Cache response
    await redis.setex(cacheKey, 3600, response);

    res.json({ response, cached: false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AI request failed', details: error.message });
  }
});

// Text summarization
app.post('/summarize', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant that summarizes text concisely." },
        { role: "user", content: `Summarize the following text:\n\n${text}` }
      ],
      max_tokens: 200
    });

    const summary = completion.choices[0].message.content;

    res.json({ summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Summarization failed' });
  }
});

// Content moderation
app.post('/moderate', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    const moderation = await openai.moderations.create({
      input: text
    });

    const result = moderation.results[0];

    res.json({
      flagged: result.flagged,
      categories: result.categories,
      scores: result.category_scores
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Moderation failed' });
  }
});

// Smart search suggestions
app.post('/suggest', async (req, res) => {
  try {
    const { query, context } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a search suggestion assistant. Provide 5 relevant search suggestions based on the query." },
        { role: "user", content: `Query: ${query}\nContext: ${context || 'general'}` }
      ],
      max_tokens: 100
    });

    const suggestions = completion.choices[0].message.content.split('\n').filter(s => s.trim());

    res.json({ suggestions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Suggestion generation failed' });
  }
});

app.listen(PORT, () => {
  console.log(`AI service running on port ${PORT}`);
});
