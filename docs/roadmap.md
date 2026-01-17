# Roadmap

> **Owner:** Roy (adds/removes items)  
> **Managed by:** Eng Manager Agent (prioritizes, breaks down, tracks status)  
> **Last updated:** 2026-01-16

---

## Active Sprint

| Priority | Item | Status | Assigned | Notes |
|----------|------|--------|----------|-------|
| 1 | E2E test infrastructure - Phase 1 | Queued | — | Setup + Auth tests |
| 2 | E2E test infrastructure - Phase 2 | Queued | — | Core flows (search, subscriptions, history) |
| 3 | E2E test infrastructure - Phase 3 | Queued | — | Prod smoke + CI gate |

---

## Backlog

| Item | Added | Notes |
|------|-------|-------|
| Parallel scheduler for subscription checking | 2026-01-16 | Perf improvement, low priority |
| Episode download feature | 2026-01-16 | — |
| User data export | 2026-01-16 | GDPR compliance |

---

## Suggested (Eng Manager)

> Items Eng Manager identified. Roy approves before moving to Backlog.

| Item | Rationale | Suggested |
|------|-----------|-----------|
| — | — | — |

---

## Completed

| Item | Completed | Commit | Notes |
|------|-----------|--------|-------|
| Artwork URL validation | 2026-01-16 | pending | Frontend lib/image.ts with 29 tests |
| Add episode pagination | 2026-01-16 | pending | Load More button, 100 episodes per page |
| Fix formatDate duplication | 2026-01-16 | pending | Consolidated to lib/date.ts with 36 tests |
| Podcast subscription system | 2026-01-16 | d509a62 | Full feature: subscribe, auto-fetch, batch process |

---

## Task Breakdown Template

When breaking down large items, use this format:

```
### [Item Name]

Parent: [original roadmap item]
Status: [In Progress / Blocked / Complete]

Subtasks:
1. [ ] [Subtask title]
   - Spec: [what to build]
   - Acceptance: [how to verify done]
   - Assigned: [Dev / — ]
   - Status: [Queued / In Progress / In Review / Done]

2. [ ] [Subtask title]
   - Spec: [what to build]
   - Acceptance: [how to verify done]
   - Depends on: [#1, if applicable]
   - Assigned: [Dev / — ]
   - Status: [Queued / In Progress / In Review / Done]
```

---

## Status Definitions

| Status | Meaning |
|--------|---------|
| Queued | Ready to be assigned, not started |
| In Progress | Dev is working on it |
| In Review | Submitted to Reviewer |
| Blocked | Cannot proceed, reason noted |
| Done | Deployed to staging, verified working |
| Released | Merged to main, in production |

---

## Current Task Breakdown

### E2E Test Infrastructure

Parent: E2E test infrastructure (from Backlog)
Status: In Progress
Plan: [docs/E2E_TESTING_PLAN.md](./E2E_TESTING_PLAN.md)

**Phase 1: Foundation**
1. [ ] Create `e2e/` directory with Playwright setup
   - Spec: `npm init playwright@latest`, configure for staging
   - Acceptance: `npm test` runs without errors
   - Status: Queued

2. [ ] Create Page Object Model base classes
   - Spec: `pages/base.page.ts`, `pages/login.page.ts`, `pages/home.page.ts`
   - Acceptance: Reusable page abstractions work
   - Status: Queued

3. [ ] Implement `auth.spec.ts`
   - Spec: Login, logout, protected route redirect tests
   - Acceptance: All auth tests pass against staging
   - Depends on: #1, #2, test user created
   - Status: Queued

4. [ ] Set up GitHub Actions workflow
   - Spec: `.github/workflows/e2e.yml`, runs on develop push
   - Acceptance: E2E runs in CI, artifacts uploaded on failure
   - Depends on: #3
   - Status: Queued

**Phase 2: Core Flows**
5. [ ] Implement `search.spec.ts`
   - Spec: Search, results, podcast view, episode preview
   - Acceptance: All search flow tests pass
   - Depends on: Phase 1 complete
   - Status: Queued

6. [ ] Implement `subscriptions.spec.ts`
   - Spec: Subscribe, list, detail, pagination, unsubscribe
   - Acceptance: All subscription tests pass
   - Depends on: #5
   - Status: Queued

7. [ ] Implement `history.spec.ts`
   - Spec: History page, filters, episode summary view
   - Acceptance: All history tests pass
   - Depends on: Pre-processed test episode seeded
   - Status: Queued

**Phase 3: Production & Polish**
8. [ ] Implement `smoke.spec.ts` for production
   - Spec: Read-only tests (login, pages load, data displays)
   - Acceptance: < 1 min runtime, no mutations
   - Status: Queued

9. [ ] Add CI gate to block prod deploy
   - Spec: Prod deploy workflow requires staging E2E pass
   - Acceptance: Prod deploy fails if staging E2E fails
   - Depends on: #8
   - Status: Queued

10. [ ] Implement `public.spec.ts`
    - Spec: Public summary pages, SEO meta tags
    - Acceptance: All public page tests pass
    - Status: Queued

**Blockers:**
- [x] Roy creates test users: `royfrenk+staging@gmail.com` (staging), `royfrenk+prod@gmail.com` (prod) ✓
- [ ] Credentials added to GitHub Secrets: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `STAGING_URL`
