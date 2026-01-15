import os
import tempfile
import httpx
import ffmpeg
from pathlib import Path


async def download_audio(url: str, output_dir: str) -> str:
    """Download audio from URL and return the local file path."""
    async with httpx.AsyncClient(follow_redirects=True, timeout=300.0) as client:
        response = await client.get(url)
        response.raise_for_status()

        content_type = response.headers.get("content-type", "")
        ext = ".mp3"
        if "audio/mpeg" in content_type:
            ext = ".mp3"
        elif "audio/wav" in content_type:
            ext = ".wav"
        elif "audio/x-m4a" in content_type or "audio/mp4" in content_type:
            ext = ".m4a"

        output_path = os.path.join(output_dir, f"audio{ext}")
        with open(output_path, "wb") as f:
            f.write(response.content)

        return output_path


def convert_to_wav(input_path: str, output_dir: str) -> str:
    """Convert audio file to WAV format for processing."""
    output_path = os.path.join(output_dir, "audio.wav")

    try:
        (
            ffmpeg
            .input(input_path)
            .output(output_path, acodec="pcm_s16le", ar=16000, ac=1)
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
    except ffmpeg.Error as e:
        raise RuntimeError(f"FFmpeg error: {e.stderr.decode() if e.stderr else 'Unknown error'}")

    return output_path


def get_audio_duration(file_path: str) -> float:
    """Get duration of audio file in seconds."""
    try:
        probe = ffmpeg.probe(file_path)
        duration = float(probe["format"]["duration"])
        return duration
    except Exception:
        return 0.0
