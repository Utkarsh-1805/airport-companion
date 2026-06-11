"""FastAPI server that grounds gemma2:9b on the 3D airport map data.

Gemma 2 (9B) runs locally via Ollama. We picked it over the larger Gemma 4
variants because inference latency on a laptop is the bottleneck for the
voice companion — 9B replies in ~1-2s where 26B+ stalls at 5s+. Gemma 4
tags remain in ALLOWED_MODELS so a beefier host can opt in via /llm.

Endpoint contract matches the React frontend (powermind2):
    POST /query  ->  {response, should_navigate, destination, sources}

Run locally:
    uvicorn server:app --host 127.0.0.1 --port 8000 --reload
"""

from __future__ import annotations

import re
import shutil
import json
import urllib.error
import urllib.request
from typing import Any, Optional

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from langchain.chains.combine_documents import create_stuff_documents_chain
    from langchain_community.embeddings import OllamaEmbeddings
    from langchain_community.llms import Ollama
    from langchain_community.vectorstores import Chroma
    from langchain_core.documents import Document
    from langchain_core.prompts import PromptTemplate
except Exception:  # noqa: BLE001 - the server has a local fallback mode
    create_stuff_documents_chain = None
    OllamaEmbeddings = None
    Ollama = None
    Chroma = None
    PromptTemplate = None

    class Document:  # minimal shape used by the fallback retriever
        def __init__(self, page_content: str, metadata: dict[str, Any]):
            self.page_content = page_content
            self.metadata = metadata

from airport_corpus import build_documents, build_routing_index
from realtime_tools import (
    current_etag,
    execute_tool_calls,
    format_tool_results_for_prompt,
    get_full_snapshot,
    plan_tool_calls,
    tool_call_trace,
)

import os

# Default Gemma model can be overridden by env var or by a `model` field in
# the per-request `user_context`. Recognised tags from the Ollama library
# include gemma4:e2b, gemma2:9b, gemma4:26b, gemma4:31b (and quantised
# variants). The cheapest variant that gives sensible multilingual replies
# on a laptop is e4b — keep that as the fallback.
DEFAULT_LLM_MODEL = os.getenv("AEROASSIST_LLM", "gemma2:9b")

# Passenger-facing fallback when the assistant cannot answer a query from the
# airport directory. Configurable via env so different airports can swap in
# their own 24x7 number without a code change.
HELPLINE_NUMBER = os.getenv("AEROASSIST_HELPLINE", "+91-22-6685-1010")
HELPLINE_HINT_EN = (
    f" If you need further assistance, please call the airport helpline at {HELPLINE_NUMBER}."
)

# Heuristic markers that the LLM produced an "I don't know" style reply. We
# look for these to decide whether to append the helpline pointer.
_UNANSWERED_MARKERS = (
    "i apologize",
    "i'm sorry",
    "i am sorry",
    "do not have any information",
    "don't have any information",
    "do not have information",
    "no information",
    "not available at",
    "not in the airport",
    "is not present",
    "isn't present",
    "couldn't find",
    "could not find",
    "unable to",
    "unfortunately",
)


def _looks_unanswered(text: str) -> bool:
    if not text:
        return True
    lowered = text.lower()
    return any(marker in lowered for marker in _UNANSWERED_MARKERS)
LLM_MODEL = DEFAULT_LLM_MODEL  # mutable: /llm POST can change at runtime
EMBED_MODEL = os.getenv("AEROASSIST_EMBED_MODEL", "nomic-embed-text")

# Allow-list of models the front-end and /llm endpoint may request. Keeps
# the API safe (someone can't ask the server to load `llama4:405b` and OOM
# the box). Tweak via env if you've pulled non-Gemma models locally.
ALLOWED_MODELS = set(
    filter(
        None,
        os.getenv(
            "AEROASSIST_ALLOWED_MODELS",
            "gemma2:2b,gemma2:9b,gemma2:27b,gemma4:e2b,gemma2:9b,gemma4:26b,gemma4:31b,gemma3:4b,gemma3n:e2b,gemma3n:e4b",
        ).split(","),
    )
)

