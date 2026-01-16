"""
Service for checking and processing subscription episodes.
"""
import uuid
import hashlib
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse
import httpx
import feedparser

from app.db import repository

logger = logging.getLogger(__name__)

# Allowed URL schemes for RSS feeds
ALLOWED_SCHEMES = {'http', 'https'}
# Block private/internal networks
BLOCKED_HOSTS = {'localhost', '127.0.0.1', '0.0.0.0', '::1'}


def validate_feed_url(url: str) -> bool:
    """
    Validate that a feed URL is safe to fetch.
    Prevents SSRF attacks by blocking internal/private URLs.
    """
    try:
        parsed = urlparse(url)

        # Check scheme
        if parsed.scheme.lower() not in ALLOWED_SCHEMES:
            return False

        # Check for blocked hosts
        hostname = parsed.hostname or ''
        if hostname.lower() in BLOCKED_HOSTS:
            return False

        # Block private IP ranges (basic check)
        if hostname.startswith('10.') or hostname.startswith('192.168.') or hostname.startswith('172.'):
            return False

        # Must have a valid hostname
        if not hostname or '.' not in hostname:
            return False

        return True
    except Exception:
        return False


async def fetch_rss_feed(feed_url: str) -> List[Dict[str, Any]]:
    """
    Fetch and parse an RSS feed.
    Returns list of episode dicts with guid, title, audio_url, publish_date, duration_seconds.

    Raises ValueError if URL is invalid or unsafe.
    """
    if not validate_feed_url(feed_url):
        raise ValueError(f"Invalid or unsafe feed URL: {feed_url}")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(feed_url, follow_redirects=True)
        response.raise_for_status()

    feed = feedparser.parse(response.text)
    episodes = []

    for entry in feed.entries:
        # Get audio URL from enclosures
        audio_url = None
        for enclosure in entry.get('enclosures', []):
            if enclosure.get('type', '').startswith('audio/'):
                audio_url = enclosure.get('href') or enclosure.get('url')
                break

        # Fallback to media content
        if not audio_url:
            for media in entry.get('media_content', []):
                if media.get('type', '').startswith('audio/'):
                    audio_url = media.get('url')
                    break

        # Skip entries without audio
        if not audio_url:
            continue

        # Get GUID or generate from audio URL
        guid = entry.get('id') or entry.get('guid')
        if not guid:
            guid = hashlib.md5(audio_url.encode()).hexdigest()

        # Parse publish date
        publish_date = None
        if entry.get('published_parsed'):
            try:
                publish_date = datetime(*entry.published_parsed[:6]).isoformat()
            except (TypeError, ValueError):
                pass

        # Parse duration (could be in various formats)
        duration_seconds = None
        duration_str = entry.get('itunes_duration') or entry.get('duration')
        if duration_str:
            try:
                if ':' in str(duration_str):
                    parts = str(duration_str).split(':')
                    if len(parts) == 3:
                        duration_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                    elif len(parts) == 2:
                        duration_seconds = int(parts[0]) * 60 + int(parts[1])
                else:
                    duration_seconds = float(duration_str)
            except (ValueError, TypeError):
                pass

        episodes.append({
            'guid': guid,
            'title': entry.get('title', 'Untitled Episode'),
            'audio_url': audio_url,
            'publish_date': publish_date,
            'duration_seconds': duration_seconds
        })

    return episodes


async def fetch_and_store_episodes(subscription_id: str, feed_url: str) -> int:
    """
    Fetch RSS feed and store all episodes for a new subscription.
    Returns count of episodes stored.
    """
    try:
        episodes = await fetch_rss_feed(feed_url)
        if episodes:
            count = await repository.bulk_create_subscription_episodes(subscription_id, episodes)

            # Update last_episode_date
            newest_date = await repository.get_newest_episode_date(subscription_id)
            if newest_date:
                sub = await repository.get_subscription(subscription_id)
                if sub:
                    await repository.update_subscription(
                        subscription_id, sub['user_id'],
                        last_episode_date=newest_date
                    )

            return count
        return 0
    except ValueError as e:
        logger.warning(f"Invalid feed URL for subscription {subscription_id}: {e}")
        return 0
    except httpx.HTTPError as e:
        logger.error(f"HTTP error fetching feed for subscription {subscription_id}: {e}")
        return 0
    except Exception as e:
        logger.exception(f"Unexpected error fetching feed for subscription {subscription_id}")
        return 0


