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
    try {
        data = JSON.parse(text);
    } catch (e) {
        data = text;
    }

    return { status: res.status, data };
};

const run = async () => {
    const followerId = randomUUID();
    const followedId = randomUUID();

    // Follow
    const followRes = await fetchJson(`${BASE_URL}/follows`, {
        method: 'POST',
        headers: { 'x-user-id': followerId },
        body: JSON.stringify({ followedId })
    });
    assert([200, 201].includes(followRes.status), `Follow status ${followRes.status}`);

    // Following list
    const listRes = await fetchJson(`${BASE_URL}/follows/${followerId}`);
    assert(listRes.status === 200, `Follow list status ${listRes.status}`);
    assert(Array.isArray(listRes.data.following), 'Following list should be array');

    // Feed filters
    const forYou = await fetchJson(`${BASE_URL}/feed/${followerId}?filter=for_you`);
    assert(forYou.status === 200, `for_you status ${forYou.status}`);

    const recent = await fetchJson(`${BASE_URL}/feed/${followerId}?filter=recent`);
    assert(recent.status === 200, `recent status ${recent.status}`);

    const trending = await fetchJson(`${BASE_URL}/feed/${followerId}?filter=trending`);
    assert(trending.status === 200, `trending status ${trending.status}`);

    const following = await fetchJson(`${BASE_URL}/feed/${followerId}?filter=following`);
    assert(following.status === 200, `following status ${following.status}`);

    // Unfollow
    const unfollowRes = await fetchJson(`${BASE_URL}/follows/${followedId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': followerId }
    });
    assert(unfollowRes.status === 200, `Unfollow status ${unfollowRes.status}`);

    console.log('Feed filter + follow tests passed');
};

run().catch((err) => {
    console.error('Tests failed:', err);
    process.exit(1);
});
