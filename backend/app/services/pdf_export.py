"""
PDF export service for generating episode summaries as PDFs.
"""
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
    Table, TableStyle, Frame, PageTemplate, BaseDocTemplate
)
from reportlab.lib.colors import HexColor, white, Color
from reportlab.graphics.shapes import Drawing, Rect, Circle, String
from reportlab.graphics.widgetbase import Widget
from reportlab.platypus.flowables import Flowable

from app.models.schemas import EpisodeResult


# Brand colors
PURPLE = HexColor('#7c3aed')
PURPLE_LIGHT = HexColor('#ede9fe')
GRAY_DARK = HexColor('#1f2937')
GRAY_MEDIUM = HexColor('#6b7280')
GRAY_LIGHT = HexColor('#e5e7eb')


class HeaderBar(Flowable):
    """A purple header bar with the Recap Rabbit logo text."""

    def __init__(self, width, height=50):
        Flowable.__init__(self)
        self.width = width
        self.height = height

    def draw(self):
        self.canv.setFillColor(PURPLE)
        self.canv.rect(0, 0, self.width, self.height, fill=1, stroke=0)
        self.canv.setFillColor(white)
        self.canv.setFont('Helvetica-Bold', 16)
        self.canv.drawString(20, self.height / 2 - 6, "RECAP RABBIT")


class SectionHeading(Flowable):
    """Section heading with purple left border."""

    def __init__(self, text, width):
        Flowable.__init__(self)
        self.text = text
        self.flowable_width = width
        self.height = 24

    def wrap(self, availWidth, availHeight):
        return (self.flowable_width, self.height)

    def draw(self):
        # Purple left border
        self.canv.setFillColor(PURPLE)
        self.canv.rect(0, 0, 4, self.height, fill=1, stroke=0)

        # Section title
        self.canv.setFillColor(PURPLE)
        self.canv.setFont('Helvetica-Bold', 13)
        self.canv.drawString(14, 6, self.text.upper())


