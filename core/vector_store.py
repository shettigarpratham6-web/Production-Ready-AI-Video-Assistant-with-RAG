# vector_store.py

from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document


# ── Configuration ─────────────────────────────────────────────────────────────

CHROMA_DIR = "vector_db"
COLLECTION_NAME = "meeting_transcript"

# Ollama embedding model
EMBEDDING_MODEL = "nomic-embed-text:latest"


# ── Embeddings ────────────────────────────────────────────────────────────────

_embeddings = None


def get_embeddings():
    """
    Create Ollama embeddings.

    Make sure the model is installed locally:

        ollama pull nomic-embed-text
    """
    global _embeddings
    if _embeddings is None:
        _embeddings = OllamaEmbeddings(
            model=EMBEDDING_MODEL,
            keep_alive=3600,
        )

    return _embeddings


# ── Build Vector Store ────────────────────────────────────────────────────────

def build_vector_store(transcript: str) -> Chroma:
    """
    Split the transcript into chunks, generate embeddings
    using Ollama, and store them in ChromaDB.
    """

    print("Building vector store...")

    if not transcript.strip():
        raise ValueError(
            "Cannot build vector store from an empty transcript."
        )

    # Split transcript into manageable chunks (800 chars for optimal semantic coverage & speed)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=80,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks = splitter.split_text(transcript)

    # Convert chunks into LangChain documents
    documents = [
        Document(
            page_content=chunk,
            metadata={
                "chunk_index": i
            },
        )
        for i, chunk in enumerate(chunks)
    ]

    # Create Ollama embeddings
    embeddings = get_embeddings()

    # Create ChromaDB vector store
    vector_store = Chroma.from_documents(
        documents=documents,
        embedding=embeddings,
        collection_name=COLLECTION_NAME,
        persist_directory=CHROMA_DIR,
    )

    print(
        f"Vector store created with "
        f"{len(documents)} chunks."
    )

    return vector_store


# ── Load Existing Vector Store ────────────────────────────────────────────────

def load_vector_store() -> Chroma:
    """
    Load the existing ChromaDB vector store
    using the same Ollama embedding model.
    """

    embeddings = get_embeddings()

    vector_store = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_DIR,
    )

    return vector_store


# ── Retriever ─────────────────────────────────────────────────────────────────

def get_retriever(
    vector_store: Chroma,
    k: int = 4
):
    """
    Create a similarity-based retriever.
    """

    return vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={
            "k": k
        },
    )