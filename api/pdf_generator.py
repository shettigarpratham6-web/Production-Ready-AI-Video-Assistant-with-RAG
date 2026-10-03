# api/pdf_generator.py

import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors


def generate_pdf_report(
    title: str,
    summary: str,
    action_items: str,
    decisions: str,
    questions: str,
) -> bytes:
    """
    Compile meeting insights into a formatted PDF document using ReportLab.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
        alignment=0,
        spaceAfter=10,
    )
    h1_style = ParagraphStyle(
        "ReportH1",
        parent=styles["Heading2"],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0f766e"),
        spaceBefore=12,
        spaceAfter=5,
    )
    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=8,
    )
    meta_style = ParagraphStyle(
        "ReportMeta",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=12,
    )

    story = [
        Paragraph(title or "AI Video and Meeting Assistant Report", title_style),
        Paragraph(
            f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')} | Engine: Ollama LLaMA 3.2",
            meta_style,
        ),
        HRFlowable(
            width="100%",
            thickness=1.2,
            color=colors.HexColor("#cbd5e1"),
            spaceAfter=12,
        ),
        Paragraph("Executive Summary", h1_style),
        Paragraph(
            summary.replace("\n", "<br/>") if summary else "No summary available.",
            body_style,
        ),
        Spacer(1, 8),
        Paragraph("Action Items", h1_style),
        Paragraph(
            action_items.replace("\n", "<br/>")
            if action_items
            else "No action items recorded.",
            body_style,
        ),
        Spacer(1, 8),
        Paragraph("Key Decisions", h1_style),
        Paragraph(
            decisions.replace("\n", "<br/>")
            if decisions
            else "No key decisions recorded.",
            body_style,
        ),
        Spacer(1, 8),
        Paragraph("Open Questions and Follow-ups", h1_style),
        Paragraph(
            questions.replace("\n", "<br/>")
            if questions
            else "No open questions recorded.",
            body_style,
        ),
    ]

    doc.build(story)
    return buffer.getvalue()
