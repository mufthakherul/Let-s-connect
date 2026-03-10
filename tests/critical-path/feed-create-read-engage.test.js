const {
  fetchJson,
  isServiceReachable,
  skipIfUnreachable,
  assertNoServerError,
  newUserId
} = require('./_helpers');

const CONTENT_SERVICE_URL = process.env.CONTENT_SERVICE_URL || 'http://localhost:8002';

async function run() {
  const reachable = await isServiceReachable(CONTENT_SERVICE_URL);
  skipIfUnreachable('content-service', CONTENT_SERVICE_URL, reachable);

  const userId = newUserId();
  const createPostRes = await fetchJson(`${CONTENT_SERVICE_URL}/posts`, {
    method: 'POST',
    headers: { 'x-user-id': userId },
    body: JSON.stringify({
      content: `Workstream G test post #baseline ${Date.now()}`,
      type: 'text',
      visibility: 'public'
    })
  });
  assertNoServerError('create post', createPostRes);

  const feedRes = await fetchJson(`${CONTENT_SERVICE_URL}/posts/feed/${userId}?filter=for_you`);
  assertNoServerError('read feed', feedRes);

  const postId = createPostRes?.data?.data?.id || createPostRes?.data?.id;
  let reactStatus = 'skipped';

  if (postId) {
    const reactRes = await fetchJson(`${CONTENT_SERVICE_URL}/posts/${postId}/reactions`, {
      method: 'POST',
      headers: { 'x-user-id': userId },
      body: JSON.stringify({ type: 'like' })
    });
    assertNoServerError('react to post', reactRes);
    reactStatus = reactRes.status;
  }

  console.log('✅ Feed critical path baseline passed', {
    createPostStatus: createPostRes.status,
    feedStatus: feedRes.status,
    reactStatus
  });
}

run().catch((err) => {
  console.error('❌ Feed critical path baseline failed:', err);
  process.exit(1);
});
