"""
PDF export service for generating episode summaries as PDFs.
"""
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.colors import HexColor

from app.models.schemas import EpisodeResult


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
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch
    )

    # Define styles
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name='EpisodeTitle',
        fontSize=20,
        spaceAfter=6,
        fontName='Helvetica-Bold',
        textColor=HexColor('#1a1a1a')
    ))

    styles.add(ParagraphStyle(
        name='EpisodeSubtitle',
        fontSize=12,
        spaceAfter=12,
        fontName='Helvetica',
        textColor=HexColor('#666666')
    ))

    styles.add(ParagraphStyle(
        name='SectionHeading',
        fontSize=14,
        spaceBefore=16,
        spaceAfter=8,
        fontName='Helvetica-Bold',
        textColor=HexColor('#0284c7')  # Primary color
    ))

    styles.add(ParagraphStyle(
        name='EpisodeBodyText',
        fontSize=11,
        spaceAfter=8,
        alignment=TA_JUSTIFY,
        fontName='Helvetica',
        textColor=HexColor('#333333'),
        leading=16
    ))

    styles.add(ParagraphStyle(
        name='Takeaway',
        fontSize=11,
        spaceAfter=6,
        fontName='Helvetica',
        textColor=HexColor('#333333'),
        leftIndent=12,
        bulletIndent=0
    ))

    styles.add(ParagraphStyle(
        name='Quote',
        fontSize=11,
        spaceAfter=8,
        fontName='Helvetica-Oblique',
        textColor=HexColor('#444444'),
        leftIndent=20,
        rightIndent=20,
        leading=16
    ))

    styles.add(ParagraphStyle(
        name='QuoteAttribution',
        fontSize=10,
        spaceAfter=12,
        fontName='Helvetica',
        textColor=HexColor('#666666'),
        leftIndent=20
    ))

    styles.add(ParagraphStyle(
        name='TranscriptSpeaker',
        fontSize=10,
        spaceBefore=8,
        spaceAfter=2,
        fontName='Helvetica-Bold',
        textColor=HexColor('#0284c7')
    ))

    styles.add(ParagraphStyle(
        name='TranscriptText',
        fontSize=10,
        spaceAfter=4,
        fontName='Helvetica',
        textColor=HexColor('#333333'),
        leading=14
    ))

    story = []

    # Title - escape special characters
    title = (episode.title or "Podcast Episode").replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    story.append(Paragraph(title, styles['EpisodeTitle']))

    # Subtitle with podcast name and duration
    subtitle_parts = []
    if episode.podcast_name:
        safe_name = episode.podcast_name.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        subtitle_parts.append(safe_name)
    if episode.duration_seconds:
        mins = int(episode.duration_seconds // 60)
        subtitle_parts.append(f"{mins} minutes")
    if subtitle_parts:
        story.append(Paragraph(" | ".join(subtitle_parts), styles['EpisodeSubtitle']))

    story.append(Spacer(1, 0.25 * inch))

    # Summary section
    if include_summary and episode.summary and episode.summary.paragraph:
        story.append(Paragraph("Summary", styles['SectionHeading']))
        # Escape special characters in summary
        safe_paragraph = episode.summary.paragraph.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        story.append(Paragraph(safe_paragraph, styles['EpisodeBodyText']))

    # Takeaways section
    if include_takeaways and episode.summary and episode.summary.takeaways:
        story.append(Paragraph("Key Takeaways", styles['SectionHeading']))
        for takeaway in episode.summary.takeaways:
            # Escape special characters
            safe_takeaway = takeaway.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(f"• {safe_takeaway}", styles['Takeaway']))
        story.append(Spacer(1, 0.1 * inch))

    # Key Quotes section
    if include_quotes and episode.summary and episode.summary.key_quotes:
        story.append(Paragraph("Key Quotes", styles['SectionHeading']))
        for quote in episode.summary.key_quotes:
            # Escape special characters
            safe_text = quote.text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(f'"{safe_text}"', styles['Quote']))
            if quote.speaker:
                safe_speaker = quote.speaker.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                story.append(Paragraph(f"— {safe_speaker}", styles['QuoteAttribution']))
            else:
                story.append(Spacer(1, 0.05 * inch))

    # Full Transcript section
    if include_transcript and episode.cleaned_transcript:
        story.append(Spacer(1, 0.2 * inch))
        story.append(HRFlowable(width="100%", thickness=1, color=HexColor('#e0e0e0')))
        story.append(Spacer(1, 0.1 * inch))
        story.append(Paragraph("Full Transcript", styles['SectionHeading']))

        # Parse and format transcript
        paragraphs = episode.cleaned_transcript.split('\n\n')
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            # Check if paragraph starts with a speaker label [Speaker Name]:
            if para.startswith('[') and ']:' in para:
                bracket_end = para.index(']:')
                speaker = para[1:bracket_end]
                text = para[bracket_end + 2:].strip()

                # Escape special characters
                safe_speaker = speaker.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                story.append(Paragraph(safe_speaker, styles['TranscriptSpeaker']))
                if text:
                    safe_text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    story.append(Paragraph(safe_text, styles['TranscriptText']))
            else:
                # Regular paragraph without speaker
                safe_para = para.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                story.append(Paragraph(safe_para, styles['TranscriptText']))

    # Build the PDF
    doc.build(story)
    return buffer.getvalue()
