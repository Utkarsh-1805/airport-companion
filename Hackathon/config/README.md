# AeroAssist: Low-Latency RAG for Airport Assistance

A production-ready, privacy-first AI assistant designed to run on-premise at airports using **Retrieval-Augmented Generation (RAG)** architecture.

## 🎯 Key Features

- **Sub-500ms Retrieval** | Sub-2s Total Response Time
- **100% Local Processing** | Zero Data Egress
- **Hybrid Search** | Semantic + Keyword (BM25) Matching
- **Spatial Awareness** | Distance-based Facility Recommendations
- **Real-time Context** | Gate Changes, Flight Updates
- **FastAPI REST API** | Easy Integration

## 🏗️ System Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────┐
│   Generation Layer (Ollama + Gemma)    │
│   - 4-bit quantized LLM inference       │
│   - Prompt compression & caching        │
│   - Streaming token support             │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│   Retrieval Layer (Hybrid Search)       │
│   - Vector DB (Qdrant in-memory)        │
│   - FastEmbed embeddings                │
│   - BM25 keyword search                 │
│   - Spatial filtering                   │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│   Data Layer                            │
│   - Static: Airport facilities (JSON)   │
│   - Dynamic: User boarding passes       │
│   - Session store                       │
└─────────────────────────────────────────┘
```

## 📋 Prerequisites

- **Python 3.9+**
- **Ollama** running locally with Gemma model
  ```bash
  # Install from: https://ollama.ai
  ollama pull gemma:2b
  ollama serve  # Runs on http://localhost:11434
  ```
- **2GB+ RAM** (recommended 4GB+)
- **Windows/Mac/Linux**

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Create virtual environment
python -m venv venv

# Activate
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install packages
pip install -r requirements.txt
```

### 2. Verify Ollama Connection

```bash
python -c "from src.generation import OllamaGenerator; OllamaGenerator()"
```

### 3. Run Example Query

```bash
python main.py
```

This will execute example queries demonstrating the full RAG pipeline.

### 4. Start FastAPI Server

```bash
python -m uvicorn src.app:app --host 0.0.0.0 --port 8000 --reload
```

Access API at: http://localhost:8000/docs

## 📊 Performance Benchmarks

| Component | Target | Status |
|-----------|--------|--------|
| Embedding Latency | <50ms | ✅ |
| Vector Search | <20ms | ✅ |
| Retrieval Total | <500ms | ✅ |
| LLM Response (Gemma) | <1500ms | ✅ |
| **Total TTFT** | **<2s** | ✅ |

## 🔧 API Endpoints

### Query Processing
```bash
POST /query

{
  "user_id": "traveler_01",
  "query": "Where can I get coffee?",
  "user_context": {
    "flight_id": "AI-101",
    "gate": "B12",
    "boarding_time": "14:30",
    "status": "On-time"
  }
}
```

### Streaming Response
```bash
GET /query/stream?user_id=traveler_01&query=coffee&gate=B12
```

### Session Management
```bash
POST /session

{
  "user_id": "traveler_01",
  "flight_id": "AI-101",
  "gate": "B12",
  "boarding_time": "14:30",
  "status": "On-time"
}
```

### Health Check
```bash
GET /health
GET /config
GET /sessions
```

## 🧪 Testing

Run individual component tests:

```bash
# Test retrieval component
python test_utils.py retrieval

# Test generation component
python test_utils.py generation

# Latency benchmarks
python test_utils.py latency

# End-to-end test
python test_utils.py e2e
```

## 📁 Project Structure

```
Airport Rag/
├── config/
│   └── settings.py          # Configuration & performance targets
├── data/
│   └── airport_facilities.json  # Sample airport data
├── src/
│   ├── __init__.py
│   ├── app.py              # FastAPI application
│   ├── rag.py              # Main RAG orchestrator
│   ├── embeddings.py       # FastEmbed wrapper
│   ├── vector_db.py        # Qdrant client
│   ├── retrieval.py        # Hybrid search (semantic + BM25)
│   ├── generation.py       # Ollama integration
│   ├── prompt_engine.py    # Prompt composition & compression
│   ├── session.py          # User session management
│   └── spatial.py          # Distance/location calculations
├── main.py                 # CLI entry point with examples
├── test_utils.py           # Testing utilities
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## ⚙️ Configuration

Key settings in `config/settings.py`:

```python
# LLM
OLLAMA_MODEL = "gemma:2b"  # or "gemma:7b"
OLLAMA_BASE_URL = "http://localhost:11434"

# Embeddings
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"  # FastEmbed model
EMBEDDING_DIM = 384

# Performance
MAX_RETRIEVAL_TIME = 0.5  # seconds
MAX_GENERATION_TIME = 2.0  # seconds

