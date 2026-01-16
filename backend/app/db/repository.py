"""
Data access layer for episodes and usage tracking.
"""
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from app.db.database import get_db
from app.models.schemas import (
    EpisodeResult,
    ProcessingStatus,
    TranscriptSegment,
    EpisodeSummary,
    KeyQuote
)


# ============ Usage Tracking ============

# Pricing constants (as of Jan 2025)
PRICING = {
    "assemblyai": {
        "transcription_per_hour": 0.37,  # $0.37/hour with speaker diarization
    },
    "anthropic": {
        "claude-sonnet-input_per_million": 3.00,   # $3/M input tokens
        "claude-sonnet-output_per_million": 15.00,  # $15/M output tokens
    },
    "listennotes": {
        "per_request": 0.00,  # Free tier
    }
}


async def log_usage(
    service: str,
    operation: str,
    episode_id: Optional[str] = None,
    input_units: float = 0,
    output_units: float = 0,
    cost_usd: float = 0,
    metadata: Optional[dict] = None
) -> None:
    """Log API usage for cost tracking."""
    async with get_db() as db:
        await db.execute("""
            INSERT INTO usage_logs (service, operation, episode_id, input_units, output_units, cost_usd, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            service,
            operation,
            episode_id,
            input_units,
            output_units,
            cost_usd,
            json.dumps(metadata) if metadata else None,
            datetime.utcnow().isoformat()
        ))
        await db.commit()


async def get_transcription_time_ratio() -> float:
    """
    Calculate average processing time ratio from historical transcription data.
    Returns ratio of processing_seconds / audio_seconds.
    Falls back to 0.8 if no historical data available.
    """
    async with get_db() as db:
        async with db.execute("""
            SELECT metadata FROM usage_logs
            WHERE service = 'assemblyai' AND operation = 'transcription'
            AND metadata IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 20
        """) as cursor:
            rows = await cursor.fetchall()

            if not rows:
                return 0.8  # Default fallback

            ratios = []
            for row in rows:
                try:
                    metadata = json.loads(row[0])
                    duration = metadata.get('duration_seconds')
                    processing_time = metadata.get('processing_seconds')
                    if duration and processing_time and duration > 0:
                        ratios.append(processing_time / duration)
                except (json.JSONDecodeError, TypeError):
                    continue

            if not ratios:
                return 0.8  # Default fallback

            # Return average ratio, capped between 0.3 and 2.0
            avg_ratio = sum(ratios) / len(ratios)
            return max(0.3, min(2.0, avg_ratio))


async def log_search(query: str, user_id: Optional[str] = None, results_count: int = 0) -> None:
    """Log a search query for tracking popular searches."""
    # Normalize query: lowercase and strip whitespace
    normalized_query = query.lower().strip()
    if not normalized_query:
        return

    async with get_db() as db:
        await db.execute("""
            INSERT INTO search_logs (query, user_id, results_count, created_at)
            VALUES (?, ?, ?, ?)
        """, (normalized_query, user_id, results_count, datetime.utcnow().isoformat()))
        await db.commit()


async def get_popular_searches(limit: int = 6, days: int = 30) -> List[str]:
    """
    Get the most popular search queries from the last N days.
    Returns list of search queries ordered by frequency.
    """
    async with get_db() as db:
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

        async with db.execute("""
            SELECT query, COUNT(*) as search_count
            FROM search_logs
            WHERE created_at >= ?
            GROUP BY query
            ORDER BY search_count DESC
            LIMIT ?
        """, (cutoff, limit)) as cursor:
            rows = await cursor.fetchall()
            return [row[0] for row in rows]


async def get_usage_stats(days: int = 30) -> Dict[str, Any]:
    """Get aggregated usage statistics."""
    async with get_db() as db:
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

        # Get totals by service
        async with db.execute("""
            SELECT
                service,
                COUNT(*) as call_count,
                SUM(input_units) as total_input,
                SUM(output_units) as total_output,
                SUM(cost_usd) as total_cost
            FROM usage_logs
            WHERE created_at >= ?
            GROUP BY service
        """, (cutoff,)) as cursor:
            rows = await cursor.fetchall()
            by_service = {}
            for row in rows:
                by_service[row[0]] = {
                    "calls": row[1],
                    "input_units": row[2] or 0,
                    "output_units": row[3] or 0,
                    "cost_usd": round(row[4] or 0, 4)
                }

        # Get grand total
        async with db.execute("""
            SELECT SUM(cost_usd) FROM usage_logs WHERE created_at >= ?
        """, (cutoff,)) as cursor:
            row = await cursor.fetchone()
            total_cost = round(row[0] or 0, 4)

        # Get daily breakdown
        async with db.execute("""
            SELECT
                DATE(created_at) as date,
                service,
                SUM(cost_usd) as cost
            FROM usage_logs
            WHERE created_at >= ?
            GROUP BY DATE(created_at), service
            ORDER BY date DESC
        """, (cutoff,)) as cursor:
            rows = await cursor.fetchall()
            daily = {}
            for row in rows:
                date = row[0]
                if date not in daily:
                    daily[date] = {"total": 0, "by_service": {}}
                daily[date]["by_service"][row[1]] = round(row[2] or 0, 4)
                daily[date]["total"] = round(daily[date]["total"] + (row[2] or 0), 4)

        # Get recent logs
        async with db.execute("""
            SELECT service, operation, episode_id, input_units, output_units, cost_usd, created_at
            FROM usage_logs
            WHERE created_at >= ?
            ORDER BY created_at DESC
            LIMIT 50
        """, (cutoff,)) as cursor:
            rows = await cursor.fetchall()
            recent = [
                {
                    "service": row[0],
                    "operation": row[1],
                    "episode_id": row[2],
                    "input_units": row[3],
                    "output_units": row[4],
                    "cost_usd": round(row[5] or 0, 4),
                    "created_at": row[6]
                }
                for row in rows
            ]

        return {
            "period_days": days,
            "total_cost_usd": total_cost,
            "by_service": by_service,
            "daily": daily,
            "recent_logs": recent
        }


async def create_episode(
    episode_id: str,
    user_id: str,
    title: Optional[str] = None,
    podcast_name: Optional[str] = None,
    description: Optional[str] = None,
    audio_url: Optional[str] = None,
    audio_path: Optional[str] = None
) -> None:
    """Insert a new episode record."""
    async with get_db() as db:
        now = datetime.utcnow().isoformat()
        await db.execute("""
            INSERT INTO episodes (id, user_id, title, podcast_name, description, status, progress, audio_url, audio_path, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            episode_id, user_id, title, podcast_name, description,
            ProcessingStatus.PENDING.value, 0,
            audio_url, audio_path,
            now, now
        ))
        await db.commit()


