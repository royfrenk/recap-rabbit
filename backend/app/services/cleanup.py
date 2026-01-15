import re

FILLER_WORDS = [
    r"\buh\b",
    r"\bum\b",
    r"\buhm\b",
    r"\buhh\b",
    r"\bumm\b",
    r"\blike\b,?\s*\blike\b",
    r"\byou know\b",
    r"\bI mean\b",
    r"\bkind of\b",
    r"\bsort of\b",
    r"\bbasically\b",
    r"\bliterally\b",
    r"\bactually\b",
    r"\bhonestly\b",
    r"\bso,?\s*so\b",
    r"\band,?\s*and\b",
]

FALSE_STARTS_PATTERN = re.compile(
    r"\b(\w+)\s*,?\s*\1\b",
    re.IGNORECASE
)


def remove_filler_words(text: str) -> str:
    """Remove filler words from text."""
    result = text
    for pattern in FILLER_WORDS:
        result = re.sub(pattern, "", result, flags=re.IGNORECASE)
    return result


def remove_false_starts(text: str) -> str:
    """Remove repeated words (false starts)."""
    return FALSE_STARTS_PATTERN.sub(r"\1", text)


def clean_whitespace(text: str) -> str:
    """Clean up extra whitespace."""
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s+([.,!?])", r"\1", text)
    text = re.sub(r"([.,!?])\s*([.,!?])", r"\1", text)
    return text.strip()


def cleanup_transcript(text: str) -> str:
    """Apply all cleanup operations to transcript text."""
    text = remove_filler_words(text)
    text = remove_false_starts(text)
    text = clean_whitespace(text)
    return text


def cleanup_segments(segments: list[dict]) -> list[dict]:
    """Apply cleanup to all transcript segments."""
    cleaned = []
    for seg in segments:
        cleaned_text = cleanup_transcript(seg["text"])
        if cleaned_text:
            cleaned.append({
                **seg,
                "text": cleaned_text
            })
    return cleaned


def segments_to_text(segments: list[dict], include_speakers: bool = True) -> str:
    """Convert segments to readable text with optional speaker labels."""
    lines = []
    current_speaker = None
    current_text = []

    for seg in segments:
        speaker = seg.get("speaker")
        text = seg["text"]

        if include_speakers and speaker != current_speaker:
            if current_text:
                lines.append(f"[{current_speaker or 'Unknown'}]: {' '.join(current_text)}")
            current_speaker = speaker
            current_text = [text]
        else:
            current_text.append(text)

    if current_text:
        if include_speakers:
            lines.append(f"[{current_speaker or 'Unknown'}]: {' '.join(current_text)}")
        else:
            lines.append(" ".join(current_text))

    return "\n\n".join(lines)
