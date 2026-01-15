import os
from typing import Optional

PYANNOTE_AVAILABLE = False
_pipeline = None

try:
    from pyannote.audio import Pipeline
    PYANNOTE_AVAILABLE = True
except ImportError:
    pass


def get_pipeline():
    """Load PyAnnote diarization pipeline (cached)."""
    global _pipeline
    if not PYANNOTE_AVAILABLE:
        raise ImportError("pyannote.audio is not installed. Speaker diarization is disabled.")

    if _pipeline is None:
        hf_token = os.getenv("HUGGINGFACE_TOKEN")
        if not hf_token:
            raise ValueError("HUGGINGFACE_TOKEN environment variable is required for diarization")
        _pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=hf_token
        )
    return _pipeline


def diarize_audio(audio_path: str) -> list[dict]:
    """
    Perform speaker diarization on audio file.
    Returns list of segments with start, end, and speaker label.
    Returns empty list if pyannote is not available.
    """
    if not PYANNOTE_AVAILABLE:
        return []

    pipeline = get_pipeline()
    diarization = pipeline(audio_path)

    segments = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        segments.append({
            "start": turn.start,
            "end": turn.end,
            "speaker": speaker
        })

    return segments


def merge_transcript_with_diarization(
    transcript_segments: list[dict],
    diarization_segments: list[dict]
) -> list[dict]:
    """
    Merge transcript segments with speaker diarization.
    Assigns speaker labels to transcript segments based on overlap.
    """
    if not diarization_segments:
        return [{**seg, "speaker": None} for seg in transcript_segments]

    merged = []

    for t_seg in transcript_segments:
        t_start = t_seg["start"]
        t_end = t_seg["end"]

        best_speaker = None
        best_overlap = 0

        for d_seg in diarization_segments:
            d_start = d_seg["start"]
            d_end = d_seg["end"]

            overlap_start = max(t_start, d_start)
            overlap_end = min(t_end, d_end)
            overlap = max(0, overlap_end - overlap_start)

            if overlap > best_overlap:
                best_overlap = overlap
                best_speaker = d_seg["speaker"]

        merged.append({
            "start": t_start,
            "end": t_end,
            "text": t_seg["text"],
            "speaker": best_speaker
        })

    return merged