async def update_episode_status(
    episode_id: str,
    status: ProcessingStatus,
    progress: int = 0,
    error: Optional[str] = None,
    message: Optional[str] = None,
    checkpoint_stage: Optional[str] = None
) -> None:
    """Update episode processing status."""
    async with get_db() as db:
        now = datetime.utcnow().isoformat()

        # Build dynamic update query
        updates = ["status = ?", "progress = ?", "updated_at = ?"]
        params = [status.value, progress, now]

        if error is not None:
            updates.append("error = ?")
            params.append(error)

        if message is not None:
            updates.append("status_message = ?")
            params.append(message)

        if checkpoint_stage is not None:
            updates.append("checkpoint_stage = ?")
            params.append(checkpoint_stage)

        params.append(episode_id)

        await db.execute(
            f"UPDATE episodes SET {', '.join(updates)} WHERE id = ?",
            params
        )
        await db.commit()


async def update_episode_duration(episode_id: str, duration: float) -> None:
    """Update episode duration."""
    async with get_db() as db:
        now = datetime.utcnow().isoformat()
        await db.execute(
            "UPDATE episodes SET duration_seconds = ?, updated_at = ? WHERE id = ?",
            (duration, now, episode_id)
        )
        await db.commit()


async def update_episode_language(episode_id: str, language_code: str) -> None:
    """Update episode detected language."""
    async with get_db() as db:
        now = datetime.utcnow().isoformat()
        await db.execute(
            "UPDATE episodes SET language_code = ?, updated_at = ? WHERE id = ?",
            (language_code, now, episode_id)
        )
        await db.commit()


