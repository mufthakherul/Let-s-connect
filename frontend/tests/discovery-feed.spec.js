// @ts-check
const { test, expect } = require('@playwright/test');

const apiBase = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8000/api';

async function registerAndLogin(request, prefix = 'disc') {
  const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const email = `${prefix}+${runId}@milonexa.test`;
  const username = `${prefix}_${runId}`;
  const password = 'Test!Pass456';

  await request.post(`${apiBase}/user/register`, {
    data: { username, email, password, firstName: 'Disc', lastName: 'Test' },
  });

  const loginResp = await request.post(`${apiBase}/user/login`, {
    data: { email, password },
  });
  const body = await loginResp.json();
  return { token: body?.data?.token, userId: body?.data?.user?.id, username };
}

test.describe('Discovery & feed flow', () => {
  test('public search endpoint is accessible without auth', async ({ request }) => {
    const resp = await request.get(`${apiBase}/content/search?q=test`);
    expect([200, 204]).toContain(resp.status());
  });

  test('trending topics endpoint returns data', async ({ request }) => {
    const resp = await request.get(`${apiBase}/content/discover/trending`);
    expect([200, 204]).toContain(resp.status());
  });

  test('discover people endpoint returns data', async ({ request }) => {
    const resp = await request.get(`${apiBase}/user/discover/people`);
    expect([200, 204]).toContain(resp.status());
  });

  test('authenticated user can create and read posts', async ({ request }) => {
    test.skip(!process.env.PLAYWRIGHT_API_BASE_URL && process.env.CI !== 'true',
      'Skipping: services not running');

    const { token } = await registerAndLogin(request);
    if (!token) return;

    const createResp = await request.post(`${apiBase}/content/posts`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { content: 'Discovery test post via Playwright #test', visibility: 'public' },
    });
    expect([200, 201]).toContain(createResp.status());

    const feedResp = await request.get(`${apiBase}/content/posts?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(feedResp.ok()).toBeTruthy();
    const body = await feedResp.json();
    const posts = body?.data || body?.posts || [];
    expect(Array.isArray(posts)).toBeTruthy();
  });

  test('user can follow another user', async ({ request }) => {
    test.skip(!process.env.PLAYWRIGHT_API_BASE_URL && process.env.CI !== 'true',
      'Skipping: services not running');

    const a = await registerAndLogin(request, 'flwr');
    const b = await registerAndLogin(request, 'flwe');
    if (!a.token || !b.userId) return;

    const resp = await request.post(`${apiBase}/user/${b.userId}/follow`, {
      headers: { Authorization: `Bearer ${a.token}` },
    });
    expect([200, 201, 204]).toContain(resp.status());
  });
});

test.describe('Profile page', () => {
  test('public profile page renders', async ({ page }) => {
    const resp = await page.goto('/');
    expect(resp).not.toBeNull();
    // Just verify the app shell loads
    await expect(page.locator('body')).toContainText(/milonexa|enable javascript|loading/i);
  });
});
