import os
import httpx
from typing import Optional

from app.db.repository import log_usage


async def search_podcasts(query: str, limit: int = 10) -> dict:
    """
    Search for podcast episodes using Listen Notes API.
    First searches for podcasts, then gets recent episodes from top matches.
    """
    api_key = os.getenv("LISTEN_NOTES_API_KEY")

    if not api_key:
        return {
            "results": [],
            "total": 0,
            "message": "Listen Notes API key not configured. Please use direct URL input."
        }

    try:
        async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
            # Step 1: Search for podcasts (not episodes) to find the right show
            podcast_response = await client.get(
                "https://listen-api.listennotes.com/api/v2/search",
                params={
                    "q": query,
                    "type": "podcast",
                    "offset": 0,
                    "limit": 3  # Get top 3 matching podcasts
                },
                headers={
                    "X-ListenAPI-Key": api_key
                }
            )
            podcast_response.raise_for_status()
            podcast_data = podcast_response.json()

            results = []
            podcasts_found = podcast_data.get("results", [])

            if podcasts_found:
                # Step 2: Get recent episodes from the top matching podcasts
                for podcast in podcasts_found[:2]:  # Top 2 podcasts
                    podcast_id = podcast.get("id")
                    podcast_name = podcast.get("title_original", "")
                    thumbnail = podcast.get("thumbnail", "")

                    # Get recent episodes from this podcast
                    episodes_response = await client.get(
                        f"https://listen-api.listennotes.com/api/v2/podcasts/{podcast_id}",
                        params={
                            "sort": "recent_first"
                        },
                        headers={
                            "X-ListenAPI-Key": api_key
                        }
                    )

                    if episodes_response.status_code == 200:
                        episodes_data = episodes_response.json()
                        episodes = episodes_data.get("episodes", [])[:5]  # Latest 5 episodes per podcast

                        for ep in episodes:
                            results.append({
                                "id": ep.get("id", ""),
                                "title": ep.get("title", ""),
                                "podcast_name": podcast_name,
                                "description": ep.get("description", "")[:500] if ep.get("description") else None,
                                "audio_url": ep.get("audio", ""),
                                "thumbnail": thumbnail or ep.get("thumbnail", ""),
                                "duration_seconds": ep.get("audio_length_sec"),
                                "publish_date": ep.get("pub_date_ms")
                            })

            # If no podcasts found, fall back to episode search
            if not results:
                episode_response = await client.get(
                    "https://listen-api.listennotes.com/api/v2/search",
                    params={
                        "q": query,
                        "type": "episode",
                        "len_min": 1,
                        "len_max": 180,
                        "sort_by_date": 0,
                        "offset": 0,
                        "limit": limit
                    },
                    headers={
                        "X-ListenAPI-Key": api_key
                    }
                )
                episode_response.raise_for_status()
                data = episode_response.json()

                for item in data.get("results", []):
                    results.append({
                        "id": item.get("id", ""),
                        "title": item.get("title_original", ""),
                        "podcast_name": item.get("podcast", {}).get("title_original", ""),
                        "description": item.get("description_original", "")[:500] if item.get("description_original") else None,
                        "audio_url": item.get("audio", ""),
                        "thumbnail": item.get("thumbnail", ""),
                        "duration_seconds": item.get("audio_length_sec"),
                        "publish_date": item.get("pub_date_ms")
                    })

            # Log usage (count API calls made)
            api_calls = 1  # Initial podcast search
            api_calls += min(len(podcasts_found), 2)  # Episode fetches for top 2 podcasts
            if not results:
                api_calls += 1  # Fallback episode search

            await log_usage(
                service="listennotes",
                operation="search",
                input_units=api_calls,
                output_units=len(results),
                cost_usd=0,  # Free tier
                metadata={
                    "query": query,
                    "results_count": len(results)
                }
            )

            return {
                "results": results[:limit],
                "total": len(results)
            }
    except Exception as e:
        return {
            "results": [],
            "total": 0,
            "message": f"Search error: {str(e)}. Try using direct URL input instead."
        }


async def get_episode_details(episode_id: str) -> Optional[dict]:
    """Get detailed information about a specific episode."""
    api_key = os.getenv("LISTEN_NOTES_API_KEY")

    if not api_key:
        return None

    try:
        async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
            response = await client.get(
                f"https://listen-api.listennotes.com/api/v2/episodes/{episode_id}",
                headers={
                    "X-ListenAPI-Key": api_key
                }
            )

            if response.status_code == 404:
                return None

            response.raise_for_status()
            data = response.json()

            return {
                "id": data.get("id", ""),
                "title": data.get("title", ""),
                "podcast_name": data.get("podcast", {}).get("title", ""),
                "description": data.get("description", ""),
                "audio_url": data.get("audio", ""),
                "thumbnail": data.get("thumbnail", ""),
                "duration_seconds": data.get("audio_length_sec"),
                "publish_date": data.get("pub_date_ms")
            }
    except Exception:
        return None
