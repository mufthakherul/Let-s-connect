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

const MESSAGING_SERVICE_URL = process.env.MESSAGING_SERVICE_URL || 'http://localhost:8003';

async function run() {
    const reachable = await isServiceReachable(MESSAGING_SERVICE_URL);
    skipIfUnreachable('messaging-service', MESSAGING_SERVICE_URL, reachable);

    const userA = newUserId();
    const userB = newUserId();

    // Test: Create conversation
    const conversationRes = await fetchJson(`${MESSAGING_SERVICE_URL}/conversations`, {
        method: 'POST',
        body: JSON.stringify({
            name: `Critical path chat ${Date.now()}`,
            type: 'direct',
            participants: [userA, userB]
        })
    });
    assertNoServerError('create conversation', conversationRes);
    assertStatusCode(conversationRes, 200, 'create conversation');
    assertHasProperties(conversationRes.data, ['id'], 'conversation object');
    const conversationId = conversationRes?.data?.id;

    // Test: List conversations
    const listRes = await fetchJson(`${MESSAGING_SERVICE_URL}/conversations/${userA}`);
    assertNoServerError('list conversations', listRes);
    assertStatusCode(listRes, 200, 'list conversations');
    assertTrue(Array.isArray(listRes.data) || (typeof listRes.data === 'object'), 'conversation list is array or object');

    // Test: Fetch and reconnect messages
    let messageFetchStatus = 'skipped';
    let reconnectStatus = 'skipped';

    if (conversationId) {
        const messagesRes = await fetchJson(`${MESSAGING_SERVICE_URL}/conversations/${conversationId}/messages`);
        assertNoServerError('get messages', messagesRes);
        assertStatusCode(messagesRes, 200, 'get messages');
        messageFetchStatus = 'success';

        const reconnectProbeRes = await fetchJson(`${MESSAGING_SERVICE_URL}/conversations/${conversationId}/messages?page=1&limit=10`);
        assertNoServerError('reconnect probe', reconnectProbeRes);
        assertStatusCode(reconnectProbeRes, 200, 'reconnect probe');
        reconnectStatus = 'success';
    }

    console.log('✅ Messaging critical path PASSED', {
        createConversationStatus: conversationRes.status,
        listStatus: listRes.status,
        messageFetchStatus,
        reconnectStatus,
        conversationIdValid: !!conversationId
    });
}

run().catch((err) => {
    console.error('❌ Messaging critical path FAILED:', err.message);
    process.exit(1);
});
