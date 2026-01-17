# E2E Test Cases

> Edit this file to add new test cases. Developer will implement them in the corresponding spec files.

## Auth Tests (`tests/auth.spec.ts`)

| Test Name | User Action | Expected Result | Env |
|-----------|-------------|-----------------|-----|
| displays login form | Navigate to /login | Email input, password input, and login button are visible | Staging |
| has link to signup page | Navigate to /login, click signup link | Redirected to /signup | Staging |
| successful login redirects to home | Enter valid credentials, click login | Redirected away from /login | Staging |
| invalid credentials show error | Enter invalid credentials, click login | Error message is displayed | Staging |
| empty form shows validation | Click login without entering credentials | Stays on /login (form doesn't submit) | Staging |
| subscriptions page redirects when not authenticated | Navigate to /subscriptions without logging in | Redirected to /login | Staging |
| history page requires authentication | Navigate to /history without logging in | Redirected to /login or shows auth message | Staging |
| usage page requires authentication | Navigate to /usage without logging in | Redirected to /login or shows auth message | Staging |
| can access subscriptions page after login | Log in, navigate to /subscriptions | Page loads, URL stays on /subscriptions | Staging |
| can access history page after login | Log in, navigate to /history | Page loads, URL stays on /history | Staging |
| logout clears session | Log in, click logout, try to access /subscriptions | Redirected to /login | Staging |


## Smoke Tests (`tests/smoke.spec.ts`)

| Test Name | User Action | Expected Result | Env |
|-----------|-------------|-----------------|-----|
| homepage loads | Navigate to / | Page has content (search input or heading visible) | Prod |
| login page loads | Navigate to /login | Email and password inputs are visible | Prod |
| signup page loads | Navigate to /signup | Email and password inputs are visible | Prod |
| login works with valid credentials | Enter valid credentials on /login | Redirected away from /login | Prod |
| subscriptions page loads | Log in, navigate to /subscriptions | Page loads without errors | Prod |
| history page loads | Log in, navigate to /history | Page loads without errors | Prod |
| usage page loads | Log in, navigate to /usage | Page loads without errors | Prod |
| health endpoint responds | GET /api/health | Returns 200 OK | Prod |
| search API responds | GET /api/search?q=test&limit=1 | Returns 200 OK | Prod |

---

## Search & Discovery Tests (`tests/search.spec.ts`)

| Test Name | User Action | Expected Result | Env |
|-----------|-------------|-----------------|-----|
| search returns results | Enter search term, submit | Results are displayed | Staging |
| click podcast shows episodes | Click on a podcast from results | Episode list is displayed | Staging |
| click episode shows preview | Click on an episode | Preview page loads with metadata | Staging |
| "Get Summary" button visible when logged in | Log in, view episode preview | "Get Summary" button is visible | Staging |
| clicking Get Summary starts processing | Click Get Summary button | Navigates to episode processing page | Staging |

---

## Subscriptions Tests (`tests/subscriptions.spec.ts`)

| Test Name | User Action | Expected Result | Env |
|-----------|-------------|-----------------|-----|
| subscriptions page loads | Navigate to /subscriptions | Page title is visible | Staging |
| shows subscriptions or empty state | Navigate to /subscriptions | Either subscriptions or empty message shown | Staging |
| subscription detail loads episodes | Click on a subscription | Episodes are listed | Staging |
| "Load More" pagination works | Click Load More button | More episodes appear | Staging |
| subscribe to podcast | Search for podcast, click subscribe | Podcast appears in subscriptions list | Staging |

---

## History Tests (`tests/history.spec.ts`)

| Test Name | User Action | Expected Result | Env |
|-----------|-------------|-----------------|-----|
| history page loads | Navigate to /history | Page title is visible | Staging |
| shows episodes or empty state | Navigate to /history | Either episodes or empty message shown | Staging |
| filter by status works | Click filter buttons | Filters change without error | Staging |
| queue filter shows queued episodes | Click Queue filter | Shows queue view | Staging |
| clicking episode navigates to detail | Click on an episode | Navigates to /episode/ page | Staging |
| completed episode shows summary | Click on completed episode | Summary content is displayed | Staging |

---

## Adding a New Test

1. Add the test case to this document first
2. Developer implements in the appropriate spec file
3. Follow Page Object Model pattern (selectors in `pages/`, logic in `tests/`)
4. Run locally: `cd e2e && npm run test:staging`

## Test User Credentials

Stored in GitHub Secrets:
- `E2E_USER_EMAIL` - Test user email
- `E2E_USER_PASSWORD` - Test user password
- `STAGING_HTTP_USER` - HTTP Basic Auth for staging
- `STAGING_HTTP_PASS` - HTTP Basic Auth for staging
