"""
Smart speaker identification service.
Uses Claude to analyze transcripts and identify speaker names from context.
Supports Hebrew and English, with gender detection for unidentified speakers.
"""
import os
import re
import json
import anthropic
from typing import Optional

from app.db.repository import log_usage

# Claude Sonnet pricing
CLAUDE_INPUT_COST_PER_MILLION = 3.00   # $3/M input tokens
CLAUDE_OUTPUT_COST_PER_MILLION = 15.00  # $15/M output tokens


def get_anthropic_client():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable is required")
    return anthropic.Anthropic(api_key=api_key)


def build_transcript_sample(segments: list[dict], duration_seconds: float = None) -> str:
    """
    Build a strategic transcript sample for speaker identification.

    Samples:
    - First 10 minutes (introductions)
    - Last 5 minutes (sign-offs, often have names)
    - High-conversation segments (frequent speaker changes)
    """
    if not segments:
        return ""

    sample_parts = []

    # Get total duration
    if duration_seconds:
        total_duration = duration_seconds
    elif segments:
        total_duration = segments[-1].get("end", 0)
    else:
        total_duration = 0

    # Part 1: First 10 minutes (introductions)
    sample_parts.append("=== BEGINNING OF EPISODE ===")
    for seg in segments:
        if seg.get("start", 0) > 600:  # First 10 minutes
            break
        speaker = seg.get("speaker", "Unknown")
        text = seg.get("text", "")
        sample_parts.append(f"[{speaker}]: {text}")

    # Part 2: Last 5 minutes (sign-offs)
    if total_duration > 900:  # Only if episode > 15 min
        cutoff = total_duration - 300  # Last 5 minutes
        sample_parts.append("\n=== END OF EPISODE ===")
        for seg in segments:
            if seg.get("start", 0) >= cutoff:
                speaker = seg.get("speaker", "Unknown")
                text = seg.get("text", "")
                sample_parts.append(f"[{speaker}]: {text}")

    # Part 3: High-conversation segments (where speakers alternate frequently)
    # Find segments where there are many speaker changes in a short time
    if len(segments) > 50:
        conversation_segments = find_conversation_segments(segments)
        if conversation_segments:
            sample_parts.append("\n=== CONVERSATION EXCERPTS ===")
            for seg in conversation_segments[:20]:  # Limit to 20 segments
                speaker = seg.get("speaker", "Unknown")
                text = seg.get("text", "")
                sample_parts.append(f"[{speaker}]: {text}")

    return "\n".join(sample_parts)


def find_conversation_segments(segments: list[dict], window_size: int = 10) -> list[dict]:
    """Find segments where speakers alternate frequently (likely introductions/conversations)."""
    if len(segments) < window_size:
        return []

    best_window_start = 0
    best_speaker_changes = 0

    for i in range(len(segments) - window_size):
        window = segments[i:i + window_size]
        speaker_changes = sum(
            1 for j in range(1, len(window))
            if window[j].get("speaker") != window[j-1].get("speaker")
        )
        if speaker_changes > best_speaker_changes:
            best_speaker_changes = speaker_changes
            best_window_start = i

    # Return the best conversation window (skip first 10 min which we already have)
    if best_speaker_changes >= 5 and segments[best_window_start].get("start", 0) > 600:
        return segments[best_window_start:best_window_start + window_size]

    return []


