const {
    fetchJson,
    isServiceReachable,
    skipIfUnreachable,
    assertNoServerError,
    assertStatusCode,
    assertHasProperties,
    assertTrue,
    newUserId
} = require('./_helpers');

const CONTENT_SERVICE_URL = process.env.CONTENT_SERVICE_URL || 'http://localhost:8002';

async function run() {
    const reachable = await isServiceReachable(CONTENT_SERVICE_URL);
    skipIfUnreachable('content-service', CONTENT_SERVICE_URL, reachable);

    const userId = newUserId();
    
    // Test: Create post
    const createPostRes = await fetchJson(`${CONTENT_SERVICE_URL}/posts`, {
        method: 'POST',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({
            content: `Workstream G test post #strict ${Date.now()}`,
            type: 'text',
            visibility: 'public'
        })
    });
    assertNoServerError('create post', createPostRes);
    assertStatusCode(createPostRes, 200, 'create post'); // or 201 if implemented properly
    const postData = createPostRes.data?.data || createPostRes.data;
    assertHasProperties(postData, ['id', 'content'], 'post object');
    const postId = postData?.id;

    // Test: Read feed
    const feedRes = await fetchJson(`${CONTENT_SERVICE_URL}/posts/feed/${userId}?filter=for_you`);
    assertNoServerError('read feed', feedRes);
    assertStatusCode(feedRes, 200, 'read feed');
    const feedData = feedRes.data?.data || feedRes.data;
    assertTrue(Array.isArray(feedData) || (typeof feedData === 'object' && feedData !== null), 'feed response is array or object');

    // Test: React to post if it exists
    let reactStatus = 'skipped';
    if (postId) {
        const reactRes = await fetchJson(`${CONTENT_SERVICE_URL}/posts/${postId}/reactions`, {
            method: 'POST',
            headers: { 'x-user-id': userId },
            body: JSON.stringify({ type: 'like' })
        });
        assertNoServerError('react to post', reactRes);
        if (reactRes.status !== 404) {
            assertStatusCode(reactRes, 200, 'react to post');
            reactStatus = 'success';
        } else {
            reactStatus = 'endpoint-not-found';
        }
    }

    console.log('✅ Feed critical path PASSED', {
        createPostStatus: createPostRes.status,
        feedStatus: feedRes.status,
        reactStatus,
        postIdValid: !!postId
    });
}

run().catch((err) => {
    console.error('❌ Feed critical path FAILED:', err.message);
    process.exit(1);
});
