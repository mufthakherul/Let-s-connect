const assert = require('assert');
const { randomUUID } = require('crypto');

const BASE_URL = process.env.CONTENT_SERVICE_URL || 'http://localhost:8002';

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

const run = async () => {
  const userId = randomUUID();

  // Create anonymous post
  const createRes = await fetchJson(`${BASE_URL}/posts`, {
    method: 'POST',
    headers: { 'x-user-id': userId },
    body: JSON.stringify({ content: 'Anonymous test post', anonymous: true })
  });
  assert(createRes.status === 201, `create status ${createRes.status} - ${JSON.stringify(createRes.data)}`);
  const post = createRes.data;
  assert(post.isAnonymous === true, 'post should be anonymous');
  assert(post.anonHandle, 'anonHandle should be present');
  assert(!post.userId || post.userId === null, 'userId should not be exposed in response');

  // Analytics for user should NOT count anonymous post
  const analytics = await fetchJson(`${BASE_URL}/analytics/user/${userId}`);
  assert(analytics.status === 200, 'analytics request failed');
  assert(analytics.data.totalPosts === 0, 'Anonymous post should not count in user analytics');

  // Public feed should contain the post
  const feed = await fetchJson(`${BASE_URL}/feed/${userId}`);
  assert(feed.status === 200, 'feed fetch failed');
  const found = (feed.data || []).some(p => p.id === post.id);
  assert(found, 'anonymous post should appear in feed results');

  // Author requests deletion via challenge metadata
  const deletion = await fetchJson(`${BASE_URL}/posts/${post.id}/deletion-request`, {
    method: 'POST',
    headers: { 'x-user-id': userId },
    body: JSON.stringify({ requesterType: 'author', metadata: { approxCreatedAt: post.createdAt } })
  });
  assert(deletion.status === 200, 'deletion request failed');

  // Post should no longer be visible in public listings
  const after = await fetchJson(`${BASE_URL}/feed/${userId}`);
  const foundAfter = (after.data || []).some(p => p.id === post.id);
  assert(!foundAfter, 'post should not be visible after author deletion request');

  console.log('Anonymous posting tests passed');
};

run().catch(err => {
  console.error('Tests failed:', err);
  process.exit(1);
});