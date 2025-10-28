import { expect, test } from '@playwright/test';

const loginEmail = process.env.PLAYWRIGHT_LOGIN_EMAIL ?? 'admin@contractorpro.sa';
const loginPassword = process.env.PLAYWRIGHT_LOGIN_PASSWORD ?? 'admin123';

/**
 * UI smoke test that covers the public login shell served from the legacy HTML portal.
 * It verifies the credential autofill helpers and redirect logic before the React SPA loads.
 */
test('public login page accepts demo credentials and redirects to dashboard shell', async ({ page }) => {
  await page.goto('/login.html');

  await page.locator('#email').fill(loginEmail);
  await page.locator('#password').fill(loginPassword);
  await page.locator('#loginBtn').click();

  await expect(page.locator('#loginBtn')).toHaveText(/جاري التحقق|تم بنجاح/);

  await page.waitForURL('**/pages/main_dashboard.html', { timeout: 10_000 });
  await expect(page).toHaveURL(/main_dashboard\.html/);
});
