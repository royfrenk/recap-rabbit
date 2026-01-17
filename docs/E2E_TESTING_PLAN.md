# E2E Testing Implementation Plan

> **Status:** Planning
> **Owner:** Eng Manager
> **Last updated:** 2026-01-16

---

## Executive Summary

Implement end-to-end testing using **Playwright** to verify critical user flows work correctly in staging and production environments. The goal is to catch regressions before they impact users and give developers confidence when deploying.

---

## Tool Selection: Playwright over Cypress

### Why Playwright?

| Factor | Playwright | Cypress |
|--------|------------|---------|
| Multi-browser | Native (Chromium, Firefox, WebKit) | Experimental |
| Speed | Faster, parallel by default | Slower |
| CI/CD | Excellent (sharding, artifacts) | Good (paid features) |
| Cost | Free, all features | Paid for advanced |
| API testing | Built-in | Plugin required |
| Debugging | Trace viewer, screenshots | Time-travel (better UX) |
| Learning curve | Moderate | Easier |

**Decision:** Playwright wins on speed, multi-browser, and cost. The debugging UX difference is acceptable given the other benefits.

---

## Architecture

### Directory Structure

```
podcatchup/
├── e2e/                              # E2E tests (separate from unit tests)
│   ├── playwright.config.ts          # Playwright configuration
│   ├── package.json                  # E2E-specific dependencies
│   ├── .env.example                  # Template for env vars
│   ├── tests/
│   │   ├── auth.spec.ts              # Login, signup, logout
│   │   ├── search.spec.ts            # Search, preview, podcast view
│   │   ├── subscriptions.spec.ts     # Subscribe, manage, episodes
│   │   ├── history.spec.ts           # History page, filters
│   │   ├── public.spec.ts            # Public summary pages
│   │   └── smoke.spec.ts             # Quick prod smoke tests
│   ├── fixtures/
│   │   ├── test-users.ts             # Test account helpers
│   │   └── test-data.ts              # Known test episodes/podcasts
│   └── pages/                        # Page Object Model
│       ├── base.page.ts
│       ├── home.page.ts
│       ├── login.page.ts
│       ├── subscriptions.page.ts
│       └── episode.page.ts
├── frontend/
├── backend/
└── ...
```

### Why Separate `e2e/` Directory?

1. E2E tests are stack-agnostic (test the deployed app, not code)
2. Different dependencies than frontend unit tests
3. Runs against deployed URLs, not local dev server
4. Clear separation of concerns

---

## Environment Strategy

### Three Environments

| Environment | URL | Test Scope | Credentials |
|-------------|-----|------------|-------------|
| Local | `localhost:3000` | Full (optional) | Local test user |
| Staging | `staging.recaprabbit.com` | Full CRUD | `E2E_STAGING_*` env vars |
| Production | `recaprabbit.com` | Read-only smoke | `E2E_PROD_*` env vars |

### Test User Strategy

**Staging:**
- Test user: `royfrenk+staging@gmail.com`
- Full permissions, can create/delete data
- Tests clean up after themselves
- Pre-seed with known test subscription for consistent testing

**Production:**
- Test user: `royfrenk+prod@gmail.com`
- Only runs smoke tests (no data mutations)
- Tests: login works, pages load, existing data displays

### Environment Variables

```bash
# e2e/.env.staging
BASE_URL=https://staging.recaprabbit.com
E2E_USER_EMAIL=royfrenk+staging@gmail.com
E2E_USER_PASSWORD=<from-github-secrets>
E2E_TEST_SUBSCRIPTION_ID=<pre-created-subscription>
E2E_TEST_EPISODE_ID=<pre-processed-episode>

# e2e/.env.production
BASE_URL=https://recaprabbit.com
E2E_USER_EMAIL=royfrenk+prod@gmail.com
E2E_USER_PASSWORD=<from-github-secrets>
E2E_READONLY=true
```

---

## Test Suites

### 1. Authentication (`auth.spec.ts`)

| Test | Staging | Prod |
|------|---------|------|
| Sign up with email/password | ✓ (cleanup after) | ✗ |
| Log in with valid credentials | ✓ | ✓ |
| Log in with invalid credentials shows error | ✓ | ✓ |
| Protected routes redirect to login | ✓ | ✓ |
| Logout clears session | ✓ | ✓ |

### 2. Search & Discovery (`search.spec.ts`)

| Test | Staging | Prod |
|------|---------|------|
| Search returns results | ✓ | ✓ |
| Click podcast shows episodes | ✓ | ✓ |
| Click episode shows preview | ✓ | ✓ |
| Preview page displays metadata | ✓ | ✓ |
| "Get Summary" button visible when logged in | ✓ | ✓ |

### 3. Subscriptions (`subscriptions.spec.ts`)

| Test | Staging | Prod |
|------|---------|------|
| Subscribe to podcast | ✓ | ✗ |
| Subscriptions list shows subscription | ✓ | ✓ (pre-existing) |
| Subscription detail loads episodes | ✓ | ✓ |
| Toggle pause/active works | ✓ | ✗ |
| "Load More" pagination works | ✓ | ✓ |
| Unsubscribe removes subscription | ✓ | ✗ |

### 4. History & Episodes (`history.spec.ts`)

| Test | Staging | Prod |
|------|---------|------|
| History page loads | ✓ | ✓ |
| Filter by status works | ✓ | ✓ |
| Completed episode shows summary | ✓ | ✓ |
| Summary sections render (takeaways, quotes) | ✓ | ✓ |

