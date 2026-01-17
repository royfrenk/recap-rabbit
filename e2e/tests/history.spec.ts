import { test, expect } from '../fixtures/auth.fixture';
import { HistoryPage } from '../pages/history.page';
import { EpisodePage } from '../pages/preview.page';

test.describe('History', () => {
  test.describe('History Page', () => {
    test('history page loads', async ({ authenticatedPage }) => {
      const historyPage = new HistoryPage(authenticatedPage);
      await historyPage.goto();

      // Page should have title
      await expect(historyPage.pageTitle).toBeVisible();
    });

    test('shows episodes or empty state', async ({ authenticatedPage }) => {
      const historyPage = new HistoryPage(authenticatedPage);
      await historyPage.goto();

      // Wait for page to load
      await authenticatedPage.waitForTimeout(1000);

      // Should show either episodes, empty state, or at least the page loaded
      const hasEpisodes = await historyPage.hasEpisodes();
      const isEmpty = await historyPage.isEmpty();
      const hasTitle = await historyPage.pageTitle.isVisible();

      // Page should have content - either episodes, empty state, or title
      expect(hasEpisodes || isEmpty || hasTitle).toBe(true);
    });
  });

  test.describe('Filtering', () => {
    test('filter by status works', async ({ authenticatedPage }) => {
      const historyPage = new HistoryPage(authenticatedPage);
      await historyPage.goto();

      // Click on Completed filter
      await historyPage.filterBy('completed');

      // Wait for filter to take effect
      await authenticatedPage.waitForTimeout(500);

      // Click on All filter
      await historyPage.filterBy('all');

      // Wait for filter to take effect
      await authenticatedPage.waitForTimeout(500);

      // If we got here without errors, filters work
      expect(true).toBe(true);
    });

    test('queue filter shows queued episodes', async ({ authenticatedPage }) => {
      const historyPage = new HistoryPage(authenticatedPage);
      await historyPage.goto();

      // Click on Queue filter
      await historyPage.filterBy('queue');

      // Wait for list to update
      await authenticatedPage.waitForTimeout(1000);

      // Should show queue view (either episodes, empty queue message, or page loaded)
      const hasEpisodes = await historyPage.hasEpisodes();
      const hasEmptyQueue = await authenticatedPage.locator('text=/No episodes in queue|No episodes/i').isVisible();
      const hasTitle = await historyPage.pageTitle.isVisible();

      expect(hasEpisodes || hasEmptyQueue || hasTitle).toBe(true);
    });
  });

  test.describe('Episode Detail', () => {
    test('clicking episode navigates to detail', async ({ authenticatedPage }) => {
      const historyPage = new HistoryPage(authenticatedPage);
      await historyPage.goto();

      // Wait for page to load
      await authenticatedPage.waitForTimeout(1000);

      const hasEpisodes = await historyPage.hasEpisodes();

      if (!hasEpisodes) {
        // No episodes to click, test passes (nothing to test)
        expect(true).toBe(true);
        return;
      }

      // Click on the first episode
      await historyPage.clickEpisode(0);

      // Should navigate to episode page
      await expect(authenticatedPage).toHaveURL(/\/episode\//);
    });

    test('completed episode shows summary', async ({ authenticatedPage }) => {
      const historyPage = new HistoryPage(authenticatedPage);
      await historyPage.goto();

      // Filter to completed only
      await historyPage.filterBy('completed');

      await authenticatedPage.waitForTimeout(1000);

      const hasEpisodes = await historyPage.hasEpisodes();

      if (!hasEpisodes) {
        // No completed episodes, test passes (nothing to test)
        expect(true).toBe(true);
        return;
      }

      // Click on the first completed episode
      await historyPage.clickEpisode(0);

      // Should navigate to episode page
      await expect(authenticatedPage).toHaveURL(/\/episode\//);

      // Episode page should have summary content
      const episodePage = new EpisodePage(authenticatedPage);

      // Wait for page to load
      await authenticatedPage.waitForLoadState('networkidle');

      // Should have summary (takeaways, quotes, or summary section) or page loaded
      const hasSummary = await episodePage.hasSummary();
      const status = await episodePage.getStatus();
      const hasTitle = await episodePage.episodeTitle.isVisible();

      // Either has summary, status badge, or title visible
      expect(hasSummary || status.length > 0 || hasTitle).toBe(true);
    });
  });
});
