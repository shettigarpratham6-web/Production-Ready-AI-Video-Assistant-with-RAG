# summarizer.py

import os

from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_text_splitters import RecursiveCharacterTextSplitter


def get_llm(temperature: float = 0.3, num_predict: int | None = None):
    """Create and return the Ollama LLM."""

    kwargs = {
        "model": "llama3.2:latest",
        "temperature": temperature,
        "keep_alive": "1h",
    }
    if num_predict is not None:
        kwargs["num_predict"] = num_predict

    return ChatOllama(**kwargs)


def split_transcript(transcript: str) -> list[str]:
    """Split a long meeting transcript into manageable chunks."""

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=6000,
        chunk_overlap=300,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    return splitter.split_text(transcript)


def summarize(transcript: str) -> str:
    """
    Generate a professional summary of the complete meeting.

    Uses a fast single-pass for standard meetings, or map-reduce for long transcripts:
    1. If short/medium transcript, generate full structured summary directly in 1 pass.
    2. If long transcript, summarize chunks then combine into final summary.
    """

    if not transcript.strip():
        return "No transcript available to summarize."

    llm = get_llm(temperature=0.3)

    combined_prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            """
You are an expert meeting summarization assistant.

Generate a professional meeting summary from the provided meeting text.

Organize the final summary into these sections:

• Overview
• Key Discussion Points
• Key Decisions
• Action Items
• Important Follow-ups

Rules:
- Use only information present in the provided transcript.
- Do not invent missing information.
- Remove duplicate information.
- Keep the result concise and easy to scan.
- If a section has no information, omit that section.
"""
        ),
        ("human", "{text}"),
    ])

    combined_chain = combined_prompt | llm | StrOutputParser()

    chunks = split_transcript(transcript)

    # Fast path: If fits in one chunk, avoid redundant map step
    if len(chunks) <= 1:
        return combined_chain.invoke({"text": transcript})

    # ── Map-Reduce for long transcripts ──────────────────────────────────────
    map_prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            """
You are an expert meeting summarization assistant.

Summarize the provided portion of a meeting transcript.

Focus on:
- Important discussion points
- Decisions
- Action items
- Important facts or updates
- Problems or concerns mentioned

Do not invent information that is not present in the transcript.
Keep the summary concise and factual.
"""
        ),
        ("human", "{text}"),
    ])

    map_chain = map_prompt | llm | StrOutputParser()

    chunk_summaries = [
        map_chain.invoke({"text": chunk})
        for chunk in chunks
    ]

    combined = "\n\n".join(chunk_summaries)

    return combined_chain.invoke({
        "text": combined
    })


def generate_title(transcript: str) -> str:
    """Generate a short professional title for the meeting."""

    if not transcript.strip():
        return "Untitled Meeting"

    llm = get_llm(temperature=0.2, num_predict=30)

    title_prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            """
Based on the meeting transcript, generate a short,
professional meeting title.

Requirements:
- Maximum 8 words
- Clearly represent the main topic of the meeting
- Professional and specific
- Do not use quotation marks
- Return only the title
"""
        ),
        ("human", "{text}"),
    ])

    title_chain = title_prompt | llm | StrOutputParser()

    return title_chain.invoke({
        "text": transcript[:2000]
    }).strip()