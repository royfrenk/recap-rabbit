# Project State

> **Purpose:** Current state of the Podcatchup codebase  
> **Updated by:** Developer Agent after each completed task  
> **Last updated:** 2026-01-16 (commit d509a62)

---

## Project Location

```
/Users/royfrenkiel/projects/podcatchup
```

---

## File Structure

```
├── backend/                          # FastAPI Python backend
│   ├── app/
│   │   ├── main.py                   # App entry, APScheduler setup
│   │   ├── routers/
│   │   │   ├── auth.py               # Authentication endpoints
│   │   │   └── subscriptions.py      # Subscription API endpoints
│   │   ├── services/
│   │   │   └── subscription_checker.py  # RSS fetching, SSRF protection, episode processing
│   │   ├── db/
│   │   │   ├── database.py           # Database setup, table definitions
│   │   │   └── repository.py         # CRUD functions
│   │   └── models/
│   │       └── schemas.py            # Pydantic models
│   ├── tests/
│   │   ├── test_subscription_checker.py  # 42 SSRF protection tests
│   │   └── test_subscriptions_api.py     # 17 API endpoint tests
│   ├── data/
│   │   └── podcatchup.db             # SQLite database
│   └── requirements.txt
│
└── frontend/                         # Next.js 14 frontend
    ├── app/
    │   ├── page.tsx                  # Home page (has SubscribeButton)
    │   └── subscriptions/
    │       ├── page.tsx              # Subscription list page
    │       └── [id]/page.tsx         # Subscription detail page
    ├── components/
    │   ├── Header.tsx                # Nav with Subscriptions link
    │   ├── SubscribeButton.tsx       # Subscribe button for search results
    │   ├── SubscriptionCard.tsx      # Subscription card with actions
    │   ├── EpisodeSelector.tsx       # Episode selection with date filters
    │   └── ui/                       # shadcn/ui components
    │       ├── checkbox.tsx
    │       ├── label.tsx
    │       └── switch.tsx
    ├── lib/
    │   ├── api.ts                    # API client, types, fetch functions
    │   ├── date.ts                   # Shared date/duration formatting utilities
    │   └── image.ts                  # Image URL validation (prevents tracking pixels)
    ├── tests/
    │   ├── date.test.ts              # 36 date formatting tests
    │   ├── image.test.ts             # 29 image URL validation tests
    │   └── subscription-api.test.ts  # 14 subscription API tests
    ├── vitest.config.ts
    └── package.json
```

---

## Database Schema

SQLite database at `backend/data/podcatchup.db`

