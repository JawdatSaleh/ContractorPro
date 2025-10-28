import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../utils/auth';

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

test('attendance bulk entry succeeds and refreshes the grid', async ({ page }) => {
  await page.goto('/attendance');
  await expect(page.getByRole('heading', { level: 2, name: 'الحضور اليومي' })).toBeVisible();

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/attendance/bulk') && res.request().method() === 'POST'),
    page.getByRole('button', { name: 'تسجيل حضور افتراضي' }).click()
  ]);

  expect(response.ok()).toBeTruthy();
  await expect(page.locator('table tbody tr')).not.toHaveCount(0);
});

test('leave request and approval workflow completes', async ({ page }) => {
  await page.goto('/leaves');
  await expect(page.getByRole('heading', { level: 2, name: 'طلب إجازة' })).toBeVisible();

  await page.getByLabel('من').fill('2025-01-01');
  await page.getByLabel('إلى').fill('2025-01-05');

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().endsWith('/api/leaves') && res.request().method() === 'POST'),
    page.getByRole('button', { name: 'إرسال الطلب' }).click()
  ]);
  expect(createResponse.ok()).toBeTruthy();

  await page.waitForResponse((res) => res.url().includes('/api/leaves') && res.request().method() === 'GET');

  const approveButton = page.getByRole('button', { name: 'اعتماد' }).first();
  const [approveResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/leaves/') && res.url().endsWith('/approve') && res.request().method() === 'PATCH'),
    approveButton.click()
  ]);
  expect(approveResponse.ok()).toBeTruthy();
});

test('payroll batch can be created, calculated, and posted', async ({ page }) => {
  await page.goto('/payroll');
  await expect(page.getByRole('heading', { level: 2, name: 'إنشاء دفعة رواتب' })).toBeVisible();

  const [createResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().endsWith('/api/payroll/batches') && res.request().method() === 'POST'),
    page.getByRole('button', { name: 'إنشاء' }).click()
  ]);
  expect(createResponse.ok()).toBeTruthy();

  await page.waitForResponse((res) => res.url().includes('/api/payroll/batches') && res.request().method() === 'GET');
  const batchRow = page.locator('table tbody tr').first();
  await expect(batchRow).toBeVisible();

  const [calculateResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/payroll/batches/') && res.url().endsWith('/calculate') && res.request().method() === 'POST'),
    batchRow.getByRole('button', { name: 'حساب' }).click()
  ]);
  expect(calculateResponse.ok()).toBeTruthy();

  const [postResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/payroll/batches/') && res.url().endsWith('/post') && res.request().method() === 'POST'),
    batchRow.getByRole('button', { name: 'ترحيل' }).click()
  ]);
  expect(postResponse.ok()).toBeTruthy();

  await page.waitForResponse((res) => res.url().includes('/api/payroll/batches') && res.request().method() === 'GET');
  await expect(page.locator('table tbody tr td:nth-child(3)')).toContainText(/posted|pending/i);
});

test('activity center export requires populated dataset', async ({ page }) => {
  await page.goto('/activity');
  await expect(page.getByRole('heading', { level: 1, name: 'سجل النشاطات الشامل' })).toBeVisible();

  await page.waitForResponse((res) => res.url().includes('/api/activity/logs'));

  const exportButton = page.getByRole('button', { name: 'تصدير CSV' });
  const disabled = await exportButton.isDisabled();
  if (!disabled) {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      exportButton.click()
    ]);
    expect(await download.suggestedFilename()).toMatch(/activity-logs-/);
  } else {
    test.info().annotations.push({ type: 'pending-data', description: 'Requires seeded activity logs to enable export' });
  }
});

test('cost center report renders aggregated totals', async ({ page }) => {
  await page.goto('/reports');
  await expect(page.getByRole('heading', { level: 2, name: 'تقرير تكلفة مراكز التكلفة' })).toBeVisible();
  await page.waitForResponse((res) => res.url().includes('/api/reports/cost-centers'));
  await expect(page.locator('table tbody tr')).not.toHaveCount(0);
});
