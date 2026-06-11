"""FastAPI application for AeroAssist RAG system."""

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json

from src.rag import AeroAssistRAG

# Initialize FastAPI app
app = FastAPI(
    title="AeroAssist",
    description="Low-latency RAG system for airport assistance",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG system (singleton)
rag_system = None


def get_rag_system() -> AeroAssistRAG:
    """Get or initialize RAG system."""
    global rag_system
    if rag_system is None:
        rag_system = AeroAssistRAG()
    return rag_system


# ==================== Data Models ====================


class UserContext(BaseModel):
    """User session context (boarding pass data)."""

    user_id: str
    flight_id: str
    gate: str
    boarding_time: str  # Format: "HH:MM"
    status: str = "On-time"


class QueryRequest(BaseModel):
    """User query request."""

    user_id: str
    query: str
    user_context: Optional[UserContext] = None
    include_user_docs: bool = False


class FacilityResponse(BaseModel):
    """Facility in response."""

    id: str
    name: str
    category: str
    distance_m: float
    walking_time_sec: float
    services: List[str]


class PerformanceMetrics(BaseModel):
    """Performance metrics."""

    retrieval_ms: float
    generation_ms: float
    total_ms: float
    meets_latency: Dict[str, bool]


class QueryResponse(BaseModel):
    """Complete query response."""

    status: str
    query: str
    response: str
    retrieved_facilities: List[FacilityResponse]
    performance: PerformanceMetrics
    user_context: Dict[str, Any]


# ==================== Endpoints ====================


@app.get("/")
async def root():
    """Health check and welcome endpoint."""
    return {
        "service": "AeroAssist",
        "status": "running",
        "endpoints": [
            "GET /health",
            "POST /query",
            "GET /query/stream",
            "POST /session",
            "GET /sessions",
        ],
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    try:
        rag = get_rag_system()
        return {
            "status": "healthy",
            "components": {
                "retrieval": "ready",
                "generation": "ready",
                "session_manager": "ready",
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Health check failed: {str(e)}"
        )


@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """
    Main query endpoint for AeroAssist.
    
    Processes user query through complete RAG pipeline:
    1. Semantic search + spatial filtering
    2. Prompt compression
    3. LLM inference with Gemma
    
    Returns response with retrieved context and generated answer.
    """
    try:
        rag = get_rag_system()

        # Convert UserContext to dict if provided
        user_data = None
        if request.user_context:
            user_data = request.user_context.dict()

        # Process query
        result = rag.process_query(
            user_id=request.user_id,
            query=request.query,
            user_data=user_data,
            include_user_docs=request.include_user_docs,
        )

        return result

    except Exception as e:
        print(f"[API] Query error: {e}")
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")


@app.get("/query/stream")
async def query_stream(
    user_id: str,
    query: str,
    gate: Optional[str] = "A1",
    include_user_docs: Optional[bool] = False,
):
    """
    Streaming endpoint for real-time token generation.
    
    Returns text/event-stream with tokens as they're generated.
    """
    try:
        rag = get_rag_system()

        def generate():
            try:
                for chunk in rag.stream_response(
                    user_id=user_id,
                    query=query,
                    user_data={"user_id": user_id, "gate": gate},
                    include_user_docs=include_user_docs,
                ):
                    yield chunk

            except Exception as e:
                yield f"\nError: {str(e)}"

        return StreamingResponse(generate(), media_type="text/event-stream")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Streaming failed: {str(e)}")


@app.post("/session")
async def create_session(user_context: UserContext):
    """
    Create or update a user session.
    
    Allows "hot swapping" of user context (e.g., gate changes).
    """
    try:
        rag = get_rag_system()
        session_id = rag.session_manager.create_session(user_context.dict())

        return {
            "status": "success",
            "session_id": session_id,
            "user_id": user_context.user_id,
            "context": user_context.dict(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Session creation failed: {str(e)}")


@app.get("/sessions")
async def list_sessions():
    """List all active sessions."""
    try:
        rag = get_rag_system()
        sessions = rag.session_manager.list_active_sessions()

        return {
            "active_sessions": sessions,
            "count": len(sessions),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list sessions: {str(e)}")


@app.get("/config")
async def get_config():
    """Get system configuration and performance targets."""
    from config.settings import (
        OLLAMA_MODEL,
        EMBEDDING_MODEL,
        MAX_RETRIEVAL_TIME,
        MAX_GENERATION_TIME,
        QDRANT_COLLECTION,
    )

    return {
        "system": "AeroAssist",
        "models": {
            "llm": OLLAMA_MODEL,
            "embedding": EMBEDDING_MODEL,
        },
        "performance_targets": {
            "max_retrieval_ms": MAX_RETRIEVAL_TIME * 1000,
            "max_generation_ms": MAX_GENERATION_TIME * 1000,
        },
        "database": {
            "type": "Qdrant",
            "collection": QDRANT_COLLECTION,
        },
    }


# ==================== Startup/Shutdown ====================


@app.on_event("startup")
async def startup_event():
    """Initialize RAG system on startup."""
    print("\n[FastAPI] Starting AeroAssist server...")
    rag = get_rag_system()

    # Load sample data
    import json
    with open("data/airport_facilities.json", "r") as f:
        facilities = json.load(f)
    # Try to load mock users as well (optional)
    mock_users = []
    try:
        with open("data/mock_users.json", "r", encoding="utf-8") as mf:
            mock_users = json.load(mf)
            # Accept either a single object or a list of users
            if isinstance(mock_users, dict):
                mock_users = [mock_users]
            elif mock_users is None:
                mock_users = []
    except FileNotFoundError:
        mock_users = []

    # Tag docs by type so retrieval can filter them
    for doc in facilities:
        doc["doc_type"] = "facility"
    for u in mock_users:
        u["doc_type"] = "user"

    combined = facilities + mock_users

    # Clear and index combined dataset so BM25 and vector DB are in sync
    try:
        rag.retrieval.vector_db.clear_collection()
    except Exception:
        pass

    rag.load_facilities(combined)
    print(f"[FastAPI] Loaded {len(facilities)} airport facilities and {len(mock_users)} mock users")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("\n[FastAPI] Shutting down AeroAssist...")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )
