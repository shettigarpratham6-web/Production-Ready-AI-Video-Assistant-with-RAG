# transcriber.py

import os
import tempfile

import whisper
import requests
from pydub import AudioSegment


# ── Configuration ─────────────────────────────────────────────────────────────

# Sarvam synchronous STT API accepts audio up to 30 seconds.
# We use 25-second pieces for a safety margin.
SARVAM_PIECE_SECONDS = 25

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

SARVAM_STT_TRANSLATE_URL = (
    "https://api.sarvam.ai/speech-to-text-translate"
)

SARVAM_MODEL = os.getenv(
    "SARVAM_STT_MODEL",
    "saaras:v2.5"
)


# ── Whisper Model ─────────────────────────────────────────────────────────────

_model = None


def load_model():
    """
    Load the Whisper model lazily.

    The model is loaded only once and reused for
    subsequent transcription requests.
    """

    global _model

    if _model is None:
        print(f"Loading Whisper model: {WHISPER_MODEL} ...")

        _model = whisper.load_model(WHISPER_MODEL)

        print("Whisper model loaded.")

    return _model


from concurrent.futures import ThreadPoolExecutor


# ── Whisper Transcription ────────────────────────────────────────────────────

def transcribe_chunk_whisper(chunk_path: str, language: str = "english") -> str:
    """
    Transcribe an audio chunk using local Whisper.
    """

    model = load_model()

    lang_code = "en" if language.lower() in ("english", "en") else None

    result = model.transcribe(
        chunk_path,
        task="transcribe",
        language=lang_code,
        fp16=False,
        condition_on_previous_text=False,
    )

    return result.get("text", "").strip()


# ── Sarvam API ────────────────────────────────────────────────────────────────

def _send_to_sarvam(piece_path: str) -> str:
    """
    Send one audio piece to Sarvam's STT + translation API
    and return the English transcript.
    """

    if not SARVAM_API_KEY:
        raise RuntimeError(
            "SARVAM_API_KEY is not set in the environment."
        )

    headers = {
        "api-subscription-key": SARVAM_API_KEY
    }

    with open(piece_path, "rb") as audio_file:

        files = {
            "file": (
                os.path.basename(piece_path),
                audio_file,
                "audio/wav"
            )
        }

        data = {
            "model": SARVAM_MODEL,
            "with_diarization": "false"
        }

        response = requests.post(
            SARVAM_STT_TRANSLATE_URL,
            headers=headers,
            files=files,
            data=data,
            timeout=120,
        )

    if not response.ok:

        print(
            f"\nSarvam returned "
            f"{response.status_code}"
        )

        print(
            f"Response body: "
            f"{response.text}\n"
        )

        response.raise_for_status()

    result = response.json()

    return result.get("transcript", "").strip()


# ── Sarvam Transcription ─────────────────────────────────────────────────────

def transcribe_chunk_sarvam(chunk_path: str) -> str:
    """
    Transcribe a chunk using Sarvam.

    Sarvam's synchronous API accepts audio up to 30 seconds,
    so longer chunks are divided into 25-second pieces.
    Concurrently processes pieces for maximum speed.
    """

    if not SARVAM_API_KEY:
        raise RuntimeError(
            "SARVAM_API_KEY is not set in the environment."
        )

    audio = AudioSegment.from_wav(chunk_path)

    piece_ms = SARVAM_PIECE_SECONDS * 1000

    total_pieces = (
        len(audio) + piece_ms - 1
    ) // piece_ms

    if total_pieces == 0:
        return ""

    temp_files = []

    try:
        piece_paths = []
        for i, start in enumerate(
            range(0, len(audio), piece_ms)
        ):
            piece = audio[start:start + piece_ms]
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                piece_path = temp_file.name
            temp_files.append(piece_path)
            piece.export(piece_path, format="wav")
            piece_paths.append((i, piece_path))

        def process_piece(item):
            idx, path = item
            print(f"  → Sarvam piece {idx + 1}/{total_pieces} ...")
            return idx, _send_to_sarvam(path)

        max_workers = min(len(piece_paths), 5)
        results = [None] * len(piece_paths)
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            for idx, text in executor.map(process_piece, piece_paths):
                results[idx] = text

        return " ".join([t for t in results if t]).strip()

    finally:
        for p in temp_files:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except OSError:
                    pass


# ── Transcription Router ──────────────────────────────────────────────────────

def transcribe_chunk(
    chunk_path: str,
    language: str = "english"
) -> str:
    """
    Route the audio chunk to the appropriate transcription engine.

    English:
        → Local Whisper

    Hinglish:
        → Sarvam STT + English translation
    """

    language = language.lower().strip()

    if language == "hinglish":
        return transcribe_chunk_sarvam(chunk_path)

    return transcribe_chunk_whisper(chunk_path, language=language)


# ── Transcribe All Chunks ─────────────────────────────────────────────────────

def transcribe_all(
    chunks: list[str],
    language: str = "english"
) -> str:
    """
    Transcribe all audio chunks and combine them
    into one complete transcript.
    """

    if not chunks:
        return ""

    language = language.lower().strip()

    engine = (
        "Sarvam AI"
        if language == "hinglish"
        else "Whisper"
    )

    print(
        f"Using {engine} for transcription."
    )

    transcripts = []

    for i, chunk in enumerate(chunks):

        print(
            f"Transcribing chunk "
            f"{i + 1}/{len(chunks)}..."
        )

        text = transcribe_chunk(
            chunk,
            language=language
        )

        if text:
            transcripts.append(text)

    print("Transcription complete.")

    return " ".join(transcripts).strip()