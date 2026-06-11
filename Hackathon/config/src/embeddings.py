"""Lightweight embedding module using FastEmbed."""

import time
from typing import List
from fastembed import TextEmbedding

from config.settings import EMBEDDING_MODEL, EMBEDDING_DIM


class EmbeddingService:
    """Manages text embeddings using FastEmbed for minimal latency."""

    def __init__(self):
        """Initialize FastEmbed model."""
        print(f"[Embeddings] Loading {EMBEDDING_MODEL}...")
        start = time.time()
        self.model = TextEmbedding(model_name=EMBEDDING_MODEL)
        elapsed = time.time() - start
        print(f"[Embeddings] Model loaded in {elapsed:.2f}s")

    def embed_text(self, text: str) -> List[float]:
        """
        Embed a single text string.
        
        Args:
            text: Input text to embed
            
        Returns:
            Embedding vector as list of floats
        """
        embeddings = list(self.model.embed([text]))
        return embeddings[0].tolist() if embeddings else []

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Embed multiple texts in batch (optimized for speed).
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors
        """
        embeddings = list(self.model.embed(texts))
        return [emb.tolist() for emb in embeddings]

    def get_dimension(self) -> int:
        """Get embedding dimension."""
        return EMBEDDING_DIM
