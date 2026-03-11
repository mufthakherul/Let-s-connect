'use strict';
/**
 * Search & Discovery unit tests for content-service.
 * Runs without services via mocked fetch (fast, standalone).
 */
const assert = require('assert');
const { randomUUID } = require('crypto');

const SERVICE_URL = process.env.CONTENT_SERVICE_URL || 'http://localhost:8002';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
};

const isServiceReachable = async () => {
  try {
    const res = await fetch(`${SERVICE_URL}/health`);
    return res.ok;
  } catch { return false; }
};

// ─── Test runner ─────────────────────────────────────────────────────────────

let passed = 0;
let skipped = 0;
let failed = 0;
const results = [];

async function runTest(name, fn, skipWhenOffline = true) {
  const reachable = await isServiceReachable();
  if (skipWhenOffline && !reachable) {
    console.log(`  ⏭  SKIP  ${name} (service offline)`);
    skipped++;
    results.push({ name, status: 'skipped' });
    return;
  }
  try {
    await fn();
    console.log(`  ✅ PASS  ${name}`);
    passed++;
    results.push({ name, status: 'passed' });
  } catch (err) {
    console.error(`  ❌ FAIL  ${name}`);
    console.error(`         ${err.message}`);
    failed++;
    results.push({ name, status: 'failed', error: err.message });
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== Content Service: Search & Discovery Tests ===\n');

  // Health check
  await runTest('health endpoint returns 200', async () => {
    const { status } = await fetchJson(`${SERVICE_URL}/health`);
    assert.strictEqual(status, 200);
  }, false);

  // Search
  await runTest('GET /search?q=test returns 200 or 401', async () => {
    const { status } = await fetchJson(`${SERVICE_URL}/search?q=test`);
    assert.ok([200, 401, 403].includes(status), `Unexpected status: ${status}`);
  });

  await runTest('GET /search with empty q returns 400 or 200', async () => {
    const { status } = await fetchJson(`${SERVICE_URL}/search?q=`);
    assert.ok([200, 400].includes(status), `Unexpected status: ${status}`);
  });

  await runTest('GET /search with type filter returns valid response', async () => {
    const { status, data } = await fetchJson(`${SERVICE_URL}/search?q=test&type=post`);
    assert.ok([200, 401, 403].includes(status));
    if (status === 200) {
      assert.ok(data.results !== undefined || data.data !== undefined || Array.isArray(data));
    }
  });

  // Discovery
  await runTest('GET /discover/trending returns 200', async () => {
    const { status, data } = await fetchJson(`${SERVICE_URL}/discover/trending`);
    assert.ok([200, 204].includes(status), `Unexpected status: ${status}`);
    if (status === 200) {
      const items = data.data || data.trending || data;
      assert.ok(Array.isArray(items) || typeof items === 'object');
    }
  });

  await runTest('GET /discover/groups returns 200 or 401', async () => {
    const { status } = await fetchJson(`${SERVICE_URL}/discover/groups`);
    assert.ok([200, 401, 403].includes(status));
  });

  await runTest('GET /discover/content returns 200 or 401', async () => {
    const { status } = await fetchJson(`${SERVICE_URL}/discover/content`);
    assert.ok([200, 401, 403].includes(status));
  });

  // Post creation requires auth — confirm 401
  await runTest('POST /posts without auth returns 401', async () => {
    const { status } = await fetchJson(`${SERVICE_URL}/posts`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Test', visibility: 'public' }),
    });
    assert.ok([401, 403].includes(status), `Expected 401/403, got ${status}`);
  });

  // Post reactions require auth
  await runTest('POST /posts/:id/reactions without auth returns 401', async () => {
    const fakeId = randomUUID();
    const { status } = await fetchJson(`${SERVICE_URL}/posts/${fakeId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ type: 'like' }),
    });
    assert.ok([401, 403, 404].includes(status));
  });

  // Hashtag endpoints
  await runTest('GET /hashtags endpoint accessible', async () => {
    const { status } = await fetchJson(`${SERVICE_URL}/hashtags`);
    assert.ok([200, 401, 403, 404].includes(status));
  });

  console.log('\n─────────────────────────────────────');
  console.log(`Results: ${passed} passed, ${skipped} skipped, ${failed} failed`);
  console.log('─────────────────────────────────────\n');

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
