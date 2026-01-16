import httpx
import xml.etree.ElementTree as ET
from typing import Optional
from html import unescape
import re


def strip_html(text: str) -> str:
    """Remove HTML tags from text."""
    if not text:
        return ""
    clean = re.sub(r'<[^>]+>', '', text)
    return unescape(clean).strip()


def parse_duration(duration_str: str) -> Optional[int]:
    """Parse duration string (HH:MM:SS or seconds) to seconds."""
    if not duration_str:
        return None
    try:
        # Try parsing as integer seconds
        return int(duration_str)
    except ValueError:
        pass

    # Try parsing as HH:MM:SS or MM:SS
    parts = duration_str.split(':')
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        elif len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
    except ValueError:
        pass
    return None


async def fetch_rss_episodes(feed_url: str, limit: int = 5) -> list[dict]:
    """Fetch episodes from an RSS feed."""
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(feed_url, headers={
                "User-Agent": "RecapRabbit/1.0 (Podcast Summarizer)"
            })
            response.raise_for_status()

            # Parse XML
            root = ET.fromstring(response.text)

            # Find channel and items
            channel = root.find('channel')
            if channel is None:
                return []

            episodes = []
            items = channel.findall('item')[:limit]

            for item in items:
                # Get audio URL from enclosure
                enclosure = item.find('enclosure')
                audio_url = enclosure.get('url') if enclosure is not None else None

                if not audio_url:
                    # Try media:content as fallback
                    media_content = item.find('{http://search.yahoo.com/mrss/}content')
                    if media_content is not None:
                        audio_url = media_content.get('url')

                if not audio_url:
                    continue  # Skip episodes without audio

                # Get title
                title_elem = item.find('title')
                title = title_elem.text if title_elem is not None else "Untitled"

                # Get description
                description = None
                for desc_tag in ['description', '{http://www.itunes.com/dtds/podcast-1.0.dtd}summary']:
                    desc_elem = item.find(desc_tag)
                    if desc_elem is not None and desc_elem.text:
                        description = strip_html(desc_elem.text)[:500]
                        break

                # Get duration
                duration = None
                duration_elem = item.find('{http://www.itunes.com/dtds/podcast-1.0.dtd}duration')
                if duration_elem is not None and duration_elem.text:
                    duration = parse_duration(duration_elem.text)

                # Get publish date
                pub_date = None
                pub_date_elem = item.find('pubDate')
                if pub_date_elem is not None and pub_date_elem.text:
                    pub_date = pub_date_elem.text

                # Get episode image or use podcast image
                image_url = None
                image_elem = item.find('{http://www.itunes.com/dtds/podcast-1.0.dtd}image')
                if image_elem is not None:
                    image_url = image_elem.get('href')

                episodes.append({
                    "title": title,
                    "description": description,
                    "audio_url": audio_url,
                    "duration_seconds": duration,
                    "publish_date": pub_date,
                    "thumbnail": image_url
                })

            return episodes
    except Exception as e:
        print(f"Error fetching RSS feed {feed_url}: {e}")
        return []


