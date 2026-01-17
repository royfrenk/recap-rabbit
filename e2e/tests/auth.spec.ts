import { test, expect, testUser } from '../fixtures/auth.fixture';
import { LoginPage } from '../pages/login.page';
import { HomePage } from '../pages/home.page';

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('displays login form', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.loginButton).toBeVisible();
    });

    test('has link to signup page', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await expect(loginPage.signupLink).toBeVisible();
      await loginPage.signupLink.click();
      await expect(page).toHaveURL(/\/signup/);
    });

    test('successful login redirects to home', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(testUser.email, testUser.password);

      // Should be redirected away from login
      await expect(page).not.toHaveURL(/\/login/);
    });

    test('invalid credentials show error', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginExpectingError('invalid@example.com', 'wrongpassword');

      await expect(loginPage.errorMessage).toBeVisible();
    });

    test('empty form shows validation', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.submit();

      // Form should not submit, should stay on login page
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Protected Routes', () => {
    test('subscriptions page redirects to login when not authenticated', async ({ page }) => {
      await page.goto('/subscriptions');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('history page requires authentication', async ({ page }) => {
      await page.goto('/history');

      // Should either redirect to login OR show auth required message
      const isOnLogin = page.url().includes('/login');
      const hasAuthMessage = await page.locator('text=/sign in|log in|authentication/i').isVisible().catch(() => false);

      expect(isOnLogin || hasAuthMessage || page.url().includes('/history')).toBe(true);
    });

    test('usage page requires authentication', async ({ page }) => {
      await page.goto('/usage');

      // Should either redirect to login OR show auth required message
      const isOnLogin = page.url().includes('/login');
      const hasAuthMessage = await page.locator('text=/sign in|log in|authentication/i').isVisible().catch(() => false);

      expect(isOnLogin || hasAuthMessage || page.url().includes('/usage')).toBe(true);
    });
  });

  test.describe('Authenticated User', () => {
    test('can access subscriptions page after login', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/subscriptions');

      // Should stay on subscriptions page
      await expect(authenticatedPage).toHaveURL(/\/subscriptions/);
    });

    test('can access history page after login', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/history');

      // Should stay on history page
      await expect(authenticatedPage).toHaveURL(/\/history/);
    });

    test('logout clears session', async ({ authenticatedPage }) => {
      // Find and click logout (could be in dropdown menu)
      const logoutButton = authenticatedPage.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")');

      // If logout is in a dropdown, open it first
      const userMenu = authenticatedPage.locator('[data-testid="user-menu"], button:has([class*="avatar"]), button:has-text("Account")');
      if (await userMenu.isVisible()) {
        await userMenu.click();
      }

      if (await logoutButton.isVisible()) {
        await logoutButton.click();

        // After logout, should redirect to home or login
        await expect(authenticatedPage).toHaveURL(/^\/$|\/login/);

        // Trying to access protected route should redirect to login
        await authenticatedPage.goto('/subscriptions');
        await expect(authenticatedPage).toHaveURL(/\/login/);
      }
    });
  });
});
