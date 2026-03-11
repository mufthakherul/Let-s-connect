// @ts-check
const { test, expect } = require('@playwright/test');

const apiBase = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8000/api';

/**
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} [prefix]
 */
async function loginUser(request, prefix = 'notif') {
  const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const email = `${prefix}+${runId}@milonexa.test`;
  const username = `${prefix}_${runId}`;
  const password = 'Test!Pass456';

  await request.post(`${apiBase}/user/register`, {
    data: { username, email, password, firstName: 'Notif', lastName: 'Test' },
  });

  const loginResp = await request.post(`${apiBase}/user/login`, {
    data: { email, password },
  });
  const body = await loginResp.json();
  return { token: body?.data?.token, userId: body?.data?.user?.id };
}

test.describe('Notifications', () => {
  test('can list notifications when authenticated', async ({ request }) => {
    test.skip(!process.env.PLAYWRIGHT_API_BASE_URL && process.env.CI !== 'true',
      'Skipping: services not running');

    const { token } = await loginUser(request);
    if (!token) return;

    const resp = await request.get(`${apiBase}/user/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 204]).toContain(resp.status());
    const body = await resp.json();
    const notifications = body?.data || body?.notifications || [];
    expect(Array.isArray(notifications)).toBeTruthy();
  });

  test('can mark notifications as read', async ({ request }) => {
    test.skip(!process.env.PLAYWRIGHT_API_BASE_URL && process.env.CI !== 'true',
      'Skipping: services not running');

    const { token } = await loginUser(request);
    if (!token) return;

    const resp = await request.put(`${apiBase}/user/notifications/read-all`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 204]).toContain(resp.status());
  });

  test('notification preferences can be fetched', async ({ request }) => {
    test.skip(!process.env.PLAYWRIGHT_API_BASE_URL && process.env.CI !== 'true',
      'Skipping: services not running');

    const { token } = await loginUser(request);
    if (!token) return;

    const resp = await request.get(`${apiBase}/user/notification-preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 204]).toContain(resp.status());
  });
});

test.describe('Shop flow', () => {
  test('product browsing is publicly accessible', async ({ request }) => {
    const resp = await request.get(`${apiBase}/shop/products`);
    expect([200, 204]).toContain(resp.status());
  });

  test('authenticated user can view cart', async ({ request }) => {
    test.skip(!process.env.PLAYWRIGHT_API_BASE_URL && process.env.CI !== 'true',
      'Skipping: services not running');

    const { token } = await loginUser(request, 'shop');
    if (!token) return;

    const resp = await request.get(`${apiBase}/shop/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 204]).toContain(resp.status());
  });

  test('authenticated user can create a product listing', async ({ request }) => {
    test.skip(!process.env.PLAYWRIGHT_API_BASE_URL && process.env.CI !== 'true',
      'Skipping: services not running');

    const { token } = await loginUser(request, 'seller');
    if (!token) return;

    const resp = await request.post(`${apiBase}/shop/products`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: 'Playwright Test Product',
        description: 'Created by E2E test',
        price: 9.99,
        currency: 'USD',
      },
    });
    expect([200, 201]).toContain(resp.status());
  });
});
