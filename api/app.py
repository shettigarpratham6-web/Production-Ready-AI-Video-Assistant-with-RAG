# api/app.py

import os
import sys
import glob
import json
import asyncio
import tempfile
import urllib.request
from typing import Optional, List, Dict, Any

# Windows console encoding safeguard
if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv

# Load .env BEFORE initializing Inngest
load_dotenv()

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import inngest
import inngest.fast_api

from workflow.client import inngest_client
from workflow.functions import process_meeting

# Pipeline and RAG imports
from main import run_pipeline, create_meeting_id
from core.rag_engine import build_rag_chain, load_rag_chain, ask_question
from core.cache import get_cache, get_cached_answer
from api.pdf_generator import generate_pdf_report


# ============================================================
# FastAPI Application
# ============================================================

app = FastAPI(
    title="Advanced RAG AI Meeting Assistant",
    version="1.0.0",
)

# Enable CORS for React frontend (Vite default is 5173, plus flexible origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# In-memory store for active RAG chains
_active_rag_chains: Dict[str, Any] = {}
RESULTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".inngest_results")
DOWNLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "downloads")
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
os.makedirs(RESULTS_DIR, exist_ok=True)
os.makedirs(DOWNLOADS_DIR, exist_ok=True)


# ============================================================
# Request / Response Models
# ============================================================

class MeetingRequest(BaseModel):
    source: str
    language: str = "english"


class ChatRequest(BaseModel):
    meeting_id: str
    question: str


class ExportPdfRequest(BaseModel):
    meeting_id: Optional[str] = "meeting"
    title: str = "Meeting Report"
    summary: str = ""
    action_items: str = ""
    key_decisions: str = ""
    open_questions: str = ""


from fastapi import Request
from fastapi.responses import FileResponse

@app.get("/")
async def root(request: Request):
    accept = request.headers.get("accept", "")
    index_path = os.path.join(FRONTEND_DIST, "index.html")
    if "text/html" in accept and os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "message": "AI Meeting Assistant API is running"
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy"
    }


def check_url(url: str, timeout: float = 1.0) -> bool:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Diagnostic/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status in (200, 204, 301, 302)
    except Exception:
        return False


@app.get("/api/diagnostics")
async def diagnostics():
    """
    Check availability of Ollama, Redis, Inngest Server, and API.
    """
    inngest_online = check_url("http://127.0.0.1:8288")
    ollama_online = check_url("http://127.0.0.1:11434")

    # Redis check
    redis_online = False
    try:
        import redis
        r_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        r = redis.from_url(r_url, socket_timeout=1)
        redis_online = r.ping()
    except Exception:
        redis_online = False

    return {
        "api": True,
        "ollama": ollama_online,
        "redis": redis_online,
        "inngest": inngest_online,
        "llm_model": "llama3.2:latest",
        "cache_type": "Redis VL Semantic Cache",
    }


# ============================================================
# File Upload Endpoint
# ============================================================

