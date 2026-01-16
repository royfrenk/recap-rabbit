from fastapi import APIRouter, Query
from typing import List

from app.models.schemas import SearchResponse
from app.services.podcast_search import (
    search_podcasts,
    get_episode_details,
    lookup_podcast_by_url,
    lookup_podcast_by_id,
    parse_podcast_url
)
from app.db.repository import log_search, get_popular_searches

router = APIRouter()

# Default popular searches (fallback when no search history)
DEFAULT_POPULAR = [
    "tim ferriss productivity",
    "huberman lab sleep",
    "lex fridman ai",
    "joe rogan science",
]


@router.get("/popular", response_model=List[str])
async def popular_searches(
    limit: int = Query(6, ge=1, le=20, description="Number of results")
):
    """Get the most popular search queries."""
    searches = await get_popular_searches(limit=limit)
    # Return defaults if no search history yet
    if not searches:
        return DEFAULT_POPULAR[:limit]
    return searches


@router.get("")
async def search(
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Number of results")
):
    """Search for podcast episodes."""
    result = await search_podcasts(q, limit)

    # Log the search for popular searches tracking
    results_count = len(result.get("results", [])) if isinstance(result, dict) else 0
    await log_search(query=q, results_count=results_count)

    return result


@router.get("/podcast/lookup")
async def lookup_podcast(
    url: str = Query(..., description="Apple Podcasts URL"),
    limit: int = Query(20, ge=1, le=100, description="Number of episodes to return")
):
    """
    Look up a podcast by its Apple Podcasts URL and return episodes.

    Supports URLs like:
    - https://podcasts.apple.com/us/podcast/podcast-name/id1234567890
    """
    result = await lookup_podcast_by_url(url, limit)
    return result


@router.get("/podcast/{podcast_id}")
async def get_podcast_episodes(
    podcast_id: str,
    limit: int = Query(50, ge=1, le=100, description="Number of episodes to return")
):
    """
    Get episodes for a specific podcast by its Apple/iTunes ID.

    Returns episodes sorted by publish date (newest first).
    """
    result = await lookup_podcast_by_id(podcast_id, limit)
    return result


@router.get("/{episode_id}")
async def get_episode(episode_id: str):
    """Get details for a specific episode from search results."""
    result = await get_episode_details(episode_id)
    if result is None:
        return {"error": "Episode not found or API not configured"}
    return result
