import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers import episodes, search, usage, auth
from app.db.database import init_database
from app.db import repository

load_dotenv()

# CORS origins - allow localhost and production domain
CORS_ORIGINS = [
    "http://localhost:3000",
    "https://localhost:3000",
    "https://recaprabbit.com",
    "https://www.recaprabbit.com",
]
# Add custom origins from environment
if os.getenv("CORS_ORIGINS"):
    CORS_ORIGINS.extend(os.getenv("CORS_ORIGINS").split(","))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    # Startup
    await init_database()
    print("Database initialized")

    # Check for incomplete episodes
    incomplete = await repository.get_incomplete_episodes()
    if incomplete:
        print(f"Found {len(incomplete)} incomplete episode(s) that can be resumed:")
        for ep in incomplete:
            print(f"  - {ep['title'] or ep['id']} (status: {ep['status']})")

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
