import os
from typing import Optional
from anthropic import Anthropic

from app.db.repository import log_usage

# Claude Sonnet pricing
CLAUDE_INPUT_COST_PER_MILLION = 3.00   # $3/M input tokens
CLAUDE_OUTPUT_COST_PER_MILLION = 15.00  # $15/M output tokens

_client = None


def get_client():
    """Get Anthropic client (cached)."""
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is required")
        _client = Anthropic(api_key=api_key)
    return _client


async def summarize_transcript(
    transcript: str,
    podcast_name: str = None,
    episode_title: str = None,
    episode_id: Optional[str] = None,
    language_code: Optional[str] = None
) -> dict:
    """
    Generate summary, takeaways, and key quotes from transcript.
    For non-English content, also generates English translations.

    Returns:
        dict with 'paragraph', 'takeaways', 'key_quotes' keys
        and optionally 'paragraph_en', 'takeaways_en' for non-English content
    """
    client = get_client()

    context = ""
    if podcast_name:
        context += f"Podcast: {podcast_name}\n"
    if episode_title:
        context += f"Episode: {episode_title}\n"

    # Determine if we need bilingual output
    is_non_english = language_code and language_code != 'en'

    if is_non_english:
        prompt = f"""You are analyzing a podcast episode transcript. Your task is to provide a comprehensive summary for someone who doesn't have time to listen to the full episode.

{context}
TRANSCRIPT:
{transcript}

IMPORTANT: The transcript is in {language_code}. Provide the summary in TWO versions:
1. First in the ORIGINAL LANGUAGE of the transcript
2. Then in ENGLISH

Please provide:

1. A concise paragraph summary (3-5 sentences) that captures the main topic and key points discussed.

2. 5-7 bullet point takeaways - the most important insights, facts, or conclusions from the episode.

3. 3-5 key quotes - memorable or impactful direct quotes from the speakers. Include the speaker label if available. Keep quotes in original language.

Format your response EXACTLY as follows:

SUMMARY:
[Your paragraph summary in the ORIGINAL LANGUAGE]

TAKEAWAYS:
- [Takeaway 1 in original language]
- [Takeaway 2 in original language]
...

KEY_QUOTES:
- "[Quote 1 in original language]" - [Speaker]
- "[Quote 2 in original language]" - [Speaker]
...

SUMMARY_EN:
[English translation of the summary paragraph]

TAKEAWAYS_EN:
- [Takeaway 1 in English]
- [Takeaway 2 in English]
...
"""
    else:
        prompt = f"""You are analyzing a podcast episode transcript. Your task is to provide a comprehensive summary for someone who doesn't have time to listen to the full episode.

{context}
TRANSCRIPT:
{transcript}

Please provide:

1. A concise paragraph summary (3-5 sentences) that captures the main topic and key points discussed.

2. 5-7 bullet point takeaways - the most important insights, facts, or conclusions from the episode.

3. 3-5 key quotes - memorable or impactful direct quotes from the speakers. Include the speaker label if available (e.g., [SPEAKER_00]).

Format your response as follows:
SUMMARY:
[Your paragraph summary here]

TAKEAWAYS:
- [Takeaway 1]
- [Takeaway 2]
...

KEY_QUOTES:
- "[Quote 1]" - [Speaker]
- "[Quote 2]" - [Speaker]
...
"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=3000 if is_non_english else 2000,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    # Log usage
    input_tokens = response.usage.input_tokens
    output_tokens = response.usage.output_tokens
    cost = (input_tokens * CLAUDE_INPUT_COST_PER_MILLION / 1_000_000) + \
           (output_tokens * CLAUDE_OUTPUT_COST_PER_MILLION / 1_000_000)

    await log_usage(
        service="anthropic",
        operation="summarization",
        episode_id=episode_id,
        input_units=input_tokens,
        output_units=output_tokens,
        cost_usd=cost,
        metadata={
            "model": "claude-sonnet-4-20250514",
            "transcript_length": len(transcript),
            "bilingual": is_non_english,
            "language_code": language_code
        }
    )

    response_text = response.content[0].text

    result = parse_summary_response(response_text, is_non_english)
    return result


def parse_summary_response(response_text: str, is_bilingual: bool = False) -> dict:
    """Parse the structured response from Claude."""
    result = {
        "paragraph": "",
        "takeaways": [],
        "key_quotes": [],
        "paragraph_en": None,
        "takeaways_en": None
    }

    current_section = None

    for line in response_text.split("\n"):
        line = line.strip()

        # Section headers
        if line.startswith("SUMMARY_EN:"):
            current_section = "summary_en"
            continue
        elif line.startswith("SUMMARY:"):
            current_section = "summary"
            continue
        elif line.startswith("TAKEAWAYS_EN:"):
            current_section = "takeaways_en"
            continue
        elif line.startswith("TAKEAWAYS:"):
            current_section = "takeaways"
            continue
        elif line.startswith("KEY_QUOTES:") or line.startswith("KEY QUOTES:"):
            current_section = "quotes"
            continue

        if not line:
            continue

        # Parse content based on section
        if current_section == "summary":
            if result["paragraph"]:
                result["paragraph"] += " " + line
            else:
                result["paragraph"] = line
        elif current_section == "summary_en":
            if result["paragraph_en"]:
                result["paragraph_en"] += " " + line
            else:
                result["paragraph_en"] = line
        elif current_section == "takeaways":
            if line.startswith("- ") or line.startswith("• "):
                result["takeaways"].append(line[2:].strip())
            elif line.startswith("*"):
                result["takeaways"].append(line[1:].strip())
            elif line[0].isdigit() and ". " in line:
                result["takeaways"].append(line.split(". ", 1)[1].strip())
        elif current_section == "takeaways_en":
            if result["takeaways_en"] is None:
                result["takeaways_en"] = []
            if line.startswith("- ") or line.startswith("• "):
                result["takeaways_en"].append(line[2:].strip())
            elif line.startswith("*"):
                result["takeaways_en"].append(line[1:].strip())
            elif line[0].isdigit() and ". " in line:
                result["takeaways_en"].append(line.split(". ", 1)[1].strip())
        elif current_section == "quotes":
            if line.startswith("- ") or line.startswith("• "):
                quote_text = line[2:].strip()
                speaker = None
                if " - " in quote_text:
                    parts = quote_text.rsplit(" - ", 1)
                    quote_text = parts[0].strip('"').strip("'")
                    speaker = parts[1].strip("[]")
                else:
                    quote_text = quote_text.strip('"').strip("'")

                result["key_quotes"].append({
                    "text": quote_text,
                    "speaker": speaker
                })

    return result
