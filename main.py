# main.py

import hashlib
import sys

if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv

from utils.audio_processor import process_input
from core.transcriber import transcribe_all
from core.summarizer import summarize, generate_title
from core.extractor import (
    extract_action_items,
    extract_key_decisions,
    extract_questions,
)
from core.rag_engine import (
    build_rag_chain,
    ask_question,
)


# Load environment variables
load_dotenv()


def create_meeting_id(transcript: str) -> str:
    """
    Create a stable unique ID for a meeting based on its transcript.

    The same transcript will always generate the same meeting ID.
    """

    return hashlib.sha256(
        transcript.encode("utf-8")
    ).hexdigest()[:16]


def run_pipeline(
    source: str,
    language: str = "english"
) -> dict:
    """
    Run the complete AI Meeting Assistant pipeline.

    Pipeline:
        Source
        ↓
        Audio Processing
        ↓
        Transcription
        ↓
        Meeting ID
        ↓
        Title Generation
        ↓
        Summarization
        ↓
        Action Items
        ↓
        Decisions
        ↓
        Questions
        ↓
        Vector Store
        ↓
        RAG Chain
    """

    print("\n" + "=" * 60)
    print("🎥 AI MEETING ASSISTANT")
    print("=" * 60)

    if not source.strip():
        raise ValueError(
            "Source URL or file path cannot be empty."
        )

    language = language.lower().strip()

    if language not in {"english", "hinglish"}:
        raise ValueError(
            "Language must be either 'english' or 'hinglish'."
        )

    # ── Step 1: Audio Processing ─────────────────────────────────────────────

    print("\n[1/7] Processing audio...")

    chunks = process_input(source)

    print(
        f"✓ Audio processing complete "
        f"({len(chunks)} chunk(s))"
    )

    # ── Step 2: Transcription ────────────────────────────────────────────────

    print("\n[2/7] Transcribing meeting...")

    transcript = transcribe_all(
        chunks,
        language
    )

    if not transcript.strip():
        raise RuntimeError(
            "Transcription produced no text."
        )

    print("✓ Transcription complete.")

    print(
        f"\nRaw transcription preview:\n"
        f"{transcript[:300]}..."
    )

    # ── Create Meeting ID ────────────────────────────────────────────────────

    meeting_id = create_meeting_id(transcript)

    print(
        f"✓ Meeting ID: {meeting_id}"
    )

    # ── Step 3: Generate Title ────────────────────────────────────────────────

    print("\n[3/7] Generating meeting title...")

    title = generate_title(
        transcript
    )

    print(f"✓ Title: {title}")

    # ── Step 4: Generate Summary ─────────────────────────────────────────────

    print("\n[4/7] Generating meeting summary...")

    summary = summarize(
        transcript
    )

    print("✓ Summary generated.")

    # ── Step 5: Extract Meeting Information ───────────────────────────────────

    print("\n[5/7] Extracting meeting insights...")

    action_items = extract_action_items(
        transcript
    )

    decisions = extract_key_decisions(
        transcript
    )

    questions = extract_questions(
        transcript
    )

    print("✓ Action items extracted.")
    print("✓ Key decisions extracted.")
    print("✓ Open questions extracted.")

    # ── Step 6: Build RAG ─────────────────────────────────────────────────────

    print("\n[6/7] Building meeting knowledge base...")

    rag_chain = build_rag_chain(
        transcript
    )

    print("✓ RAG pipeline ready.")

    # ── Step 7: Return Results ────────────────────────────────────────────────

    print("\n[7/7] Pipeline complete.")

    return {
        "meeting_id": meeting_id,
        "title": title,
        "transcript": transcript,
        "summary": summary,
        "action_items": action_items,
        "key_decisions": decisions,
        "open_questions": questions,
        "rag_chain": rag_chain,
    }


# ── CLI Entry Point ──────────────────────────────────────────────────────────

if __name__ == "__main__":

    source = input(
        "\nEnter YouTube URL or local file path: "
    ).strip()

    language = (
        input(
            "Language (english/hinglish): "
        ).strip()
        or "english"
    )

    try:

        result = run_pipeline(
            source,
            language
        )

        # ── Display Results ──────────────────────────────────────────────────

        print("\n" + "=" * 60)
        print("MEETING ANALYSIS")
        print("=" * 60)

        print(
            f"\n📌 Title:\n"
            f"{result['title']}"
        )

        print(
            f"\n📋 Summary:\n"
            f"{result['summary']}"
        )

        print(
            f"\n✅ Action Items:\n"
            f"{result['action_items']}"
        )

        print(
            f"\n🔑 Key Decisions:\n"
            f"{result['key_decisions']}"
        )

        print(
            f"\n❓ Open Questions:\n"
            f"{result['open_questions']}"
        )

        print(
            f"\n🆔 Meeting ID:\n"
            f"{result['meeting_id']}"
        )

        print("\n" + "=" * 60)

        # ── Interactive RAG Chat ─────────────────────────────────────────────

        print(
            "\n💬 Chat with your meeting"
            "\nType 'exit' to quit.\n"
        )

        rag_chain = result["rag_chain"]
        meeting_id = result["meeting_id"]

        while True:

            question = input("You: ").strip()

            if question.lower() in {
                "exit",
                "quit",
                "q",
            }:

                print(
                    "\n👋 Goodbye!"
                )

                break

            if not question:
                continue

            try:

                # Redis Semantic Cache + RAG
                answer = ask_question(
                    rag_chain,
                    question,
                    meeting_id
                )

                print(
                    f"\n🤖 Assistant: "
                    f"{answer}\n"
                )

            except Exception as e:

                print(
                    f"\n❌ Error while "
                    f"answering question: {e}\n"
                )

    except KeyboardInterrupt:

        print(
            "\n\n⚠️ Process interrupted by user."
        )

    except Exception as e:

        print(
            f"\n❌ Pipeline failed: {e}"
        )