"""Hybrid retrieval combining semantic search and BM25 keyword matching."""

import time
import json
from typing import List, Dict, Any
from rank_bm25 import BM25Okapi

from config.settings import BM25_WEIGHT, SEMANTIC_WEIGHT, TOP_K_RETRIEVAL
from src.vector_db import VectorDB
from src.spatial import score_facility_by_proximity


class HybridRetrieval:
    """Combines vector similarity and BM25 keyword search for robust retrieval."""

    def __init__(self):
        """Initialize hybrid retrieval with vector DB."""
        self.vector_db = VectorDB()
        self.bm25 = None
        # `facilities_list` holds ALL indexed documents (facilities + users)
        self.facilities_list = []
        # Initialize BM25 only if there are indexed facilities
        self._init_bm25()

    def _init_bm25(self):
        """Initialize BM25 index with all facilities."""
        facilities = self.vector_db.get_all_facilities()
        self.facilities_list = facilities or []

        # Build BM25 only over documents that are facility type (exclude user docs)
        facility_indices = [i for i, f in enumerate(self.facilities_list) if f.get("doc_type") == "facility"]

        if not facility_indices:
            self.bm25 = None
            self.bm25_index_mapping = []
            return

        # Tokenize for BM25 only for facility docs
        corpus = [
            f"{self.facilities_list[i].get('name', '')} {self.facilities_list[i].get('category', '')} {self.facilities_list[i].get('description', '')} {' '.join(self.facilities_list[i].get('services', []))} {' '.join(self.facilities_list[i].get('tags', []))}".split()
            for i in facility_indices
        ]
        self.bm25 = BM25Okapi(corpus)
        # Mapping from BM25 corpus index -> facilities_list index
        self.bm25_index_mapping = facility_indices

    def ensure_indexed(self, path: str = "data/airport_facilities.json"):
        """Ensure the vector DB and BM25 index are populated; lazy-load from JSON if empty."""
        facilities = self.vector_db.get_all_facilities()
        if facilities:
            return

        try:
            with open(path, "r", encoding="utf-8") as f:
                facilities = json.load(f)
            if facilities:
                self.index_facilities(facilities)
        except FileNotFoundError:
            # No data available to index
            return

    def index_facilities(self, facilities: List[Dict[str, Any]]):
        """
        Index facilities into both vector DB and BM25.
        
        Args:
            facilities: List of facility documents
        """
        self.vector_db.index_facilities(facilities)
        self._init_bm25()

    def retrieve(
        self,
        query: str,
        user_gate: str = None,
        top_k: int = TOP_K_RETRIEVAL,
        include_user_docs: bool = False,
        category_filter: List[str] = None,
        time_remaining_min: int = 999,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant facilities using hybrid search.

        Args:
            query: User query (may be rewritten)
            user_gate: User's current gate for spatial scoring
            top_k: Number of final results to return
            include_user_docs: Whether to include user profile documents
            category_filter: Optional list of facility category strings to restrict results
            time_remaining_min: Minutes until boarding — drives urgency penalty on walking time

        Returns:
            List of top-k relevant facilities sorted by combined score
        """
        start = time.time()

        # Ensure we have data indexed (lazy-load if needed)
        if not self.facilities_list or self.bm25 is None:
            self.ensure_indexed()
            # Re-initialize BM25 after indexing
            self._init_bm25()

        # Phase 1: Semantic Search (Vector DB) — retrieve a wider pool, then filter/rerank
        semantic_results = self.vector_db.search(query, top_k=top_k * 3)
        if not include_user_docs:
            semantic_results = [r for r in semantic_results if r.get("doc_type") != "user"]

        # Phase 2: BM25 Keyword Search
        query_tokens = query.lower().split()
        if self.bm25 is None:
            # No BM25 index available; set zero scores
            bm25_scores = [0.0] * len(self.facilities_list)
        else:
            # Get BM25 scores for the facility-only corpus and map them back
            partial_scores = self.bm25.get_scores(query_tokens)
            # Initialize full-length zero scores
            bm25_scores = [0.0] * len(self.facilities_list)
            for j, score in enumerate(partial_scores):
                idx = self.bm25_index_mapping[j]
                bm25_scores[idx] = score

        # Create ID-to-facility map (facility_list indices correspond to vector IDs)
        facility_map = {i: f for i, f in enumerate(self.facilities_list)}
        vector_id_map = {r["vector_id"]: r for r in semantic_results}

        # Phase 3: Hybrid Scoring - Combine both approaches
        combined_scores = {}

        for i, facility in enumerate(self.facilities_list):
            semantic_score = 0.0
            bm25_score = bm25_scores[i]

            # Add semantic score if facility was in semantic results
            if i in vector_id_map:
                semantic_score = vector_id_map.get(i, {}).get("score", 0.0)

            # Normalize BM25 score (0-1 range)
            max_bm25 = max(bm25_scores) if max(bm25_scores) > 0 else 1.0
            normalized_bm25 = bm25_score / max_bm25

            # Weighted combination
            combined_score = (
                SEMANTIC_WEIGHT * semantic_score + BM25_WEIGHT * normalized_bm25
            )

            combined_scores[i] = {
                "facility": facility,
                "combined_score": combined_score,
                "semantic_score": semantic_score,
                "bm25_score": normalized_bm25,
            }

        # Phase 4: Category filtering (intent-aware pre-filter before final ranking)
        if category_filter:
            filtered_scores = {
                i: v for i, v in combined_scores.items()
                if v["facility"].get("category") in category_filter
            }
            # Fall back to unfiltered results if the filter removes everything
            if filtered_scores:
                combined_scores = filtered_scores

        # Phase 5: Spatial Scoring — proximity bonus with urgency penalty
        # When boarding is imminent, walking time carries a heavy penalty so that
        # far-away facilities drop below closer ones regardless of semantic similarity.
        if user_gate:
            # Urgency penalty factor: ramps up as time_remaining_min shrinks
            if time_remaining_min < 10:
                urgency_penalty = 0.05   # Extreme — only 0–60m facilities survive
            elif time_remaining_min < 20:
                urgency_penalty = 0.02   # High
            else:
                urgency_penalty = 0.005  # Low — normal browsing mode

            for i in combined_scores:
                facility = combined_scores[i]["facility"]
                base_score = combined_scores[i]["combined_score"]
                scored_facility = score_facility_by_proximity(
                    facility, user_gate, base_score
                )
                # Apply urgency penalty: score -= urgency_penalty * walk_minutes
                walk_sec = scored_facility.get("walking_time_sec", 0)
                walk_min = walk_sec / 60.0
                urgency_adjusted = scored_facility.get("proximity_score", base_score)
                urgency_adjusted -= urgency_penalty * walk_min

                combined_scores[i]["facility"] = scored_facility
                combined_scores[i]["combined_score"] = max(0.0, urgency_adjusted)

        # Sort by combined score and return top-k
        sorted_results = sorted(
            combined_scores.items(), key=lambda x: x[1]["combined_score"], reverse=True
        )[:top_k]

        results = [
            {
                **item[1]["facility"],
                "retrieval_score": item[1]["combined_score"],
                "semantic_score": item[1]["semantic_score"],
                "bm25_score": item[1]["bm25_score"],
            }
            for item in sorted_results
        ]

        elapsed = time.time() - start
        print(f"[Retrieval] Retrieved {len(results)} results in {elapsed*1000:.1f}ms")

        return results
