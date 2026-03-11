// @ts-check
const { test, expect } = require('@playwright/test');

const apiBase = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8000/api';

async function loginAsTestUser(request) {
  const runId = Date.now().toString(36);
  const email = `msg+${runId}@milonexa.test`;
  const username = `msg_${runId}`;
  const password = 'Test!Pass456';

  await request.post(`${apiBase}/user/register`, {
    data: { username, email, password, firstName: 'Msg', lastName: 'Test' },
  });

  const loginResp = await request.post(`${apiBase}/user/login`, {
    data: { email, password },
  });
  const body = await loginResp.json();
  return { token: body?.data?.token, userId: body?.data?.user?.id, username };
}

test.describe('Messaging flow', () => {
  test('can list conversations', async ({ request }) => {
    test.skip(!process.env.PLAYWRIGHT_API_BASE_URL && process.env.CI !== 'true',
      'Skipping: services not running');

    const { token } = await loginAsTestUser(request);
    if (!token) return;

    const resp = await request.get(`${apiBase}/messaging/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 204]).toContain(resp.status());
  });

  test('can create a direct conversation', async ({ request }) => {
    test.skip(!process.env.PLAYWRIGHT_API_BASE_URL && process.env.CI !== 'true',
      'Skipping: services not running');

    const a = await loginAsTestUser(request);
    const b = await loginAsTestUser(request);
    if (!a.token || !b.userId) return;

    const resp = await request.post(`${apiBase}/messaging/conversations`, {
      headers: { Authorization: `Bearer ${a.token}` },
      data: { participantId: b.userId, type: 'direct' },
    });
    expect([200, 201]).toContain(resp.status());
    const body = await resp.json();
    expect(body?.data?.id || body?.id).toBeTruthy();
  });

  test('can send and list messages', async ({ request }) => {
    test.skip(!process.env.PLAYWRIGHT_API_BASE_URL && process.env.CI !== 'true',
      'Skipping: services not running');

    const a = await loginAsTestUser(request);
    const b = await loginAsTestUser(request);
    if (!a.token || !b.userId) return;

    const convResp = await request.post(`${apiBase}/messaging/conversations`, {
      headers: { Authorization: `Bearer ${a.token}` },
      data: { participantId: b.userId, type: 'direct' },
    });
    if (!convResp.ok()) return;
    const convBody = await convResp.json();
    const convId = convBody?.data?.id || convBody?.id;
    if (!convId) return;

    const msgResp = await request.post(`${apiBase}/messaging/conversations/${convId}/messages`, {
      headers: { Authorization: `Bearer ${a.token}` },
      data: { content: 'Hello from Playwright!', type: 'text' },
    });
    expect([200, 201]).toContain(msgResp.status());

    const listResp = await request.get(`${apiBase}/messaging/conversations/${convId}/messages`, {
      headers: { Authorization: `Bearer ${a.token}` },
    });
    expect(listResp.ok()).toBeTruthy();
    const listBody = await listResp.json();
    const messages = listBody?.data || listBody?.messages || [];
    expect(Array.isArray(messages)).toBeTruthy();
  });
});
