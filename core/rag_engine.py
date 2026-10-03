# rag_engine.py

import os
import sys

if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda

from core.vector_store import (
    build_vector_store,
    load_vector_store,
    get_retriever,
)

# Redis Semantic Cache
from core.cache import (
    get_cache,
    get_cached_answer,
    store_answer,
)


def get_llm():
    """Create and return the Ollama LLM."""

    return ChatOllama(
        model="llama3.2:latest",
        temperature=0.3,
        keep_alive="1h",
    )


def format_docs(docs):
    """Convert retrieved documents into a single context string."""

    return "\n\n".join(
        doc.page_content
        for doc in docs
    )


def create_rag_prompt():
    """Create the prompt used by the RAG pipeline."""

    return ChatPromptTemplate.from_messages([
        (
            "system",
            """
You are an expert AI meeting assistant.

Answer the user's question using ONLY the meeting transcript
context provided below.

Rules:
- Do not use information outside the provided context.
- Do not invent or assume information.
- If the answer cannot be found in the context, say:
  "I could not find this information in the meeting transcript."
- Be concise, accurate, and precise.
- If the transcript contains conflicting information, mention the conflict.
- If quoting someone, clearly indicate that it is a quote.

Meeting transcript context:
{context}
"""
        ),
        ("human", "{question}"),
    ])


def build_rag_chain(transcript: str):
    """
    Build a RAG chain from a new meeting transcript.

    The transcript is embedded and stored in the vector database,
    then retrieved dynamically when the user asks questions.
    """

    # Build vector store using the transcript
    vector_store = build_vector_store(transcript)

    # Create retriever
    retriever = get_retriever(
        vector_store,
        k=4
    )

    # Load LLM
    llm = get_llm()

    # Create prompt
    prompt = create_rag_prompt()

    # LCEL RAG pipeline
    rag_chain = (
        {
            "context": retriever | RunnableLambda(format_docs),
            "question": RunnablePassthrough(),
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    return rag_chain


def load_rag_chain():
    """
    Load an existing vector store and create a RAG chain.
    """

    # Load existing vector store
    vector_store = load_vector_store()

    # Create retriever
    retriever = get_retriever(
        vector_store,
        k=4
    )

    # Load LLM
    llm = get_llm()

    # Create prompt
    prompt = create_rag_prompt()

    # LCEL RAG pipeline
    rag_chain = (
        {
            "context": retriever | RunnableLambda(format_docs),
            "question": RunnablePassthrough(),
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    return rag_chain


def ask_question(
    rag_chain,
    question: str,
    meeting_id: str
) -> str:
    """
    Ask a question using Redis Semantic Cache + RAG.

    Flow:

    Question
       ↓
    Redis Semantic Cache
       ↓
    ┌───────────────┐
    │ Cache HIT?    │
    └───────────────┘
       ↓ Yes              ↓ No
    Cached Answer      ChromaDB RAG
                          ↓
                       Mistral
                          ↓
                    Store in Redis
                          ↓
                       Answer
    """

    print(f"\nQuestion: {question}")

    # Create/get Redis semantic cache
    cache = get_cache()

    # ---------------------------------------------------------
    # 1. Check Redis Semantic Cache
    # ---------------------------------------------------------

    cached_answer = get_cached_answer(
        question=question,
        meeting_id=meeting_id,
        cache=cache,
    )

    if cached_answer:
        print("⚡ Redis Semantic Cache HIT")
        print(f"Answer: {cached_answer}\n")
        return cached_answer

    # ---------------------------------------------------------
    # 2. Cache MISS → Run normal RAG
    # ---------------------------------------------------------

    print("🔍 Redis Semantic Cache MISS")
    print("Running ChromaDB + Ollama RAG...")

    answer = rag_chain.invoke(question)

    # ---------------------------------------------------------
    # 3. Store answer in Redis
    # ---------------------------------------------------------

    store_answer(
        question=question,
        answer=answer,
        meeting_id=meeting_id,
        cache=cache,
    )

    print("💾 Answer stored in Redis Semantic Cache")
    print(f"Answer: {answer}\n")

    return answer