async def identify_speakers(
    segments: list[dict],
    podcast_name: Optional[str] = None,
    episode_title: Optional[str] = None,
    episode_description: Optional[str] = None,
    episode_id: Optional[str] = None
) -> dict[str, dict]:
    """
    Analyze transcript segments to identify speaker names and gender.

    Returns a mapping of speaker labels to speaker info:
    {
        "A": {"name": "John Smith", "gender": "male"},
        "B": {"name": null, "gender": "female"},
    }
    """
    if not segments:
        return {}

    # Get unique speaker labels
    speaker_labels = list(set(seg.get("speaker") for seg in segments if seg.get("speaker")))
    if not speaker_labels:
        return {}

    # Get total duration for sampling
    duration = segments[-1].get("end", 0) if segments else 0

    # Build strategic transcript sample
    transcript_text = build_transcript_sample(segments, duration)

    # Build metadata context
    metadata_context = ""
    if podcast_name:
        metadata_context += f"Podcast: {podcast_name}\n"
    if episode_title:
        metadata_context += f"Episode Title: {episode_title}\n"
    if episode_description:
        metadata_context += f"Episode Description: {episode_description[:1000]}\n"  # Limit description

    # Use Claude to identify speakers
    client = get_anthropic_client()

    prompt = f"""Analyze this podcast transcript to identify speaker names and gender.

{metadata_context}
Speaker labels found: {', '.join(sorted(speaker_labels))}

Transcript samples:
{transcript_text}

INSTRUCTIONS:
1. Identify speaker names from:
   - Self-introductions in ANY language:
     * English: "I'm John", "My name is Sarah", "This is X speaking"
     * Hebrew: "אני דני", "שמי יעל", "קוראים לי משה"
     * Spanish: "Soy Maria", "Me llamo Carlos"
     * French: "Je suis Pierre", "Je m'appelle Sophie"
     * German: "Ich bin Hans", "Mein Name ist..."
     * Arabic: "أنا محمد", "اسمي فاطمة"
     * And similar patterns in other languages
   - Others addressing them by name in any language
   - Episode title/description often mentions guest names
   - Common podcast patterns: "Welcome [guest]", "Today we have [name]", "אורח/ת שלנו היום"

2. Determine gender for ALL speakers (even if name is unknown):
   - From the name itself (culturally gendered names)
   - From grammatical gender in gendered languages:
     * Hebrew: verb conjugations, adjective endings (-ים/-ות)
     * Spanish/French/Arabic: adjective and verb agreement
     * German: pronoun usage (er/sie)
   - From pronouns others use ("he/she", "הוא/היא", "él/ella", "il/elle")
   - From context clues and titles (Mr./Mrs., אדון/גברת, Señor/Señora)

3. For unidentified speakers:
   - Set name to null
   - Still try to determine gender

Return ONLY a JSON object. Example:
{{
  "A": {{"name": "דני שמש", "gender": "male"}},
  "B": {{"name": null, "gender": "female"}},
  "C": {{"name": "Speaker C", "gender": "unknown"}}
}}

Rules:
- Use "male", "female", or "unknown" for gender
- If confident about a name, include it; otherwise set to null
- If you find a name in the title/description that matches a speaker's voice pattern, use it
"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )

        # Log usage
        input_tokens = response.usage.input_tokens
        output_tokens = response.usage.output_tokens
        cost = (input_tokens * CLAUDE_INPUT_COST_PER_MILLION / 1_000_000) + \
               (output_tokens * CLAUDE_OUTPUT_COST_PER_MILLION / 1_000_000)

        await log_usage(
            service="anthropic",
            operation="speaker_identification",
            episode_id=episode_id,
            input_units=input_tokens,
            output_units=output_tokens,
            cost_usd=cost,
            metadata={
                "model": "claude-sonnet-4-20250514",
                "speakers_found": len(speaker_labels),
                "transcript_sample_length": len(transcript_text)
            }
        )

        response_text = response.content[0].text.strip()

        # Extract JSON from response (handle nested objects)
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            speaker_map = json.loads(json_match.group())

            # Validate and normalize the mapping
            cleaned_map = {}
            for label, info in speaker_map.items():
                if isinstance(info, dict):
                    cleaned_map[label] = {
                        "name": info.get("name") if info.get("name") else None,
                        "gender": info.get("gender", "unknown")
                    }
                elif isinstance(info, str):
                    # Handle old format (just name string)
                    cleaned_map[label] = {
                        "name": info if info.strip() else None,
                        "gender": "unknown"
                    }

            return cleaned_map

        return {}

    except Exception as e:
        print(f"Speaker identification failed: {e}")
        return {}


def apply_speaker_names(segments: list[dict], speaker_map: dict) -> list[dict]:
    """
    Apply identified speaker names and gender to transcript segments.

    speaker_map format:
    {
        "A": {"name": "John", "gender": "male"},
        "B": {"name": null, "gender": "female"}
    }
    """
    if not speaker_map:
        return segments

    updated_segments = []
    for seg in segments:
        new_seg = seg.copy()
        original_speaker = seg.get("speaker")

        if original_speaker and original_speaker in speaker_map:
            info = speaker_map[original_speaker]

            # Store original label for manual override feature
            new_seg["speaker_label"] = original_speaker

            # Set display name
            if info.get("name"):
                new_seg["speaker"] = info["name"]
            else:
                # Use gender-aware default name
                gender = info.get("gender", "unknown")
                if gender == "male":
                    new_seg["speaker"] = f"Speaker {original_speaker} (Male)"
                elif gender == "female":
                    new_seg["speaker"] = f"Speaker {original_speaker} (Female)"
                else:
                    new_seg["speaker"] = f"Speaker {original_speaker}"

            # Store gender
            new_seg["speaker_gender"] = info.get("gender", "unknown")

        elif original_speaker:
            # No info found - keep original with label
            new_seg["speaker_label"] = original_speaker
            new_seg["speaker"] = f"Speaker {original_speaker}"
            new_seg["speaker_gender"] = "unknown"

        updated_segments.append(new_seg)

    return updated_segments
