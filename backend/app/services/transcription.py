import os
import asyncio
import time
import httpx
from typing import Callable, Optional

from app.db.repository import log_usage

# AssemblyAI pricing
ASSEMBLYAI_COST_PER_HOUR = 0.37  # $0.37/hour with speaker diarization


def get_api_key():
    key = os.getenv("ASSEMBLYAI_API_KEY")
    if not key:
        raise ValueError("ASSEMBLYAI_API_KEY environment variable is required")
    return key


async def transcribe_audio(
    audio_path: str,
    duration_seconds: Optional[float] = None,
    progress_callback: Optional[Callable[[int, str], None]] = None,
    episode_id: Optional[str] = None
) -> dict:
    """
    Transcribe audio file using AssemblyAI.
    Returns dict with 'segments' (with speaker labels) and 'text'.
    """
    api_key = get_api_key()

    headers = {"authorization": api_key}

    # Step 1: Upload the audio file
    async with httpx.AsyncClient(timeout=300.0) as client:
        with open(audio_path, "rb") as f:
            upload_response = await client.post(
                "https://api.assemblyai.com/v2/upload",
                headers=headers,
                content=f.read()
            )
        upload_response.raise_for_status()
        audio_url = upload_response.json()["upload_url"]

        # Step 2: Request transcription with speaker diarization and auto language detection
        transcript_response = await client.post(
            "https://api.assemblyai.com/v2/transcript",
            headers=headers,
            json={
                "audio_url": audio_url,
                "speaker_labels": True,  # Enable diarization
                "language_detection": True  # Auto-detect language (supports 99 languages including Hebrew)
            }
        )
        transcript_response.raise_for_status()
        transcript_id = transcript_response.json()["id"]

        # Step 3: Poll for completion with progress tracking
        start_time = time.time()

        # Estimate processing time: AssemblyAI typically processes at 0.3-0.5x realtime
        # Use 0.4x as baseline (2.5 min processing per 1 min audio)
        duration_mins = (duration_seconds / 60) if duration_seconds else 10
        estimated_seconds = duration_mins * 2.5 * 60  # Convert to seconds

        while True:
            status_response = await client.get(
                f"https://api.assemblyai.com/v2/transcript/{transcript_id}",
                headers=headers
            )
            status_response.raise_for_status()
            result = status_response.json()

            if result["status"] == "completed":
                break
            elif result["status"] == "error":
                raise RuntimeError(f"Transcription failed: {result.get('error', 'Unknown error')}")

            # Update progress based on elapsed time
            if progress_callback:
                elapsed = time.time() - start_time
                elapsed_mins = int(elapsed // 60)
                elapsed_secs = int(elapsed % 60)

                # Calculate simulated progress (30-55% range for transcription phase)
                # This leaves room for speaker ID (55-65%), cleaning (65-75%), summarizing (75-95%)
                progress_ratio = min(elapsed / estimated_seconds, 0.95)
                simulated_progress = 30 + int(progress_ratio * 25)  # 30% to 55%

                # Build status message
                status = result.get("status", "processing")
                if status == "queued":
                    message = f"Queued for processing... ({elapsed_mins}m {elapsed_secs}s)"
                else:
                    message = f"Transcribing... {elapsed_mins}m {elapsed_secs}s elapsed"
                    if duration_seconds:
                        est_remaining = max(0, estimated_seconds - elapsed)
                        if est_remaining > 60:
                            message += f" (est. {int(est_remaining // 60)}m remaining)"
                        elif est_remaining > 0:
                            message += f" (almost done...)"

                progress_callback(simulated_progress, message)

            await asyncio.sleep(3)

    # Step 4: Format response
    segments = []
    for utterance in result.get("utterances", []):
        segments.append({
            "start": utterance["start"] / 1000,  # Convert ms to seconds
            "end": utterance["end"] / 1000,
            "text": utterance["text"],
            "speaker": utterance.get("speaker", None)
        })

    # Log usage
    audio_hours = (duration_seconds or 0) / 3600
    cost = audio_hours * ASSEMBLYAI_COST_PER_HOUR
    await log_usage(
        service="assemblyai",
        operation="transcription",
        episode_id=episode_id,
        input_units=audio_hours,  # hours of audio
        output_units=len(result.get("text", "")),  # characters transcribed
        cost_usd=cost,
        metadata={
            "duration_seconds": duration_seconds,
            "language": result.get("language_code"),
            "speakers_count": len(set(u.get("speaker") for u in result.get("utterances", []) if u.get("speaker")))
        }
    )

    return {
        "segments": segments,
        "text": result.get("text", ""),
        "speakers": list(set(u.get("speaker") for u in result.get("utterances", []) if u.get("speaker"))),
        "language_code": result.get("language_code"),
        "language_confidence": result.get("language_confidence")
    }