async def search_podcasts(query: str, limit: int = 10) -> dict:
    """
    Search for podcast episodes using iTunes API + RSS feed parsing.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Search iTunes for podcasts
            response = await client.get(
                "https://itunes.apple.com/search",
                params={
                    "term": query,
                    "entity": "podcast",
                    "limit": 5  # Get top 5 matching podcasts
                }
            )
            response.raise_for_status()
            data = response.json()

            results = []
            podcasts = data.get("results", [])

            # For each podcast, fetch recent episodes from RSS feed
            for podcast in podcasts[:3]:  # Top 3 podcasts
                podcast_name = podcast.get("collectionName", "")
                podcast_id = str(podcast.get("collectionId", ""))
                feed_url = podcast.get("feedUrl")
                thumbnail = podcast.get("artworkUrl600") or podcast.get("artworkUrl100")

                if not feed_url:
                    continue

                # Fetch episodes from RSS feed
                episodes = await fetch_rss_episodes(feed_url, limit=5)

                for ep in episodes:
                    results.append({
                        "id": f"itunes_{hash(ep['audio_url']) % 10000000}",
                        "title": ep["title"],
                        "podcast_name": podcast_name,
                        "podcast_id": podcast_id,
                        "description": ep["description"],
                        "audio_url": ep["audio_url"],
                        "thumbnail": ep["thumbnail"] or thumbnail,
                        "duration_seconds": ep["duration_seconds"],
                        "publish_date": ep["publish_date"]
                    })

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
    # iTunes doesn't support direct episode lookup by ID
    # This would require caching or a different approach
    return None


def parse_podcast_url(url: str) -> Optional[str]:
    """
    Parse a podcast platform URL and extract the podcast ID.

    Supported formats:
    - Apple Podcasts: https://podcasts.apple.com/{country}/podcast/{name}/id{id}
    - Apple Podcasts short: https://podcasts.apple.com/podcast/id{id}

    Returns the numeric podcast ID or None if not a supported URL.
    """
    # Apple Podcasts URL patterns
    apple_patterns = [
        r'podcasts\.apple\.com/[a-z]{2}/podcast/[^/]+/id(\d+)',  # Full URL with country
        r'podcasts\.apple\.com/podcast/[^/]+/id(\d+)',           # Without country
        r'podcasts\.apple\.com/[a-z]{2}/podcast/id(\d+)',        # Short with country
        r'podcasts\.apple\.com/podcast/id(\d+)',                  # Short without country
        r'itunes\.apple\.com/[a-z]{2}/podcast/[^/]+/id(\d+)',    # Old iTunes URL
    ]

    for pattern in apple_patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    return None


async def lookup_podcast_by_id(podcast_id: str, limit: int = 10) -> dict:
    """
    Look up a podcast by its Apple/iTunes ID and return its episodes.

    Uses iTunes Lookup API to get podcast info, then fetches episodes from RSS.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Look up the podcast by ID
            response = await client.get(
                "https://itunes.apple.com/lookup",
                params={
                    "id": podcast_id,
                    "entity": "podcast"
                }
            )
            response.raise_for_status()
            data = response.json()

            results = data.get("results", [])
            if not results:
                return {
                    "results": [],
                    "total": 0,
                    "message": "Podcast not found"
                }

            podcast = results[0]
            podcast_name = podcast.get("collectionName", "")
            feed_url = podcast.get("feedUrl")
            thumbnail = podcast.get("artworkUrl600") or podcast.get("artworkUrl100")

            if not feed_url:
                return {
                    "results": [],
                    "total": 0,
                    "message": "Podcast RSS feed not available"
                }

            # Fetch episodes from RSS feed
            episodes = await fetch_rss_episodes(feed_url, limit=limit)

            episode_results = []
            for ep in episodes:
                episode_results.append({
                    "id": f"itunes_{hash(ep['audio_url']) % 10000000}",
                    "title": ep["title"],
                    "podcast_name": podcast_name,
                    "podcast_id": podcast_id,
                    "description": ep["description"],
                    "audio_url": ep["audio_url"],
                    "thumbnail": ep["thumbnail"] or thumbnail,
                    "duration_seconds": ep["duration_seconds"],
                    "publish_date": ep["publish_date"]
                })

            return {
                "results": episode_results,
                "total": len(episode_results),
                "podcast_id": podcast_id,
                "podcast_name": podcast_name,
                "podcast_thumbnail": thumbnail
            }

    except Exception as e:
        return {
            "results": [],
            "total": 0,
            "message": f"Failed to look up podcast: {str(e)}"
        }


async def lookup_podcast_by_url(url: str, limit: int = 10) -> dict:
    """
    Look up a podcast by its platform URL (e.g., Apple Podcasts URL).

    Parses the URL to extract the podcast ID, then fetches episodes.
    """
    podcast_id = parse_podcast_url(url)

    if not podcast_id:
        return {
            "results": [],
            "total": 0,
            "message": "Unsupported podcast URL format. Currently supports Apple Podcasts URLs."
        }

    return await lookup_podcast_by_id(podcast_id, limit=limit)
