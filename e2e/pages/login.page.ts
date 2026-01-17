import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Login page object model.
 */
export class LoginPage extends BasePage {
  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly signupLink: Locator;
  readonly errorMessage: Locator;
  readonly googleButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.loginButton = page.locator('button[type="submit"]');
    this.signupLink = page.locator('a[href="/signup"]').last();
    this.errorMessage = page.locator('[role="alert"], .error, .text-destructive');
    this.googleButton = page.locator('button:has-text("Google"), button:has-text("Continue with Google")');
  }

  /**
   * Navigate to login page.
   */
  async goto() {
    await super.goto('/login');
  }

  /**
   * Fill in login form.
   */
  async fillCredentials(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Submit login form.
   */
  async submit() {
    await this.loginButton.click();
  }

  /**
   * Perform complete login flow.
   */
  async login(email: string, password: string) {
    await this.fillCredentials(email, password);
    await this.submit();
    // Wait for navigation away from login page
    await this.page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 10000,
    });
  }

  /**
   * Attempt login and expect failure.
   */
  async loginExpectingError(email: string, password: string) {
    await this.fillCredentials(email, password);
    await this.submit();
    // Wait for error message
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Check if error message is displayed.
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Get error message text.
   */
  async getErrorText(): Promise<string> {
    return await this.getText(this.errorMessage);
  }
}
