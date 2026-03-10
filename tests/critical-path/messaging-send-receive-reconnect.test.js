const {
  fetchJson,
  isServiceReachable,
  skipIfUnreachable,
  assertNoServerError,
  newUserId
} = require('./_helpers');

const MESSAGING_SERVICE_URL = process.env.MESSAGING_SERVICE_URL || 'http://localhost:8003';

async function run() {
  const reachable = await isServiceReachable(MESSAGING_SERVICE_URL);
  skipIfUnreachable('messaging-service', MESSAGING_SERVICE_URL, reachable);

  const userA = newUserId();
  const userB = newUserId();

  const conversationRes = await fetchJson(`${MESSAGING_SERVICE_URL}/conversations`, {
    method: 'POST',
    body: JSON.stringify({
      name: `Critical path chat ${Date.now()}`,
      type: 'direct',
      participants: [userA, userB]
    })
  });
  assertNoServerError('create conversation', conversationRes);

  const conversationId = conversationRes?.data?.id;

  const listRes = await fetchJson(`${MESSAGING_SERVICE_URL}/conversations/${userA}`);
  assertNoServerError('list conversations', listRes);

  let messageFetchStatus = 'skipped';
  let reconnectStatus = 'skipped';

  if (conversationId) {
    const messagesRes = await fetchJson(`${MESSAGING_SERVICE_URL}/conversations/${conversationId}/messages`);
    assertNoServerError('get messages', messagesRes);
    messageFetchStatus = messagesRes.status;

    const reconnectProbeRes = await fetchJson(`${MESSAGING_SERVICE_URL}/conversations/${conversationId}/messages?page=1&limit=10`);
    assertNoServerError('reconnect probe', reconnectProbeRes);
    reconnectStatus = reconnectProbeRes.status;
  }

  console.log('✅ Messaging critical path baseline passed', {
    createConversationStatus: conversationRes.status,
    listStatus: listRes.status,
    messageFetchStatus,
    reconnectStatus
  });
}

run().catch((err) => {
  console.error('❌ Messaging critical path baseline failed:', err);
  process.exit(1);
});