class NumberedItem(Flowable):
    """A takeaway item with a purple numbered circle."""

    def __init__(self, number, text, width):
        Flowable.__init__(self)
        self.number = number
        self.text = text
        self.flowable_width = width
        # Calculate height based on text length
        chars_per_line = int((width - 50) / 6)  # Approximate
        lines = max(1, len(text) // chars_per_line + 1)
        self.height = max(30, lines * 16 + 10)

    def wrap(self, availWidth, availHeight):
        return (self.flowable_width, self.height)

    def draw(self):
        # Purple circle with number
        self.canv.setFillColor(PURPLE)
        self.canv.circle(15, self.height - 15, 12, fill=1, stroke=0)

        # White number
        self.canv.setFillColor(white)
        self.canv.setFont('Helvetica-Bold', 11)
        x_offset = 12 if self.number < 10 else 9
        self.canv.drawString(x_offset, self.height - 19, str(self.number))

        # Text - wrap it manually
        self.canv.setFillColor(GRAY_DARK)
        self.canv.setFont('Helvetica', 11)

        # Simple text wrapping
        text = self.text
        x = 38
        y = self.height - 15
        max_width = self.flowable_width - 50
        words = text.split()
        line = ""

        for word in words:
            test_line = line + " " + word if line else word
            if self.canv.stringWidth(test_line, 'Helvetica', 11) < max_width:
                line = test_line
            else:
                if line:
                    self.canv.drawString(x, y, line)
                    y -= 16
                line = word

        if line:
            self.canv.drawString(x, y, line)


class QuoteBox(Flowable):
    """A quote with light purple background."""

    def __init__(self, quote_text, speaker, width):
        Flowable.__init__(self)
        self.quote_text = quote_text
        self.speaker = speaker
        self.flowable_width = width
        # Calculate height
        chars_per_line = int((width - 40) / 6.5)
        lines = max(1, len(quote_text) // chars_per_line + 1)
        self.height = lines * 16 + 45  # Extra space for speaker

    def wrap(self, availWidth, availHeight):
        return (self.flowable_width, self.height)

    def draw(self):
        # Light purple background
        self.canv.setFillColor(PURPLE_LIGHT)
        self.canv.roundRect(0, 0, self.flowable_width, self.height, 4, fill=1, stroke=0)

        # Quote text in italic
        self.canv.setFillColor(GRAY_DARK)
        self.canv.setFont('Helvetica-Oblique', 11)

        text = f'"{self.quote_text}"'
        x = 16
        y = self.height - 20
        max_width = self.flowable_width - 32
        words = text.split()
        line = ""

        for word in words:
            test_line = line + " " + word if line else word
            if self.canv.stringWidth(test_line, 'Helvetica-Oblique', 11) < max_width:
                line = test_line
            else:
                if line:
                    self.canv.drawString(x, y, line)
                    y -= 16
                line = word

        if line:
            self.canv.drawString(x, y, line)
            y -= 20

        # Speaker attribution
        if self.speaker:
            self.canv.setFont('Helvetica', 10)
            self.canv.setFillColor(GRAY_MEDIUM)
            self.canv.drawString(x, y, f"— {self.speaker}")


def add_footer(canvas, doc):
    """Add footer to each page."""
    canvas.saveState()
    canvas.setFillColor(GRAY_MEDIUM)
    canvas.setFont('Helvetica', 9)
    footer_text = "Generated by Recap Rabbit"
    text_width = canvas.stringWidth(footer_text, 'Helvetica', 9)
    canvas.drawString(
        (letter[0] - text_width) / 2,
        0.5 * inch,
        footer_text
    )
    canvas.restoreState()


def generate_pdf(
    episode: EpisodeResult,
    include_summary: bool = True,
    include_takeaways: bool = True,
    include_quotes: bool = True,
    include_transcript: bool = True
) -> bytes:
    """
    Generate a PDF with selected sections from an episode.

    Args:
        episode: The episode data
        include_summary: Include the summary paragraph
        include_takeaways: Include key takeaways
        include_quotes: Include key quotes
        include_transcript: Include the full transcript

    Returns:
        PDF file as bytes
    """
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        topMargin=0.5 * inch,
        bottomMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch
    )

    # Content width
    content_width = letter[0] - 1.5 * inch

    # Define styles
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name='EpisodeTitle',
        fontSize=24,
        spaceAfter=6,
        fontName='Helvetica-Bold',
        textColor=GRAY_DARK,
        leading=28
    ))

    styles.add(ParagraphStyle(
        name='PodcastName',
        fontSize=12,
        spaceAfter=4,
        fontName='Helvetica',
        textColor=GRAY_MEDIUM
    ))

    styles.add(ParagraphStyle(
        name='EpisodeMeta',
        fontSize=11,
        spaceAfter=16,
        fontName='Helvetica',
        textColor=GRAY_MEDIUM
    ))

    styles.add(ParagraphStyle(
        name='RRBodyText',
        fontSize=11,
        spaceAfter=8,
        fontName='Helvetica',
        textColor=GRAY_DARK,
        leading=18
    ))

    styles.add(ParagraphStyle(
        name='TranscriptSpeaker',
        fontSize=10,
        spaceBefore=12,
        spaceAfter=2,
        fontName='Helvetica-Bold',
        textColor=PURPLE
    ))

    styles.add(ParagraphStyle(
        name='TranscriptText',
        fontSize=10,
        spaceAfter=4,
        fontName='Helvetica',
        textColor=GRAY_DARK,
        leading=14
    ))

    story = []

    # Header bar
    story.append(HeaderBar(content_width + 1.5 * inch, 45))
    story.append(Spacer(1, 0.4 * inch))

    # Title
    title = (episode.title or "Podcast Episode").replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    story.append(Paragraph(title, styles['EpisodeTitle']))

    # Podcast name
    if episode.podcast_name:
        safe_name = episode.podcast_name.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        story.append(Paragraph(safe_name, styles['PodcastName']))

    # Duration and date
    meta_parts = []
    if episode.duration_seconds:
        mins = int(episode.duration_seconds // 60)
        secs = int(episode.duration_seconds % 60)
        meta_parts.append(f"{mins}:{secs:02d}")
    meta_parts.append(datetime.now().strftime("%b %d, %Y"))
    story.append(Paragraph(" • ".join(meta_parts), styles['EpisodeMeta']))

    # Divider line
    story.append(HRFlowable(width="100%", thickness=1, color=GRAY_LIGHT, spaceAfter=20))

    # Summary section
    if include_summary and episode.summary and episode.summary.paragraph:
        story.append(SectionHeading("Summary", content_width))
        story.append(Spacer(1, 0.15 * inch))
        safe_paragraph = episode.summary.paragraph.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        story.append(Paragraph(safe_paragraph, styles['RRBodyText']))
        story.append(Spacer(1, 0.25 * inch))

    # Key Takeaways section
    if include_takeaways and episode.summary and episode.summary.takeaways:
        story.append(SectionHeading("Key Takeaways", content_width))
        story.append(Spacer(1, 0.15 * inch))
        for i, takeaway in enumerate(episode.summary.takeaways, 1):
            safe_takeaway = takeaway.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            story.append(NumberedItem(i, safe_takeaway, content_width))
            story.append(Spacer(1, 0.08 * inch))
        story.append(Spacer(1, 0.15 * inch))

    # Key Quotes section
    if include_quotes and episode.summary and episode.summary.key_quotes:
        story.append(SectionHeading("Key Quotes", content_width))
        story.append(Spacer(1, 0.15 * inch))
        for quote in episode.summary.key_quotes:
            safe_text = quote.text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            safe_speaker = quote.speaker.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;') if quote.speaker else None
            story.append(QuoteBox(safe_text, safe_speaker, content_width))
            story.append(Spacer(1, 0.1 * inch))

    # Full Transcript section
    if include_transcript and episode.cleaned_transcript:
        story.append(Spacer(1, 0.2 * inch))
        story.append(HRFlowable(width="100%", thickness=1, color=GRAY_LIGHT))
        story.append(Spacer(1, 0.15 * inch))
        story.append(SectionHeading("Full Transcript", content_width))
        story.append(Spacer(1, 0.15 * inch))

        paragraphs = episode.cleaned_transcript.split('\n\n')
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            if para.startswith('[') and ']:' in para:
                bracket_end = para.index(']:')
                speaker = para[1:bracket_end]
                text = para[bracket_end + 2:].strip()

                safe_speaker = speaker.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                story.append(Paragraph(safe_speaker, styles['TranscriptSpeaker']))
                if text:
                    safe_text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    story.append(Paragraph(safe_text, styles['TranscriptText']))
            else:
                safe_para = para.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                story.append(Paragraph(safe_para, styles['TranscriptText']))

    # Build the PDF with footer
    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
    return buffer.getvalue()
