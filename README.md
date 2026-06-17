# Airport Companion — Adani Hackathon

A privacy-first, voice-driven AI companion for airport passengers. The system combines a **3D interactive airport map**, a **local Retrieval-Augmented Generation (RAG) backend** running on-device, and a **modern React frontend** to help travellers navigate, find shops/food, get gate updates, and ask multilingual questions — all without sending data to the cloud.

> Built for the Adani Airports hackathon. Inspired by Chhatrapati Shivaji Maharaj International Airport (CSMIA), Mumbai.

---

## ✨ What it does

- **Find your way** — interactive 3D airport scene with Dijkstra-based shortest-path routing between gates, shops, lounges, restrooms, baggage claim, and more.
- **Ask anything** — voice/text companion that grounds answers in the live airport directory using RAG.
- **Speaks your language** — replies in Hindi, Tamil, Telugu, English, and other Indian languages, picking up the language from the user's query.
- **Stays private** — the LLM (Gemma 2 9B via Ollama), embeddings, and vector store all run **locally**. No passenger query leaves the device.
- **Real-time aware** — gate changes and flight updates are surfaced via tool-calls and reflected in the assistant's answers.
- **Boarding-pass intake** — OCR (tesseract.js) reads a boarding pass photo to personalise the experience without typing.

---

## 🗂 Repository layout

This repo bundles three coordinated subprojects:

| Folder | Stack | Purpose |
|---|---|---|
| [`Airport Rag/`](./Airport%20Rag) | Legacy static shell + exported data | Original map assets and exported airport/RAG JSON kept for reference. The runnable 3D map now lives in `powermind2/`. |
| [`Hackathon/`](./Hackathon) | Python · FastAPI · LangChain · Ollama · ChromaDB · Whisper · Kokoro TTS | Local RAG backend grounded on the airport directory. Serves the `/query` endpoint to the frontend, runs the voice pipeline (VAD → STT → LLM → TTS), and exposes real-time tool calls for flight/gate data. |
| [`powermind2/`](./powermind2) | React 19 · Vite · @react-three/fiber · framer-motion · tesseract.js | Production frontend — onboarding, home, explore, FAQ, profile, settings, full-map view, AI companion, boarding-pass OCR, mini-map, smart services, and itinerary checkpoints. |

---

## 🏗 Architecture (high level)

```
   ┌────────────────────────────────────────┐
   │  powermind2 (React + R3F frontend)     │
   │  - 3D scene, AI companion, OCR upload  │
   └──────────────┬─────────────────────────┘
                  │  HTTP  POST /query
                  ▼
   ┌────────────────────────────────────────┐
   │  Hackathon (FastAPI server.py)         │
   │  - LangChain retrieval chain           │
   │  - Realtime tools (gate / flight)      │
   └──────────────┬─────────────────────────┘
                  │
        ┌─────────┴────────┐
        ▼                  ▼
  Ollama LLM         Chroma vector DB
  (gemma2:9b)        (airport corpus +
                      OllamaEmbeddings)
```

The 3D airport map (`Airport Rag/`) can run standalone for spatial demos, or its `data/navigation-graph.json` can be ingested by the assistant for spatial grounding.

---

## 🚀 Getting started

> Tested on Windows 11. Python 3.9 and Node.js 20+ required. [Ollama](https://ollama.com) must be installed locally.

### 1. Pull the local models

```powershell
ollama pull gemma2:9b
ollama pull nomic-embed-text
```

### 2. Run the RAG backend (`Hackathon/`)

```powershell
cd Hackathon
uv sync
uv run uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

The default backend install is lightweight and runs without Ollama, Chroma, or
Visual C++ build tools. In that mode `/query` uses the local airport corpus with
keyword retrieval so the frontend remains demoable. For the full local LLM,
vector DB, voice, and TTS stack, install the optional dependencies with
`uv sync --extra full`, then pull the Ollama models listed above.

The Streamlit demo is also available:

```powershell
streamlit run app.py
```

### 3. Run the React frontend (`powermind2/`)

```powershell
cd powermind2
npm.cmd install
npm.cmd run dev
```

Open http://127.0.0.1:5173.

### 4. Legacy map data (`Airport Rag/`)

`Airport Rag/` is retained for source data and exports used by the companion.
Its `index.html` is a redirect-style information page; run `powermind2/` for
the current interactive 3D airport map.

---

## 🔧 Configuration

Environment variables read by the backend:

| Variable | Default | Purpose |
|---|---|---|
| `AEROASSIST_LLM` | `gemma2:9b` | Ollama model tag for generation. Swap for `gemma4:e2b`, `gemma4:26b`, etc. on a beefier host. |
| `AEROASSIST_HELPLINE` | `+91-22-6685-1010` | Fallback helpline shown when the assistant cannot answer from the corpus. |

---

## 🎯 Why these choices

- **Gemma 2 9B (not 26B+)** — keeps inference under ~2 s on a laptop; latency is the bottleneck for a voice companion, not raw quality.
- **On-device RAG** — privacy guarantee for passenger data + works in airport buildings where backhaul is unreliable.
- **Three.js over Unity** — zero install for demo judges; the same `navigation-graph.json` is portable to a Unity build later.
- **Hybrid retrieval (semantic + BM25)** — names of gates and shop brands need exact-match recall; embeddings alone miss them.

---

## 👤 Author

**Sweta Rana**
[GitHub @Utkarsh](https://github.com/Utkarsh-1805)

---

## 📄 License

MIT — see [`LICENSE`](./LICENSE).
