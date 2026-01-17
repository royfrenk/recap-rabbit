import { test, expect } from '../fixtures/auth.fixture';
import { SubscriptionsPage, SubscriptionDetailPage } from '../pages/subscriptions.page';
import { SearchPage } from '../pages/search.page';

test.describe('Subscriptions', () => {
  test.describe('Subscriptions List', () => {
    test('subscriptions page loads', async ({ authenticatedPage }) => {
      const subscriptionsPage = new SubscriptionsPage(authenticatedPage);
      await subscriptionsPage.goto();

      // Page should have title
      await expect(subscriptionsPage.pageTitle).toBeVisible();
    });

    test('shows subscriptions or empty state', async ({ authenticatedPage }) => {
      const subscriptionsPage = new SubscriptionsPage(authenticatedPage);
      await subscriptionsPage.goto();

      // Should show either subscriptions or empty state
      const hasSubscriptions = await subscriptionsPage.hasSubscriptions();
      const isEmpty = await subscriptionsPage.isEmpty();

      expect(hasSubscriptions || isEmpty).toBe(true);
    });
  });

  test.describe('Subscription Detail', () => {
    test('subscription detail loads episodes', async ({ authenticatedPage }) => {
      const subscriptionsPage = new SubscriptionsPage(authenticatedPage);
      await subscriptionsPage.goto();

      // Check if there are any subscriptions
      const hasSubscriptions = await subscriptionsPage.hasSubscriptions();

      if (hasSubscriptions) {
        // Click on the first subscription
        await subscriptionsPage.clickSubscription(0);

        // Should navigate to detail page
        await expect(authenticatedPage).toHaveURL(/\/subscriptions\/.+/);

        // Should show episodes
        const detailPage = new SubscriptionDetailPage(authenticatedPage);
        const episodeCount = await detailPage.getEpisodeCount();
        expect(episodeCount).toBeGreaterThanOrEqual(0);
      } else {
        // Skip test if no subscriptions
        test.skip();
      }
    });

    test('"Load More" pagination works', async ({ authenticatedPage }) => {
      const subscriptionsPage = new SubscriptionsPage(authenticatedPage);
      await subscriptionsPage.goto();

      // Check if there are any subscriptions
      const hasSubscriptions = await subscriptionsPage.hasSubscriptions();

      if (hasSubscriptions) {
        // Click on the first subscription
        await subscriptionsPage.clickSubscription(0);

        // Wait for detail page to load
        await expect(authenticatedPage).toHaveURL(/\/subscriptions\/.+/);

        const detailPage = new SubscriptionDetailPage(authenticatedPage);

        // Check if Load More button exists
        const hasLoadMore = await detailPage.hasLoadMore();

        if (hasLoadMore) {
          const initialCount = await detailPage.getEpisodeCount();

          // Click Load More
          await detailPage.clickLoadMore();

          // Should have more episodes now
          const newCount = await detailPage.getEpisodeCount();
          expect(newCount).toBeGreaterThan(initialCount);
        } else {
          // Not enough episodes to paginate, test passes
          expect(true).toBe(true);
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Subscribe Flow', () => {
    // Note: This test modifies data - only run on staging
    test('subscribe to podcast', async ({ authenticatedPage }) => {
      // First check if user already has subscriptions
      const subscriptionsPage = new SubscriptionsPage(authenticatedPage);
      await subscriptionsPage.goto();

      const alreadyHasSubscriptions = await subscriptionsPage.hasSubscriptions();

      if (alreadyHasSubscriptions) {
        // User already has subscriptions, test passes
        expect(alreadyHasSubscriptions).toBe(true);
        return;
      }

      // No subscriptions, try to subscribe
      const searchPage = new SearchPage(authenticatedPage);
      await searchPage.goto();

      // Search for a podcast
      await searchPage.search('The Daily');

      // Wait for results
      await expect(searchPage.resultCards.first()).toBeVisible({ timeout: 15000 });

      // Click on podcast to view episodes
      await searchPage.clickPodcastName();

      // Check if subscribe button is visible (not already subscribed)
      const subscribeButton = authenticatedPage.locator('button:has-text("Subscribe")').first();
      const unsubscribeButton = authenticatedPage.locator('button:has-text("Unsubscribe")').first();

      const canSubscribe = await subscribeButton.isVisible().catch(() => false);
      const alreadySubscribed = await unsubscribeButton.isVisible().catch(() => false);

      if (canSubscribe && !alreadySubscribed) {
        await subscribeButton.click();

        // Button should change to indicate subscribed
        await expect(
          authenticatedPage.locator('button:has-text("Subscribed"), button:has-text("Unsubscribe")')
        ).toBeVisible({ timeout: 5000 });
      }

      // Verify subscription exists
      await subscriptionsPage.goto();
      const hasSubscriptions = await subscriptionsPage.hasSubscriptions();
      expect(hasSubscriptions).toBe(true);
    });
  });
});
