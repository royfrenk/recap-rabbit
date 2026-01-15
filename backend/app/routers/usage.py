"""
API endpoints for usage statistics and cost tracking.
Admin only - requires royfrenk@gmail.com account.
"""
from fastapi import APIRouter, Query, Depends
from app.db import repository
from app.routers.auth import require_admin

router = APIRouter()


@router.get("")
async def get_usage_stats(
    admin: dict = Depends(require_admin),
    days: int = Query(30, ge=1, le=365)
):
    """
    Get API usage statistics and costs.
    Admin only.

    Returns aggregated usage by service, daily breakdown, and recent logs.
    """
    stats = await repository.get_usage_stats(days)
    return stats


@router.get("/pricing")
async def get_pricing(admin: dict = Depends(require_admin)):
    """Get current API pricing information. Admin only."""
    return {
        "assemblyai": {
            "service": "AssemblyAI",
            "description": "Audio transcription with speaker diarization",
            "pricing": "$0.37 per audio hour"
        },
        "anthropic": {
            "service": "Anthropic Claude",
            "description": "Speaker identification and summarization",
            "pricing": "$3 per million input tokens, $15 per million output tokens"
        },
        "listennotes": {
            "service": "Listen Notes",
            "description": "Podcast search",
            "pricing": "Free tier (limited requests)"
        }
    }
