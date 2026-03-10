const { randomUUID } = require('crypto');

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_err) {
    data = text;
  }

  return { status: res.status, ok: res.ok, data };
}

async function isServiceReachable(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/health`);
    return res.ok || res.status < 500;
  } catch (_err) {
    return false;
  }
}

function skipIfUnreachable(serviceName, baseUrl, reachable) {
  if (!reachable) {
    console.log(`⏭️  Skipping ${serviceName} critical-path test: service unreachable at ${baseUrl}`);
    process.exit(0);
  }
}

function assertNoServerError(step, result) {
  if (result.status >= 500) {
    throw new Error(`${step} failed with server error ${result.status}: ${JSON.stringify(result.data)}`);
  }
}

function newUserId() {
  return randomUUID();
}

function newEmail(prefix = 'testuser') {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;
}

function newUsername(prefix = 'user') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

module.exports = {
  fetchJson,
  isServiceReachable,
  skipIfUnreachable,
  assertNoServerError,
  newUserId,
  newEmail,
  newUsername
};
