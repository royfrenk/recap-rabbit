import { Page, Locator } from '@playwright/test';

/**
 * Base page class with common functionality for all pages.
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a path relative to baseURL.
   */
  async goto(path: string = '/') {
    await this.page.goto(path);
  }

  /**
   * Wait for navigation to complete.
   */
  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the current URL path.
   */
  getPath(): string {
    return new URL(this.page.url()).pathname;
  }

  /**
   * Check if user is logged in by looking for auth indicators.
   */
  async isLoggedIn(): Promise<boolean> {
    // Check for presence of user menu or logout link
    const userIndicator = this.page.locator('[data-testid="user-menu"], a[href="/history"]');
    return await userIndicator.isVisible().catch(() => false);
  }

  /**
   * Get text content of an element.
   */
  async getText(locator: Locator): Promise<string> {
    return (await locator.textContent()) || '';
  }

  /**
   * Wait for a toast/alert message.
   */
  async waitForToast(text?: string): Promise<Locator> {
    const toast = this.page.locator('[role="alert"], .toast');
    await toast.waitFor({ state: 'visible' });
    if (text) {
      await this.page.locator(`[role="alert"]:has-text("${text}"), .toast:has-text("${text}")`).waitFor();
    }
    return toast;
  }
}
