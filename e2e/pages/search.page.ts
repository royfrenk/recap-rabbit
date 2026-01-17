import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Search/Home page object model.
 */
export class SearchPage extends BasePage {
  // Locators
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly searchResults: Locator;
  readonly resultCards: Locator;
  readonly podcastLink: Locator;
  readonly getSummaryButton: Locator;
  readonly backToSearchButton: Locator;
  readonly subscribeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input[placeholder*="search"]');
    this.searchButton = page.locator('button:has-text("Go"), button:has-text("Search"), button[type="submit"]');
    this.searchResults = page.locator('h2:has-text("Search Results"), h2:has-text("episodes")');
    this.resultCards = page.locator('[class*="card" i]').filter({ has: page.locator('h3') });
    this.podcastLink = page.locator('button:has(.lucide-podcast)').first();
    this.getSummaryButton = page.locator('button:has-text("Get Summary"), button:has-text("Summary")');
    this.backToSearchButton = page.locator('button:has-text("Back to search")');
    this.subscribeButton = page.locator('button:has-text("Subscribe")');
  }

  /**
   * Navigate to home/search page.
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
    // Wait for results to load - either API response or results visible
    try {
      await this.page.waitForResponse(
        (response) => response.url().includes('/api/search') && response.status() === 200,
        { timeout: 20000 }
      );
    } catch {
      // If response wait fails, wait for results to appear instead
    }
    // Wait for results to render
    await this.page.waitForTimeout(1000);
    // Wait for result cards to be visible
    await this.resultCards.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  }

  /**
   * Get the count of result cards.
   */
  async getResultCount(): Promise<number> {
    return await this.resultCards.count();
  }

  /**
   * Click on a result card by index.
   */
  async clickResult(index: number = 0) {
    await this.resultCards.nth(index).click();
  }

  /**
   * Click on podcast name to view all episodes.
   */
  async clickPodcastName() {
    const podcastButton = this.page.locator('button:has(.lucide-podcast)').first();
    await podcastButton.click();
    // Wait for episodes to load
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if search results are displayed.
   */
  async hasResults(): Promise<boolean> {
    const count = await this.getResultCount();
    return count > 0;
  }

  /**
   * Check if Get Summary button is visible.
   */
  async hasSummaryButton(): Promise<boolean> {
    return await this.getSummaryButton.first().isVisible();
  }
}
