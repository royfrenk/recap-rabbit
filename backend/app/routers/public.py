"""
Public API endpoints - no authentication required.
Used for SEO public summary pages.
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

from app.db import repository
from app.models.schemas import PublicSummaryResponse

router = APIRouter()


@router.get("/summary/{slug}", response_model=PublicSummaryResponse)
async def get_public_summary(slug: str):
    """
    Get a public episode summary by its slug.
    No authentication required - this is for SEO public pages.
    """
    episode = await repository.get_public_episode_by_slug(slug)

    if not episode:
        raise HTTPException(status_code=404, detail="Summary not found")

    return PublicSummaryResponse(
        slug=episode.slug,
        title=episode.title,
        podcast_name=episode.podcast_name,
        description=episode.description,
        summary=episode.summary,
        duration_seconds=episode.duration_seconds,
        language_code=episode.language_code,
        created_at=episode.created_at
    )


@router.get("/summaries", response_model=List[Dict[str, Any]])
async def list_public_summaries(limit: int = 100):
    """
    List all public summaries.
    Used for sitemap generation and discovery.
    """
    summaries = await repository.get_all_public_episodes(limit=limit)
    return summaries
