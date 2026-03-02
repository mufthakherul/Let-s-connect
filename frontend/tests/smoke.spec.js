const { test, expect } = require('@playwright/test');

test('homepage shell renders', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    expect(response.ok()).toBeTruthy();

    await expect(page).toHaveTitle(/Milonexa/i);
    await expect(page.locator('body')).toContainText(/milonexa|enable javascript|loading/i);
});
