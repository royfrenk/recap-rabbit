import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Subscriptions page object model.
 */
export class SubscriptionsPage extends BasePage {
  // Locators
  readonly pageTitle: Locator;
  readonly subscriptionCards: Locator;
  readonly subscriptionCount: Locator;
  readonly addSubscriptionButton: Locator;
  readonly emptyState: Locator;
  readonly loadMoreButton: Locator;
  readonly unsubscribeButton: Locator;
  readonly pauseButton: Locator;
  readonly resumeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.locator('h1:has-text("Subscriptions")');
    // Subscription cards contain the podcast name and episode count
    this.subscriptionCards = page.locator('[class*="card" i]').filter({
      has: page.locator('text=/\\d+ episodes/')
    });
    this.subscriptionCount = page.locator('text=/\\d+ subscription/');
    this.addSubscriptionButton = page.locator('button:has-text("Subscribe to Podcast"), button:has-text("Find Podcasts")');
    this.emptyState = page.locator('text="No subscriptions yet"');
    this.loadMoreButton = page.locator('button:has-text("Load More")');
    this.unsubscribeButton = page.locator('button:has-text("Unsubscribe")');
    this.pauseButton = page.locator('button:has-text("Pause")');
    this.resumeButton = page.locator('button:has-text("Resume")');
  }

  /**
   * Navigate to subscriptions page.
   */
  async goto() {
    await super.goto('/subscriptions');
    // Wait for page to load
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the count of subscription cards.
   */
  async getSubscriptionCount(): Promise<number> {
    await this.page.waitForTimeout(500);
    return await this.subscriptionCards.count();
  }

  /**
   * Click on a subscription card by index.
   */
  async clickSubscription(index: number = 0) {
    await this.subscriptionCards.nth(index).click();
  }

  /**
   * Check if subscriptions are displayed.
   */
  async hasSubscriptions(): Promise<boolean> {
    const count = await this.getSubscriptionCount();
    return count > 0;
  }

  /**
   * Check if empty state is shown.
   */
  async isEmpty(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Click unsubscribe on a subscription (opens menu first if needed).
   */
  async unsubscribe(index: number = 0) {
    // Click on the card to select it first, or find the unsubscribe button
    const card = this.subscriptionCards.nth(index);
    const unsubBtn = card.locator('button:has-text("Unsubscribe")');

    if (await unsubBtn.isVisible()) {
      await unsubBtn.click();
    } else {
      // May need to open a menu first
      const menuBtn = card.locator('button[aria-label*="menu"], button:has(.lucide-more)');
      if (await menuBtn.isVisible()) {
        await menuBtn.click();
        await this.page.locator('button:has-text("Unsubscribe")').click();
      }
    }
  }
}

/**
 * Subscription detail page object model.
 */
export class SubscriptionDetailPage extends BasePage {
  // Locators
  readonly backButton: Locator;
  readonly podcastTitle: Locator;
  readonly episodeCards: Locator;
  readonly episodeCount: Locator;
  readonly loadMoreButton: Locator;
  readonly pauseButton: Locator;
  readonly deleteButton: Locator;
  readonly checkNewButton: Locator;

  constructor(page: Page) {
    super(page);
    this.backButton = page.locator('button:has-text("Back"), a:has-text("Back")');
    this.podcastTitle = page.locator('h1, h2').first();
    this.episodeCards = page.locator('[class*="Card"]').filter({ has: page.locator('h3, h4') });
    this.episodeCount = page.locator('text=/\\d+ episode/');
    this.loadMoreButton = page.locator('button:has-text("Load More")');
    this.pauseButton = page.locator('button:has-text("Pause"), button:has(.lucide-bell-off)');
    this.deleteButton = page.locator('button:has-text("Unsubscribe"), button:has(.lucide-trash)');
    this.checkNewButton = page.locator('button:has-text("Check"), button:has(.lucide-refresh)');
  }

  /**
   * Get the count of episode cards.
   */
  async getEpisodeCount(): Promise<number> {
    await this.page.waitForTimeout(500);
    return await this.episodeCards.count();
  }

  /**
   * Click Load More button.
   */
  async clickLoadMore() {
    await this.loadMoreButton.click();
    // Wait for more episodes to load
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if Load More button is visible.
   */
  async hasLoadMore(): Promise<boolean> {
    return await this.loadMoreButton.isVisible();
  }
}
