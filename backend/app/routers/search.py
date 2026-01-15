from fastapi import APIRouter, Query

from app.models.schemas import SearchResponse
from app.services.podcast_search import search_podcasts, get_episode_details

router = APIRouter()


@router.get("")
async def search(
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Number of results")
):
    """Search for podcast episodes."""
    result = await search_podcasts(q, limit)
    return result


@router.get("/{episode_id}")
async def get_episode(episode_id: str):
    """Get details for a specific episode from search results."""
    result = await get_episode_details(episode_id)
    if result is None:
        return {"error": "Episode not found or API not configured"}
    return result
