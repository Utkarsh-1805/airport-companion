"""
Advanced Configuration for AeroAssist
For fine-tuning performance and resource allocation
"""

# Advanced Embedding Configuration
EMBEDDING_CONFIG = {
    # Model variants: balance quality vs speed
    "model": "BAAI/bge-small-en-v1.5",  # Options: "all-minilm-l6-v2", "all-mpnet-base-v2"
    "batch_size": 32,
    "max_length": 512,
    "normalize_embeddings": True,
}

# Advanced Vector DB Configuration
VECTOR_DB_CONFIG = {
    "collection_name": "airport_facilities",
    "vector_size": 384,
    "distance_metric": "cosine",  # Options: "euclidean", "manhattan", "cosine"
    "hnsw_config": {
        "m": 16,  # Connection count per layer
        "ef_construct": 200,  # Construction parameter
        "ef_search": 100,  # Search parameter
    },
    "quantization": {
        "enabled": False,  # Enable for memory savings
        "quantile": 0.99,
    },
}

# Advanced Retrieval Configuration
RETRIEVAL_CONFIG = {
    "hybrid_search": {
        "use_bm25": True,
        "semantic_weight": 0.7,
        "keyword_weight": 0.3,
    },
    "spatial_search": {
        "enabled": True,
        "distance_threshold_m": 500,
        "walking_speed_ms": 1.4,  # m/s
    },
    "re_ranking": {
        "enabled": False,  # Cross-encoder re-ranking (slower but more accurate)
        "model": None,  # "cross-encoder/ms-marco-MiniLM-L-12-v2"
    },
}

# Advanced Generation Configuration
GENERATION_CONFIG = {
    "model": "gemma2:9b",
    "temperature": 0.7,
    "top_k": 40,
    "top_p": 0.9,
    "repeat_penalty": 1.1,
    "max_tokens": 256,
    "stream": False,
    "cache_size": 100,  # Prompt cache capacity
}

# Performance Tuning
PERFORMANCE_CONFIG = {
    # Target latencies (seconds)
    "embedding_target": 0.05,  # 50ms
    "retrieval_target": 0.5,   # 500ms
    "generation_target": 1.5,  # 1500ms
    "ttft_target": 2.0,        # 2000ms

    # Resource allocation
    "workers": 4,  # Number of worker threads
    "batch_size": 32,  # Embedding batch size
    "cache_enabled": True,

    # Monitoring
    "collect_metrics": True,
    "metric_buffer_size": 1000,
}

# Advanced Spatial Configuration
SPATIAL_CONFIG = {
    # Define actual airport gate coordinates (in meters)
    "terminals": {
        "terminal_1": {
            "name": "Terminal 1",
            "gates": {
                "A1": (0, 0), "A2": (10, 0), "A3": (20, 0), "A4": (30, 0),
            }
        },
        "terminal_2": {
            "name": "Terminal 2",
            "gates": {
                "B10": (0, 50), "B11": (10, 50), "B12": (20, 50), "B13": (30, 50),
            }
        },
    },
    # Walking speed in m/s (1.4 m/s ≈ 3.1 mph, average human walking speed)
    "walking_speed_ms": 1.4,
    # Accessibility preferences
    "accessibility_options": {
        "wheelchair_accessible": True,
        "mobility_device_friendly": True,
    },
}

# Prompt Engineering Configuration
PROMPT_CONFIG = {
    # Context compression
    "max_context_chars": 1500,
    "max_facilities_in_context": 5,

    # System prompt customization
    "system_prompt": """You are an Airport Concierge AI assistant at a modern airport terminal.
Your role is to help travelers find amenities, services, and navigate to their destinations efficiently.

Guidelines:
1. Be concise and helpful - travelers are often in a hurry.
2. Prioritize proximity to their current gate and boarding time.
3. If a traveler is boarding soon, suggest quick services.
4. Provide specific locations (gate numbers, terminal info, walking time estimates).
5. Always be friendly and professional.
6. Never make up information - only use provided data.""",

    # Language customization
    "language": "en",
    "response_style": "formal",  # Options: "formal", "casual", "friendly"
}

# Caching Strategy
CACHE_CONFIG = {
    "system_prompts": True,
    "embeddings": True,
    "retrieval_results": False,  # Disable if data changes frequently

    # Cache size limits
    "max_cached_prompts": 1000,
    "max_cached_embeddings": 10000,

    # Cache expiration (seconds)
    "cache_ttl": 3600,  # 1 hour
}

# Monitoring & Analytics
ANALYTICS_CONFIG = {
    "track_queries": True,
    "track_latencies": True,
    "track_errors": True,

    # Data retention
    "retention_days": 30,
    "batch_write_interval": 60,  # seconds
}

# Security Configuration
SECURITY_CONFIG = {
    "enable_auth": False,  # Set to True to enable API authentication
    "auth_type": "api_key",  # Options: "api_key", "bearer_token"
    "rate_limiting": {
        "enabled": False,
        "max_requests_per_minute": 60,
    },
    "data_encryption": {
        "enabled": False,  # Encrypt sensitive user data
        "algorithm": "AES-256",
    },
}

# Hardware Optimization
HARDWARE_CONFIG = {
    # GPU/CUDA settings
    "gpu_enabled": False,
    "cuda_device_id": 0,

    # Memory constraints
    "max_memory_mb": 4096,
    "enable_memory_optimization": True,

    # Quantization (for resource-constrained environments)
    "enable_int8_quantization": False,
    "enable_int4_quantization": False,
}
