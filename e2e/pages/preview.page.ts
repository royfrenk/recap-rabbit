import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Episode preview page object model.
 */
export class PreviewPage extends BasePage {
  // Locators
  readonly backButton: Locator;
  readonly episodeTitle: Locator;
  readonly podcastName: Locator;
  readonly getSummaryButton: Locator;
  readonly description: Locator;
  readonly durationInfo: Locator;
  readonly dateInfo: Locator;
  readonly artwork: Locator;

  constructor(page: Page) {
    super(page);
    this.backButton = page.locator('button:has-text("Back to search")');
    this.episodeTitle = page.locator('h1');
    this.podcastName = page.locator('.text-primary:has(.lucide-podcast), span:near(.lucide-podcast)');
    this.getSummaryButton = page.locator('button:has-text("Get Summary")');
    this.description = page.locator('h2:has-text("Episode Description") + p, p.text-muted-foreground');
    this.durationInfo = page.locator('.lucide-clock').locator('..');
    this.dateInfo = page.locator('.lucide-calendar').locator('..');
    this.artwork = page.locator('img[alt]');
  }

  /**
   * Check if Get Summary button is visible.
   */
  async hasSummaryButton(): Promise<boolean> {
    return await this.getSummaryButton.isVisible();
  }

  /**
   * Click Get Summary button.
   */
  async clickGetSummary() {
    await this.getSummaryButton.click();
  }

  /**
   * Get episode title text.
   */
  async getTitle(): Promise<string> {
    return await this.episodeTitle.textContent() || '';
  }

  /**
   * Get podcast name text.
   */
  async getPodcastName(): Promise<string> {
    return await this.podcastName.textContent() || '';
  }

  /**
   * Check if preview page has loaded with content.
   */
  async hasContent(): Promise<boolean> {
    const title = await this.getTitle();
    return title.length > 0;
  }
}

/**
 * Episode detail/summary page object model.
 */
export class EpisodePage extends BasePage {
  // Locators
  readonly episodeTitle: Locator;
  readonly podcastName: Locator;
  readonly statusBadge: Locator;
  readonly summaryContent: Locator;
  readonly takeaways: Locator;
  readonly quotes: Locator;
  readonly transcript: Locator;
  readonly shareButton: Locator;
  readonly processingIndicator: Locator;

  constructor(page: Page) {
    super(page);
    this.episodeTitle = page.locator('h1');
    this.podcastName = page.locator('text=/Podcast:/i, .text-primary');
    this.statusBadge = page.locator('[class*="Badge"]');
    this.summaryContent = page.locator('[data-testid="summary"], .summary, h2:has-text("Summary") + div');
    this.takeaways = page.locator('h2:has-text("Takeaways"), h3:has-text("Takeaways")').locator('..');
    this.quotes = page.locator('h2:has-text("Quotes"), h3:has-text("Quotes")').locator('..');
    this.transcript = page.locator('h2:has-text("Transcript"), button:has-text("Transcript")');
    this.shareButton = page.locator('button:has-text("Share"), button:has(.lucide-share)');
    this.processingIndicator = page.locator('text=/Processing|Transcribing|Summarizing/i, .animate-spin');
  }

  /**
   * Check if episode is still processing.
   */
  async isProcessing(): Promise<boolean> {
    return await this.processingIndicator.isVisible();
  }

  /**
   * Check if summary content is visible.
   */
  async hasSummary(): Promise<boolean> {
    // Check for takeaways, quotes, or summary section
    const hasTakeaways = await this.takeaways.isVisible().catch(() => false);
    const hasQuotes = await this.quotes.isVisible().catch(() => false);
    const hasSummaryContent = await this.summaryContent.isVisible().catch(() => false);
    return hasTakeaways || hasQuotes || hasSummaryContent;
  }

  /**
   * Get episode status from badge.
   */
  async getStatus(): Promise<string> {
    const badge = this.statusBadge.first();
    if (await badge.isVisible()) {
      return await badge.textContent() || '';
    }
    return '';
  }
}
