"""
Subscription management endpoints.
"""
import uuid
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Depends

from app.models.schemas import (
    Subscription,
    SubscriptionEpisode,
    SubscriptionEpisodeStatus,
    SubscriptionWithEpisodes,
    SubscriptionCreateRequest,
    SubscriptionUpdateRequest,
    SubscriptionListResponse,
    BatchProcessRequest,
    CheckEpisodesResponse
)
from app.db import repository
from app.routers.auth import require_user

router = APIRouter()

# Maximum episodes that can be batch-processed at once.
# Set to 19 to keep total processing manageable and avoid timeouts.
# Each episode takes ~10-15 minutes to process (download + transcribe + summarize).
# Processing 19 episodes could take 3-5 hours.
MAX_BATCH_SIZE = 19

# Valid status values for subscription episodes
VALID_EPISODE_STATUSES = {'pending', 'processing', 'completed', 'skipped', 'failed'}


def _row_to_subscription(row: dict) -> Subscription:
    """Convert database row to Subscription model."""
    return Subscription(
        id=row['id'],
        user_id=row['user_id'],
        podcast_id=row['podcast_id'],
        podcast_name=row['podcast_name'],
        feed_url=row['feed_url'],
        artwork_url=row.get('artwork_url'),
        is_active=bool(row.get('is_active', 1)),
        last_checked_at=row.get('last_checked_at'),
        last_episode_date=row.get('last_episode_date'),
        created_at=row.get('created_at'),
        total_episodes=row.get('total_episodes', 0),
        processed_episodes=row.get('processed_episodes', 0)
    )


def _row_to_subscription_episode(row: dict) -> SubscriptionEpisode:
    """Convert database row to SubscriptionEpisode model."""
    return SubscriptionEpisode(
        id=row['id'],
        subscription_id=row['subscription_id'],
        episode_guid=row['episode_guid'],
        episode_title=row.get('episode_title'),
        audio_url=row.get('audio_url'),
        publish_date=row.get('publish_date'),
        duration_seconds=row.get('duration_seconds'),
        episode_id=row.get('episode_id'),
        status=SubscriptionEpisodeStatus(row.get('status', 'pending')),
        created_at=row.get('created_at')
    )


@router.get("", response_model=SubscriptionListResponse)
async def list_subscriptions(user: dict = Depends(require_user)):
    """List all subscriptions for the current user."""
    user_id = user["sub"]
    rows = await repository.get_user_subscriptions(user_id)
    subscriptions = [_row_to_subscription(row) for row in rows]
    return SubscriptionListResponse(subscriptions=subscriptions)


@router.post("", response_model=Subscription)
async def create_subscription(
    request: SubscriptionCreateRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_user)
):
    """Subscribe to a podcast."""
    # Validate feed URL before creating subscription (SSRF protection)
    from app.services.subscription_checker import validate_feed_url, validate_artwork_url
    if not validate_feed_url(request.feed_url):
        raise HTTPException(
            status_code=400,
            detail="Invalid feed URL. Only HTTP/HTTPS URLs to public hosts are allowed."
        )

    # Validate and sanitize artwork URL (SSRF protection)
    # If invalid, we simply don't store the artwork URL rather than rejecting the subscription
    validated_artwork_url = validate_artwork_url(request.artwork_url)

    user_id = user["sub"]
    subscription_id = str(uuid.uuid4())

    success = await repository.create_subscription(
        subscription_id=subscription_id,
        user_id=user_id,
        podcast_id=request.podcast_id,
        podcast_name=request.podcast_name,
        feed_url=request.feed_url,
        artwork_url=validated_artwork_url
    )

    if not success:
        raise HTTPException(status_code=409, detail="Already subscribed to this podcast")

    # Fetch initial episodes in background
    from app.services.subscription_checker import fetch_and_store_episodes
    background_tasks.add_task(fetch_and_store_episodes, subscription_id, request.feed_url)

    # Return the created subscription
    row = await repository.get_subscription(subscription_id)
    return _row_to_subscription(row)


