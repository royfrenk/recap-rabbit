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

# Episode fetch limits - to prevent loading thousands of episodes on initial fetch
DEFAULT_EPISODE_LIMIT = 100
MAX_EPISODE_LIMIT = 500

# Concurrent subscription checking - limits parallel RSS fetches
MAX_CONCURRENT_CHECKS = 5
RATE_LIMIT_DELAY = 0.5  # seconds between checks within a batch

# Trusted CDNs for podcast artwork
TRUSTED_ARTWORK_HOSTS = {
    # Apple Podcasts
    'is1-ssl.mzstatic.com',
    'is2-ssl.mzstatic.com',
    'is3-ssl.mzstatic.com',
    'is4-ssl.mzstatic.com',
    'is5-ssl.mzstatic.com',
    # Spotify
    'i.scdn.co',
    'mosaic.scdn.co',
    # Podcast hosting platforms
    'megaphone.imgix.net',
    'image.simplecastcdn.com',
    'ssl-static.libsyn.com',
    'assets.pippa.io',
    'images.transistor.fm',
    'd1bm3dmew779uf.cloudfront.net',
    'media.redcircle.com',
    'pbcdn1.podbean.com',
    'images.buzzsprout.com',
    'd3t3ozftmdmh3i.cloudfront.net',  # Anchor
    'storage.pinecast.net',
    'images.podiant.co',
    'www.omnycontent.com',
    # Common CDNs
    'd.radioline.fr',
    'static.libsyn.com',
}


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


def validate_artwork_url(url: str | None) -> str | None:
    """
    Validate that an artwork URL is safe to fetch and display.
    Returns sanitized URL if valid, None if invalid/unsafe.

    This prevents SSRF attacks through artwork URLs while allowing
    legitimate podcast artwork from trusted sources.
    """
    if not url:
        return None

    try:
        parsed = urlparse(url)

        # Check scheme (only http/https allowed)
        if parsed.scheme.lower() not in ALLOWED_SCHEMES:
            logger.warning(f"Invalid artwork URL scheme: {url}")
            return None

        hostname = parsed.hostname or ''
        hostname_lower = hostname.lower()

        # Block internal hosts (SSRF protection)
        if hostname_lower in BLOCKED_HOSTS:
            logger.warning(f"Blocked internal artwork URL: {url}")
            return None

        # Block private IP ranges
        if hostname.startswith('10.') or hostname.startswith('192.168.') or hostname.startswith('172.'):
            logger.warning(f"Blocked private IP in artwork URL: {url}")
            return None

        # Must have a valid hostname
        if not hostname or '.' not in hostname:
            logger.warning(f"Invalid hostname in artwork URL: {url}")
            return None

        # Allow trusted CDNs unconditionally
        if hostname_lower in TRUSTED_ARTWORK_HOSTS:
            return url

        # Allow *.mzstatic.com wildcard (Apple uses numbered subdomains)
        if hostname_lower.endswith('.mzstatic.com'):
            return url

        # For other hosts, require image-like path
        path_lower = parsed.path.lower()
        image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg')
        image_path_markers = ('/image/', '/images/', '/artwork/', '/cover/', '/thumb/', '/avatar/')

        has_image_extension = any(path_lower.endswith(ext) for ext in image_extensions)
        has_image_marker = any(marker in path_lower for marker in image_path_markers)

        if has_image_extension or has_image_marker:
            return url

        # URL doesn't look like an image - reject for safety
        logger.warning(f"Artwork URL doesn't appear to be an image: {url}")
        return None

    except Exception as e:
        logger.warning(f"Error validating artwork URL '{url}': {e}")
        return None


