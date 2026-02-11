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

// ============================================================================
// Phase 6: Content Recommendation API (Deferred from Phase 6 to Phase 7)
// ============================================================================

// AI-powered content recommendations
app.post('/recommend/content', async (req, res) => {
  try {
    const { userId, contentType, userPreferences, recentActivity, limit = 10 } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Check cache
    const cacheKey = `ai:recommendations:${userId}:${contentType}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return res.json({ recommendations: JSON.parse(cached), cached: true });
    }

    // Build context from user preferences and activity
    const context = `
User Preferences: ${JSON.stringify(userPreferences || {})}
Recent Activity: ${JSON.stringify(recentActivity || [])}
Content Type: ${contentType || 'general'}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "You are a content recommendation engine. Based on user preferences and activity, suggest relevant content with brief explanations. Return a JSON array of recommendations with 'title', 'reason', and 'score' fields." 
        },
        { role: "user", content: context }
      ],
      max_tokens: 500
    });

    let recommendations = [];
    try {
      const content = completion.choices[0].message.content;
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create structured recommendations from text
        const lines = content.split('\n').filter(l => l.trim());
        recommendations = lines.slice(0, limit).map((line, idx) => ({
          title: line.replace(/^\d+\.\s*/, '').trim(),
          reason: 'AI-suggested based on your preferences',
          score: 1 - (idx * 0.1)
        }));
      }
    } catch (parseError) {
      console.error('Failed to parse recommendations:', parseError);
      recommendations = [{
        title: 'Unable to generate recommendations',
        reason: 'Please try again later',
        score: 0
      }];
    }

    // Cache recommendations for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(recommendations));

    res.json({ recommendations, cached: false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Recommendation generation failed', details: error.message });
  }
});

// Collaborative filtering recommendations
app.post('/recommend/collaborative', async (req, res) => {
  try {
    const { userId, similarUsers, contentInteractions, limit = 10 } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Check cache
    const cacheKey = `ai:collaborative:${userId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return res.json({ recommendations: JSON.parse(cached), cached: true });
    }

    // Build collaborative filtering context
    const context = `
User ID: ${userId}
Similar Users: ${JSON.stringify(similarUsers || [])}
Content Interactions: ${JSON.stringify(contentInteractions || {})}
Task: Recommend content based on what similar users have engaged with.
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "You are a collaborative filtering recommendation system. Analyze similar users' behavior to suggest content. Return a JSON array with 'contentId', 'contentType', 'reason', and 'similarity' fields." 
        },
        { role: "user", content: context }
      ],
      max_tokens: 400
    });

    let recommendations = [];
    try {
      const content = completion.choices[0].message.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        recommendations = [{ 
          message: 'Collaborative filtering results available',
          note: 'Analyzing similar user patterns'
        }];
      }
    } catch (parseError) {
      recommendations = [{ message: 'Processing collaborative data' }];
    }

    // Cache for 30 minutes
    await redis.setex(cacheKey, 1800, JSON.stringify(recommendations));

    res.json({ recommendations, cached: false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Collaborative filtering failed', details: error.message });
  }
});

// User preference learning
app.post('/recommend/learn-preferences', async (req, res) => {
  try {
    const { userId, interactions, feedbackData } = req.body;

    if (!userId || !interactions) {
      return res.status(400).json({ error: 'userId and interactions required' });
    }

    // Store user interaction patterns in Redis
    const interactionKey = `user:${userId}:interactions`;
    const preferenceKey = `user:${userId}:preferences`;

    // Get existing interactions
    const existingInteractions = await redis.get(interactionKey);
    let allInteractions = existingInteractions ? JSON.parse(existingInteractions) : [];
    
    // Add new interactions
    allInteractions = [...allInteractions, ...interactions].slice(-100); // Keep last 100

    // Store updated interactions
    await redis.setex(interactionKey, 86400 * 30, JSON.stringify(allInteractions)); // 30 days

    // Use AI to extract preferences from interactions
    const context = `
Analyze these user interactions to extract preferences:
${JSON.stringify(allInteractions)}

Feedback: ${JSON.stringify(feedbackData || {})}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "You are a user preference learning system. Analyze interactions and extract user preferences in categories like topics, formats, authors, and engagement patterns. Return a JSON object with preference categories and scores." 
        },
        { role: "user", content: context }
      ],
      max_tokens: 300
    });

    let preferences = {};
    try {
      const content = completion.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        preferences = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse preferences:', parseError);
      preferences = { status: 'learning', interactions: allInteractions.length };
    }

    // Store learned preferences
    await redis.setex(preferenceKey, 86400 * 30, JSON.stringify(preferences));

    res.json({ 
      message: 'Preferences updated successfully',
      preferences,
      interactionCount: allInteractions.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Preference learning failed', details: error.message });
  }
});

// Get user preferences
app.get('/recommend/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const preferenceKey = `user:${userId}:preferences`;
    const interactionKey = `user:${userId}:interactions`;

    const preferences = await redis.get(preferenceKey);
    const interactions = await redis.get(interactionKey);

    if (!preferences && !interactions) {
      return res.json({
        message: 'No preferences found',
        preferences: {},
        interactionCount: 0
      });
    }

    res.json({
      preferences: preferences ? JSON.parse(preferences) : {},
      interactionCount: interactions ? JSON.parse(interactions).length : 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Trending content algorithm with AI insights
app.post('/recommend/trending', async (req, res) => {
  try {
    const { contentType, timeframe = '24h', metrics, limit = 10 } = req.body;

    // Check cache
    const cacheKey = `ai:trending:${contentType}:${timeframe}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return res.json({ trending: JSON.parse(cached), cached: true });
    }

    const context = `
Analyze trending content metrics:
Content Type: ${contentType || 'all'}
Timeframe: ${timeframe}
Metrics: ${JSON.stringify(metrics || {})}

Identify what's trending and why.
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "You are a trending content analyzer. Identify patterns in engagement metrics to determine what content is trending and why. Return a JSON array with 'contentId', 'trendScore', 'reason', and 'momentum' fields." 
        },
        { role: "user", content: context }
      ],
      max_tokens: 400
    });

    let trending = [];
    try {
      const content = completion.choices[0].message.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        trending = JSON.parse(jsonMatch[0]);
      } else {
        trending = [{ message: 'Analyzing trending patterns', timeframe }];
      }
    } catch (parseError) {
      trending = [{ message: 'Processing trending data' }];
    }

    // Cache for 15 minutes
    await redis.setex(cacheKey, 900, JSON.stringify(trending));

    res.json({ trending, cached: false, timeframe });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Trending analysis failed', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`AI service running on port ${PORT}`);
});