@app.post("/api/upload")
async def upload_audio_video(file: UploadFile = File(...)):
    """
    Save uploaded audio or video file to downloads folder.
    """
    try:
        suffix = os.path.splitext(file.filename)[1].lower()
        if suffix not in [".mp3", ".wav", ".m4a", ".mp4", ".webm", ".aac"]:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: {suffix}. Allowed: mp3, wav, m4a, mp4, webm, aac"
            )

        safe_filename = f"upload_{os.path.splitext(file.filename)[0][:30]}_{os.urandom(4).hex()}{suffix}"
        target_path = os.path.join(DOWNLOADS_DIR, safe_filename)

        with open(target_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                f.write(chunk)

        return {
            "status": "success",
            "filepath": os.path.abspath(target_path),
            "filename": file.filename,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# ============================================================
# Direct Local Meeting Processing
# ============================================================

@app.post("/api/process-direct")
async def process_direct(request: MeetingRequest):
    """
    Execute the meeting processing pipeline synchronously in a thread.
    """
    if not request.source or not request.source.strip():
        raise HTTPException(status_code=400, detail="Source URL or file path is required")

    try:
        # Run synchronous CPU/GPU heavy pipeline in a worker thread
        result = await asyncio.to_thread(
            run_pipeline,
            request.source.strip(),
            request.language.lower().strip()
        )

        meeting_id = result["meeting_id"]

        # Cache the active RAG chain in memory for immediate chat
        _active_rag_chains[meeting_id] = result.get("rag_chain")

        # Prepare JSON response data (excluding chain object)
        output_data = {
            "status": "completed",
            "meeting_id": meeting_id,
            "title": result.get("title", "Meeting Analysis"),
            "transcript": result.get("transcript", ""),
            "summary": result.get("summary", ""),
            "action_items": result.get("action_items", ""),
            "key_decisions": result.get("key_decisions", ""),
            "open_questions": result.get("open_questions", ""),
            "language": request.language,
            "word_count": len(result.get("transcript", "").split()),
            "char_count": len(result.get("transcript", "")),
            "engine": "Direct Local Pipeline",
            "source": request.source,
        }

        # Persist to .inngest_results for unified history
        try:
            with open(os.path.join(RESULTS_DIR, f"{meeting_id}.json"), "w", encoding="utf-8") as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)
            with open(os.path.join(RESULTS_DIR, "latest.json"), "w", encoding="utf-8") as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Warning saving result: {e}")

        return output_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline processing failed: {str(e)}")


# ============================================================
# Start Inngest Meeting Processing (Existing route preserved)
# ============================================================

@app.post("/process-meeting")
async def start_meeting_processing(
    request: MeetingRequest
):
    """
    Send a meeting processing event to Inngest.
    """
    try:
        event_ids = await inngest_client.send(
            inngest.Event(
                name="meeting/process",
                data={
                    "source": request.source,
                    "language": request.language,
                },
            )
        )

        return {
            "status": "accepted",
            "message": "Meeting processing started",
            "event_ids": event_ids,
        }
    except Exception as e:
        err_str = str(e)
        if "never received response while sending events" in err_str or "ConnectError" in err_str or "Failed to connect" in err_str:
            raise HTTPException(
                status_code=503,
                detail="Inngest dev server (port 8288) is offline. Please start it with 'npx inngest-cli@latest dev' or switch to 'Direct Pipeline' mode."
            )
        raise HTTPException(
            status_code=500,
            detail=f"Inngest event dispatch failed: {err_str}"
        )


# ============================================================
# Runs / History Endpoints
# ============================================================

@app.get("/api/runs")
async def get_all_runs():
    """
    Retrieve all recorded meeting runs.
    """
    runs = []
    seen_ids = set()
    for file_path in glob.glob(os.path.join(RESULTS_DIR, "*.json")):
        base = os.path.basename(file_path)
        if base == "latest.json":
            continue
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                m_id = data.get("meeting_id")
                if m_id and m_id not in seen_ids:
                    seen_ids.add(m_id)
                    runs.append({
                        "meeting_id": m_id,
                        "title": data.get("title", "Meeting"),
                        "language": data.get("language", "English"),
                        "word_count": data.get("word_count", 0),
                    })
        except Exception:
            pass

    return {"runs": runs}


@app.get("/api/runs/latest")
async def get_latest_run():
    """
    Retrieve the most recent run from disk.
    """
    latest_file = os.path.join(RESULTS_DIR, "latest.json")
    if not os.path.exists(latest_file):
        return {"status": "no_runs", "latest": None}

    try:
        with open(latest_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except Exception as e:
        return {"status": "error", "message": str(e), "latest": None}


@app.get("/api/runs/{meeting_id}")
async def get_run_by_id(meeting_id: str):
    """
    Retrieve a specific run by meeting ID.
    """
    target = os.path.join(RESULTS_DIR, f"{meeting_id}.json")
    if not os.path.exists(target):
        raise HTTPException(status_code=404, detail=f"Meeting ID {meeting_id} not found")

    try:
        with open(target, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load run: {e}")


# ============================================================
# RAG Chat Endpoint (Redis Semantic Cache + ChromaDB)
# ============================================================

@app.post("/api/chat")
async def chat_with_meeting(request: ChatRequest):
    """
    Ask a question about the meeting using Redis Semantic Cache and ChromaDB RAG.
    """
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    meeting_id = request.meeting_id
    question = request.question.strip()

    try:
        # Step 1: Check Redis Semantic Cache
        cache = get_cache()
        cached_answer = get_cached_answer(
            question=question,
            meeting_id=meeting_id,
            cache=cache,
        )

        if cached_answer:
            return {
                "answer": cached_answer,
                "cached": True,
                "meeting_id": meeting_id,
            }

        # Step 2: Ensure RAG chain is ready
        rag_chain = _active_rag_chains.get(meeting_id)

        if not rag_chain:
            # Check if we have transcript in saved runs to re-build or load
            saved_file = os.path.join(RESULTS_DIR, f"{meeting_id}.json")
            if os.path.exists(saved_file):
                try:
                    with open(saved_file, "r", encoding="utf-8") as f:
                        saved_data = json.load(f)
                    transcript = saved_data.get("transcript")
                    if transcript:
                        rag_chain = await asyncio.to_thread(build_rag_chain, transcript)
                        _active_rag_chains[meeting_id] = rag_chain
                except Exception as e:
                    print(f"Could not build rag chain from saved transcript: {e}")

        if not rag_chain:
            # Fallback to load existing vector store
            try:
                rag_chain = await asyncio.to_thread(load_rag_chain)
                _active_rag_chains[meeting_id] = rag_chain
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Vector store not initialized for this meeting. Please process the meeting first. Error: {e}"
                )

        # Step 3: Run RAG question answering in thread
        answer = await asyncio.to_thread(
            ask_question,
            rag_chain,
            question,
            meeting_id
        )

        return {
            "answer": answer,
            "cached": False,
            "meeting_id": meeting_id,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat query failed: {str(e)}")


# ============================================================
# PDF Export Endpoint
# ============================================================

@app.post("/api/export/pdf")
async def export_pdf(data: ExportPdfRequest):
    """
    Generate and stream PDF report.
    """
    try:
        pdf_bytes = generate_pdf_report(
            title=data.title,
            summary=data.summary,
            action_items=data.action_items,
            decisions=data.key_decisions,
            questions=data.open_questions,
        )

        filename = f"meeting_report_{data.meeting_id or 'doc'}.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


# ============================================================
# Inngest Integration (Existing handler preserved)
# ============================================================

inngest.fast_api.serve(
    app,
    inngest_client,
    [process_meeting],
)


# ============================================================
# Serve React Frontend Build (if present)
# ============================================================

from fastapi.staticfiles import StaticFiles

FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")