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
    try {
        data = JSON.parse(text);
    } catch (e) {
        data = text;
    }

    return { status: res.status, data };
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

    // Feed filters
    const forYou = await fetchJson(`${API_BASE_URL}/posts/feed/${userId}?filter=for_you`);
    assert(forYou.status === 200, `for_you status ${forYou.status}`);

    const recent = await fetchJson(`${API_BASE_URL}/posts/feed/${userId}?filter=recent`);
    assert(recent.status === 200, `recent status ${recent.status}`);

    const trending = await fetchJson(`${API_BASE_URL}/posts/feed/${userId}?filter=trending`);
    assert(trending.status === 200, `trending status ${trending.status}`);

    const following = await fetchJson(`${API_BASE_URL}/posts/feed/${userId}?filter=following`);
    assert(following.status === 200, `following status ${following.status}`);

    console.log('Feed filter integration tests passed');
};

run().catch((err) => {
    console.error('Tests failed:', err);
    process.exit(1);
});
