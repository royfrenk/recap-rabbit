from pydantic import BaseModel
from typing import Optional
from enum import Enum


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    TRANSCRIBING = "transcribing"
    DIARIZING = "diarizing"
    CLEANING = "cleaning"
    SUMMARIZING = "summarizing"
    COMPLETED = "completed"
    FAILED = "failed"


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str
    speaker: Optional[str] = None
    speaker_label: Optional[str] = None  # Original label (A, B, C)
    speaker_gender: Optional[str] = None  # male, female, unknown


class KeyQuote(BaseModel):
    text: str
    speaker: Optional[str] = None
    timestamp: Optional[float] = None


class EpisodeSummary(BaseModel):
    paragraph: str
    takeaways: list[str]
    key_quotes: list[KeyQuote]
    # English translation (if original is non-English)
    paragraph_en: Optional[str] = None
    takeaways_en: Optional[list[str]] = None


# RTL languages for frontend display
RTL_LANGUAGES = {'he', 'ar', 'fa', 'ur', 'yi'}


class EpisodeResult(BaseModel):
    id: str
    title: Optional[str] = None
    podcast_name: Optional[str] = None
    description: Optional[str] = None
    status: ProcessingStatus
    progress: int = 0
    status_message: Optional[str] = None
    transcript: Optional[list[TranscriptSegment]] = None
    cleaned_transcript: Optional[str] = None
    summary: Optional[EpisodeSummary] = None
    error: Optional[str] = None
    duration_seconds: Optional[float] = None
    audio_url: Optional[str] = None
    language_code: Optional[str] = None  # Detected language (e.g., 'he', 'en', 'es')
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    # SEO public sharing
    is_public: bool = False
    slug: Optional[str] = None


class EpisodeListItem(BaseModel):
    """Lightweight episode representation for history list."""
    id: str
    title: Optional[str] = None
    podcast_name: Optional[str] = None
    status: ProcessingStatus
    progress: int = 0
    created_at: Optional[str] = None
    duration_seconds: Optional[float] = None


class EpisodeListResponse(BaseModel):
    """Paginated list of episodes."""
    episodes: list[EpisodeListItem]
    total: int


class PDFExportRequest(BaseModel):
    """Options for PDF export."""
    include_summary: bool = True
    include_takeaways: bool = True
    include_quotes: bool = True
    include_transcript: bool = True


class EpisodeURLRequest(BaseModel):
    url: str
    title: Optional[str] = None
    podcast_name: Optional[str] = None
    description: Optional[str] = None


class PodcastSearchResult(BaseModel):
    id: str
    title: str
    podcast_name: str
    description: Optional[str] = None
    audio_url: str
    thumbnail: Optional[str] = None
    duration_seconds: Optional[int] = None
    publish_date: Optional[str] = None


class SearchResponse(BaseModel):
    results: list[PodcastSearchResult]
    total: int


class SpeakerUpdateRequest(BaseModel):
    """Request to update speaker names."""
    speaker_map: dict[str, str]  # original_label -> new_name


class SetPublicRequest(BaseModel):
    """Request to set episode public/private."""
    is_public: bool


class PublicSummaryResponse(BaseModel):
    """Public summary for SEO pages (no sensitive data)."""
    slug: str
    title: Optional[str] = None
    podcast_name: Optional[str] = None
    description: Optional[str] = None
    summary: Optional[EpisodeSummary] = None
    duration_seconds: Optional[float] = None
    language_code: Optional[str] = None
    created_at: Optional[str] = None
