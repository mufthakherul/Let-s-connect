'use strict';
/**
 * Messaging service unit/integration tests.
 * Gracefully skips when the service is offline.
 */
const assert = require('assert');
const { randomUUID } = require('crypto');

const SERVICE_URL = process.env.MESSAGING_SERVICE_URL || 'http://localhost:8003';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      ...(options.headers || {}),
    },
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

let passed = 0, skipped = 0, failed = 0;

async function runTest(name, fn, skipWhenOffline = true) {
  const reachable = await isServiceReachable();
  if (skipWhenOffline && !reachable) {
    console.log(`  ⏭  SKIP  ${name}`);
    skipped++;
    return;
  }
  try {
    await fn();
    console.log(`  ✅ PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL  ${name}: ${err.message}`);
    failed++;
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== Messaging Service Tests ===\n');

  await runTest('health endpoint returns 200', async () => {
    const { status } = await fetchJson(`${SERVICE_URL}/health`);
    assert.strictEqual(status, 200);
  }, false);

  await runTest('GET /conversations without auth returns 401', async () => {
    const { status } = await fetchJson(`${SERVICE_URL}/conversations`, {
      headers: { Authorization: '' },
    });
    assert.ok([401, 403].includes(status), `Expected 401/403, got ${status}`);
  });

  await runTest('POST /conversations without auth returns 401', async () => {
    const { status } = await fetchJson(`${SERVICE_URL}/conversations`, {
      method: 'POST',
      headers: { Authorization: '' },
      body: JSON.stringify({ participantId: randomUUID() }),
    });
    assert.ok([401, 403].includes(status));
  });

  await runTest('GET /servers/discover is accessible', async () => {
    const { status } = await fetchJson(`${SERVICE_URL}/servers/discover`);
    assert.ok([200, 204, 401].includes(status));
  });

  await runTest('GET /servers/popular is accessible', async () => {
    const { status } = await fetchJson(`${SERVICE_URL}/servers/popular`);
    assert.ok([200, 204, 401].includes(status));
  });

  await runTest('POST /servers without auth returns 401', async () => {
    const { status } = await fetchJson(`${SERVICE_URL}/servers`, {
      method: 'POST',
      headers: { Authorization: '' },
      body: JSON.stringify({ name: 'Test Server' }),
    });
    assert.ok([401, 403].includes(status));
  });

  await runTest('GET /conversations/:id/messages without auth returns 401', async () => {
    const fakeId = randomUUID();
    const { status } = await fetchJson(`${SERVICE_URL}/conversations/${fakeId}/messages`, {
      headers: { Authorization: '' },
    });
    assert.ok([401, 403, 404].includes(status));
  });

  console.log(`\nResults: ${passed} passed, ${skipped} skipped, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
