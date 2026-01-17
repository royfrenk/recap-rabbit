import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Home page object model.
 */
export class HomePage extends BasePage {
  // Locators
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly searchResults: Locator;
  readonly uploadButton: Locator;
  readonly loginLink: Locator;
  readonly signupLink: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    this.searchButton = page.locator('button:has-text("Search"), button[type="submit"]');
    this.searchResults = page.locator('[data-testid="search-results"], .search-results');
    this.uploadButton = page.locator('button:has-text("Upload")');
    this.loginLink = page.locator('a[href="/login"]');
    this.signupLink = page.locator('a[href="/signup"]');
  }

  /**
   * Navigate to home page.
   */
  async goto() {
    await super.goto('/');
  }

  /**
   * Perform a search.
   */
  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchButton.click();
    // Wait for results to load
    await this.page.waitForResponse(
      (response) => response.url().includes('/api/search') && response.status() === 200,
      { timeout: 10000 }
    );
  }

  /**
   * Get search result items.
   */
  getResultItems(): Locator {
    return this.page.locator('[data-testid="search-result"], .search-result, [class*="Card"]');
  }

  /**
   * Click on a search result by index.
   */
  async clickResult(index: number) {
    const results = this.getResultItems();
    await results.nth(index).click();
  }

  /**
   * Check if search results are visible.
   */
  async hasResults(): Promise<boolean> {
    const results = this.getResultItems();
    return (await results.count()) > 0;
  }
}
