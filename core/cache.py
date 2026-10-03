# core/cache.py

import os

from redisvl.extensions.cache.llm import SemanticCache
from redisvl.utils.vectorize import OllamaTextVectorizer
from redisvl.query.filter import Tag


REDIS_URL = os.getenv(
    "REDIS_URL",
    "redis://localhost:6379"
)

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "nomic-embed-text:latest"
)

CACHE_TTL = int(
    os.getenv(
        "REDIS_CACHE_TTL",
        "3600"
    )
)

DISTANCE_THRESHOLD = float(
    os.getenv(
        "REDIS_CACHE_DISTANCE_THRESHOLD",
        "0.15"
    )
)


_cache = None


def get_cache():
    """
    Create or return the cached Redis semantic cache.

    Ollama is used to generate embeddings for
    semantic similarity.
    """
    global _cache
    if _cache is not None:
        return _cache

    try:
        vectorizer = OllamaTextVectorizer(
            model=OLLAMA_MODEL
        )

        _cache = SemanticCache(
            name="meeting_semantic_cache",
            redis_url=REDIS_URL,
            vectorizer=vectorizer,
            distance_threshold=DISTANCE_THRESHOLD,
            ttl=CACHE_TTL,
            filterable_fields=[
                {
                    "name": "meeting_id",
                    "type": "tag"
                }
            ],
        )
    except Exception as e:
        print(f"Warning: Could not initialize Redis semantic cache: {e}")
        return None

    return _cache


def get_cached_answer(
    question: str,
    meeting_id: str,
    cache
):
    """
    Search Redis for a semantically similar
    cached question belonging to this meeting.
    """
    if not cache:
        return None

    try:
        meeting_filter = (
            Tag("meeting_id") == meeting_id
        )

        results = cache.check(
            prompt=question,
            num_results=1,
            filter_expression=meeting_filter,
        )

        if results:
            return results[0]["response"]
    except Exception as e:
        print(f"Warning: Redis cache lookup failed: {e}")

    return None


def store_answer(
    question: str,
    answer: str,
    meeting_id: str,
    cache
):
    """
    Store a generated answer in Redis.
    """
    if not cache:
        return

    try:
        cache.store(
            prompt=question,
            response=answer,
            filters={
                "meeting_id": meeting_id
            },
        )
    except Exception as e:
        print(f"Warning: Redis cache store failed: {e}")