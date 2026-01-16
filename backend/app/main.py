import os
import sys
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# Early startup logging
print(f"Starting Recap Rabbit API...", flush=True)
print(f"Python version: {sys.version}", flush=True)
print(f"Current directory: {os.getcwd()}", flush=True)
print(f"Directory contents: {os.listdir('.')}", flush=True)

try:
    print("Importing routers...", flush=True)
    from app.routers import episodes, search, usage, auth
    print("Importing database...", flush=True)
    from app.db.database import init_database
    print("Importing repository...", flush=True)
    from app.db import repository
    print("All imports successful", flush=True)
except Exception as e:
    print(f"Import error: {e}", flush=True)
    traceback.print_exc()
    raise

# CORS origins - allow localhost, staging, and production domains
CORS_ORIGINS = [
    "http://localhost:3000",
    "https://localhost:3000",
    "https://staging.recaprabbit.com",
    "https://recaprabbit.com",
    "https://www.recaprabbit.com",
]
# Add custom origins from environment
if os.getenv("CORS_ORIGINS"):
    CORS_ORIGINS.extend(os.getenv("CORS_ORIGINS").split(","))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    try:
        # Startup
        print("Initializing database...", flush=True)
        await init_database()
        print("Database initialized successfully", flush=True)

        # Check for incomplete episodes
        incomplete = await repository.get_incomplete_episodes()
        if incomplete:
            print(f"Found {len(incomplete)} incomplete episode(s) that can be resumed:", flush=True)
            for ep in incomplete:
                print(f"  - {ep['title'] or ep['id']} (status: {ep['status']})", flush=True)

        print("Startup complete, ready to serve requests", flush=True)
    except Exception as e:
        print(f"Startup error: {e}", flush=True)
        traceback.print_exc()
        raise

    yield
    # Shutdown (nothing needed)


app = FastAPI(
    title="Recap Rabbit API",
    description="Podcast transcription and summarization API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(episodes.router, prefix="/api/episodes", tags=["episodes"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(usage.router, prefix="/api/usage", tags=["usage"])


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
