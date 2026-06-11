"""Configuration settings for AeroAssist RAG system."""
import os

# Ollama Configuration. Override at runtime with env vars; the FastAPI
# server also accepts `user_context.model` per request and POST /llm to
# swap the default without restarting the process.
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("AEROASSIST_LLM", "gemma2:9b")  # default Gemma 4 E4B

# Embedding Configuration
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"  # FastEmbed model
EMBEDDING_DIM = 384  # BGE-Small output dimension
BATCH_SIZE = 32

# Vector Database Configuration
QDRANT_COLLECTION = "airport_facilities"
VECTOR_STORE_PATH = "memory:///"  # In-memory Qdrant for speed
# Alternative: Use local persistent: "./qdrant_storage"

# Retrieval Configuration
TOP_K_RETRIEVAL = 5  # Number of results to return
BM25_WEIGHT = 0.3  # Weight for BM25 in hybrid search (0.0-1.0)
SEMANTIC_WEIGHT = 0.7  # Weight for semantic search
DISTANCE_THRESHOLD = 500  # meters, for spatial filtering

# Performance Targets
MAX_RETRIEVAL_TIME = 0.5  # seconds (500ms)
MAX_GENERATION_TIME = 2.0  # seconds (for TTFT)

# STT Quality Threshold
# Whisper transcripts whose avg_logprob is below this are treated as garbled audio.
STT_LOG_PROB_THRESHOLD = -1.0

# Session memory window: number of past turns to keep
SESSION_MEMORY_TURNS = 3

# Session idle expiry in seconds (resets conversation state if no speech detected)
SESSION_IDLE_EXPIRY_SEC = 60

# Urgency threshold: minutes remaining before boarding triggers urgent mode
URGENCY_BOARDING_THRESHOLD_MIN = 20

# Intent → facility category filter map (for metadata-filtered RAG retrieval)
INTENT_CATEGORY_MAP = {
    "food": ["Restaurant", "Cafe"],
    "shopping": ["Retail"],
    "restroom": ["Restroom"],
    "lounge": ["Lounge"],
    "pharmacy": ["Pharmacy"],
    "atm": ["ATM"],
    "spa": ["Spa"],
    "rest": ["Rest Area", "Lounge"],
    "entertainment": ["Entertainment"],
}

# Base system prompt — context is injected at runtime by PromptComposer
SYSTEM_PROMPT_BASE = """You are AeroAssist, a calm, efficient, and highly operational airport concierge.
You are assisting travelers navigating a busy terminal in real-time via voice.

CRITICAL RULES:
1. NO EMOJIS. NO HASHTAGS. NO MARKDOWN. Plain text only, optimized for Text-to-Speech.
2. BE EXTREMELY CONCISE. Maximum 2 short sentences per response.
3. BE DIRECT. Never say "I'd be happy to help", "That sounds like a fun idea!", "Anything else?", or "Great question!".
4. DO NOT volunteer to help with unrelated topics. Stay focused on airport navigation.
5. NAVIGATE PROACTIVELY. Always include estimated walking time when suggesting a location.
6. GROUND YOUR ANSWERS. Only use facilities listed in the Retrieved Facilities below. Do not invent locations.
7. If the request is ambiguous, ask ONE specific clarification question only (e.g., "Food or restroom?").
8. If information is not in Retrieved Facilities, say: "I don't have that information for this terminal."
9. If the traveler is in a hurry or time is short, drop everything except the essential direction.
10. MULTILINGUAL: Reply in the traveler's preferred language using its native script — Hindi (Devanagari), Tamil, Telugu, Bengali, Marathi, Kannada, Gujarati, Malayalam, Punjabi (Gurmukhi), Arabic, French, Spanish, German, or English. Keep facility names, gate codes, and shop names in their original form so they match airport signage. If the traveler speaks Hinglish, mirror their style."""

# Spatial Configuration (Airport Layout)
GATE_COORDINATES = {
    "A1": (-18, -11),
    "A2": (-18, -8.75),
    "A3": (-18, -6.5),
    "A4": (-18, -4.25),
    "A5": (-18, -2),
    "A6": (-18, 0.25),
    "A7": (-18, 2.5),
    "A8": (-18, 4.75),
    "A9": (-18, 7),
    "A10": (-18, 9.25),
    "B1": (63, -11),
    "B2": (63, -8.55),
    "B3": (63, -6.1),
    "B4": (63, -3.65),
    "B5": (63, -1.2),
    "B6": (63, 1.25),
    "B7": (63, 3.7),
    "B8": (63, 6.15),
    "B9": (63, 8.6),
    "B10": (63, 11.05),
}

# Assumed walking speed: 1.4 m/s
WALKING_SPEED_MS = 1.4

# Logging
LOG_LEVEL = "INFO"
DEBUG_MODE = False