async def check_subscription_for_new_episodes(
    subscription_id: str,
    feed_url: str
) -> Dict[str, Any]:
    """
    Check an RSS feed for new episodes that aren't already stored.
    Returns dict with new_count and new_episode_ids.
    """
    try:
        episodes = await fetch_rss_feed(feed_url)
        new_count = 0
        new_episode_ids = []

        for ep in episodes:
            # Check if episode already exists
            exists = await repository.check_episode_exists(subscription_id, ep['guid'])
            if not exists:
                ep_id = await repository.create_subscription_episode(
                    subscription_id=subscription_id,
                    episode_guid=ep['guid'],
                    episode_title=ep.get('title'),
                    audio_url=ep.get('audio_url'),
                    publish_date=ep.get('publish_date'),
                    duration_seconds=ep.get('duration_seconds')
                )
                if ep_id:
                    new_count += 1
                    new_episode_ids.append(ep_id)

        return {'new_count': new_count, 'new_episode_ids': new_episode_ids}
    except ValueError as e:
        logger.warning(f"Invalid feed URL when checking subscription {subscription_id}: {e}")
        return {'new_count': 0, 'new_episode_ids': []}
    except Exception as e:
        logger.exception(f"Error checking feed for subscription {subscription_id}")
        return {'new_count': 0, 'new_episode_ids': []}


async def auto_process_episodes(
    subscription_id: str,
    episode_ids: List[int],
    podcast_name: str
):
    """
    Auto-process new episodes (called when checking for new episodes on active subscription).
    """
    # Get subscription to find user_id
    sub = await repository.get_subscription(subscription_id)
    if not sub:
        return

    user_id = sub['user_id']

    # Get episode details
    episodes = []
    for ep_id in episode_ids:
        ep = await repository.get_subscription_episode_by_id(ep_id)
        if ep and ep['status'] == 'pending':
            episodes.append(ep)

    if episodes:
        await process_subscription_episodes(episodes, podcast_name, user_id)


async def process_subscription_episodes(
    episodes: List[Dict[str, Any]],
    podcast_name: str,
    user_id: str
):
    """
    Process a list of subscription episodes by creating episode records and triggering transcription.
    """
    from app.routers.episodes import process_episode

    for ep in episodes:
        try:
            # Mark as processing
            await repository.update_subscription_episode_status([ep['id']], 'processing')

            # Create an episode record
            episode_id = str(uuid.uuid4())
            await repository.create_episode(
                episode_id=episode_id,
                user_id=user_id,
                title=ep.get('episode_title'),
                podcast_name=podcast_name,
                audio_url=ep.get('audio_url')
            )

            # Link subscription episode to main episode
            await repository.update_subscription_episode_status(
                [ep['id']], 'processing', linked_episode_id=episode_id
            )

            # Process the episode (this is async and handles its own errors)
            await process_episode(
                episode_id,
                ep.get('audio_url'),
                ep.get('episode_title'),
                podcast_name
            )

            # Mark as completed
            await repository.update_subscription_episode_status([ep['id']], 'completed')

        except Exception as e:
            logger.exception(f"Error processing subscription episode {ep['id']}")
            await repository.update_subscription_episode_status([ep['id']], 'failed')


async def check_all_active_subscriptions():
    """
    Check all active subscriptions for new episodes.
    Called by the scheduler every 6 hours.
    """
    subscriptions = await repository.get_active_subscriptions()

    for sub in subscriptions:
        try:
            result = await check_subscription_for_new_episodes(sub['id'], sub['feed_url'])

            # Update last checked time
            await repository.update_subscription(
                sub['id'], sub['user_id'],
                last_checked_at=datetime.utcnow().isoformat()
            )

            # Auto-process new episodes
            if result['new_episode_ids']:
                await auto_process_episodes(
                    sub['id'],
                    result['new_episode_ids'],
                    sub['podcast_name']
                )

        except Exception as e:
            logger.exception(f"Error checking subscription {sub['id']}")

        # Small delay between subscriptions to avoid overwhelming the system
        await asyncio.sleep(1)
