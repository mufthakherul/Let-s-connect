const express = require('express');
const http = require('http');
const Redis = require('ioredis');
const crypto = require('crypto');
const { HealthChecker, checkRedis } = require('../shared/monitoring');
const { CacheKeyBuilder, CacheTTL, getCacheStats } = require('../shared/cache-strategy');
require('dotenv').config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 8007;
const healthChecker = new HealthChecker('ai-service');

app.use(express.json());
app.use(healthChecker.metricsMiddleware());

// ─────────────────────────────────────────────────────────────────────────────
// Local LLM (Ollama) Configuration
// Privacy-safe, runs entirely on your own infrastructure — no data leaves.
// ─────────────────────────────────────────────────────────────────────────────
const OLLAMA_HOST   = process.env.OLLAMA_HOST  || 'ollama';
const OLLAMA_PORT   = parseInt(process.env.OLLAMA_PORT || '11434', 10);
const OLLAMA_MODEL  = process.env.OLLAMA_MODEL || 'llama3.2';
const OLLAMA_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS || '120000', 10);

// Redis for caching
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
const LONG_TERM_CACHE_TTL = 86400 * 30;
const TRENDING_CACHE_TTL = 900;

healthChecker.registerCheck('redis', () => checkRedis(redis));
healthChecker.registerCheck('ollama', async () => {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: OLLAMA_HOST, port: OLLAMA_PORT, path: '/api/tags', method: 'GET', timeout: 5000 },
      (res) => {
        res.resume();
        resolve({ healthy: res.statusCode < 400, message: `Ollama reachable (HTTP ${res.statusCode})` });
      }
    );
    req.on('timeout', () => { req.destroy(); resolve({ healthy: false, message: 'Ollama timeout' }); });
    req.on('error', (e) => resolve({ healthy: false, message: `Ollama unreachable: ${e.message}` }));
    req.end();
  });
});

const hashCacheSegment = (value) => crypto.createHash('sha1').update(String(value)).digest('hex');
const buildHashedAiKey = (prefix, payload) => CacheKeyBuilder.custom('ai', prefix, hashCacheSegment(payload));

/**
 * Call the local Ollama /api/chat endpoint.
 * @param {Array<{role:string,content:string}>} messages
 * @param {number} numPredict  max tokens to generate
 * @returns {Promise<string>}
 */
