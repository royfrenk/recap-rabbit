# Deployment Configuration

## Git Branch Structure

| Branch    | Purpose                | Auto-deploys to |
|-----------|------------------------|-----------------|
| `main`    | Production code        | Production      |
| `develop` | Staging/integration    | Staging         |
| `staging` | Feature work (temp)    | -               |

### Workflow

1. Create feature branches from `develop`
2. Merge features into `develop` → triggers **staging** deployment
3. When ready for production, merge `develop` into `main` → triggers **production** deployment

```
feature/* → develop (staging) → main (production)
```

---

## Railway Setup

**Project:** `recap-rabbit`

### Environments

| Environment | Branch    | Services                          |
|-------------|-----------|-----------------------------------|
| staging     | `develop` | recap-rabbit-BE, recap-rabbit-FE  |
| production  | `main`    | recap-rabbit-BE, recap-rabbit-FE  |

### Services

#### Backend (`recap-rabbit-BE`)
- **Location:** `/backend`
- **Builder:** nixpacks
- **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health check:** `/health` (timeout: 300s)
- **Restart policy:** on_failure

#### Frontend (`recap-rabbit-FE`)
- **Location:** `/frontend`
- **Builder:** nixpacks
- **Start command:** `npm run start`

---

## Railway CLI Commands

```bash
# Check current project/environment
railway status

# Deploy manually (if needed)
cd backend && railway up
cd frontend && railway up

# View logs
railway logs

# Open Railway dashboard
railway open
```

---

## Deployment Checklist

### To deploy to Staging:
```bash
git checkout develop
git merge <feature-branch>
git push origin develop
# Railway auto-deploys from develop branch
```

### To deploy to Production:
```bash
git checkout main
git merge develop
git push origin main
# Railway auto-deploys from main branch
```

---

## Environment Variables

Environment variables are configured in the Railway dashboard for each environment.
Check Railway dashboard → Project → Environment → Variables for the full list.

Common variables:
- `DATABASE_URL` - SQLite/PostgreSQL connection
- `BACKEND_URL` - Backend API URL (for frontend)
- `ANTHROPIC_API_KEY` - Claude API key
- `ASSEMBLYAI_API_KEY` - AssemblyAI transcription
- `LISTENNOTES_API_KEY` - Podcast search API
