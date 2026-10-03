import os
import json
import hashlib

import inngest

from workflow.client import inngest_client

from utils.audio_processor import process_input
from core.transcriber import transcribe_all
from core.summarizer import summarize, generate_title
from core.extractor import (
    extract_action_items,
    extract_key_decisions,
    extract_questions,
)
from core.vector_store import build_vector_store


@inngest_client.create_function(
    fn_id="process-meeting",
    trigger=inngest.TriggerEvent(
        event="meeting/process",
    ),
)
async def process_meeting(ctx):
    """
    Durable AI Meeting Assistant workflow.

    Flow:
        Audio Processing
            ↓
        Transcription
            ↓
        Meeting ID
            ↓
        Title
            ↓
        Summary
            ↓
        Action Items
            ↓
        Decisions
            ↓
        Questions
            ↓
        ChromaDB
    """

    source = ctx.event.data["source"]

    language = ctx.event.data.get(
        "language",
        "english",
    )

    # ============================================================
    # STEP 1 — Process Audio
    # ============================================================

    chunks = await ctx.step.run(
        "process-audio",
        lambda: process_input(source),
    )

    if not chunks:
        raise RuntimeError(
            "No audio chunks were generated."
        )

    # ============================================================
    # STEP 2 — Transcription
    # ============================================================

    transcript = await ctx.step.run(
        "transcribe-meeting",
        lambda: transcribe_all(
            chunks,
            language,
        ),
    )

    if not transcript or not transcript.strip():
        raise RuntimeError(
            "Transcription produced no text."
        )

    # ============================================================
    # STEP 3 — Generate Meeting ID
    # ============================================================

    meeting_id = hashlib.sha256(
        transcript.encode("utf-8")
    ).hexdigest()[:16]

    # ============================================================
    # STEP 4 — Generate Title
    # ============================================================

    title = await ctx.step.run(
        "generate-title",
        lambda: generate_title(transcript),
    )

    # ============================================================
    # STEP 5 — Generate Summary
    # ============================================================

    summary = await ctx.step.run(
        "generate-summary",
        lambda: summarize(transcript),
    )

    # ============================================================
    # STEP 6 — Extract Action Items
    # ============================================================

    action_items = await ctx.step.run(
        "extract-action-items",
        lambda: extract_action_items(transcript),
    )

    # ============================================================
    # STEP 7 — Extract Decisions
    # ============================================================

    decisions = await ctx.step.run(
        "extract-decisions",
        lambda: extract_key_decisions(transcript),
    )

    # ============================================================
    # STEP 8 — Extract Open Questions
    # ============================================================

    questions = await ctx.step.run(
        "extract-questions",
        lambda: extract_questions(transcript),
    )

    # ============================================================
    # STEP 9 — Build ChromaDB Vector Store
    # ============================================================

    await ctx.step.run(
        "build-vector-store",
        lambda: bool(build_vector_store(transcript)) and {"status": "completed"},
    )

    # ============================================================
    # FINAL RESULT
    # ============================================================

    final_data = {
        "status": "completed",
        "meeting_id": meeting_id,
        "title": title,
        "transcript": transcript,
        "summary": summary,
        "action_items": action_items,
        "key_decisions": decisions,
        "open_questions": questions,
        "language": language,
        "word_count": len(transcript.split()),
        "char_count": len(transcript),
    }

    try:
        results_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".inngest_results")
        os.makedirs(results_dir, exist_ok=True)
        with open(os.path.join(results_dir, f"{meeting_id}.json"), "w", encoding="utf-8") as f:
            json.dump(final_data, f, ensure_ascii=False, indent=2)
        with open(os.path.join(results_dir, "latest.json"), "w", encoding="utf-8") as f:
            json.dump(final_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Warning: Could not save Inngest result to disk: {e}")

    return final_data