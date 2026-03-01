const { test, expect } = require('@playwright/test');

const apiBase = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8000/api';

async function registerAndLogin(request) {
    const runId = Date.now().toString(36);
    const email = `pw+${runId}@letsconnect.test`;
    const username = `pw_${runId}`;
    const password = 'Sm0ke!Pass123';

    const registerResp = await request.post(`${apiBase}/user/register`, {
        data: {
            username,
            email,
            password,
            firstName: 'Playwright',
            lastName: 'Smoke'
        }
    });

    expect([200, 201]).toContain(registerResp.status());

    const loginResp = await request.post(`${apiBase}/user/login`, {
        data: { email, password }
    });

    expect(loginResp.ok()).toBeTruthy();
    const loginJson = await loginResp.json();

    const token = loginJson?.data?.token;
    const user = loginJson?.data?.user;

    expect(token).toBeTruthy();
    expect(user?.id).toBeTruthy();

    return { token, user };
}

test('login flow baseline (API + app session)', async ({ request, page }) => {
    const { token, user } = await registerAndLogin(request);

    await page.addInitScript(({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    }, { token, user });

    await page.goto('/feed');
    await expect(page).toHaveURL(/\/feed/);
});

test('create content flow baseline (authenticated post + feed read)', async ({ request }) => {
    const { token, user } = await registerAndLogin(request);

    const createResp = await request.post(`${apiBase}/content/posts`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
            content: `Playwright smoke post ${Date.now()}`,
            type: 'text',
            visibility: 'public'
        }
    });

    expect([200, 201]).toContain(createResp.status());

    const feedResp = await request.get(`${apiBase}/content/posts/feed/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    expect(feedResp.status()).toBe(200);
    const feedJson = await feedResp.json();
    const feedItems = Array.isArray(feedJson?.data) ? feedJson.data : [];

    expect(Array.isArray(feedItems)).toBeTruthy();
});