```sql
-- Podcast subscriptions
CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    podcast_id TEXT NOT NULL,
    podcast_name TEXT NOT NULL,
    feed_url TEXT NOT NULL,
    artwork_url TEXT,
    is_active INTEGER DEFAULT 1,
    last_checked_at TIMESTAMP,
    last_episode_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, podcast_id)
);

-- Episodes per subscription
CREATE TABLE subscription_episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    episode_guid TEXT NOT NULL,
    episode_title TEXT,
    audio_url TEXT,
    publish_date TIMESTAMP,
    duration_seconds REAL,
    episode_id TEXT,  -- Links to episodes table when processed
    status TEXT DEFAULT 'pending',  -- pending|processing|completed|skipped|failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subscription_id, episode_guid)
);
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/subscriptions | List user's subscriptions |
| POST | /api/subscriptions | Subscribe to podcast |
| GET | /api/subscriptions/{id} | Get subscription with episodes |
| PUT | /api/subscriptions/{id} | Toggle active/pause |
| DELETE | /api/subscriptions/{id} | Unsubscribe |
| GET | /api/subscriptions/{id}/episodes | List episodes with filters |
| POST | /api/subscriptions/{id}/check | Check for new episodes |
| POST | /api/subscriptions/{id}/process-batch | Process selected episodes (max 19) |

All endpoints require JWT auth via `Depends(require_user)`.

---

## Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Backend | FastAPI + Python | 3.10.11 |
| Frontend | Next.js (App Router) | 14 |
| Database | SQLite | - |
| Scheduling | APScheduler | - |
| RSS parsing | feedparser | - |
| UI components | shadcn/ui | - |
| Backend tests | pytest | - |
| Frontend tests | vitest | - |

---

## Test Counts

| Suite | Count | Last run |
|-------|-------|----------|
| Backend | 130 | 2026-01-16 |
| Frontend | 79 | 2026-01-16 |

---

## Known Issues

> Remove items from this list when fixed. Add new issues when discovered.

| Issue | Location | Severity | Notes |
|-------|----------|----------|-------|
| Sequential scheduler | `check_all_active_subscriptions()` | Low | Processes subscriptions one-by-one |

---

## Environment

| Variable | Location | Notes |
|----------|----------|-------|
| JWT_SECRET | `backend/app/routers/auth.py` | Required env var, no default (generate with `openssl rand -hex 32`) |
| Database path | `backend/data/podcatchup.db` | SQLite file |

---

## Infrastructure

### Git Branch Structure

| Branch | Purpose | Auto-deploys to |
|--------|---------|-----------------|
| `main` | Production code | Production |
| `develop` | Staging/integration | Staging |
| `feature/*` | Feature work | — |

**Workflow:**
```
feature/* → develop (staging) → main (production)
```

### Railway Setup

**Project:** `recap-rabbit`

| Environment | Branch | Services |
|-------------|--------|----------|
| staging | `develop` | recap-rabbit-BE, recap-rabbit-FE |
| production | `main` | recap-rabbit-BE, recap-rabbit-FE |

### Services

| Service | Location | Start Command |
|---------|----------|---------------|
| recap-rabbit-BE | `/backend` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| recap-rabbit-FE | `/frontend` | `npm run start` |

Both use nixpacks builder. Backend has health check at `/health`.

### Environment Variables

Configured in Railway dashboard per environment:
- `DATABASE_URL`
- `BACKEND_URL`
- `ANTHROPIC_API_KEY`
- `ASSEMBLYAI_API_KEY`
- `LISTENNOTES_API_KEY`

---

## Git State

- **Branch:** develop
- **Last commit:** d509a62 - "Add podcast subscription feature with auto-processing"

---

## Recent Changes

> Add new entries at the top. Keep last 10 entries.

| Date | Change | Commit |
|------|--------|--------|
| 2026-01-16 | Made JWT_SECRET a required env var (security fix) | pending |
| 2026-01-16 | Added frontend image URL validation (lib/image.ts) to prevent tracking pixels | 8bceb13 |
| 2026-01-16 | Added episode pagination with Load More button | 8bceb13 |
| 2026-01-16 | Consolidated date formatting to shared lib/date.ts utility | 8bceb13 |
| 2026-01-16 | Added podcast subscription system with RSS fetching, auto-processing, batch processing | d509a62 |

---

## Commands

### Run Backend (Local)
```bash
cd backend && source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Run Frontend (Local)
```bash
cd frontend && npm run dev
```

### Run Tests
```bash
# Backend
cd backend && source venv/bin/activate && pytest tests/ -v

# Frontend
cd frontend && npm test
```

### Deploy to Staging
```bash
git checkout develop
git merge <feature-branch>
git push origin develop
# Railway auto-deploys from develop branch
```

### Deploy to Production (Roy only)
```bash
git checkout main
git merge develop
git push origin main
# Railway auto-deploys from main branch
```

### Rollback Production (Roy only)
```bash
# Revert the merge commit
git revert -m 1 HEAD
git push origin main

# Or hard reset (if revert is messy)
git reset --hard HEAD~1
git push origin main --force
```

### Railway CLI
```bash
railway status          # Check current project/environment
railway logs            # View logs
railway open            # Open Railway dashboard
```

### Generate Test JWT
```bash
cd backend && source venv/bin/activate && python3 -c "
import jwt
from datetime import datetime, timedelta
token = jwt.encode({'sub': 'test-user', 'exp': datetime.utcnow() + timedelta(hours=24)}, 'your-secret-key-change-in-production', algorithm='HS256')
print(token)
"
```