PROMPT_TEMPLATE_TEXT = (
    """You are AeroAssist, the AI airport companion for Mumbai CSMIA. The terminal
is organised as a *progressive passenger journey* through these zones (in order):

   landside  ->  security  ->  immigration  ->  airside_retail
                                              ->  airside_food
                                              ->  airside_services
                                              ->  gate_piers

   Plus a separate arrival flow:  gate_piers  ->  arrival.

STRICT GROUNDING RULES:
1. Only use facts that appear in the Context below. The Context is the complete
   inventory of zones, shops, gates, services, and FAQ entries. If a place is
   not in the Context, it does NOT exist at this airport - never invent it.
2. Always reason about the passenger's current zone before suggesting a route.
   If they are airside (post-security), they cannot return to landside without
   re-entering through arrivals. If they are at a gate, lost-passport help is
   at the airside Service Hub, not landside.
3. When recommending a destination, ALWAYS quote the exact map node id (e.g.
   InfoDesk_C, Gate_B4, PrayerRoom, Currency_Exchange). The UI uses these to
   draw the 3D path.
4. If the Context contains an FAQ entry matching the query, prefer its answer
   verbatim and use its 'Recommended route destination' as the route target.
5. MULTILINGUAL: The passenger's preferred reply language is provided as
   {language}. ALWAYS write your entire reply in that language using its
   native script (e.g. Hindi → Devanagari, Tamil → தமிழ், Telugu → తెలుగు,
   Bengali → বাংলা, Marathi → मराठी, Kannada → ಕನ್ನಡ, Gujarati → ગુજરાતી,
   Malayalam → മലയാളം, Punjabi → ਪੰਜਾਬੀ, Arabic → العربية, French/Spanish/
   German → Latin script). Keep proper nouns (gate codes like Gate_B4,
   shop names like Starbucks, Krishna Pearls, Duty Free) in their original
   form so the passenger can match signage. If the passenger types in a
   different language than the preferred one, still reply in the preferred
   language unless they explicitly switch.
6. Keep replies under 80 words unless the user asks for more detail.
7. If the answer is genuinely not in the Context, briefly admit it and suggest
   the nearest Context item that could help.

LIVE DATA RULES (highest priority - overrides any cached fact):
8. The block titled "LIVE AIRPORT DATA" below, when present, is the result of
   tools the agent just called against the realtime feed. It is the freshest
   source of truth for flight status, boarding state, gate assignment, delay
   minutes, and security/immigration/shop wait times. ALWAYS prefer it over
   any conflicting fact in the static Context.
9. When live data is present and relevant, quote the specific numbers you
   used (e.g. "12 min wait at Central Security Hub", "AI203 boarding now at
   B4"). This proves to the passenger you checked live, not stale, info.
10. If live data is NOT present and the passenger asks about flight status,
    boarding, delays, or queue length, say you do not have live data right
    now rather than guessing.

CONVERSATION CONTEXT:
The Recent Conversation below shows the last few turns. Use it to resolve
follow-up questions. When the New Query is short and pronoun-heavy (e.g.
"is it open?", "how far is that?", "and from there?"), the *it / that /
there* refers to the most recent place named in the conversation. Identify
THAT place first, find its facts in the Context, and answer about THAT
place specifically. Do not switch to a different shop just because the
Context happens to mention one. Stay consistent with what you already
told the passenger.

Recent conversation (oldest first; may be empty):
{history}

Passenger's current journey stage: {stage}
Passenger's preferred reply language: {language}

Context (airport directory):
{context}

{live_data}

New passenger query: {input}

Reply:"""
)
PROMPT = PromptTemplate.from_template(PROMPT_TEMPLATE_TEXT) if PromptTemplate else None


class LocalKeywordRetriever:
    """Tiny dependency-free retriever used when Chroma/Ollama are unavailable."""

    def __init__(self, documents: list[Document]):
        self.documents = documents

    def invoke(self, query: str) -> list[Document]:
        terms = {t for t in re.findall(r"[a-z0-9_]+", (query or "").lower()) if len(t) > 2}
        if not terms:
            return self.documents[:8]

        scored: list[tuple[int, Document]] = []
        for doc in self.documents:
            text = doc.page_content.lower()
            score = sum(text.count(term) for term in terms)
            if score:
                scored.append((score, doc))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [doc for _, doc in scored[:8]] or self.documents[:8]


