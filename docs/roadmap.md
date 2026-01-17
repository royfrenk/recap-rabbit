# Roadmap

> **Owner:** Roy (adds/removes items)  
> **Managed by:** Eng Manager Agent (prioritizes, breaks down, tracks status)  
> **Last updated:** 2026-01-16

---

## Active Sprint

| Priority | Item | Status | Assigned | Notes |
|----------|------|--------|----------|-------|
| 1 | Fix formatDate duplication | Queued | — | Extract to lib/utils.ts |
| 2 | Add episode pagination | Queued | — | Large podcasts load slowly |
| 3 | Artwork URL validation | Queued | — | Security: potential tracking pixels |

---

## Backlog

| Item | Added | Notes |
|------|-------|-------|
| E2E test infrastructure | 2026-01-16 | Playwright or Cypress, run against staging post-deploy |
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
