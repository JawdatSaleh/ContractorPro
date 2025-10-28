import { expect, Page } from '@playwright/test';

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    permissions?: { key: string }[];
    roles?: { key: string }[];
  };
}

const STORAGE_KEY = 'contractorpro-token';

export async function loginAsAdmin(page: Page) {
  const email = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'admin@contractorpro.local';
  const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'Admin#123';
  const apiBase = (process.env.PLAYWRIGHT_API_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

  const response = await page.request.post(`${apiBase}/api/auth/login`, {
    data: { email, password }
  });

  expect(response.ok()).toBeTruthy();
  const result = (await response.json()) as LoginResult;

  await page.addInitScript(({ storageKey, token }) => {
    window.localStorage.setItem(storageKey, token);
  }, { storageKey: STORAGE_KEY, token: result.token });

  return result;
}
