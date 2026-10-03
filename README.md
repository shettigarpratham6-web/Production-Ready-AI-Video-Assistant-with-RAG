# 🎙️ Production-Ready AI Video & Meeting Assistant with RAG

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff.svg)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![Ollama](https://img.shields.io/badge/LLM-LLaMA%203.2-black.svg)](https://ollama.ai/)
[![Inngest](https://img.shields.io/badge/Orchestration-Inngest-FFD21F.svg)](https://www.inngest.com/)

A modern, production-grade **AI Video & Meeting Assistant** that ingests YouTube videos, uploaded audio/video files, or live microphone recordings to generate structured executive summaries, action item checklists, consensus decisions, and unresolved follow-ups. Equipped with a **ChromaDB vector store**, **Redis VL Semantic Cache**, and an interactive **RAG chat assistant** wrapped in a **Swiss Minimalist / Editorial UI**.

---

## 🌟 Key Features

- **🎨 Premium Swiss Minimalist / Editorial UI**:
  - Warm cream canvas (`#FAF8F5`) with a subtle technical 1px gray grid background.
  - High-impact oversized typography (`Space Grotesk` & `Plus Jakarta Sans`).
  - Tactile yellow accent (`#FFD21F`), thin black borders (`1px solid #111`), rounded pill buttons, and zero generic neon/glassmorphism styling.
  - Smooth micro-interactions powered by **Framer Motion**.

- **🎙️ Versatile Multi-Source Ingestion**:
  - **YouTube URL**: Instant stream extraction and download via `yt-dlp`.
  - **File Upload Dropzone**: Supports `MP3`, `WAV`, `M4A`, `MP4`, `WEBM`, and `AAC` (up to 200MB).
  - **Live Browser Meeting Recorder**: In-browser audio recording via Web MediaRecorder API with real-time stopwatch and waveform indicators.

- **🗣️ Dual-Engine Speech-to-Text (STT)**:
  - **English**: Local **OpenAI Whisper** model running entirely offline on your GPU/CPU.
  - **Hinglish / Indic Speech**: Cloud integration with **Sarvam AI** for seamless transcription and English translation.

- **🧠 Executive Intelligence with LLaMA 3.2**:
  - Executive Briefing & Concise Meeting Summary.
  - Action Items & Deliverables checklist with interactive completion toggles.
  - Key Consensus Decisions & Unresolved Open Questions.

- **⚡ Grounded RAG Chat + Redis Semantic Caching**:
  - Chunked semantic indexing in **ChromaDB** using local `sentence-transformers` embeddings.
  - **Redis VL Semantic Cache**: Sub-5ms response times for repeat or semantically similar questions with visual cache-hit tags.
  - Graceful fallback: Automatically queries ChromaDB directly if Redis is offline.

- **🔄 Durable Event-Driven Workflow (Inngest)**:
  - 8-step durable workflow pipeline with automatic retries, state checkpointing, and step observability on Inngest Dev Server (`http://localhost:8288`).
  - Supports **Direct Local Pipeline** for synchronous single-process execution.

- **📄 Multi-Format Export Center**:
  - **Executive PDF Report**: Styled document generated via ReportLab with tables, checklists, and summary blocks.
  - **Markdown (`.md`)**: Clean markdown containing the complete report and transcript.
  - **JSON (`.json`)**: Raw structured metadata and transcript.

---

## 🏗️ Architecture & Pipeline Flow

```text
Audio/Video Input (YouTube / File / Mic)
           │
           ▼
[Step 1] Audio Processing & 16kHz Normalization (pydub / ffmpeg)
           │
           ▼
[Step 2] Dual-Engine Speech-to-Text (Whisper / Sarvam AI)
           │
           ▼
[Step 3] Deterministic SHA-256 Meeting ID & Title Generation
           │
           ▼
[Step 4] Executive Summarization (LLaMA 3.2 via Ollama)
           │
           ▼
[Step 5] Deliverables Extraction (Action Items, Decisions, Questions)
           │
           ▼
[Step 6] Vector Embeddings & Indexing (ChromaDB)
           │
           ▼
[Step 7] Redis Semantic Cache Sync (Redis VL)
           │
           ▼
[Step 8] Interactive RAG Chat & Multi-Format Exports (PDF / MD / JSON)
```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Framer Motion, Lucide Icons, Vanilla CSS (Swiss Editorial Design Tokens).
- **Backend API**: FastAPI, Uvicorn, Pydantic, Python-Multipart.
- **AI & RAG Engine**: LangChain, Ollama (`llama3.2:latest`), ChromaDB, Sentence-Transformers.
- **Speech-to-Text**: Faster-Whisper / OpenAI Whisper, Sarvam AI API.
- **Caching Layer**: Redis Stack / Redis VL (`redisvl`).
- **Orchestration**: Inngest Python SDK (`inngest`), Inngest CLI.
- **Media Processing**: `yt-dlp`, `ffmpeg`, `pydub`.
- **Document Generation**: ReportLab (PDF), Markdown.

---

## 📁 Project Structure

```text
Rag-vid/
├── api/
│   ├── app.py                 # FastAPI application, CORS, routes & Inngest serve
│   └── pdf_generator.py       # ReportLab PDF executive document generator
├── core/
│   ├── cache.py               # Redis VL semantic caching & similarity lookup
│   ├── extractor.py           # Action items, key decisions & questions extraction
│   ├── rag_engine.py          # LangChain RAG pipeline with ChromaDB retriever
│   ├── summarizer.py          # Executive summary & title generation via LLaMA 3.2
│   ├── transcriber.py         # Dual-engine STT (Whisper & Sarvam AI)
│   └── vector_store.py        # ChromaDB vector store initialization
├── frontend/
│   ├── public/                # Static assets & favicons
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx               # Swiss top header with live system diagnostics
│   │   │   ├── WelcomeView.jsx          # Hero section, studio input & mic recorder
│   │   │   ├── MeetingDashboard.jsx     # Workspace, video player, tabs, RAG chat
│   │   │   ├── MeetingHistoryDrawer.jsx # Framer Motion slide-out runs drawer
│   │   │   ├── ProcessingView.jsx       # Pipeline stepper & live timer
│   │   │   └── Sidebar.jsx              # Companion sidebar for dashboard mode
│   │   ├── App.jsx            # Main app router & state orchestrator
│   │   ├── index.css          # Swiss minimalist design system & tokens
│   │   └── main.jsx           # React root entry
│   ├── package.json           # Frontend dependencies & scripts
│   └── vite.config.js         # Vite configuration with proxy to FastAPI (port 8000)
├── utils/
│   └── audio_processor.py     # YouTube download & audio segmentation chunks
├── workflow/
│   ├── client.py              # Inngest client initialization
│   └── functions.py           # 8-step durable workflow function (process_meeting)
├── .env.example               # Template environment variables
├── .gitignore                 # Excludes venv, node_modules, cache, vector databases
├── main.py                    # Standalone CLI entrypoint for local execution
├── requirements.txt           # Python backend dependencies
└── README.md                  # Project documentation
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites

- **Python**: `3.11` or `3.12`
- **Node.js**: `v18+` or `v20+` and `npm`
- **Ollama**: Installed and running locally ([Download Ollama](https://ollama.ai/))
- **FFmpeg**: Installed and accessible in your system `PATH` ([Download FFmpeg](https://ffmpeg.org/))
- **Docker** *(Optional, only if using Redis Semantic Caching)*

---

### 2. Setup Local Models with Ollama

Start Ollama and pull the required models:

```bash
ollama pull llama3.2:latest
ollama pull nomic-embed-text:latest
```

---

### 3. Backend Setup

1. **Create and activate a Python virtual environment**:
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to provide optional API keys (e.g. `SARVAM_API_KEY` for Hinglish speech).

4. **Start the FastAPI backend**:
   ```bash
   python -m uvicorn api.app:app --port 8000 --reload
   ```
   The backend API will be live at `http://localhost:8000`.

---

### 4. Frontend Setup

1. **Navigate to the frontend folder**:
   ```bash
   cd frontend
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   Open your browser at **`http://localhost:5173`**.

---

### 5. Optional Services

#### A. Inngest Dev Server (Durable Workflows)
To use the durable 8-step execution engine with live DAG step retries:
```bash
npx inngest-cli@latest dev -u http://127.0.0.1:8000/api/inngest
```
Access the Inngest Dev Dashboard at **`http://localhost:8288/runs`**.

#### B. Redis VL Semantic Cache
To enable sub-5ms caching on repeated questions:
```bash
docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest
```

*(Note: The application automatically operates using ChromaDB RAG if Redis or Inngest are offline).*

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/diagnostics` | Checks connectivity for Ollama, Redis, Inngest, and API gateway |
| `POST` | `/api/upload` | Uploads local audio/video recording to server |
| `POST` | `/api/process-direct` | Runs synchronous end-to-end meeting pipeline |
| `POST` | `/process-meeting` | Dispatches durable event to Inngest workflow |
| `GET` | `/api/runs` | Returns all completed meeting runs |
| `GET` | `/api/runs/latest` | Returns the most recent completed meeting run |
| `GET` | `/api/runs/{meeting_id}` | Returns a specific meeting run by ID |
| `POST` | `/api/chat` | RAG query endpoint with Redis Semantic Cache lookup |
| `POST` | `/api/export/pdf` | Generates and streams executive ReportLab PDF report |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
