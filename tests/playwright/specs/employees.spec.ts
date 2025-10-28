import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../utils/auth';

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

test('employee directory renders but filters remain ineffective because of contract mismatch', async ({ page }) => {
  await page.goto('/employees');

  await expect(page.getByRole('heading', { level: 3, name: 'الموظفون' })).toBeVisible();

  const [initialResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/employees') && response.request().method() === 'GET'),
    page.waitForLoadState('networkidle')
  ]);
  expect(initialResponse.ok()).toBeTruthy();

  await page.getByLabel('بحث').fill('Ahmed');

  const filterResponse = await page.waitForResponse((response) =>
    response.url().includes('/api/employees') &&
    response.request().method() === 'GET' &&
    response.url().includes('search=')
  );

  const url = new URL(filterResponse.url());
  expect(url.searchParams.get('search')).not.toBeNull();
  expect(url.searchParams.get('q')).toBeNull();
});

test('employee profile crashes because finance endpoints return 404', async ({ page }) => {
  await page.goto('/employees');
  await page.waitForSelector('table');
  const firstEmployeeLink = page.locator('table tbody tr').first().locator('a').first();
  await firstEmployeeLink.click();

  const failingResponse = await page.waitForResponse((response) =>
    response.url().includes('/api/employees/') && response.url().includes('/finance') && response.status() === 404
  );

  expect(failingResponse.status()).toBe(404);
  await expect(page.locator('text=تعذر تحميل بيانات الموظف')).toBeVisible();
});

test('creating an employee currently returns 404 from the API', async ({ page }) => {
  await page.goto('/employees/new');

  await page.getByLabel('كود الموظف').fill('E2E-EMP-999');
  await page.getByLabel('الاسم الكامل').fill('اختبار تلقائي');
  await page.getByLabel('البريد الإلكتروني').fill('e2e.employee@example.com');
  await page.getByLabel('القسم').fill('جودة');

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().endsWith('/api/employees') && res.request().method() === 'POST'),
    page.getByRole('button', { name: 'إنشاء الموظف' }).click()
  ]);

  expect(response.status()).toBe(404);
});
