const assert = require('assert');
const { randomUUID } = require('crypto');

const SERVICE_URL = process.env.CONTENT_SERVICE_URL || 'http://localhost:8002';
const API_BASE_URL = process.env.CONTENT_SERVICE_API_BASE_URL || `${SERVICE_URL}/api/v1/content`;

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { data = text; }
  return { status: res.status, data };
};

const unwrapData = (payload) => {
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data;
  }
  return payload;
};

const isServiceReachable = async () => {
  try {
    const res = await fetch(`${SERVICE_URL}/health`);
    return res.ok;
  } catch (_error) {
    return false;
  }
};

const run = async () => {
  const reachable = await isServiceReachable();
  if (!reachable) {
    console.log(`Skipping integration test: content-service not reachable at ${SERVICE_URL}`);
    return;
  }

  const userId = randomUUID();

  // Create anonymous post
  const createRes = await fetchJson(`${API_BASE_URL}/posts`, {
    method: 'POST',
    headers: { 'x-user-id': userId },
    body: JSON.stringify({ content: 'Anonymous test post', anonymous: true })
  });
  assert(createRes.status === 201, `create status ${createRes.status} - ${JSON.stringify(createRes.data)}`);
  const post = unwrapData(createRes.data);
  assert(post.isAnonymous === true, 'post should be anonymous');
  assert(post.anonHandle, 'anonHandle should be present');
  assert(!post.userId || post.userId === null, 'userId should not be exposed in response');

  // Public feed should contain the post
  const feed = await fetchJson(`${API_BASE_URL}/posts/feed/${userId}`);
  assert(feed.status === 200, 'feed fetch failed');
  const feedItems = unwrapData(feed.data) || [];
  const found = feedItems.some(p => p.id === post.id);
  assert(found, 'anonymous post should appear in feed results');

  console.log('Anonymous posting integration tests passed');
};

run().catch(err => {
  console.error('Tests failed:', err);
  process.exit(1);
});