class HistoryTurn(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class QueryRequest(BaseModel):
    user_id: Optional[str] = None
    query: str
    history: Optional[list[HistoryTurn]] = None
    user_context: Optional[dict[str, Any]] = None


class QueryResponse(BaseModel):
    response: str
    should_navigate: bool
    destination: Optional[str] = None
    sources: list[dict[str, Any]] = []
    tool_calls: list[dict[str, Any]] = []
    realtime_etag: Optional[str] = None


def _build_retriever():
    docs = build_documents()
    documents = [Document(page_content=d["text"], metadata=d["metadata"]) for d in docs]
    retriever = LocalKeywordRetriever(documents)
    if Chroma and OllamaEmbeddings and shutil.which("ollama"):
        try:
            embeddings = OllamaEmbeddings(model=EMBED_MODEL)
            vectorstore = Chroma.from_documents(documents=documents, embedding=embeddings)
            retriever = vectorstore.as_retriever(search_kwargs={"k": 8})
            _state["rag_mode"] = "ollama_chroma"
        except Exception as exc:  # noqa: BLE001 - keep the demo server runnable
            _state["rag_mode"] = f"local_keyword_fallback: {exc}"
    else:
        _state["rag_mode"] = "local_keyword_fallback"
    # Also build a fast keyword index: entity name -> Document.
    # Embedding search alone struggles to recall a specific shop chunk when
    # the follow-up question is short ("is it open?"). The keyword index
    # guarantees the named entity's chunk gets injected.
    keyword_index: dict[str, Document] = {}
    for d in documents:
        meta = d.metadata
        # Pull the human-readable name out of the chunk text. Each chunk's
        # first line follows "X record id=... name=Foo" or "Service node id=... name=Foo"
        # or "Zone <id> - <Name>" / "FAQ topic: <phrase>".
        text = d.page_content
        name = None
        if meta.get("kind") == "shop":
            for token in text.split("\n")[0].split():
                if token.startswith("name="):
                    name = token[len("name="):]
                    break
            # name= captures only first token; do a regex for full name
            import re as _re
            m = _re.search(r"name=([^\n]+)", text.split("\n")[0])
            if m:
                name = m.group(1).strip()
        elif meta.get("kind") == "service":
            import re as _re
            m = _re.search(r"name=([^\n]+)", text.split("\n")[0])
            if m:
                name = m.group(1).strip()
        elif meta.get("kind") == "zone":
            line = text.split("\n")[0]
            if " - " in line:
                name = line.split(" - ", 1)[1].strip()
        elif meta.get("kind") == "faq":
            line = text.split("\n")[0]
            if line.startswith("FAQ topic: "):
                name = line[len("FAQ topic: "):].strip()
        if name:
            keyword_index.setdefault(name.lower(), d)
    return retriever, keyword_index


NAV_VERBS = re.compile(
    r"\b(navigate|route|directions?|guide|take me|show me|where is|where's|where can|"
    r"how (do|can) i (get|reach)|find|nearest|closest|walk|go to|head to|map|"
    r"lost|missed?|need|help|assistance|emergency)\b",
    re.IGNORECASE,
)
NAV_PLACES = re.compile(
    r"\b(gate|terminal|restroom|washroom|toilet|security|lounge|coffee|starbucks|"
    r"cafe|chai|tea|duty[- ]?free|pharmacy|medicine|charger|adapter|power bank|"
    r"electronics|shop|store|food|eat|atm|kiosk|book|toy|burger|"
    r"passport|visa|baggage|luggage|customs|immigration|wheelchair|prayer|"
    r"family|nursing|baby|medical|smoking|currency|exchange|sim|taxi|metro|"
    r"shuttle|hotel|info(rmation)?\s*desk|check.?in|check.?out|"
    r"layover|transfer|connecting|charge|charging|laptop)\b",
    re.IGNORECASE,
)
INFO_ONLY = re.compile(
    r"\b(weather|time|news|joke|story|how are you|who are you|hello|"
    r"hi |hey|thanks|thank you|bye)\b",
    re.IGNORECASE,
)


def _detect_navigation(text: str) -> bool:
    if INFO_ONLY.search(text) and not NAV_VERBS.search(text):
        return False
    return bool(NAV_VERBS.search(text) or NAV_PLACES.search(text))


def _resolve_destination(text: str, routing_index: dict) -> Optional[str]:
    """Resolve the user's query to a graph node id. Order matters:
    FAQ phrases > gate ids > service keywords > shop keywords > zone fallbacks.
    """
    lowered = text.lower()

    # 1. FAQ phrase: substring match OR all-words-present (handles "I lost my
    # passport" matching FAQ phrase "lost passport").
    query_words = set(re.findall(r"\w+", lowered))
    best_faq = None
    best_score = 0
    for phrase, entry in routing_index.get("faq_by_phrase", {}).items():
        if not entry.get("destination"):
            continue
        if phrase in lowered:
            return entry["destination"]
        phrase_words = set(re.findall(r"\w+", phrase))
        if phrase_words and phrase_words.issubset(query_words):
            score = len(phrase_words)
            if score > best_score:
                best_score = score
                best_faq = entry
    if best_faq:
        return best_faq["destination"]

    # 2. Gate id like "Gate B4" or "B4"
    gate_match = re.search(r"\bgate\s*([ab])\s*(\d{1,2})\b", lowered) or re.search(r"\b([ab])(\d{1,2})\b\s*gate", lowered)
    if gate_match:
        return f"Gate_{gate_match.group(1).upper()}{gate_match.group(2)}"

    # 3. Service keywords (longer/more-specific keywords win first)
    for keyword, node_id in sorted(routing_index.get("services_by_keyword", {}).items(), key=lambda kv: -len(kv[0])):
        if keyword and len(keyword) > 3 and keyword in lowered:
            return node_id

    # 4. Shop / food keywords (longer first)
    for keyword, node_id in sorted(routing_index.get("shops_by_keyword", {}).items(), key=lambda kv: -len(kv[0])):
        if keyword and keyword in lowered:
            return node_id

    # 5. Zone / single-word fallbacks
    if any(w in lowered for w in ("restroom", "washroom", "toilet")):
        return "Restrooms_Retail_E"
    if "lounge" in lowered:
        return "Lounge_Premium_E"
    if "immigration" in lowered:
        return "Imm_Hub"
    if "baggage" in lowered or "luggage" in lowered:
        return "Baggage_3"
    if "customs" in lowered:
        return "Customs_Hub"
    if "taxi" in lowered or "rideshare" in lowered:
        return "Taxi_Stand"
    if "charge" in lowered or "charging" in lowered or "laptop" in lowered:
        return "Service_Hub"
    if "wheelchair" in lowered or "assistance" in lowered or "elderly" in lowered:
        return "AccessHelp_W"
    if "layover" in lowered or "transfer" in lowered or "connecting" in lowered:
        return "Service_Hub"
    if "info" in lowered or "help desk" in lowered or "ask" in lowered:
        return "InfoDesk_C"

    return None


app = FastAPI(title="AeroAssist Local LLM Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["ETag"],
)


_state: dict[str, Any] = {
    "llm_cache": {},          # model_name -> Ollama instance (cached)
    "chain_cache": {},        # model_name -> stuff-documents chain (cached)
}


def _get_chain(model_name: Optional[str]):
    """Return (and lazily build) a langchain chain bound to `model_name`.

    Multiple Gemma variants can be live at once because Ollama keeps each
    loaded model in memory until evicted; we just keep one langchain
    document-chain per model so swapping per-request is cheap.
    """
    name = model_name or LLM_MODEL
    if name not in ALLOWED_MODELS:
        # Refuse silently — fall back to the configured default.
        name = LLM_MODEL
    if not (Ollama and create_stuff_documents_chain and PROMPT and shutil.which("ollama")):
        return None
    chain = _state["chain_cache"].get(name)
    if chain is None:
        try:
            llm = _state["llm_cache"].get(name) or Ollama(model=name)
            _state["llm_cache"][name] = llm
            chain = create_stuff_documents_chain(llm, PROMPT)
            _state["chain_cache"][name] = chain
        except Exception:  # noqa: BLE001 - /query will use local fallback text
            return None
    return chain


def _ollama_available() -> bool:
    try:
        with urllib.request.urlopen("http://127.0.0.1:11434/api/tags", timeout=2) as response:
            return response.status == 200
    except (OSError, urllib.error.URLError):
        return False


def _ollama_generate(model_name: str, prompt: str) -> Optional[str]:
    payload = json.dumps({
        "model": model_name,
        "prompt": prompt,
        "stream": False,
    }).encode("utf-8")
    request = urllib.request.Request(
        "http://127.0.0.1:11434/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            body = json.loads(response.read().decode("utf-8"))
            return (body.get("response") or "").strip()
    except (OSError, urllib.error.URLError, json.JSONDecodeError):
        return None


def _build_ollama_prompt(
    req: QueryRequest,
    docs: list[Document],
    stage: str,
    language: str,
    live_data_block: str,
) -> str:
    context = "\n\n".join(doc.page_content for doc in docs[:8])
    return PROMPT_TEMPLATE_TEXT.format(
        input=req.query,
        history=_format_history(req.history),
        stage=stage,
        language=language,
        context=context,
        live_data=live_data_block or "(no live tool calls fired for this query)",
    )


@app.on_event("startup")
def _startup() -> None:
    # Warm the default model and the retriever. Other Gemma variants are
    # loaded lazily on first request.
    _get_chain(LLM_MODEL)
    retriever, keyword_index = _build_retriever()
    if _state.get("rag_mode") == "local_keyword_fallback" and _ollama_available():
        _state["rag_mode"] = "ollama_direct_keyword_retrieval"
    _state["retriever"] = retriever
    _state["keyword_index"] = keyword_index
    _state["routing_index"] = build_routing_index()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model": LLM_MODEL,
        "rag_mode": _state.get("rag_mode", "unknown"),
        "loaded": sorted(_state["llm_cache"].keys()),
        "allowed": sorted(ALLOWED_MODELS),
    }


class LlmSwapRequest(BaseModel):
    model: str


@app.get("/llm")
def llm_get() -> dict[str, Any]:
    """Inspect current default + cached models."""
    return {
        "model": LLM_MODEL,
        "default": DEFAULT_LLM_MODEL,
        "loaded": sorted(_state["llm_cache"].keys()),
        "allowed": sorted(ALLOWED_MODELS),
    }


@app.post("/llm")
def llm_swap(req: LlmSwapRequest) -> dict[str, Any]:
    """Swap the default model at runtime. Per-request overrides via
    `user_context.model` still work regardless of this default.
    """
    global LLM_MODEL
    if req.model not in ALLOWED_MODELS:
        return {"ok": False, "error": "model_not_allowed", "allowed": sorted(ALLOWED_MODELS)}
    # Eagerly build chain so the next /query call has it ready.
    chain = _get_chain(req.model)
    if chain is None:
        return {"ok": False, "error": "ollama_or_langchain_unavailable", "allowed": sorted(ALLOWED_MODELS)}
    LLM_MODEL = req.model
    return {"ok": True, "model": LLM_MODEL, "loaded": sorted(_state["llm_cache"].keys())}


def _format_history(turns: Optional[list[HistoryTurn]]) -> str:
    if not turns:
        return "(no prior turns)"
    lines = []
    for turn in turns[-6:]:
        role = "Passenger" if turn.role == "user" else "AeroAssist"
        # Trim very long assistant turns so the prompt stays compact.
        content = turn.content.strip()
        if len(content) > 320:
            content = content[:320].rstrip() + "..."
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


def _retrieval_query(query: str, turns: Optional[list[HistoryTurn]]) -> str:
    """When the new query is a follow-up like "is it open?", retrieving
    on the bare query misses the entity it refers to. We seed retrieval
    with the last user question AND the last assistant turn (which usually
    name the entity) so the embedding signal points at the right chunks.
    """
    if not turns:
        return query
    last_user = next((t.content for t in reversed(turns) if t.role == "user"), None)
    last_assistant = next((t.content for t in reversed(turns) if t.role == "assistant"), None)
    parts = []
    if last_user:
        parts.append(last_user[:160])
    if last_assistant:
        parts.append(last_assistant[:240])
    parts.append(query)
    return " ".join(parts).strip()


def _fallback_answer(query_text: str, docs: list[Document], executed_tools: list[dict[str, Any]]) -> str:
    """Deterministic answer used when the local LLM stack is not installed."""
    if executed_tools:
        live_data = format_tool_results_for_prompt(executed_tools)
        if live_data:
            compact = " ".join(line.strip() for line in live_data.splitlines()[1:4])
            return f"I checked the live airport data. {compact}"

    best = docs[0] if docs else None
    if not best:
        return "I can run in demo mode, but I could not find that in the airport directory."

    lines = [line.strip() for line in best.page_content.splitlines() if line.strip()]
    answer_line = next((line for line in lines if line.startswith("Answer: ")), None)
    route_line = next((line for line in lines if "Map node id" in line or "Recommended route destination" in line), None)

    if answer_line:
        response = answer_line.replace("Answer: ", "", 1)
    else:
        response = lines[0]
        if len(lines) > 1:
            response += f". {lines[1]}"

    if route_line and "Map node id" not in response:
        response += f" {route_line}"

    if len(response) > 520:
        response = response[:520].rsplit(" ", 1)[0] + "..."
    return response


@app.post("/query", response_model=QueryResponse)
def query(req: QueryRequest) -> QueryResponse:
    user_ctx = req.user_context or {}
    stage = user_ctx.get("current_stage") or "entry"
    language = user_ctx.get("language") or "English"

    # Per-request model override → the frontend can pick a different
    # Gemma variant without restarting the server. Falls back to the
    # current default if the requested tag isn't in ALLOWED_MODELS.
    requested_model = (user_ctx.get("model") or "").strip() or None
    document_chain = _get_chain(requested_model)
    retriever = _state["retriever"]
    routing_index = _state["routing_index"]

    # Two retrieval passes when there's history: one on the rewritten query
    # (captures the follow-up entity), one on the new query alone (captures
    # any new entities). Then dedupe by (kind, id) keeping the first hit.
    primary_docs = retriever.invoke(_retrieval_query(req.query, req.history))
    docs = list(primary_docs)
    if req.history:
        bare_docs = retriever.invoke(req.query)
        seen = {(d.metadata.get("kind"), d.metadata.get("id")) for d in docs}
        for d in bare_docs:
            key = (d.metadata.get("kind"), d.metadata.get("id"))
            if key not in seen:
                docs.append(d)
                seen.add(key)

    # Force-inject any named entity from the conversation history. Embedding
    # similarity drops named entities for short follow-up queries, so a
    # keyword index guarantees the chunk for "Starbucks" / "Apollo Pharmacy"
    # / "Prayer Room" is in front of the LLM whenever they were just discussed.
    keyword_index = _state.get("keyword_index", {})
    if keyword_index and req.history:
        history_blob = " ".join(t.content for t in req.history).lower()
        seen = {(d.metadata.get("kind"), d.metadata.get("id")) for d in docs}
        forced = []
        for name, chunk in keyword_index.items():
            if name in history_blob:
                key = (chunk.metadata.get("kind"), chunk.metadata.get("id"))
                if key not in seen:
                    forced.append(chunk)
                    seen.add(key)
        if forced:
            docs = forced + docs
    docs = docs[:14]

    # MCP-style tool layer: plan tool calls from the query, execute them
    # against the realtime JSON, and inject the results into the LLM prompt.
    tool_plan = plan_tool_calls(req.query)
    executed_tools = execute_tool_calls(tool_plan)
    live_data_block = format_tool_results_for_prompt(executed_tools)

    if document_chain is None:
        requested_name = requested_model if requested_model in ALLOWED_MODELS else LLM_MODEL
        if _ollama_available():
            _state["rag_mode"] = "ollama_direct_keyword_retrieval"
            answer = _ollama_generate(
                requested_name,
                _build_ollama_prompt(req, docs, stage, language, live_data_block),
            )
        else:
            answer = None
        if not answer:
            _state["rag_mode"] = "local_keyword_fallback"
            answer = _fallback_answer(req.query, docs, executed_tools)
    else:
        answer = document_chain.invoke({
            "input": req.query,
            "history": _format_history(req.history),
            "stage": stage,
            "language": language,
            "context": docs,
            "live_data": live_data_block or "(no live tool calls fired for this query)",
        })
    answer = (answer or "").strip()
    retrieved = docs

    sources = [
        {"kind": doc.metadata.get("kind"), "id": doc.metadata.get("id")}
        for doc in retrieved[:6]
    ]

    should_navigate = _detect_navigation(req.query)
    destination = _resolve_destination(req.query, routing_index) if should_navigate else None

    # Two situations count as "the assistant could not help":
    #   (a) the LLM admitted it doesn't have the info, OR
    #   (b) the user asked to be routed somewhere but we couldn't resolve a
    #       map node for it (e.g. "swimming pool" — not in the airport).
    # In both cases attach the helpline pointer (once) and suppress map
    # opening so the UI doesn't pop a route to nowhere.
    answered_text = answer or "I don't have that in the airport directory."
    unresolved_route = should_navigate and not destination
    if (_looks_unanswered(answered_text) or unresolved_route) and HELPLINE_NUMBER not in answered_text:
        answered_text = answered_text.rstrip() + HELPLINE_HINT_EN
    if unresolved_route:
        should_navigate = False

    return QueryResponse(
        response=answered_text,
        should_navigate=should_navigate,
        destination=destination,
        sources=sources,
        tool_calls=tool_call_trace(executed_tools),
        realtime_etag=current_etag(),
    )


USER_STORE_PATH = os.getenv(
    "AEROASSIST_USER_STORE",
    os.path.join(os.path.dirname(__file__), "config", "data", "mock_users.json"),
)


def _read_user_store() -> dict[str, Any]:
    try:
        import json as _json
        with open(USER_STORE_PATH, "r", encoding="utf-8") as fh:
            data = _json.load(fh)
        return data if isinstance(data, dict) else {}
    except (FileNotFoundError, ValueError):
        return {}


def _write_user_store(payload: dict[str, Any]) -> None:
    import json as _json
    os.makedirs(os.path.dirname(USER_STORE_PATH), exist_ok=True)
    with open(USER_STORE_PATH, "w", encoding="utf-8") as fh:
        _json.dump(payload, fh, indent=2, ensure_ascii=False)


class UserPayload(BaseModel):
    user_id: Optional[str] = None
    flight_id: Optional[str] = None
    flight_number: Optional[str] = None
    gate: Optional[str] = None
    boarding_time: Optional[str] = None
    departure_time: Optional[str] = None
    terminal: Optional[str] = None
    seat: Optional[str] = None
    pnr: Optional[str] = None
    passenger: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None  # "form" | "ocr" — useful for debugging
    extras: Optional[dict[str, Any]] = None


@app.get("/user")
def user_get() -> dict[str, Any]:
    return _read_user_store()


@app.post("/user")
def user_post(payload: UserPayload) -> dict[str, Any]:
    """Merge submitted fields into the user store on disk.

    The frontend onboarding form and the boarding-pass OCR both call this so
    the persisted record reflects whichever source filled the field most
    recently. We merge instead of overwriting so a partial OCR pass (which
    may not capture every field) does not blank out values the user already
    typed.
    """
    from datetime import datetime, timezone

    current = _read_user_store()
    incoming = {k: v for k, v in payload.dict().items() if v not in (None, "")}
    extras = incoming.pop("extras", None)
    merged = {**current, **incoming}
    if extras:
        merged_extras = {**(current.get("extras") or {}), **extras}
        merged["extras"] = merged_extras
    merged.setdefault("user_id", payload.user_id or current.get("user_id") or "traveler_001")
    if "created_at" not in merged:
        merged["created_at"] = datetime.now(timezone.utc).isoformat()
    merged["updated_at"] = datetime.now(timezone.utc).isoformat()
    _write_user_store(merged)
    return {"ok": True, "user": merged}


@app.get("/realtime")
def realtime(request: Request, response: Response) -> Any:
    """Return the full realtime snapshot. Browsers / the React frontend poll
    this every few seconds; the ETag header lets them skip the body when
    nothing has changed (the response is still fast since we read by mtime).
    """
    snapshot = get_full_snapshot()
    etag = current_etag()
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "no-store"

    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag, "Cache-Control": "no-store"})

    return {"etag": etag, "snapshot": snapshot}


@app.get("/realtime/tools")
def list_tools() -> dict[str, Any]:
    """Expose the tool catalog so an MCP-style client (or a curious user)
    can see what the agent can do. Schemas are intentionally lightweight.
    """
    return {
        "tools": [
            {"name": "get_all_flights", "args": {}, "description": "Full live flight board."},
            {"name": "get_flight_status", "args": {"flight_number": "string"}, "description": "Status of a single flight by number, e.g. AI203."},
            {"name": "get_gate_status", "args": {"gate": "string"}, "description": "Flights currently at a gate, e.g. B4."},
            {"name": "find_flights_to", "args": {"city_or_code": "string"}, "description": "Flights heading to a destination city or IATA code."},
            {"name": "get_security_wait", "args": {}, "description": "Live wait minutes per security checkpoint."},
            {"name": "get_immigration_wait", "args": {}, "description": "Live wait minutes per immigration counter."},
            {"name": "get_shop_wait", "args": {}, "description": "Live wait / queue state per retail shop."},
        ]
    }
