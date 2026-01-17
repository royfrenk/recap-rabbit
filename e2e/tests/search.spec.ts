import { test, expect, testUser } from '../fixtures/auth.fixture';
import { SearchPage } from '../pages/search.page';
import { PreviewPage } from '../pages/preview.page';

test.describe('Search & Discovery', () => {
  test.describe('Search Functionality', () => {
    test('search returns results', async ({ page }) => {
      const searchPage = new SearchPage(page);
      await searchPage.goto();

      // Search for a common podcast
      await searchPage.search('Tim Ferriss');

      // Should have results
      const resultCount = await searchPage.getResultCount();
      expect(resultCount).toBeGreaterThan(0);
    });

    test('click podcast shows episodes', async ({ page }) => {
      const searchPage = new SearchPage(page);
      await searchPage.goto();

      // Search for a podcast
      await searchPage.search('Tim Ferriss');

      // Wait for results
      await expect(searchPage.resultCards.first()).toBeVisible();

      // Click on the podcast name to view all episodes
      await searchPage.clickPodcastName();

      // Should show episodes header with count
      await expect(page.locator('text=/\\d+ episodes/')).toBeVisible({ timeout: 10000 });
    });

    test('click episode shows preview', async ({ page }) => {
      const searchPage = new SearchPage(page);
      await searchPage.goto();

      // Search for a podcast
      await searchPage.search('Tim Ferriss');

      // Wait for results
      await expect(searchPage.resultCards.first()).toBeVisible();

      // Click on the first result card
      await searchPage.clickResult(0);

      // Should navigate to preview page
      await expect(page).toHaveURL(/\/preview\//);

      // Preview page should have content
      const previewPage = new PreviewPage(page);
      await expect(previewPage.episodeTitle).toBeVisible();
    });
  });

  test.describe('Authenticated Search', () => {
    test('"Get Summary" button visible when logged in', async ({ authenticatedPage }) => {
      const searchPage = new SearchPage(authenticatedPage);
      await searchPage.goto();

      // Search for a podcast
      await searchPage.search('Tim Ferriss');

      // Wait for results
      await expect(searchPage.resultCards.first()).toBeVisible();

      // Should see Get Summary button
      await expect(searchPage.getSummaryButton.first()).toBeVisible();
    });

    test('clicking Get Summary starts processing', async ({ authenticatedPage }) => {
      const searchPage = new SearchPage(authenticatedPage);
      await searchPage.goto();

      // Search for a podcast
      await searchPage.search('Tim Ferriss');

      // Wait for results
      await expect(searchPage.resultCards.first()).toBeVisible();

      // Click Get Summary on first result
      await searchPage.getSummaryButton.first().click();

      // Should navigate to episode page
      await expect(authenticatedPage).toHaveURL(/\/episode\//, { timeout: 15000 });
    });
  });
});
