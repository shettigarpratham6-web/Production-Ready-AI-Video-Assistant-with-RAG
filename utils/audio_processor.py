# audio_processor.py

import os

import yt_dlp
from pydub import AudioSegment


# ── Configuration ─────────────────────────────────────────────────────────────

DOWNLOAD_DIR = "downloads"

os.makedirs(DOWNLOAD_DIR, exist_ok=True)


# ── YouTube Audio Download ────────────────────────────────────────────────────

def download_youtube_audio(url: str) -> str:
    """
    Download the best available audio from a YouTube URL
    and convert it to WAV format.
    """

    output_template = os.path.join(
        DOWNLOAD_DIR,
        "%(title)s.%(ext)s"
    )

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "wav",
                "preferredquality": "192",
            }
        ],
        "postprocessor_args": [
            "-ar", "16000",
            "-ac", "1",
        ],
        "quiet": True,
        "noplaylist": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:

        info = ydl.extract_info(
            url,
            download=True
        )

        downloaded_path = ydl.prepare_filename(info)

    # FFmpeg changes the extension to .wav
    wav_path = os.path.splitext(
        downloaded_path
    )[0] + ".wav"

    if not os.path.exists(wav_path):
        raise FileNotFoundError(
            f"Downloaded WAV file not found: {wav_path}"
        )

    return wav_path


# ── Convert Audio/Video to WAV ────────────────────────────────────────────────

def convert_to_wav(input_path: str) -> str:
    """
    Convert an audio/video file to mono 16 kHz WAV.

    16 kHz is suitable for Whisper and speech-processing pipelines.
    """

    if not os.path.exists(input_path):
        raise FileNotFoundError(
            f"Input file not found: {input_path}"
        )

    output_path = (
        os.path.splitext(input_path)[0]
        + "_converted.wav"
    )

    audio = AudioSegment.from_file(input_path)

    audio = (
        audio
        .set_channels(1)
        .set_frame_rate(16000)
    )

    audio.export(
        output_path,
        format="wav"
    )

    return output_path


# ── Audio Chunking ────────────────────────────────────────────────────────────

def chunk_audio(
    wav_path: str,
    chunk_minutes: int = 10
) -> list[str]:
    """
    Split a WAV file into smaller chunks.

    Default:
        10-minute chunks
    """

    if not os.path.exists(wav_path):
        raise FileNotFoundError(
            f"WAV file not found: {wav_path}"
        )

    if chunk_minutes <= 0:
        raise ValueError(
            "chunk_minutes must be greater than 0."
        )

    audio = AudioSegment.from_wav(wav_path)

    chunk_ms = (
        chunk_minutes
        * 60
        * 1000
    )

    # If audio is already within chunk duration, avoid redundant disk re-export
    if len(audio) <= chunk_ms:
        return [wav_path]

    chunks = []

    for i, start in enumerate(
        range(0, len(audio), chunk_ms)
    ):

        chunk = audio[
            start:start + chunk_ms
        ]

        chunk_path = (
            f"{wav_path}_chunk_{i}.wav"
        )

        chunk.export(
            chunk_path,
            format="wav"
        )

        chunks.append(chunk_path)

    return chunks


# ── Complete Audio Processing Pipeline ────────────────────────────────────────

def process_input(source: str) -> list[str]:
    """
    Process either a YouTube URL or a local audio/video file.

    Pipeline:

        Source
          ↓
        WAV conversion
          ↓
        16 kHz mono
          ↓
        Audio chunks
          ↓
        List of chunk paths
    """

    if not source:
        raise ValueError(
            "Audio source cannot be empty."
        )

    # YouTube URL
    if (
        source.startswith("http://")
        or source.startswith("https://")
    ):

        print(
            "Detected YouTube URL. "
            "Downloading audio..."
        )

        wav_path = download_youtube_audio(
            source
        )

    # Local file
    else:

        print(
            "Detected local file. "
            "Converting to WAV..."
        )

        wav_path = convert_to_wav(
            source
        )

    print("Chunking audio...")

    chunks = chunk_audio(
        wav_path
    )

    print(
        f"Audio ready — "
        f"{len(chunks)} chunk(s) created."
    )

    return chunks