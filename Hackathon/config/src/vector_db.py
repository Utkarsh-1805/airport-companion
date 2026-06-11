"""Vector database management using Qdrant."""

import json
import time
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

from config.settings import (
    QDRANT_COLLECTION,
    VECTOR_STORE_PATH,
    EMBEDDING_DIM,
)
from src.embeddings import EmbeddingService


class VectorDB:
    """Manages Qdrant vector database for airport facilities."""

    def __init__(self):
        """Initialize Qdrant client and vector store."""
        print(f"[VectorDB] Initializing Qdrant at {VECTOR_STORE_PATH}...")
        self.client = QdrantClient(":memory:")  # In-memory for speed
        self.embedding_service = EmbeddingService()
        self.collection_name = QDRANT_COLLECTION

        # Initialize collection if not exists
        self._init_collection()

    def _init_collection(self):
        """Create collection with vector parameters."""
        try:
            self.client.recreate_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=EMBEDDING_DIM,
                    distance=Distance.COSINE,
                ),
            )
            print(f"[VectorDB] Collection '{self.collection_name}' created")
        except Exception as e:
            print(f"[VectorDB] Error creating collection: {e}")
            raise

    def index_facilities(self, facilities: List[Dict[str, Any]]):
        """
        Index airport facilities into vector database.
        
        Args:
            facilities: List of facility documents
        """
        print(f"[VectorDB] Indexing {len(facilities)} facilities...")
        start = time.time()

        # Prepare text for embedding
        texts_to_embed = []
        facility_ids = []
        metadata_map = {}

        for i, facility in enumerate(facilities):
            # Create comprehensive text representation for embedding
            text = f"{facility.get('name', '')} {facility.get('category', '')} {facility.get('description', '')} {' '.join(facility.get('services', []))} {' '.join(facility.get('tags', []))}"
            texts_to_embed.append(text)
            facility_ids.append(i)
            metadata_map[i] = facility

        # Batch embed all texts
        embeddings = self.embedding_service.embed_texts(texts_to_embed)

        # Create Qdrant points
        points = [
            PointStruct(
                id=i,
                vector=embeddings[i],
                payload=metadata_map[i],
            )
            for i in range(len(embeddings))
        ]

        # Upsert to database
        self.client.upsert(
            collection_name=self.collection_name,
            points=points,
        )

        elapsed = time.time() - start
        print(f"[VectorDB] Indexed {len(facilities)} facilities in {elapsed:.2f}s")

    def search(self, query_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for relevant facilities using semantic similarity.
        
        Args:
            query_text: User query
            top_k: Number of results to return
            
        Returns:
            List of relevant facilities with scores
        """
        query_vector = self.embedding_service.embed_text(query_text)

        # Prefer client-side search if available
        try:
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=top_k,
            )

            return [
                {
                    **result.payload,
                    "score": result.score,
                    "vector_id": result.id,
                }
                for result in results
            ]
        except AttributeError:
            # Fallback: scroll all points with vectors and compute cosine similarities
            import numpy as np

            points, _ = self.client.scroll(
                collection_name=self.collection_name,
                limit=1000,
                with_vectors=True,
            )
            if not points:
                return []

            qv = np.array(query_vector, dtype=float)
            qnorm = np.linalg.norm(qv) + 1e-12

            scored = []
            for p in points:
                vec = np.array(p.vector, dtype=float)
                score = float(np.dot(qv, vec) / (qnorm * (np.linalg.norm(vec) + 1e-12)))
                payload = p.payload or {}
                payload.update({"score": score, "vector_id": p.id})
                scored.append(payload)

            scored.sort(key=lambda x: x.get("score", 0.0), reverse=True)
            return scored[:top_k]

    def get_all_facilities(self) -> List[Dict[str, Any]]:
        """Retrieve all indexed facilities."""
        points, _ = self.client.scroll(
            collection_name=self.collection_name,
            limit=1000,
        )
        return [point.payload for point in points]

    def clear_collection(self):
        """Clear all data from collection."""
        self.client.delete_collection(collection_name=self.collection_name)
        self._init_collection()
        print(f"[VectorDB] Collection cleared")