async def update_episode_transcript(
    episode_id: str,
    transcript: list,
    cleaned_transcript: str
) -> None:
    """Save transcript data with checkpoint."""
    async with get_db() as db:
        now = datetime.utcnow().isoformat()

        # Serialize transcript segments to JSON
        transcript_json = json.dumps([
            seg if isinstance(seg, dict) else {
                "start": seg.start,
                "end": seg.end,
                "text": seg.text,
                "speaker": seg.speaker
            }
            for seg in transcript
        ])

        await db.execute("""
            UPDATE episodes
            SET transcript = ?, cleaned_transcript = ?, checkpoint_stage = ?, updated_at = ?
            WHERE id = ?
        """, (transcript_json, cleaned_transcript, "transcribed", now, episode_id))
        await db.commit()


async def update_episode_summary(episode_id: str, summary: EpisodeSummary) -> None:
    """Save summary data with checkpoint."""
    async with get_db() as db:
        now = datetime.utcnow().isoformat()

        summary_dict = {
            "paragraph": summary.paragraph,
            "takeaways": summary.takeaways,
            "key_quotes": [
                {"text": q.text, "speaker": q.speaker, "timestamp": q.timestamp}
                for q in summary.key_quotes
            ],
            "paragraph_en": summary.paragraph_en,
            "takeaways_en": summary.takeaways_en
        }

        await db.execute("""
            UPDATE episodes
            SET summary = ?, checkpoint_stage = ?, updated_at = ?
            WHERE id = ?
        """, (json.dumps(summary_dict), "summarized", now, episode_id))
        await db.commit()


async def get_episode(episode_id: str, user_id: Optional[str] = None) -> Optional[EpisodeResult]:
    """Retrieve episode by ID, optionally filtered by user."""
    async with get_db() as db:
        if user_id:
            query = "SELECT * FROM episodes WHERE id = ? AND user_id = ?"
            params = (episode_id, user_id)
        else:
            query = "SELECT * FROM episodes WHERE id = ?"
            params = (episode_id,)

        async with db.execute(query, params) as cursor:
            row = await cursor.fetchone()
            if row:
                return _row_to_episode(dict(row))
            return None


