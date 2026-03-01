const { test, expect } = require('@playwright/test');

test('homepage shell renders', async ({ page }) => {
  const response = await page.goto('/');
  expect(response).not.toBeNull();
  expect(response.ok()).toBeTruthy();

  await expect(page).toHaveTitle(/Let's Connect/i);
  await expect(page.locator('body')).toContainText(/let's connect|enable javascript|loading/i);
});