const ollamaChat = (messages, numPredict = 500) =>
  new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model:   OLLAMA_MODEL,
      messages,
      stream:  false,
      options: { num_predict: numPredict, temperature: 0.7 }
    });

    const req = http.request(
      {
        hostname: OLLAMA_HOST,
        port:     OLLAMA_PORT,
        path:     '/api/chat',
        method:   'POST',
        headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout:  OLLAMA_TIMEOUT_MS
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed?.message?.content || parsed?.response || '');
            } catch (e) {
              reject(new Error(`Failed to parse Ollama response: ${e.message}`));
            }
          } else {
            reject(new Error(`Ollama HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
          }
        });
      }
    );

    req.on('timeout', () => { req.destroy(); reject(new Error('Ollama request timed out')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

const generateTextFromMessages = (messages, maxOutputTokens) =>
  ollamaChat(messages, maxOutputTokens);

const generateTextFromPrompt = ({ system, prompt, maxOutputTokens }) => {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });
  return generateTextFromMessages(messages, maxOutputTokens);
};

const parseJsonFromText = (text) => {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw error;
  }
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const safeText = (value) => String(value || '').trim();
const normalizeText = (value) => safeText(value).toLowerCase().replace(/\s+/g, ' ');
const tokenize = (value) => normalizeText(value).split(/[^a-z0-9#@]+/i).filter(Boolean);

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'for', 'to', 'from', 'of', 'in', 'on', 'at', 'by', 'with', 'without',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'this', 'that', 'these', 'those', 'as', 'we', 'you',
  'they', 'he', 'she', 'them', 'his', 'her', 'our', 'your', 'their', 'i', 'me', 'my', 'mine', 'yours', 'ours', 'theirs'
]);

const POSITIVE_TERMS = new Set(['great', 'awesome', 'love', 'excellent', 'happy', 'amazing', 'fantastic', 'good', 'nice', 'thanks']);
const NEGATIVE_TERMS = new Set(['bad', 'hate', 'angry', 'terrible', 'awful', 'sad', 'worse', 'worst', 'annoyed', 'upset']);
const HARMFUL_TERMS = ['kill', 'hate', 'stupid', 'idiot', 'racist', 'abuse', 'threat', 'attack', 'die'];
const SPAM_TERMS = ['buy now', 'free money', 'click here', 'limited offer', 'subscribe now', '100% guaranteed'];

const DEFAULT_MODERATION_POLICY = {
  toxicityThreshold: 0.72,
  spamThreshold: 0.7,
  severeCategories: ['hate', 'violence', 'self_harm'],
  maxRepeatedChars: 8,
  blockedKeywords: [],
  updatedAt: null
};

const getModerationPolicyKey = (tenantId = 'global') => CacheKeyBuilder.custom('ai', 'moderation-policy', tenantId);

const getModerationPolicy = async (tenantId = 'global') => {
  const key = getModerationPolicyKey(tenantId);
  const raw = await redis.get(key);
  if (!raw) {
    return { ...DEFAULT_MODERATION_POLICY };
  }

  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_MODERATION_POLICY, ...parsed };
  } catch {
    return { ...DEFAULT_MODERATION_POLICY };
  }
};

const setModerationPolicy = async (tenantId = 'global', policy = {}) => {
  const merged = {
    ...(await getModerationPolicy(tenantId)),
    ...policy,
    updatedAt: new Date().toISOString()
  };

  await redis.setex(getModerationPolicyKey(tenantId), LONG_TERM_CACHE_TTL, JSON.stringify(merged));
  return merged;
};

const extractTopKeywords = (text, maxTags = 8) => {
  const frequencies = new Map();
  tokenize(text).forEach((token) => {
    if (token.length < 3 || STOP_WORDS.has(token) || token.startsWith('#')) return;
    frequencies.set(token, (frequencies.get(token) || 0) + 1);
  });

  return [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, maxTags)
    .map(([token]) => token);
};

const extractHashtags = (text) => {
  const hashtags = String(text || '').match(/#[\w-]+/g) || [];
  return [...new Set(hashtags.map((tag) => tag.replace(/^#/, '').toLowerCase()))];
};

const scoreSentiment = (text) => {
  const tokens = tokenize(text);
  if (!tokens.length) {
    return { score: 0, label: 'neutral', confidence: 0 };
  }

  let pos = 0;
  let neg = 0;
  for (const token of tokens) {
    if (POSITIVE_TERMS.has(token)) pos += 1;
    if (NEGATIVE_TERMS.has(token)) neg += 1;
  }

  const score = clamp((pos - neg) / Math.max(tokens.length / 3, 1), -1, 1);
  const abs = Math.abs(score);
  const label = score > 0.15 ? 'positive' : score < -0.15 ? 'negative' : 'neutral';
  const confidence = clamp(abs + (pos + neg > 0 ? 0.2 : 0), 0, 1);
  return { score: Number(score.toFixed(4)), label, confidence: Number(confidence.toFixed(4)) };
};

const scoreSpam = (text) => {
  const normalized = normalizeText(text);
  if (!normalized) return 0;

  const links = (normalized.match(/https?:\/\//g) || []).length;
  const repeats = (normalized.match(/(.)\1{4,}/g) || []).length;
  const capsRatio = (() => {
    const letters = String(text || '').replace(/[^A-Za-z]/g, '');
    if (!letters.length) return 0;
    const caps = letters.replace(/[^A-Z]/g, '').length;
    return caps / letters.length;
  })();
  const spamTermHits = SPAM_TERMS.filter((term) => normalized.includes(term)).length;

  return clamp((links * 0.22) + (repeats * 0.2) + (capsRatio * 0.35) + (spamTermHits * 0.25), 0, 1);
};

const scoreHarmful = (text, blockedKeywords = []) => {
  const normalized = normalizeText(text);
  if (!normalized) return { score: 0, hits: [] };

  const candidates = [...HARMFUL_TERMS, ...(blockedKeywords || []).map((term) => normalizeText(term)).filter(Boolean)];
  const hits = [...new Set(candidates.filter((term) => normalized.includes(term)))];
  const score = clamp(hits.length * 0.24, 0, 1);
  return { score, hits };
};

const deterministicEmbedding = (text, dimensions = 128) => {
  const dims = clamp(parseInt(dimensions, 10) || 128, 16, 1024);
  const vector = new Array(dims).fill(0);
  const normalized = normalizeText(text);

  if (!normalized) return vector;

  const tokens = tokenize(normalized);
  if (!tokens.length) return vector;

  for (const token of tokens) {
    const hash = crypto.createHash('sha1').update(token).digest();
    for (let i = 0; i < dims; i += 1) {
      const byte = hash[i % hash.length];
      vector[i] += ((byte / 255) * 2) - 1;
    }
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + (value * value), 0)) || 1;
  return vector.map((value) => Number((value / norm).toFixed(8)));
};

const cosineSimilarity = (a = [], b = []) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) return 0;
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = Number(a[i]) || 0;
    const bv = Number(b[i]) || 0;
    dot += av * bv;
    aNorm += av * av;
    bNorm += bv * bv;
  }
  const denom = (Math.sqrt(aNorm) * Math.sqrt(bNorm)) || 1;
  return dot / denom;
};

const parseJsonSafely = (text) => {
  try {
    return parseJsonFromText(text);
  } catch {
    return null;
  }
};

// Routes

app.get('/health', (req, res) => {
  res.json(healthChecker.getBasicHealth());
});

app.get('/health/ready', async (req, res) => {
  try {
    const health = await healthChecker.runChecks();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(healthChecker.getPrometheusMetrics());
});

if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_QUERY_DEBUG_ENDPOINT === 'true') {
  app.get('/debug/cache-stats', async (req, res) => {
    const stats = await getCacheStats(redis);
    res.json({ service: 'ai-service', timestamp: new Date().toISOString(), stats });
  });
}

// Chat completion
app.post('/chat', async (req, res) => {
  try {
    const { messages, userId } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    // Check cache
    const cacheKey = buildHashedAiKey('chat', JSON.stringify(messages));
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json({ response: cached, cached: true });
    }

    const response = await generateTextFromMessages(messages, 500);

    // Cache response
    await redis.setex(cacheKey, CacheTTL.VERY_LONG, response);

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

    const summary = await generateTextFromPrompt({
      system: "You are a helpful assistant that summarizes text concisely.",
      prompt: `Summarize the following text:\n\n${text}`,
      maxOutputTokens: 200
    });

    res.json({ summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Summarization failed' });
  }
});

// Search result summarization
app.post('/search/summary', async (req, res) => {
  try {
    const { query, results = [], summary = '' } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query required' });
    }

    const normalizedResults = Array.isArray(results)
      ? results.slice(0, 12).map((item) => ({
        title: item.title || item.name || item.text || 'Untitled',
        snippet: item.snippet || item.description || item.content || '',
        type: item.type || item.category || 'result',
        score: item._score || item.score || 0,
      }))
      : [];

    const cacheKey = buildHashedAiKey('search-summary', JSON.stringify({ query, summary, results: normalizedResults }));
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json({ ...JSON.parse(cached), cached: true });
    }

    const responseText = await generateTextFromPrompt({
      system: 'You are a search analyst. Summarize search results clearly and concisely. Return JSON only with keys: summary (string), themes (string[]), nextQueries (string[]). Keep the summary to 2-3 sentences and the lists short.',
      prompt: `Query: ${query}\nExisting summary: ${summary || 'none'}\nResults: ${JSON.stringify(normalizedResults, null, 2)}`,
      maxOutputTokens: 300,
    });

    let payload = null;
    try {
      payload = parseJsonFromText(responseText);
    } catch (error) {
      payload = null;
    }

    const output = {
      summary: payload?.summary || responseText.trim() || 'No summary available.',
      themes: Array.isArray(payload?.themes) ? payload.themes.slice(0, 6) : [],
      nextQueries: Array.isArray(payload?.nextQueries) ? payload.nextQueries.slice(0, 6) : [],
    };

    await redis.setex(cacheKey, CacheTTL.LONG, JSON.stringify(output));

    res.json({ ...output, cached: false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Search summary generation failed', details: error.message });
  }
});

// Semantic query expansion
app.post('/search/semantic-expand', async (req, res) => {
  try {
    const { query, limit = 8 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query required' });
    }

    const cacheKey = buildHashedAiKey('semantic-expand', JSON.stringify({ query, limit }));
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json({ ...JSON.parse(cached), cached: true });
    }

    const responseText = await generateTextFromPrompt({
      system: 'You are a semantic search assistant. Expand a user query with related concepts, synonyms, narrower terms, and broader terms. Return JSON only with keys: expandedQuery (string), relatedTerms (string[]), intent (string). Keep relatedTerms concise.',
      prompt: `Query: ${query}\nMaximum related terms: ${limit}`,
      maxOutputTokens: 250,
    });

    let payload = null;
    try {
      payload = parseJsonFromText(responseText);
    } catch (error) {
      payload = null;
    }

    const output = {
      expandedQuery: payload?.expandedQuery || String(query).trim(),
      relatedTerms: Array.isArray(payload?.relatedTerms) ? payload.relatedTerms.slice(0, limit) : [],
      intent: payload?.intent || 'general search',
    };

    await redis.setex(cacheKey, CacheTTL.LONG, JSON.stringify(output));

    res.json({ ...output, cached: false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Semantic query expansion failed', details: error.message });
  }
});

// Content moderation
app.post('/moderate', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    const moderationText = await generateTextFromPrompt({
      system: "You are a content moderation classifier.",
      prompt: `Classify the following text for safety. Return JSON only with fields: flagged (boolean), categories (object of booleans), scores (object of numbers 0-1). Categories: hate, harassment, self_harm, sexual, violence, other.\n\nText:\n${text}`,
      maxOutputTokens: 300
    });

    let result = null;
    try {
      result = parseJsonFromText(moderationText);
    } catch (parseError) {
      result = null;
    }

    const categories = result && result.categories ? result.categories : {
      hate: false,
      harassment: false,
      self_harm: false,
      sexual: false,
      violence: false,
      other: false
    };
    const scores = result && (result.scores || result.category_scores)
      ? (result.scores || result.category_scores)
      : {
        hate: 0,
        harassment: 0,
        self_harm: 0,
        sexual: 0,
        violence: 0,
        other: 0
      };
    const flagged = result && typeof result.flagged === 'boolean'
      ? result.flagged
      : Object.values(categories).some(Boolean);

    res.json({
      flagged,
      categories,
      scores
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

    const suggestionText = await generateTextFromPrompt({
      system: "You are a search suggestion assistant. Provide 5 relevant search suggestions based on the query.",
      prompt: `Query: ${query}\nContext: ${context || 'general'}`,
      maxOutputTokens: 200
    });

    const suggestions = suggestionText.split('\n').filter(s => s.trim());

    res.json({ suggestions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Suggestion generation failed' });
  }
});

// ============================================================================
// Phase 6: Content Recommendation API (Originally deferred, now implemented)
// Note: Rate limiting is handled at API Gateway level via aiRequestLimiter
// ============================================================================

// AI-powered content recommendations
app.post('/recommend/content', async (req, res) => {
  try {
    const { userId, contentType, userPreferences, recentActivity, limit = 10 } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Check cache
    const cacheKey = CacheKeyBuilder.custom('ai', 'recommendations', userId, contentType || 'general');
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

    const recommendationText = await generateTextFromPrompt({
      system: "You are a content recommendation engine. Based on user preferences and activity, suggest relevant content with brief explanations. Return a JSON array of recommendations with 'title', 'reason', and 'score' fields.",
      prompt: context,
      maxOutputTokens: 500
    });

    let recommendations = [];
    try {
      const parsed = parseJsonFromText(recommendationText);
      if (Array.isArray(parsed)) {
        recommendations = parsed;
      } else {
        const lines = recommendationText.split('\n').filter(l => l.trim());
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
    await redis.setex(cacheKey, CacheTTL.VERY_LONG, JSON.stringify(recommendations));

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
    const cacheKey = CacheKeyBuilder.custom('ai', 'collaborative', userId);
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

    const collaborativeText = await generateTextFromPrompt({
      system: "You are a collaborative filtering recommendation system. Analyze similar users' behavior to suggest content. Return a JSON array with 'contentId', 'contentType', 'reason', and 'similarity' fields.",
      prompt: context,
      maxOutputTokens: 400
    });

    let recommendations = [];
    try {
      const parsed = parseJsonFromText(collaborativeText);
      if (Array.isArray(parsed)) {
        recommendations = parsed;
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
    await redis.setex(cacheKey, CacheTTL.LONG, JSON.stringify(recommendations));

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
    const interactionKey = CacheKeyBuilder.custom('ai', 'interactions', userId);
    const preferenceKey = CacheKeyBuilder.custom('ai', 'preferences', userId);

    // Get existing interactions
    const existingInteractions = await redis.get(interactionKey);
    let allInteractions = existingInteractions ? JSON.parse(existingInteractions) : [];

    // Add new interactions
    allInteractions = [...allInteractions, ...interactions].slice(-100); // Keep last 100

    // Store updated interactions
    await redis.setex(interactionKey, LONG_TERM_CACHE_TTL, JSON.stringify(allInteractions)); // 30 days

    // Use AI to extract preferences from interactions
    const context = `
Analyze these user interactions to extract preferences:
${JSON.stringify(allInteractions)}

Feedback: ${JSON.stringify(feedbackData || {})}
    `.trim();

    const preferenceText = await generateTextFromPrompt({
      system: "You are a user preference learning system. Analyze interactions and extract user preferences in categories like topics, formats, authors, and engagement patterns. Return a JSON object with preference categories and scores.",
      prompt: context,
      maxOutputTokens: 300
    });

    let preferences = {};
    try {
      const parsed = parseJsonFromText(preferenceText);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        preferences = parsed;
      }
    } catch (parseError) {
      console.error('Failed to parse preferences:', parseError);
      preferences = { status: 'learning', interactions: allInteractions.length };
    }

    // Store learned preferences
    await redis.setex(preferenceKey, LONG_TERM_CACHE_TTL, JSON.stringify(preferences));

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

    const preferenceKey = CacheKeyBuilder.custom('ai', 'preferences', userId);
    const interactionKey = CacheKeyBuilder.custom('ai', 'interactions', userId);

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
    const cacheKey = CacheKeyBuilder.custom('ai', 'trending', contentType || 'all', timeframe);
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

    const trendingText = await generateTextFromPrompt({
      system: "You are a trending content analyzer. Identify patterns in engagement metrics to determine what content is trending and why. Return a JSON array with 'contentId', 'trendScore', 'reason', and 'momentum' fields.",
      prompt: context,
      maxOutputTokens: 400
    });

    let trending = [];
    try {
      const parsed = parseJsonFromText(trendingText);
      if (Array.isArray(parsed)) {
        trending = parsed;
      } else {
        trending = [{ message: 'Analyzing trending patterns', timeframe }];
      }
    } catch (parseError) {
      trending = [{ message: 'Processing trending data' }];
    }

    // Cache for 15 minutes
    await redis.setex(cacheKey, TRENDING_CACHE_TTL, JSON.stringify(trending));

    res.json({ trending, cached: false, timeframe });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Trending analysis failed', details: error.message });
  }
});

// Friendly root endpoint (avoid default "Cannot GET /")
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'ai-service',
    message: 'AI service is running (powered by local Ollama LLM — fully private).',
    model: OLLAMA_MODEL,
    ollamaHost: `${OLLAMA_HOST}:${OLLAMA_PORT}`,
    health: '/health',
    endpoints: [
      'POST /chat', 'POST /summarize', 'POST /moderate', 'POST /suggest',
      'POST /search/summary', 'POST /search/semantic-expand',
      'POST /recommend/content', 'POST /recommend/collaborative',
      'POST /recommend/trending', 'POST /recommend/learn-preferences',
      'GET  /recommend/preferences/:userId',
      'POST /tag', 'POST /sentiment', 'POST /translate',
      'POST /meeting/summarize', 'POST /digest',
      'POST /writing/assist', 'POST /suggest/chat',
      'POST /embed', 'GET  /models'
    ]
  });
});

// List available Ollama models
app.get('/models', async (req, res) => {
  try {
    const models = await new Promise((resolve, reject) => {
      const request = http.request(
        { hostname: OLLAMA_HOST, port: OLLAMA_PORT, path: '/api/tags', method: 'GET', timeout: 10000 },
        (response) => {
          let data = '';
          response.on('data', (c) => { data += c; });
          response.on('end', () => {
            try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
          });
        }
      );
      request.on('timeout', () => { request.destroy(); reject(new Error('timeout')); });
      request.on('error', reject);
      request.end();
    });
    res.json({ activeModel: OLLAMA_MODEL, available: models.models || [] });
  } catch (error) {
    res.status(503).json({ error: 'Ollama not reachable', details: error.message });
  }
});

// ============================================================================
// Phase 18: AI & Intelligence
// ============================================================================

// 18.1 Auto-tagging: extract relevant tags from text
app.post('/tag', async (req, res) => {
  try {
    const { text, maxTags = 8 } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const cacheKey = buildHashedAiKey('tag', `${text}:${maxTags}`);
    const cached = await redis.get(cacheKey);
    if (cached) return res.json({ tags: JSON.parse(cached), cached: true });

    const raw = await generateTextFromPrompt({
      system: 'You are a content tagging assistant. Extract concise topic tags from text. Return JSON only: { "tags": ["tag1", "tag2", ...] }. Tags should be lowercase, single-word or short phrases, relevant to the content.',
      prompt: `Extract up to ${maxTags} tags from:\n${text.slice(0, 1000)}`,
      maxOutputTokens: 200
    });

    let tags = [];
    try {
      const parsed = parseJsonFromText(raw);
      tags = Array.isArray(parsed?.tags) ? parsed.tags.slice(0, maxTags) : [];
    } catch {
      tags = raw.split(/[\n,]+/).map(t => t.trim().toLowerCase().replace(/^[#\-\s]+/, '')).filter(Boolean).slice(0, maxTags);
    }

    await redis.setex(cacheKey, CacheTTL.MEDIUM, JSON.stringify(tags));
    res.json({ tags, cached: false });
  } catch (error) {
    console.error('[ai/tag]', error);
    res.status(500).json({ error: 'Auto-tagging failed' });
  }
});

// 18.1 Sentiment analysis on text content
app.post('/sentiment', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const cacheKey = buildHashedAiKey('sentiment', text);
    const cached = await redis.get(cacheKey);
    if (cached) return res.json({ ...JSON.parse(cached), cached: true });

    const raw = await generateTextFromPrompt({
      system: 'You are a sentiment analysis model. Analyze the sentiment of the given text. Return JSON only with keys: sentiment ("positive"|"neutral"|"negative"), score (number -1 to 1), confidence (number 0 to 1), emotions (string[]).',
      prompt: `Analyze sentiment:\n${text.slice(0, 800)}`,
      maxOutputTokens: 200
    });

    let result = { sentiment: 'neutral', score: 0, confidence: 0.5, emotions: [] };
    try {
      const parsed = parseJsonFromText(raw);
      if (parsed?.sentiment) result = { ...result, ...parsed };
    } catch { /* use defaults */ }

    await redis.setex(cacheKey, CacheTTL.MEDIUM, JSON.stringify(result));
    res.json({ ...result, cached: false });
  } catch (error) {
    console.error('[ai/sentiment]', error);
    res.status(500).json({ error: 'Sentiment analysis failed' });
  }
});

// 18.1 Meeting transcript summarization
app.post('/meeting/summarize', async (req, res) => {
  try {
    const { transcript, title = 'Meeting', participants = [] } = req.body;
    if (!transcript) return res.status(400).json({ error: 'transcript is required' });

    const cacheKey = buildHashedAiKey('meeting-summary', transcript);
    const cached = await redis.get(cacheKey);
    if (cached) return res.json({ ...JSON.parse(cached), cached: true });

    const raw = await generateTextFromPrompt({
      system: 'You are a meeting summarization assistant. Create structured meeting summaries. Return JSON only with keys: summary (string), keyPoints (string[]), actionItems ({ owner: string, task: string, deadline?: string }[]), decisions (string[]).',
      prompt: `Summarize this meeting "${title}" with participants: ${participants.join(', ') || 'unknown'}.\n\nTranscript:\n${transcript.slice(0, 4000)}`,
      maxOutputTokens: 800
    });

    let result = { summary: '', keyPoints: [], actionItems: [], decisions: [] };
    try {
      const parsed = parseJsonFromText(raw);
      if (parsed?.summary) result = { ...result, ...parsed };
      else result.summary = raw.trim();
    } catch { result.summary = raw.trim(); }

    await redis.setex(cacheKey, LONG_TERM_CACHE_TTL, JSON.stringify(result));
    res.json({ ...result, cached: false });
  } catch (error) {
    console.error('[ai/meeting/summarize]', error);
    res.status(500).json({ error: 'Meeting summarization failed' });
  }
});

// 18.2 Language translation
app.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage = 'English', sourceLanguage = 'auto' } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const cacheKey = buildHashedAiKey('translate', `${text}:${targetLanguage}`);
    const cached = await redis.get(cacheKey);
    if (cached) return res.json({ ...JSON.parse(cached), cached: true });

    const raw = await generateTextFromPrompt({
      system: `You are a professional translator. Translate text to ${targetLanguage}. Return JSON only with keys: translation (string), detectedLanguage (string), confidence (number 0-1).`,
      prompt: `Translate${sourceLanguage !== 'auto' ? ` from ${sourceLanguage}` : ''} to ${targetLanguage}:\n${text.slice(0, 2000)}`,
      maxOutputTokens: Math.min(text.length * 2 + 200, 2000)
    });

    let result = { translation: text, detectedLanguage: 'unknown', confidence: 0 };
    try {
      const parsed = parseJsonFromText(raw);
      if (parsed?.translation) result = { ...result, ...parsed };
      else result.translation = raw.trim();
    } catch { result.translation = raw.trim(); }

    await redis.setex(cacheKey, CacheTTL.LONG, JSON.stringify(result));
    res.json({ ...result, cached: false });
  } catch (error) {
    console.error('[ai/translate]', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// 18.2 Smart digest: surface important content for a user
app.post('/digest', async (req, res) => {
  try {
    const { userId, recentPosts = [], userInterests = [], limit = 10 } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const cacheKey = CacheKeyBuilder.custom('ai', 'digest', userId);
    const cached = await redis.get(cacheKey);
    if (cached) return res.json({ digest: JSON.parse(cached), cached: true });

    const postsPreview = recentPosts.slice(0, 20).map((p, i) =>
      `${i + 1}. [${p.type || 'post'}] ${p.title || p.content?.slice(0, 100) || ''} (likes:${p.likes || 0})`
    ).join('\n');

    const raw = await generateTextFromPrompt({
      system: 'You are a smart content digest assistant. Select the most important and relevant content items. Return JSON only: { "digest": [{ "index": number, "reason": string, "priority": "high"|"medium"|"low" }] }',
      prompt: `User interests: ${userInterests.join(', ') || 'general'}\nSelect top ${limit} most important items:\n${postsPreview}`,
      maxOutputTokens: 500
    });

    let digest = [];
    try {
      const parsed = parseJsonFromText(raw);
      digest = Array.isArray(parsed?.digest) ? parsed.digest.slice(0, limit) : [];
    } catch { digest = []; }

    // Map indexes back to posts
    const enriched = digest
      .map(d => ({ ...recentPosts[d.index - 1], reason: d.reason, priority: d.priority }))
      .filter(Boolean);

    await redis.setex(cacheKey, TRENDING_CACHE_TTL, JSON.stringify(enriched));
    res.json({ digest: enriched, cached: false });
  } catch (error) {
    console.error('[ai/digest]', error);
    res.status(500).json({ error: 'Digest generation failed' });
  }
});

// 18.2 AI writing assistant: improve/complete text
app.post('/writing/assist', async (req, res) => {
  try {
    const { text, action = 'improve', context = '' } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const ACTION_PROMPTS = {
      improve: 'Improve this text for clarity, tone, and engagement. Return JSON only: { "result": string, "changes": string[] }',
      expand: 'Expand this text with more detail and context. Return JSON only: { "result": string }',
      shorten: 'Shorten this text while preserving the key message. Return JSON only: { "result": string }',
      rephrase: 'Rephrase this text in a different way. Return JSON only: { "result": string }',
      fixgrammar: 'Fix grammar and spelling in this text. Return JSON only: { "result": string, "corrections": string[] }',
    };

    const systemPrompt = ACTION_PROMPTS[action] || ACTION_PROMPTS.improve;
    const raw = await generateTextFromPrompt({
      system: `You are an AI writing assistant. ${systemPrompt}`,
      prompt: `${context ? `Context: ${context}\n\n` : ''}Text:\n${text.slice(0, 2000)}`,
      maxOutputTokens: 600
    });

    let result = { result: text };
    try {
      const parsed = parseJsonFromText(raw);
      if (parsed?.result) result = { ...result, ...parsed };
      else result.result = raw.trim();
    } catch { result.result = raw.trim(); }

    res.json(result);
  } catch (error) {
    console.error('[ai/writing/assist]', error);
    res.status(500).json({ error: 'Writing assistance failed' });
  }
});

// 18.3 AI chat suggestions (opt-in, real-time)
app.post('/suggest/chat', async (req, res) => {
  try {
    const { conversationHistory = [], currentInput = '', limit = 3 } = req.body;

    const cacheKey = buildHashedAiKey('chat-suggest', `${currentInput}:${conversationHistory.length}`);
    const cached = await redis.get(cacheKey);
    if (cached) return res.json({ suggestions: JSON.parse(cached), cached: true });

    const historyText = conversationHistory.slice(-5)
      .map(m => `${m.role === 'user' ? 'User' : 'Other'}: ${m.content}`)
      .join('\n');

    const raw = await generateTextFromPrompt({
      system: `You are a chat suggestion assistant. Given the conversation context and what the user is typing, suggest ${limit} ways to complete or continue their message. Return JSON only: { "suggestions": string[] }`,
      prompt: `Conversation:\n${historyText}\n\nUser is typing: "${currentInput}"`,
      maxOutputTokens: 200
    });

    let suggestions = [];
    try {
      const parsed = parseJsonFromText(raw);
      suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions.slice(0, limit) : [];
    } catch { suggestions = []; }

    await redis.setex(cacheKey, 30, JSON.stringify(suggestions)); // short TTL for chat
    res.json({ suggestions, cached: false });
  } catch (error) {
    console.error('[ai/suggest/chat]', error);
    res.status(500).json({ error: 'Chat suggestion failed' });
  }
});

// 18.3 Vector embeddings (deterministic hash-based, no external vector DB required)
app.post('/embed', async (req, res) => {
  try {
    const { texts, dims = 128 } = req.body;
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: 'texts array is required' });
    }

    const cacheKey = buildHashedAiKey('embed', `${JSON.stringify(texts)}:${dims}`);
    const cached = await redis.get(cacheKey);
    if (cached) return res.json({ embeddings: JSON.parse(cached), cached: true });

    // Use the existing deterministicEmbedding utility from the server
    const embeddings = texts.map(text => deterministicEmbedding(String(text || ''), dims));

    await redis.setex(cacheKey, CacheTTL.LONG, JSON.stringify(embeddings));
    res.json({ embeddings, dims, cached: false });
  } catch (error) {
    console.error('[ai/embed]', error);
    res.status(500).json({ error: 'Embedding generation failed' });
  }
});

// Standard route fallback
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint '${req.originalUrl}' does not exist.`
    }
  });
});

app.listen(PORT, () => {
  console.log(`AI service running on port ${PORT}`);
});
