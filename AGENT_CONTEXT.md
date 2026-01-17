# Agent Context Export - Podcast Subscription Feature

**Exported:** 2026-01-16
**Branch:** `staging` (commit `d509a62`)
**Project:** PodCatchup (Recap Rabbit)

---

## Project Location

```
/Users/royfrenkiel/projects/podcatchup
├── backend/          # FastAPI Python backend
└── frontend/         # Next.js 14 frontend
```

---

## What Was Implemented

A **podcast subscription system** allowing users to:
- Subscribe to podcasts via search or Apple Podcasts URL
- Auto-fetch episodes from RSS feeds
- Auto-process new episodes every 6 hours (APScheduler)
- Batch-process up to 19 past episodes manually
- Toggle subscriptions active/paused
- Filter episodes by date range (last week/month/3 months/custom)

---

## Database Schema

Two new tables in SQLite (`backend/data/podcatchup.db`):

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

## Key Files

### Backend (New)
| File | Purpose |
|------|---------|
| `backend/app/routers/subscriptions.py` | API endpoints for subscriptions |
| `backend/app/services/subscription_checker.py` | RSS fetching, SSRF protection, episode processing |
| `backend/tests/test_subscription_checker.py` | 42 SSRF protection tests |
| `backend/tests/test_subscriptions_api.py` | 17 API endpoint tests |

### Backend (Modified)
| File | Changes |
|------|---------|
| `backend/app/db/database.py` | Added subscription tables |
| `backend/app/db/repository.py` | Added 15+ CRUD functions for subscriptions |
| `backend/app/models/schemas.py` | Added Pydantic models |
| `backend/app/main.py` | Registered router, added APScheduler |
| `backend/requirements.txt` | Added apscheduler, feedparser, pytest |

### Frontend (New)
| File | Purpose |
|------|---------|
| `frontend/app/subscriptions/page.tsx` | Subscription list page |
| `frontend/app/subscriptions/[id]/page.tsx` | Subscription detail page |
| `frontend/components/SubscribeButton.tsx` | Subscribe button for search results |
| `frontend/components/SubscriptionCard.tsx` | Subscription card with actions |
| `frontend/components/EpisodeSelector.tsx` | Episode selection with date filters |
| `frontend/components/ui/checkbox.tsx` | shadcn/ui checkbox |
| `frontend/components/ui/label.tsx` | shadcn/ui label |
| `frontend/components/ui/switch.tsx` | shadcn/ui switch |
| `frontend/tests/subscription-api.test.ts` | 14 unit tests |
| `frontend/vitest.config.ts` | Vitest configuration |

### Frontend (Modified)
| File | Changes |
|------|---------|
| `frontend/app/page.tsx` | Added SubscribeButton to podcast view |
| `frontend/components/Header.tsx` | Added Subscriptions nav link |
| `frontend/lib/api.ts` | Added subscription types and API functions |
| `frontend/package.json` | Added test dependencies, vitest scripts |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/subscriptions` | List user's subscriptions |
| `POST` | `/api/subscriptions` | Subscribe to podcast |
| `GET` | `/api/subscriptions/{id}` | Get subscription with episodes |
| `PUT` | `/api/subscriptions/{id}` | Toggle active/pause |
| `DELETE` | `/api/subscriptions/{id}` | Unsubscribe |
| `GET` | `/api/subscriptions/{id}/episodes` | List episodes with filters |
| `POST` | `/api/subscriptions/{id}/check` | Check for new episodes |
| `POST` | `/api/subscriptions/{id}/process-batch` | Process selected episodes (max 19) |

---

## Security

### SSRF Protection
`validate_feed_url()` in `subscription_checker.py` blocks:
- `localhost`, `127.0.0.1`, `0.0.0.0`, `::1`
- Private IPs: `10.x.x.x`, `192.168.x.x`, `172.16-31.x.x`
- Non-HTTP schemes: `file://`, `ftp://`, `gopher://`, etc.

Validation happens **before** database insert in `create_subscription` endpoint.

### Authentication
All endpoints use `Depends(require_user)` - JWT required.

---

## Running the Project

### Backend
```bash
cd /Users/royfrenkiel/projects/podcatchup/backend
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd /Users/royfrenkiel/projects/podcatchup/frontend
npm run dev
# Runs on http://localhost:3000
```

### Run Tests
```bash
# Backend (59 tests)
cd backend && source venv/bin/activate && pytest tests/ -v

# Frontend (14 tests)
cd frontend && npm test
```

---

## Test Results

```
Backend:  59 passed in 0.61s
Frontend: 14 passed in 602ms
```

---

## Known Issues / TODOs from Code Review

1. **Duplicate `formatDate` functions** - Same function in 3 files, should extract to shared utility
2. **Image URL validation** - `artwork_url` from RSS displayed without validation (potential tracking pixels)
3. **No pagination on initial fetch** - Large podcasts (800+ episodes) loaded all at once
4. **Sequential scheduler** - `check_all_active_subscriptions()` processes subscriptions one-by-one

---

## Git State

```bash
# Current branch
git branch
# * staging

# Last commit
git log -1 --oneline
# d509a62 Add podcast subscription feature with auto-processing

# To push
git push -u origin staging
```

---

## Environment

- **Python:** 3.10.11
- **Node:** (check with `node -v`)
- **Database:** SQLite at `backend/data/podcatchup.db`
- **JWT Secret:** `your-secret-key-change-in-production` (in `backend/app/routers/auth.py`)

---

## Quick Test Commands

```bash
# Generate test JWT token
cd backend && source venv/bin/activate && python3 -c "
import jwt
from datetime import datetime, timedelta
token = jwt.encode({'sub': 'test-user', 'exp': datetime.utcnow() + timedelta(hours=24)}, 'your-secret-key-change-in-production', algorithm='HS256')
print(token)
"

# Test subscription API
TOKEN="<token from above>"
curl -s http://localhost:8000/api/subscriptions -H "Authorization: Bearer $TOKEN"
```