# Search
BM25_WEIGHT = 0.3
SEMANTIC_WEIGHT = 0.7
TOP_K_RETRIEVAL = 5
DISTANCE_THRESHOLD = 500  # meters
```

## 🎯 Use Cases

### Traveler Assistance
- "Where can I get coffee near my gate?"
- "Show me quick restaurants before boarding"
- "I need a lounge - where's the nearest one?"

### Real-time Updates
- Gate changes: Spatial filtering automatically updates
- Flight delays: System prioritizes different services
- Time constraints: Automatically filters options

### Privacy
- **Zero API calls** - All processing local
- **No data egress** - Sensitive boarding data stays on-premise
- **No third-party dependencies** - Except Ollama (local)

## 🚀 Production Deployment

### Docker Deployment

```bash
docker build -t aeroassist .
docker run -p 8000:8000 -p 11434:11434 aeroassist
```

### Optimization Tips

1. **Use Gemma 2B** on edge devices, **7B** on powerful servers
2. **Enable KV Caching** for repeated user patterns
3. **Use 4-bit quantization** for faster inference
4. **Batch embedding operations** for multiple queries
5. **Pre-index facilities** before peak hours

### Scaling

- **Parallel processing**: Multiple user queries simultaneously
- **Load balancing**: Multiple API instances behind reverse proxy
- **Caching**: Session prompts cached in memory
- **Batch inference**: Queue similar queries together

## 📈 Monitoring & Logging

Monitor performance metrics:

```bash
GET /health              # Component status
GET /config              # System configuration
POST /query              # Includes performance metrics

# Example response includes:
{
  "performance": {
    "retrieval_ms": 125.5,
    "generation_ms": 850.3,
    "total_ms": 975.8,
    "meets_latency": {
      "retrieval": true,
      "total": true
    }
  }
}
```

## 🔍 Troubleshooting

### "Cannot connect to Ollama"
```bash
# Verify Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve
```

### Slow retrieval
```bash
# Run latency test
python test_utils.py latency

# Check for system load
# Increase TOP_K_RETRIEVAL in settings if needed
```

### Memory issues
```bash
# Use Gemma 2B instead of 7B
# Reduce BATCH_SIZE in settings
# Clear sessions: GET /sessions then POST to cleanup
```

## 📝 Data Format

### Airport Facilities Schema

```json
{
  "id": "shop_001",
  "name": "Blue Tokai Coffee",
  "category": "Cafe",
  "location": "Terminal 2, Near Gate B10",
  "coordinates": {
    "gate": "B10",
    "offset": 50
  },
  "description": "Premium specialty coffee",
  "services": ["Coffee", "Sandwiches", "WiFi"],
  "tags": ["quick", "beverages"],
  "avg_wait_time": 5,
  "price_range": "$$"
}
```

### User Session Schema

```json
{
  "user_id": "traveler_01",
  "flight_id": "AI-101",
  "gate": "B12",
  "boarding_time": "14:30",
  "status": "On-time"
}
```

## 🎓 Advanced Features

### Prompt Caching
Frequently-used system prompts are cached for instant reuse:
```python
rag.prompt_cache.get_system_prompt(user_id, context)
```

### Hot Swapping
Update user context without re-indexing:
```bash
POST /session
# Gate change automatically reflected in next query
```

### Streaming Responses
Real-time token generation for interactive UIs:
```bash
GET /query/stream?user_id=X&query=Y
```

## 📚 Key Technologies

| Component | Technology | Reason |
|-----------|-----------|--------|
| **Embeddings** | FastEmbed | Minimal overhead, fast inference |
| **Vector DB** | Qdrant | In-memory speed, semantic search |
| **Keyword Search** | BM25 | Fast, exact phrase matching |
| **LLM** | Ollama + Gemma | Quantized, local, privacy-first |
| **API** | FastAPI | High performance, async support |
| **Search** | Hybrid | Combines strengths of both approaches |

## 🤝 Contributing

To extend AeroAssist:

1. Add new data in `data/airport_facilities.json`
2. Tune weights in `config/settings.py`
3. Extend prompts in `src/prompt_engine.py`
4. Add new API endpoints in `src/app.py`

## 📄 License

Proprietary - Designed for airport infrastructure deployment

## 🛫 Future Roadmap

- [ ] Multi-language support
- [ ] Voice interface (STT/TTS)
- [ ] Mobile app integration
- [ ] Flight status real-time integration
- [ ] Personal preference learning
- [ ] Multi-user concurrent sessions
- [ ] Analytics dashboard

## 📞 Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting)
2. Review logs in terminal
3. Run test suite: `python test_utils.py latency`
4. Verify Ollama connection

---

**Built for Privacy. Optimized for Latency. Designed for Airports. 🛫**