async def get_all_episodes(
    user_id: str,
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> List[EpisodeResult]:
    """Get all episodes for a user with optional status filter."""
    async with get_db() as db:
        if status_filter and status_filter != 'all':
            # Handle 'processing' as multiple statuses
            if status_filter == 'processing':
                processing_statuses = (
                    'pending', 'downloading', 'transcribing',
                    'diarizing', 'cleaning', 'summarizing'
                )
                placeholders = ','.join('?' * len(processing_statuses))
                query = f"""
                    SELECT * FROM episodes
                    WHERE user_id = ? AND status IN ({placeholders})
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                """
                params = (user_id, *processing_statuses, limit, offset)
            else:
                query = """
                    SELECT * FROM episodes
                    WHERE user_id = ? AND status = ?
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                """
                params = (user_id, status_filter, limit, offset)
        else:
            query = """
                SELECT * FROM episodes
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """
            params = (user_id, limit, offset)

        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            return [_row_to_episode(dict(row)) for row in rows]


async def get_episode_count(user_id: str, status_filter: Optional[str] = None) -> int:
    """Get total count of episodes for a user."""
    async with get_db() as db:
        if status_filter and status_filter != 'all':
            if status_filter == 'processing':
                processing_statuses = (
                    'pending', 'downloading', 'transcribing',
                    'diarizing', 'cleaning', 'summarizing'
                )
                placeholders = ','.join('?' * len(processing_statuses))
                query = f"SELECT COUNT(*) FROM episodes WHERE user_id = ? AND status IN ({placeholders})"
                params = (user_id, *processing_statuses)
            else:
                query = "SELECT COUNT(*) FROM episodes WHERE user_id = ? AND status = ?"
                params = (user_id, status_filter)
        else:
            query = "SELECT COUNT(*) FROM episodes WHERE user_id = ?"
            params = (user_id,)

        async with db.execute(query, params) as cursor:
            row = await cursor.fetchone()
            return row[0] if row else 0


async def get_incomplete_episodes() -> List[dict]:
    """Get episodes that were interrupted mid-processing."""
    async with get_db() as db:
        async with db.execute("""
            SELECT id, title, podcast_name, status, checkpoint_stage, audio_url, audio_path
            FROM episodes
            WHERE status NOT IN ('completed', 'failed')
            ORDER BY updated_at DESC
        """) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def update_episode_speakers(episode_id: str, speaker_map: Dict[str, str]) -> bool:
    """
    Update speaker names in transcript segments.

    Args:
        episode_id: The episode ID
        speaker_map: Mapping of speaker_label -> new_name

    Returns:
        True if successful, False if episode not found
    """
    async with get_db() as db:
        # Get current transcript
        async with db.execute(
            "SELECT transcript FROM episodes WHERE id = ?",
            (episode_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if not row or not row['transcript']:
                return False

        transcript_data = json.loads(row['transcript'])

        # Update speaker names based on speaker_label
        for seg in transcript_data:
            label = seg.get('speaker_label') or seg.get('speaker')
            if label and label in speaker_map:
                seg['speaker'] = speaker_map[label]

        # Regenerate cleaned transcript with new names
        cleaned_parts = []
        for seg in transcript_data:
            speaker = seg.get('speaker', '')
            text = seg.get('text', '')
            if speaker:
                cleaned_parts.append(f"[{speaker}]: {text}")
            else:
                cleaned_parts.append(text)
        cleaned_transcript = "\n".join(cleaned_parts)

        # Save back to database
        now = datetime.utcnow().isoformat()
        await db.execute("""
            UPDATE episodes
            SET transcript = ?, cleaned_transcript = ?, updated_at = ?
            WHERE id = ?
        """, (json.dumps(transcript_data), cleaned_transcript, now, episode_id))
        await db.commit()
        return True


def _row_to_episode(row: dict) -> EpisodeResult:
    """Convert database row to EpisodeResult."""
    transcript = None
    if row.get('transcript'):
        transcript_data = json.loads(row['transcript'])
        transcript = [TranscriptSegment(**seg) for seg in transcript_data]

    summary = None
    if row.get('summary'):
        summary_data = json.loads(row['summary'])
        summary = EpisodeSummary(
            paragraph=summary_data['paragraph'],
            takeaways=summary_data['takeaways'],
            key_quotes=[KeyQuote(**q) for q in summary_data['key_quotes']],
            paragraph_en=summary_data.get('paragraph_en'),
            takeaways_en=summary_data.get('takeaways_en')
        )

    return EpisodeResult(
        id=row['id'],
        title=row.get('title'),
        podcast_name=row.get('podcast_name'),
        description=row.get('description'),
        status=ProcessingStatus(row['status']),
        progress=row.get('progress', 0),
        status_message=row.get('status_message'),
        transcript=transcript,
        cleaned_transcript=row.get('cleaned_transcript'),
        summary=summary,
        error=row.get('error'),
        duration_seconds=row.get('duration_seconds'),
        audio_url=row.get('audio_url'),
        language_code=row.get('language_code'),
        created_at=row.get('created_at'),
        updated_at=row.get('updated_at')
    )
