import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * History page object model.
 */
export class HistoryPage extends BasePage {
  // Locators
  readonly pageTitle: Locator;
  readonly episodeCards: Locator;
  readonly episodeCount: Locator;
  readonly emptyState: Locator;
  readonly newEpisodeButton: Locator;

  // Filter buttons
  readonly allFilter: Locator;
  readonly queueFilter: Locator;
  readonly completedFilter: Locator;
  readonly processingFilter: Locator;
  readonly failedFilter: Locator;

  // Status badges
  readonly completedBadge: Locator;
  readonly processingBadge: Locator;
  readonly failedBadge: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.locator('h1:has-text("Processing History")');
    // Episode cards contain the podcast icon
    this.episodeCards = page.locator('[class*="card" i]').filter({
      has: page.locator('.lucide-podcast')
    });
    this.episodeCount = page.locator('text=/\\d+ episode/');
    this.emptyState = page.locator('text="No episodes found"');
    this.newEpisodeButton = page.locator('button:has-text("New Episode")');

    // Filters
    this.allFilter = page.locator('button:has-text("All")');
    this.queueFilter = page.locator('button:has-text("Queue")');
    this.completedFilter = page.locator('button:has-text("Completed")');
    this.processingFilter = page.locator('button:has-text("Processing")');
    this.failedFilter = page.locator('button:has-text("Failed")');

    // Badges
    this.completedBadge = page.locator('[class*="Badge"]:has-text("completed")');
    this.processingBadge = page.locator('[class*="Badge"]:has-text("processing"), [class*="Badge"]:has-text("transcribing"), [class*="Badge"]:has-text("summarizing")');
    this.failedBadge = page.locator('[class*="Badge"]:has-text("failed")');
  }

  /**
   * Navigate to history page.
   */
  async goto() {
    await super.goto('/history');
    // Wait for page to load
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the count of episode cards.
   */
  async getEpisodeCount(): Promise<number> {
    await this.page.waitForTimeout(500);
    return await this.episodeCards.count();
  }

  /**
   * Click on an episode card by index.
   */
  async clickEpisode(index: number = 0) {
    await this.episodeCards.nth(index).click();
  }

  /**
   * Filter by status.
   */
  async filterBy(status: 'all' | 'queue' | 'completed' | 'processing' | 'failed') {
    const filterMap = {
      all: this.allFilter,
      queue: this.queueFilter,
      completed: this.completedFilter,
      processing: this.processingFilter,
      failed: this.failedFilter,
    };
    await filterMap[status].click();
    // Wait for list to update
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if episodes are displayed.
   */
  async hasEpisodes(): Promise<boolean> {
    const count = await this.getEpisodeCount();
    return count > 0;
  }

  /**
   * Check if empty state is shown.
   */
  async isEmpty(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Check if completed badge is visible in results.
   */
  async hasCompletedEpisodes(): Promise<boolean> {
    return await this.completedBadge.first().isVisible();
  }
}