async def fetch_rss_feed(
    feed_url: str,
    limit: int | None = DEFAULT_EPISODE_LIMIT
) -> List[Dict[str, Any]]:
    """
    Fetch and parse an RSS feed.
    Returns list of episode dicts with guid, title, audio_url, publish_date, duration_seconds.

    Args:
        feed_url: The RSS feed URL to fetch.
        limit: Maximum number of episodes to return (newest first).
               None means no limit. Default is DEFAULT_EPISODE_LIMIT (100).

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

    # Sort episodes by publish_date (newest first) and apply limit
    episodes.sort(
        key=lambda ep: ep.get('publish_date') or '',
        reverse=True
    )

    if limit is not None and limit > 0:
        episodes = episodes[:limit]

    return episodes


async def fetch_and_store_episodes(
    subscription_id: str,
    feed_url: str,
    limit: int | None = DEFAULT_EPISODE_LIMIT
) -> int:
    """
    Fetch RSS feed and store episodes for a subscription.

    Args:
        subscription_id: The subscription ID to store episodes for.
        feed_url: The RSS feed URL to fetch.
        limit: Maximum number of episodes to fetch. Default is DEFAULT_EPISODE_LIMIT (100).
               Pass None to fetch all available episodes (up to what the feed provides).

    Returns count of episodes stored.
    """
    try:
        episodes = await fetch_rss_feed(feed_url, limit=limit)
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


async def _check_single_subscription(sub: Dict[str, Any]) -> Dict[str, Any]:
    """
    Check a single subscription for new episodes.

    Args:
        sub: Subscription dict with id, feed_url, user_id, podcast_name.

    Returns:
        Dict with subscription_id, success, new_episodes, error (if any).
    """
    result = {
        'subscription_id': sub['id'],
        'success': False,
        'new_episodes': 0,
        'error': None
    }

    try:
        check_result = await check_subscription_for_new_episodes(sub['id'], sub['feed_url'])

        # Update last checked time
        await repository.update_subscription(
            sub['id'], sub['user_id'],
            last_checked_at=datetime.utcnow().isoformat()
        )

        # Auto-process new episodes
        if check_result['new_episode_ids']:
            await auto_process_episodes(
                sub['id'],
                check_result['new_episode_ids'],
                sub['podcast_name']
            )

        result['success'] = True
        result['new_episodes'] = check_result['new_count']

    except Exception as e:
        logger.exception(f"Error checking subscription {sub['id']}")
        result['error'] = str(e)

    return result


async def check_all_active_subscriptions() -> Dict[str, Any]:
    """
    Check all active subscriptions for new episodes concurrently.
    Called by the scheduler every 6 hours.

    Uses a semaphore to limit concurrent RSS fetches to MAX_CONCURRENT_CHECKS
    to avoid overwhelming external servers and local resources.

    Returns:
        Dict with total, checked, new_episodes, errors counts.
    """
    subscriptions = await repository.get_active_subscriptions()

    if not subscriptions:
        logger.info("No active subscriptions to check")
        return {'total': 0, 'checked': 0, 'new_episodes': 0, 'errors': 0}

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_CHECKS)

    async def check_with_semaphore(sub: Dict[str, Any]) -> Dict[str, Any]:
        async with semaphore:
            # Rate limiting delay to be nice to external servers
            await asyncio.sleep(RATE_LIMIT_DELAY)
            return await _check_single_subscription(sub)

    # Run all checks concurrently with semaphore limiting
    results = await asyncio.gather(
        *[check_with_semaphore(sub) for sub in subscriptions],
        return_exceptions=True
    )

    # Aggregate results
    total = len(subscriptions)
    checked = 0
    new_episodes = 0
    errors = 0

    for r in results:
        if isinstance(r, Exception):
            errors += 1
            logger.exception(f"Unexpected error in subscription check: {r}")
        elif isinstance(r, dict):
            if r.get('success'):
                checked += 1
                new_episodes += r.get('new_episodes', 0)
            else:
                errors += 1

    logger.info(
        f"Subscription check complete: {checked}/{total} checked, "
        f"{new_episodes} new episodes, {errors} errors"
    )

    return {
        'total': total,
        'checked': checked,
        'new_episodes': new_episodes,
        'errors': errors
    }
