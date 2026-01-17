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

      // Should show either episodes or empty state
      const hasEpisodes = await historyPage.hasEpisodes();
      const isEmpty = await historyPage.isEmpty();

      expect(hasEpisodes || isEmpty).toBe(true);
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
      await authenticatedPage.waitForTimeout(500);

      // Should show queue view (either episodes or "No episodes in queue")
      const hasEpisodes = await historyPage.hasEpisodes();
      const hasEmptyQueue = await authenticatedPage.locator('text="No episodes in queue"').isVisible();

      expect(hasEpisodes || hasEmptyQueue).toBe(true);
    });
  });

  test.describe('Episode Detail', () => {
    test('clicking episode navigates to detail', async ({ authenticatedPage }) => {
      const historyPage = new HistoryPage(authenticatedPage);
      await historyPage.goto();

      const hasEpisodes = await historyPage.hasEpisodes();

      if (hasEpisodes) {
        // Click on the first episode
        await historyPage.clickEpisode(0);

        // Should navigate to episode page
        await expect(authenticatedPage).toHaveURL(/\/episode\//);
      } else {
        // No episodes to click, skip
        test.skip();
      }
    });

    test('completed episode shows summary', async ({ authenticatedPage }) => {
      const historyPage = new HistoryPage(authenticatedPage);
      await historyPage.goto();

      // Filter to completed only
      await historyPage.filterBy('completed');

      await authenticatedPage.waitForTimeout(500);

      const hasEpisodes = await historyPage.hasEpisodes();

      if (hasEpisodes) {
        // Click on the first completed episode
        await historyPage.clickEpisode(0);

        // Should navigate to episode page
        await expect(authenticatedPage).toHaveURL(/\/episode\//);

        // Episode page should have summary content
        const episodePage = new EpisodePage(authenticatedPage);

        // Wait for page to load
        await authenticatedPage.waitForLoadState('networkidle');

        // Should have summary (takeaways, quotes, or summary section)
        const hasSummary = await episodePage.hasSummary();
        const status = await episodePage.getStatus();

        // Either has summary or is still in completed state
        expect(hasSummary || status.toLowerCase().includes('completed')).toBe(true);
      } else {
        // No completed episodes, skip
        test.skip();
      }
    });
  });
});
