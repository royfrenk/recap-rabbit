import os
import uuid
import tempfile
import asyncio
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from io import BytesIO

from app.models.schemas import (
    EpisodeResult,
    EpisodeURLRequest,
    ProcessingStatus,
    TranscriptSegment,
    KeyQuote,
    EpisodeSummary,
    EpisodeListItem,
    EpisodeListResponse,
    PDFExportRequest,
    SpeakerUpdateRequest
)
from app.utils.audio import download_audio, convert_to_wav, get_audio_duration
from app.services.transcription import transcribe_audio
from app.services.cleanup import cleanup_segments, segments_to_text
from app.services.summarization import summarize_transcript
from app.services.speaker_identification import identify_speakers, apply_speaker_names
from app.db import repository

router = APIRouter()


async def update_status(
    episode_id: str,
    status: ProcessingStatus,
    progress: int = 0,
    error: str = None,
    message: str = None,
    checkpoint: str = None
):
    """Update episode processing status in database."""
    await repository.update_episode_status(
        episode_id, status, progress, error, message, checkpoint
    )


async def process_episode(
    episode_id: str,
    audio_path: str,
    title: str = None,
    podcast_name: str = None,
    description: str = None
):
    """Background task to process an episode."""
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            await update_status(
                episode_id, ProcessingStatus.DOWNLOADING, 10,
                message="Downloading audio file..."
            )

            if audio_path.startswith("http"):
                local_path = await download_audio(audio_path, temp_dir)
            else:
                local_path = audio_path

            # Convert to WAV and get duration
            wav_path = convert_to_wav(local_path, temp_dir)
            duration = get_audio_duration(wav_path)
            await repository.update_episode_duration(episode_id, duration)

            # Format duration for display
            duration_mins = int(duration // 60) if duration else 0
            duration_str = f"{duration_mins} minute" + ("s" if duration_mins != 1 else "")

            # Create progress callback for transcription
            def transcription_progress(progress: int, message: str):
                # Use asyncio to run the async update in the sync callback
                asyncio.create_task(update_status(
                    episode_id,
                    ProcessingStatus.TRANSCRIBING,
                    progress,
                    message=message
                ))

            # Initial transcription status
            await update_status(
                episode_id,
                ProcessingStatus.TRANSCRIBING,
                30,
                message=f"Starting transcription of {duration_str}..."
            )

            # Transcribe with AssemblyAI (includes speaker diarization)
            result = await transcribe_audio(
                wav_path,
                duration_seconds=duration,
                progress_callback=transcription_progress,
                episode_id=episode_id
            )

            # Segments already have speaker labels from AssemblyAI
            segments = result["segments"]
            language_code = result.get("language_code")

            # Save language code to database
            if language_code:
                await repository.update_episode_language(episode_id, language_code)

            # Update progress after transcription completes
            await update_status(
                episode_id, ProcessingStatus.TRANSCRIBING, 55,
                message="Transcription complete!"
            )

            # Identify speaker names from transcript context
            await update_status(
                episode_id, ProcessingStatus.DIARIZING, 60,
                message="Identifying speakers..."
            )
            speaker_map = await identify_speakers(
                segments,
                podcast_name=podcast_name,
                episode_title=title,
                episode_description=description,
                episode_id=episode_id
            )
            if speaker_map:
                segments = apply_speaker_names(segments, speaker_map)

            await update_status(
                episode_id, ProcessingStatus.CLEANING, 70,
                message="Cleaning up transcript..."
            )
            cleaned_segments = cleanup_segments(segments)
            cleaned_text = segments_to_text(cleaned_segments)

            # Save transcript to database with checkpoint
            transcript_objects = [
                TranscriptSegment(**seg) for seg in cleaned_segments
            ]
            await repository.update_episode_transcript(
                episode_id, transcript_objects, cleaned_text
            )

            await update_status(
                episode_id, ProcessingStatus.SUMMARIZING, 85,
                message="Generating summary with AI..."
            )
            summary_result = await summarize_transcript(
                cleaned_text,
                podcast_name=podcast_name,
                episode_title=title,
                episode_id=episode_id,
                language_code=language_code
            )

            summary = EpisodeSummary(
                paragraph=summary_result["paragraph"],
                takeaways=summary_result["takeaways"],
                key_quotes=[
                    KeyQuote(text=q["text"], speaker=q.get("speaker"))
                    for q in summary_result["key_quotes"]
                ],
                paragraph_en=summary_result.get("paragraph_en"),
                takeaways_en=summary_result.get("takeaways_en")
            )

            # Save summary to database with checkpoint
            await repository.update_episode_summary(episode_id, summary)

            await update_status(
                episode_id, ProcessingStatus.COMPLETED, 100,
                checkpoint="completed"
            )

    except Exception as e:
        await update_status(episode_id, ProcessingStatus.FAILED, error=str(e))


@router.get("")
async def list_episodes(
    status: Optional[str] = Query(None, description="Filter by status: all, completed, processing, failed"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """List all episodes with optional status filtering."""
    episodes = await repository.get_all_episodes(status, limit, offset)
    total = await repository.get_episode_count(status)

    # Convert to list items (lighter weight)
    items = [
        EpisodeListItem(
            id=ep.id,
            title=ep.title,
            podcast_name=ep.podcast_name,
            status=ep.status,
            progress=ep.progress,
            created_at=ep.created_at,
            duration_seconds=ep.duration_seconds
        )
        for ep in episodes
    ]

    return EpisodeListResponse(episodes=items, total=total)


@router.post("/upload")
async def upload_episode(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = None,
    podcast_name: Optional[str] = None
):
    """Upload a local audio file for processing."""
    if not file.content_type or not file.content_type.startswith("audio/"):
        if not file.filename.lower().endswith((".mp3", ".m4a", ".wav", ".ogg", ".flac")):
            raise HTTPException(status_code=400, detail="File must be an audio file")

    episode_id = str(uuid.uuid4())

    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_path = temp_file.name

    # Create episode in database
    await repository.create_episode(
        episode_id=episode_id,
        title=title or file.filename,
        podcast_name=podcast_name,
        audio_path=temp_path
    )

    background_tasks.add_task(
        process_episode,
        episode_id,
        temp_path,
        title or file.filename,
        podcast_name
    )

    return {"id": episode_id, "message": "Processing started"}


@router.post("/url")
async def process_url(
    background_tasks: BackgroundTasks,
    request: EpisodeURLRequest
):
    """Process a podcast episode from URL."""
    episode_id = str(uuid.uuid4())

    # Create episode in database
    await repository.create_episode(
        episode_id=episode_id,
        title=request.title,
        podcast_name=request.podcast_name,
        description=request.description,
        audio_url=request.url
    )

    background_tasks.add_task(
        process_episode,
        episode_id,
        request.url,
        request.title,
        request.podcast_name,
        request.description
    )

    return {"id": episode_id, "message": "Processing started"}


@router.get("/incomplete")
async def get_incomplete_episodes():
    """Get episodes that were interrupted and can be resumed."""
    return await repository.get_incomplete_episodes()


@router.post("/{episode_id}/resume")
async def resume_episode(episode_id: str, background_tasks: BackgroundTasks):
    """Resume processing an interrupted episode."""
    episode = await repository.get_episode(episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    if episode.status == ProcessingStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Episode already completed")

    if episode.status == ProcessingStatus.FAILED:
        # Reset status to allow retry
        await update_status(episode_id, ProcessingStatus.PENDING, 0)

    # Get audio source from database
    incomplete = await repository.get_incomplete_episodes()
    ep_data = next((e for e in incomplete if e["id"] == episode_id), None)

    if not ep_data:
        raise HTTPException(status_code=400, detail="Cannot determine audio source for resume")

    audio_source = ep_data.get("audio_url") or ep_data.get("audio_path")
    if not audio_source:
        raise HTTPException(status_code=400, detail="No audio source found")

    # Re-process from beginning (full re-run for simplicity)
    # TODO: Implement checkpoint-based resume in future
    background_tasks.add_task(
        process_episode,
        episode_id,
        audio_source,
        episode.title,
        episode.podcast_name
    )

    return {"message": "Processing resumed", "id": episode_id}


@router.get("/{episode_id}/status")
async def get_episode_status(episode_id: str):
    """Get the processing status of an episode."""
    episode = await repository.get_episode(episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    return {
        "id": episode.id,
        "status": episode.status,
        "progress": episode.progress,
        "error": episode.error,
        "status_message": episode.status_message,
        "duration_seconds": episode.duration_seconds
    }


@router.get("/{episode_id}")
async def get_episode(episode_id: str):
    """Get full episode results."""
    episode = await repository.get_episode(episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    return episode


@router.post("/{episode_id}/export/pdf")
async def export_pdf(episode_id: str, options: PDFExportRequest):
    """Generate PDF export of episode results."""
    episode = await repository.get_episode(episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    if episode.status != ProcessingStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Episode processing not completed")

    from app.services.pdf_export import generate_pdf

    pdf_bytes = generate_pdf(
        episode,
        include_summary=options.include_summary,
        include_takeaways=options.include_takeaways,
        include_quotes=options.include_quotes,
        include_transcript=options.include_transcript
    )

    # Sanitize filename
    filename = (episode.title or "episode").replace(" ", "_")
    filename = "".join(c for c in filename if c.isalnum() or c in "_-")
    filename = f"{filename[:50]}-summary.pdf"

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.put("/{episode_id}/speakers")
async def update_speakers(episode_id: str, request: SpeakerUpdateRequest):
    """Update speaker names for an episode."""
    episode = await repository.get_episode(episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    if not episode.transcript:
        raise HTTPException(status_code=400, detail="Episode has no transcript")

    success = await repository.update_episode_speakers(episode_id, request.speaker_map)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update speakers")

    return {"message": "Speakers updated successfully"}
