import { test, expect, testUser } from '../fixtures/auth.fixture';
import { LoginPage } from '../pages/login.page';
import { HomePage } from '../pages/home.page';

/**
 * Smoke tests for production.
 * These are read-only tests that verify critical paths work.
 * No data mutations - just checking pages load and basic functionality.
 */
test.describe('Smoke Tests', () => {
  test.describe('Public Pages', () => {
    test('homepage loads', async ({ page }) => {
      await page.goto('/');

      // Page should have content
      await expect(page.locator('body')).not.toBeEmpty();

      // Should have search input or main heading
      const hasContent = await page.locator('input, h1, h2').first().isVisible();
      expect(hasContent).toBe(true);
    });

    test('login page loads', async ({ page }) => {
      await page.goto('/login');

      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('signup page loads', async ({ page }) => {
      await page.goto('/signup');

      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });
  });

  test.describe('Authentication', () => {
    test('login works with valid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(testUser.email, testUser.password);

      // Should be logged in and redirected
      await expect(page).not.toHaveURL(/\/login/);
    });
  });

  test.describe('Protected Pages (Authenticated)', () => {
    test('subscriptions page loads', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/subscriptions');

      await expect(authenticatedPage).toHaveURL(/\/subscriptions/);
      // Page should render without errors
      await expect(authenticatedPage.locator('body')).not.toBeEmpty();
    });

    test('history page loads', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/history');

      await expect(authenticatedPage).toHaveURL(/\/history/);
      await expect(authenticatedPage.locator('body')).not.toBeEmpty();
    });

    test('usage page loads', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/usage');

      await expect(authenticatedPage).toHaveURL(/\/usage/);
      await expect(authenticatedPage.locator('body')).not.toBeEmpty();
    });
  });

  test.describe('API Health', () => {
    test('health endpoint responds', async ({ request }) => {
      const response = await request.get('/api/health');

      // Should return 200 OK
      expect(response.ok()).toBe(true);
    });

    test('search API responds', async ({ request }) => {
      const response = await request.get('/api/search?q=test&limit=1');

      // Should return 200 (even if no results)
      expect(response.ok()).toBe(true);
    });
  });
});
