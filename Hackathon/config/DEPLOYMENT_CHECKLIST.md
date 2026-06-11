# AeroAssist - Deployment & Testing Checklist

## Pre-Deployment Checklist

### System Requirements
- [ ] Python 3.9+ installed
- [ ] Ollama installed and gemma:2b model downloaded
- [ ] 2GB+ available RAM
- [ ] Network access to Ollama (localhost:11434)

### Environment Setup
- [ ] Virtual environment created
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] `.env` file configured (copy from `.env.example`)
- [ ] Airport data loaded (`data/airport_facilities.json`)

### Component Verification
- [ ] Ollama is running (`ollama serve`)
- [ ] FastEmbed model loads successfully
- [ ] Qdrant initializes in-memory
- [ ] API server starts without errors

## Testing Checklist

### Unit Tests
- [ ] Embedding generation (FastEmbed)
  ```bash
  python -c "from src.embeddings import EmbeddingService; e = EmbeddingService(); print(len(e.embed_text('test')))"
  ```

- [ ] Vector database operations
  ```bash
  python -c "from src.vector_db import VectorDB; db = VectorDB(); print('✓ VectorDB ready')"
  ```

- [ ] BM25 retrieval
  ```bash
  python test_utils.py retrieval
  ```

- [ ] Ollama generation
  ```bash
  python test_utils.py generation
  ```

### Integration Tests
- [ ] End-to-end query processing
  ```bash
  python test_utils.py e2e
  ```

- [ ] Session management
  ```bash
  python test_utils.py latency
  ```

### Performance Tests
- [ ] Retrieval latency (<500ms)
  ```bash
  python test_utils.py latency
  ```

- [ ] Generation latency (<1.5s)
  - Monitor in test output

### API Testing
- [ ] Health endpoint: `curl http://localhost:8000/health`
- [ ] Config endpoint: `curl http://localhost:8000/config`
- [ ] Query endpoint (see `client_example.py`)
- [ ] Streaming endpoint (see `client_example.py`)
- [ ] Session endpoints
- [ ] OpenAPI docs: `http://localhost:8000/docs`

## Startup Verification

### 1. Start Ollama
```bash
ollama serve
# Wait for "Listening on..."
```

### 2. Install Dependencies
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Run Health Check
```bash
python main.py
# Should complete successfully with example queries
```

### 4. Start API Server
```bash
python -m uvicorn src.app:app --host 0.0.0.0 --port 8000 --reload
# Should show "Application startup complete"
```

### 5. Test API
```bash
python client_example.py
# Should run example queries with responses
```

## Performance Benchmarks to Verify

| Metric | Target | Acceptable |
|--------|--------|-----------|
| Embedding latency | <50ms | <100ms |
| Vector search | <20ms | <50ms |
| Total retrieval | <500ms | <600ms |
| LLM generation | <1500ms | <2000ms |
| **Total TTFT** | **<2000ms** | **<2500ms** |

## Troubleshooting

### "Cannot connect to Ollama"
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve

# Verify model
ollama list | grep gemma
```

### "Model not found"
```bash
# Pull Gemma model
ollama pull gemma:2b

# Verify
ollama show gemma:2b
```

### Slow performance
```bash
# Check system resources
# - CPU usage (should be <80%)
# - RAM usage (should be <3GB)
# - Disk I/O (should be minimal)

# Run latency tests
python test_utils.py latency
```

### Memory issues
```bash
# Use Gemma 2B (uses ~1.5GB)
# Check available RAM: free -h (Linux) / tasklist (Windows)
# Close other applications
```

### API won't start
```bash
# Check port 8000 is free
netstat -an | grep 8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows

# Use different port
python -m uvicorn src.app:app --port 8001
```

## Data Management

### Load Custom Airport Data
```python
import json
from src.rag import AeroAssistRAG

rag = AeroAssistRAG()
with open("data/custom_facilities.json") as f:
    facilities = json.load(f)
rag.load_facilities(facilities)
```

### Data Format Validation
```bash
# Validate JSON
python -m json.tool data/airport_facilities.json > /dev/null
```

### Add New Facilities
1. Edit `data/airport_facilities.json`
2. Add facility object with all required fields
3. Restart API or reload via endpoint

## Monitoring

### Runtime Monitoring
```bash
# Watch API logs
tail -f logs/api.log

# Monitor system resources
watch -n 1 'ps aux | grep python'
```

### Performance Tracking
```bash
# Each API response includes:
# - retrieval_ms
# - generation_ms
# - total_ms
# - meets_latency (true/false)
```

## Deployment Variations

### Local Development
```bash
# Standard setup (as above)
python main.py
python -m uvicorn src.app:app --reload
```

### Docker
```bash
docker build -t aeroassist .
docker run -p 8000:8000 aeroassist
```

### Docker Compose (with Ollama)
```bash
docker-compose up
# Accessible at http://localhost:8000
```

### Kubernetes
```bash
kubectl apply -f k8s/
kubectl port-forward svc/aeroassist 8000:8000
```

## Success Criteria

- [x] All components initialize without errors
- [x] Retrieval completes in <500ms
- [x] Generation completes in <1500ms
- [x] Total response time <2000ms
- [x] API responds to all endpoints
- [x] Example queries generate relevant responses
- [x] Performance metrics are tracked
- [x] Error handling works properly

## Post-Deployment

1. **Monitor logs** for errors in first hour
2. **Run load test** with multiple concurrent users
3. **Verify latencies** match benchmarks
4. **Update data** with real airport facilities
5. **Configure authentication** for production
6. **Enable monitoring/alerting** dashboards
7. **Set up backup** strategy for facility data

---

**Last Updated**: 2026-05-03  
**Version**: 1.0  
**Status**: Ready for Deployment ✅