### 5. Public Pages (`public.spec.ts`)

| Test | Staging | Prod |
|------|---------|------|
| Public summary page loads without auth | ✓ | ✓ |
| SEO metadata present | ✓ | ✓ |
| Share URL works | ✓ | ✓ |

### 6. Smoke Tests (`smoke.spec.ts`)

Quick tests for production deploy verification:

```typescript
test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});

test('login page accessible', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[type="email"]')).toBeVisible();
});

test('API health check', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
});
```

---

## Handling Long-Running Operations

### The Problem

Episode processing takes 10-15 minutes. We can't wait for completion in E2E tests.

### The Solution

1. **Test initiation only:** Verify processing *starts* correctly
   ```typescript
   test('episode processing initiates', async ({ page }) => {
     // Navigate to preview, click Get Summary
     await page.click('button:has-text("Get Summary")');
     // Verify redirect to episode page
     await expect(page).toHaveURL(/\/episode\//);
     // Verify processing status shown
     await expect(page.locator('text=Processing')).toBeVisible();
     // DON'T wait for completion
   });
   ```

2. **Use pre-processed episodes:** For summary viewing tests, use episodes that were processed during seeding
   ```typescript
   test('completed episode shows summary', async ({ page }) => {
     // Use known pre-processed episode
     await page.goto(`/episode/${process.env.E2E_TEST_EPISODE_ID}`);
     await expect(page.locator('[data-testid="summary"]')).toBeVisible();
   });
   ```

3. **Separate integration test:** For full processing verification, run a separate nightly job (not blocking deploys)

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [develop]
  workflow_dispatch:

jobs:
  e2e-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: ./e2e
        run: npm ci

      - name: Install Playwright browsers
        working-directory: ./e2e
        run: npx playwright install --with-deps chromium

      - name: Wait for staging deploy
        run: sleep 60  # Wait for Railway deploy

      - name: Run E2E tests
        working-directory: ./e2e
        run: npm test
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
          E2E_USER_EMAIL: ${{ secrets.E2E_USER_EMAIL }}
          E2E_USER_PASSWORD: ${{ secrets.E2E_USER_PASSWORD }}

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: e2e/playwright-report/
```

### Deployment Gate

```yaml
# In deploy-to-prod workflow
jobs:
  e2e-staging:
    # ... (run E2E on staging first)

  deploy-prod:
    needs: e2e-staging  # Only runs if E2E passes
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: # Railway deploy
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Tasks:**
1. Create `e2e/` directory structure
2. Initialize Playwright: `npm init playwright@latest`
3. Configure `playwright.config.ts` for staging
4. Create Page Object Model base classes
5. Implement `auth.spec.ts` (login/logout)
6. Set up GitHub Actions workflow

**Acceptance Criteria:**
- [ ] `npm test` runs auth tests against staging
- [ ] GitHub Action triggers on develop push
- [ ] Test artifacts uploaded on failure

### Phase 2: Core Flows (Week 2)

**Tasks:**
1. Implement `search.spec.ts`
2. Implement `subscriptions.spec.ts`
3. Implement `history.spec.ts`
4. Create test user in staging
5. Seed test subscription and episode

**Acceptance Criteria:**
- [ ] All CRUD flows tested in staging
- [ ] Tests clean up after themselves
- [ ] < 5 min total runtime

### Phase 3: Production & Polish (Week 3)

**Tasks:**
1. Implement `smoke.spec.ts` for prod
2. Create read-only prod test user
3. Configure prod environment
4. Add deployment gate to prod workflow
5. Add `public.spec.ts` for SEO verification
6. Documentation

**Acceptance Criteria:**
- [ ] Smoke tests run against prod
- [ ] Prod deploy blocked if staging E2E fails
- [ ] < 1 min smoke test runtime

---

## Estimated Effort

| Phase | Tasks | Estimate |
|-------|-------|----------|
| Phase 1 | Setup + Auth | 4-6 hours |
| Phase 2 | Core flows | 6-8 hours |
| Phase 3 | Prod + Polish | 4-6 hours |
| **Total** | | **14-20 hours** |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Flaky tests | CI failures, lost trust | Playwright auto-retry, explicit waits, stable selectors |
| Slow tests | Blocks deploys | Parallel execution, skip slow tests in smoke |
| Test data pollution | Inconsistent results | Cleanup in `afterEach`, dedicated test accounts |
| Staging/prod drift | False confidence | Run subset against prod nightly |
| Secrets exposure | Security breach | GitHub Secrets, never commit `.env` files |

---

## Success Metrics

1. **Coverage:** 80%+ of critical user paths tested
2. **Reliability:** < 5% flake rate
3. **Speed:** < 5 min staging suite, < 1 min prod smoke
4. **Confidence:** Developers trust E2E to catch regressions

---

## Decisions Made

1. **Test users:** ✅ Roy created `royfrenk+staging@gmail.com` and `royfrenk+prod@gmail.com`
2. **Prod testing scope:** ✅ Read-only smoke tests only (no mutations)
3. **CI gate:** ✅ Staging E2E must pass 100% before prod deploy
4. **Nightly full processing test:** TBD (skip for now, revisit later)
5. **Playwright cloud:** Free tier sufficient for now

---

## Next Steps

1. Roy reviews and approves plan
2. Eng Manager creates task breakdown in roadmap
3. Developer implements Phase 1
4. Review after Phase 1, adjust as needed
