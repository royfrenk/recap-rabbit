import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

/**
 * Test user credentials from environment variables.
 */
export const testUser = {
  email: process.env.E2E_USER_EMAIL || '',
  password: process.env.E2E_USER_PASSWORD || '',
};

/**
 * Extended test fixture with authentication helpers.
 */
export const test = base.extend<{
  loginPage: LoginPage;
  authenticatedPage: Page;
}>({
  // Login page fixture
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  // Pre-authenticated page fixture
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await use(page);
  },
});

export { expect } from '@playwright/test';

/**
 * Helper to check if running in read-only mode (production).
 */
export function isReadOnly(): boolean {
  return process.env.E2E_READONLY === 'true';
}

/**
 * Skip test if in read-only mode.
 */
export function skipIfReadOnly(testFn: typeof test) {
  return isReadOnly() ? testFn.skip : testFn;
}