@router.get("/{subscription_id}", response_model=SubscriptionWithEpisodes)
async def get_subscription(
    subscription_id: str,
    user: dict = Depends(require_user),
    status: Optional[str] = Query(None, description="Filter episodes by status"),
    start_date: Optional[str] = Query(None, description="Filter episodes from date (ISO format)"),
    end_date: Optional[str] = Query(None, description="Filter episodes to date (ISO format)"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Get a subscription with its episodes."""
    # Validate status parameter
    if status and status not in VALID_EPISODE_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_EPISODE_STATUSES)}"
        )

    user_id = user["sub"]
    row = await repository.get_subscription(subscription_id, user_id)

    if not row:
        raise HTTPException(status_code=404, detail="Subscription not found")

    subscription = _row_to_subscription(row)

    # Get episodes with filters
    episode_rows = await repository.get_subscription_episodes(
        subscription_id,
        status_filter=status,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )
    episodes = [_row_to_subscription_episode(r) for r in episode_rows]
    total = await repository.get_subscription_episode_count(subscription_id, status)

    return SubscriptionWithEpisodes(
        subscription=subscription,
        episodes=episodes,
        total_episodes=total
    )


@router.put("/{subscription_id}", response_model=Subscription)
async def update_subscription(
    subscription_id: str,
    request: SubscriptionUpdateRequest,
    user: dict = Depends(require_user)
):
    """Update a subscription (e.g., toggle active status)."""
    user_id = user["sub"]

    # Verify subscription exists and belongs to user
    row = await repository.get_subscription(subscription_id, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Subscription not found")

    # Build updates
    updates = {}
    if request.is_active is not None:
        updates['is_active'] = 1 if request.is_active else 0

    if updates:
        await repository.update_subscription(subscription_id, user_id, **updates)

    # Return updated subscription
    row = await repository.get_subscription(subscription_id, user_id)
    return _row_to_subscription(row)


@router.delete("/{subscription_id}")
async def delete_subscription(subscription_id: str, user: dict = Depends(require_user)):
    """Unsubscribe from a podcast."""
    user_id = user["sub"]

    success = await repository.delete_subscription(subscription_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Subscription not found")

    return {"message": "Unsubscribed successfully"}


@router.get("/{subscription_id}/episodes")
async def list_subscription_episodes(
    subscription_id: str,
    user: dict = Depends(require_user),
    status: Optional[str] = Query(None, description="Filter by status"),
    start_date: Optional[str] = Query(None, description="Filter from date"),
    end_date: Optional[str] = Query(None, description="Filter to date"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """List episodes for a subscription with optional filters."""
    # Validate status parameter
    if status and status not in VALID_EPISODE_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_EPISODE_STATUSES)}"
        )

    user_id = user["sub"]

    # Verify subscription belongs to user
    row = await repository.get_subscription(subscription_id, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Subscription not found")

    episode_rows = await repository.get_subscription_episodes(
        subscription_id,
        status_filter=status,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )
    episodes = [_row_to_subscription_episode(r) for r in episode_rows]
    total = await repository.get_subscription_episode_count(subscription_id, status)

    return {"episodes": episodes, "total": total}


@router.post("/{subscription_id}/check", response_model=CheckEpisodesResponse)
async def check_for_new_episodes(
    subscription_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_user)
):
    """Check for new episodes and auto-process them if subscription is active."""
    user_id = user["sub"]

    row = await repository.get_subscription(subscription_id, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Subscription not found")

    from app.services.subscription_checker import check_subscription_for_new_episodes

    # Check for new episodes
    result = await check_subscription_for_new_episodes(subscription_id, row['feed_url'])

    # Update last checked time
    await repository.update_subscription(
        subscription_id, user_id,
        last_checked_at=datetime.utcnow().isoformat()
    )

    # If subscription is active and there are new episodes, auto-process them
    auto_processed = 0
    if row.get('is_active') and result['new_episode_ids']:
        from app.services.subscription_checker import auto_process_episodes
        background_tasks.add_task(
            auto_process_episodes,
            subscription_id,
            result['new_episode_ids'],
            row['podcast_name']
        )
        auto_processed = len(result['new_episode_ids'])

    return CheckEpisodesResponse(
        new_episodes=result['new_count'],
        auto_processed=auto_processed
    )


@router.post("/{subscription_id}/process-batch")
async def batch_process_episodes(
    subscription_id: str,
    request: BatchProcessRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_user)
):
    """Process a batch of episodes (max 19 at a time)."""
    user_id = user["sub"]

    row = await repository.get_subscription(subscription_id, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if len(request.episode_ids) > MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_BATCH_SIZE} episodes can be processed at once"
        )

    if not request.episode_ids:
        raise HTTPException(status_code=400, detail="No episodes selected")

    # Batch fetch all episodes (avoids N+1 query problem)
    all_episodes = await repository.get_subscription_episodes_by_ids(request.episode_ids)

    # Filter to episodes that belong to this subscription and are pending
    valid_episodes = [
        ep for ep in all_episodes
        if ep['subscription_id'] == subscription_id and ep['status'] == 'pending'
    ]

    if not valid_episodes:
        raise HTTPException(status_code=400, detail="No valid pending episodes found")

    # Mark episodes as processing
    episode_ids = [ep['id'] for ep in valid_episodes]
    await repository.update_subscription_episode_status(episode_ids, 'processing')

    # Process episodes in background
    from app.services.subscription_checker import process_subscription_episodes
    background_tasks.add_task(
        process_subscription_episodes,
        valid_episodes,
        row['podcast_name'],
        user_id
    )

    return {
        "message": f"Processing {len(valid_episodes)} episodes",
        "episode_count": len(valid_episodes)
    }


@router.post("/{subscription_id}/fetch-more")
async def fetch_more_episodes(
    subscription_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_user),
    limit: int = Query(100, ge=1, le=500, description="Number of additional episodes to fetch")
):
    """
    Fetch additional historical episodes beyond the initial 100.

    This endpoint allows users to load more episodes from a podcast's back catalog.
    By default, only the 100 most recent episodes are loaded on subscription.
    Use this endpoint to fetch older episodes.
    """
    user_id = user["sub"]

    row = await repository.get_subscription(subscription_id, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Subscription not found")

    from app.services.subscription_checker import fetch_rss_feed, MAX_EPISODE_LIMIT

    # Cap the limit
    if limit > MAX_EPISODE_LIMIT:
        limit = MAX_EPISODE_LIMIT

    try:
        # Fetch episodes without limit to get the full catalog, then filter
        all_episodes = await fetch_rss_feed(row['feed_url'], limit=None)

        # Filter out episodes we already have
        new_episodes = []
        for ep in all_episodes:
            exists = await repository.check_episode_exists(subscription_id, ep['guid'])
            if not exists:
                new_episodes.append(ep)

        # Apply limit to new episodes
        new_episodes = new_episodes[:limit]

        if not new_episodes:
            return {
                "message": "No additional episodes found",
                "fetched_count": 0,
                "total_available": len(all_episodes)
            }

        # Store the new episodes
        count = await repository.bulk_create_subscription_episodes(subscription_id, new_episodes)

        return {
            "message": f"Fetched {count} additional episodes",
            "fetched_count": count,
            "total_available": len(all_episodes)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch additional episodes")


@router.post("/{subscription_id}/reset-stuck")
async def reset_stuck_episodes(
    subscription_id: str,
    user: dict = Depends(require_user)
):
    """
    Reset episodes that are stuck in 'processing' status back to 'pending'.

    This allows retrying episodes that failed silently during processing.
    Only affects episodes that have been in 'processing' status without a
    linked main episode (indicating they never started actual processing).
    """
    user_id = user["sub"]

    row = await repository.get_subscription(subscription_id, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Subscription not found")

    # Find stuck episodes: in 'processing' status but no linked episode
    stuck_episodes = await repository.get_stuck_subscription_episodes(subscription_id)

    if not stuck_episodes:
        return {
            "message": "No stuck episodes found",
            "reset_count": 0
        }

    # Reset them to pending
    episode_ids = [ep['id'] for ep in stuck_episodes]
    await repository.update_subscription_episode_status(episode_ids, 'pending')

    return {
        "message": f"Reset {len(episode_ids)} stuck episodes to pending",
        "reset_count": len(episode_ids),
        "episode_ids": episode_ids
    }
