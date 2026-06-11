"""Main RAG orchestrator — Intent routing, retrieval, memory, and generation."""

import re
import time
from typing import Dict, Any, List, Iterator

from src.retrieval import HybridRetrieval
from src.generation import OllamaGenerator
from src.prompt_engine import PromptComposer, PromptCache, clean_for_tts
from src.session import SessionManager
from config.settings import (
    MAX_RETRIEVAL_TIME,
    MAX_GENERATION_TIME,
    URGENCY_BOARDING_THRESHOLD_MIN,
    INTENT_CATEGORY_MAP,
)


# ---------------------------------------------------------------------------
# Intent Router
# ---------------------------------------------------------------------------

class IntentRouter:
    """
    Lightweight rule-based intent classifier that runs BEFORE any LLM call.

    Intents:
      navigation      — gate/terminal/direction questions
      food            — restaurants, cafes, eat, drink, coffee, snack
      shopping        — stores, buy, retail, bookstore, news
      restroom        — toilet, washroom, bathroom, WC
      lounge          — lounge, relax, sit, rest
      pharmacy        — medicine, pharmacy, headache, aspirin
      atm             — ATM, cash, money, exchange
      spa             — spa, massage, manicure
      entertainment   — kids, play area, children
      boarding        — board, gate, check-in, seat, departure
      baggage         — luggage, bag, lost, claim, carousel
      flight_status   — delayed, on time, status, cancelled
      urgency         — late, hurry, miss, emergency, help, lost
      chitchat        — hi, hello, how are you, thanks, ok (non-task)
      ambiguous       — unclear / falls through all patterns
    """

    # Each intent maps to a list of keyword regexes (any match = that intent)
    _PATTERNS: Dict[str, List[str]] = {
        "urgency": [
            r"\b(late|hurry|hurrying|rush|miss(ing)?|emergency|sos|panic)\b",
            r"\bgoing to miss\b",
            r"\bi('m| am) (lost|confused|stuck)\b",  # 'I am lost' — not 'I lost my bag'
            r"\bcan'?t find my (gate|flight|terminal)\b",
        ],
        "boarding": [
            r"\b(board(ing)?|departure|departing|depart|gate|check.?in|seat|plane)\b",
            r"\bwhere('s| is) my gate\b",
            r"\bhow (long|far|much time).*(gate|board)\b",
        ],
        "navigation": [
            r"\b(where|how do i get|direction|navigate|find|walk|located)\b",
            r"\bhow far\b",
            r"\bwhich way\b",
            r"\b(kahan|kidhar|kahaan|bata|dikhao|dikhado|rasta|raasta|direction)\b",
        ],
        "food": [
            r"\b(eat|food|hungry|restaurant|cafe|coffee|snack|drink|meal|lunch|breakfast|dinner|bite|beverage|sandwich)\b",
            r"\b(chai|tea|peene|pina|peena|khana|khaana|bhookh|nashta)\b",
        ],
        "shopping": [
            r"\b(shop|store|buy|retail|news(stand)?|book|magazine|souvenir|duty.?free|tax.?free|zara|apple)\b",
            r"\b(charger|charging cable|adapter|power.?bank|headphones?|earbuds?|electronics?|tech)\b",
            r"\b(hoodie|scarf|fashion|clothing|accessor(y|ies))\b",
            r"\b(kharid|khareed|shopping|dukan|dukaan)\b",
        ],
        "restroom": [
            r"\b(toilet|restroom|bathroom|washroom|loo|wc|lavatory|powder room)\b",
        ],
        "lounge": [
            r"\b(lounge|relax|sit|rest|quiet|seating|comfortable|wait)\b",
            r"\b(business trip|business|work|meeting|refreshments?|wifi|wi-fi|charge|charging|kya kya kar)\b",
        ],
        "pharmacy": [
            r"\b(pharmacy|medicine|drug|headache|aspirin|painkiller|paracetamol|boots|chemist)\b",
        ],
        "atm": [
            r"\b(atm|cash|money|currency|exchange|withdrawal)\b",
            r"\bbank(ing)? (counter|service|desk)\b",
        ],
        "spa": [
            r"\b(spa|massage|manicure|pedicure|facial|wellness|xpress)\b",
        ],
        "entertainment": [
            r"\b(kids?|children|play|playground|entertain)\b",
        ],
        "baggage": [
            r"\b(baggage|luggage|bag|suitcase|claim|carousel|lost.?luggage|lost.?bag)\b",
        ],
        "flight_status": [
            r"\b(delay|delayed|cancel(led)?|on.?time|flight.?status|status of)\b",
        ],
        "chitchat": [
            r"^(hi|hello|hey|good (morning|afternoon|evening))[\s\w!.?]*$",
            r"^(how are you|thanks|thank you|okay|ok|sure|bye|goodbye)[.!?]?$",
            r"\b(you('re| are) (great|helpful|awesome|good))\b",
        ],
    }

    _COMPILED: Dict[str, List[re.Pattern]] = {}

    def __init__(self):
        if not self._COMPILED:
            for intent, patterns in self._PATTERNS.items():
                self.__class__._COMPILED[intent] = [
                    re.compile(p, re.IGNORECASE) for p in patterns
                ]

    def classify(self, text: str) -> str:
        """
        Return the most specific intent label for the given text.
        Falls back to 'ambiguous' if nothing matches.
        """
        stripped = text.strip().lower()

        # Priority order matters — urgency/distress first
        for intent in [
            "urgency", "restroom", "pharmacy", "atm", "baggage",
            "flight_status", "spa", "entertainment", "food",
            "shopping", "lounge", "boarding", "navigation", "chitchat",
        ]:
            compiled_list = self._COMPILED.get(intent, [])
            for pattern in compiled_list:
                if pattern.search(stripped):
                    return intent

        return "ambiguous"

    @staticmethod
    def requires_rag(intent: str) -> bool:
        """Intents that need facility retrieval from the vector DB."""
        return intent in {
            "food", "shopping", "restroom", "lounge", "pharmacy",
            "atm", "spa", "entertainment", "navigation",
        }

    @staticmethod
    def get_category_filter(intent: str) -> List[str]:
        """Return the list of facility categories to filter for this intent (may be empty)."""
        return INTENT_CATEGORY_MAP.get(intent, [])

    @staticmethod
    def handle_no_rag(intent: str, user_context: Dict[str, Any]) -> str:
        """
        Generate a deterministic response for intents that don't need RAG.
        Returns empty string if the intent still needs an LLM answer.
        """
        gate = user_context.get("gate", "your gate")
        mins = user_context.get("time_remaining_min", "?")

        if intent == "urgency":
            return (
                f"Head to gate {gate} immediately — you have approximately {mins} minutes. "
                "Follow the overhead signs or ask any airport staff in a yellow vest."
            )
        if intent == "boarding":
            return f"Your gate is {gate}. You have {mins} minutes until boarding."
        if intent == "baggage":
            return (
                "For lost or delayed baggage, go to the Baggage Services desk near the arrivals hall. "
                "For carry-on questions, please check with your airline gate agent."
            )
        if intent == "flight_status":
            return (
                "For real-time flight status, check the overhead departure boards "
                "or your airline's app."
            )
        if intent == "chitchat":
            return f"I am an automated airport assistant. How can I help you find your way today?"

        # Needs LLM
        return ""


# ---------------------------------------------------------------------------
# Query Rewriting
# ---------------------------------------------------------------------------

_REWRITE_MAP = [
    (re.compile(r"\bsomewhere to (sit|rest|chill|relax|wait)\b", re.I),
     "lounge seating rest area waiting area"),
    (re.compile(r"\bsomething to (eat|drink|munch on|snack)\b", re.I),
     "restaurant cafe food snack"),
    (re.compile(r"\buse the (bathroom|toilet|loo)\b", re.I),
     "restroom washroom toilet"),
    (re.compile(r"\bquick bite\b", re.I), "fast food cafe snack"),
    (re.compile(r"\bsome cash\b", re.I), "ATM cash withdrawal"),
    (re.compile(r"\b(grab|get) (coffee|tea)\b", re.I), "cafe coffee beverages"),
    (re.compile(r"\b(chai|tea|peene|pina|peena)\b", re.I),
     "cafe chai tea coffee beverages BrewHub"),
    (re.compile(r"\bduty.?free\b", re.I),
     "Mumbai Duty Free tax free perfume liquor chocolate cosmetics retail"),
    (re.compile(r"\b(business trip|business|work trip|meeting)\b", re.I),
     "business lounge wifi charging refreshments seating quiet work"),
]


def rewrite_query(text: str) -> str:
    """Expand colloquial phrases to richer search terms for better embedding retrieval."""
    for pattern, replacement in _REWRITE_MAP:
        if pattern.search(text):
            return text + " " + replacement
    return text


# ---------------------------------------------------------------------------
# Main RAG Orchestrator
# ---------------------------------------------------------------------------

class AeroAssistRAG:
    """Complete RAG pipeline for airport assistance."""

    def __init__(self):
        print("\n" + "=" * 50)
        print("Initializing AeroAssist RAG System")
        print("=" * 50 + "\n")

        start = time.time()

        self.retrieval = HybridRetrieval()
        self.generator = OllamaGenerator()
        self.session_manager = SessionManager()
        self.prompt_cache = PromptCache()
        self.intent_router = IntentRouter()

        elapsed = time.time() - start
        print(f"[AeroAssist] System initialized in {elapsed:.2f}s\n")

    def load_facilities(self, facilities: List[Dict[str, Any]]):
        """Load airport facilities into the vector DB and BM25 index."""
        self.retrieval.index_facilities(facilities)

    def process_query(
        self,
        user_id: str,
        query: str,
        user_data: Dict[str, Any] = None,
        include_user_docs: bool = False,
    ) -> Dict[str, Any]:
        """
        End-to-end non-streaming RAG query processing.

        Returns a response dict with 'response', 'intent', and 'performance'.
        """
        start_total = time.time()

        # Session
        if user_data:
            self.session_manager.create_session({**user_data, "user_id": user_id})
        user_context = self.session_manager.get_enhanced_context(user_id)

        # Intent
        intent = self.intent_router.classify(query)
        print(f"[Intent] Detected: {intent}")

        # Fast-path: deterministic answer (no RAG needed)
        fast_answer = self.intent_router.handle_no_rag(intent, user_context)
        if fast_answer:
            self.session_manager.add_turn(user_id, "user", query)
            self.session_manager.add_turn(user_id, "assistant", fast_answer)
            total_time = time.time() - start_total
            return {
                "status": "success",
                "query": query,
                "response": fast_answer,
                "intent": intent,
                "retrieved_facilities": [],
                "performance": {
                    "retrieval_ms": 0.0,
                    "generation_ms": 0.0,
                    "total_ms": round(total_time * 1000, 1),
                    "meets_latency": {
                        "retrieval": True,
                        "total": total_time < MAX_GENERATION_TIME,
                    },
                },
                "user_context": {
                    "flight_id": user_context.get("flight_id"),
                    "gate": user_context.get("gate"),
                    "boarding_time": user_context.get("boarding_time"),
                    "time_remaining_min": user_context.get("time_remaining_min", 0),
                },
            }

        # Retrieval
        start_retrieval = time.time()
        rewritten_query = rewrite_query(query)
        category_filter = self.intent_router.get_category_filter(intent)
        user_gate = user_context.get("gate", "A1")
        retrieved_facilities = self.retrieval.retrieve(
            rewritten_query,
            user_gate=user_gate,
            top_k=5,
            include_user_docs=include_user_docs,
            category_filter=category_filter,
            time_remaining_min=user_context.get("time_remaining_min", 999),
        )
        retrieval_time = time.time() - start_retrieval

        # Prompts
        system_prompt = self.prompt_cache.get_system_prompt(user_id, user_context)
        context_compressed = PromptComposer.compress_context(retrieved_facilities)
        history = self.session_manager.get_history(user_id)
        history_str = PromptComposer.build_conversation_history(history)
        final_query = PromptComposer.build_user_query(
            query, context_compressed, user_context, history_str, intent
        )

        # Generation
        start_generation = time.time()
        raw_response = self.generator.generate(
            system_prompt=system_prompt,
            user_message=final_query,
            max_tokens=80,
        )
        generation_time = time.time() - start_generation
        response = clean_for_tts(raw_response)

        # Memory
        self.session_manager.add_turn(user_id, "user", query)
        self.session_manager.add_turn(user_id, "assistant", response)

        total_time = time.time() - start_total
        return {
            "status": "success",
            "query": query,
            "response": response,
            "intent": intent,
            "retrieved_facilities": [
                {"id": f["id"], "name": f["name"], "category": f["category"],
                 "distance_m": f.get("distance_m", 0),
                 "walking_time_sec": f.get("walking_time_sec", 0),
                 "services": f.get("services", [])}
                for f in retrieved_facilities
            ],
            "performance": {
                "retrieval_ms": round(retrieval_time * 1000, 1),
                "generation_ms": round(generation_time * 1000, 1),
                "total_ms": round(total_time * 1000, 1),
                "meets_latency": {
                    "retrieval": retrieval_time < MAX_RETRIEVAL_TIME,
                    "total": total_time < MAX_GENERATION_TIME,
                },
            },
            "user_context": {
                "flight_id": user_context.get("flight_id"),
                "gate": user_context.get("gate"),
                "boarding_time": user_context.get("boarding_time"),
                "time_remaining_min": user_context.get("time_remaining_min", 0),
            },
        }

    def stream_response(
        self,
        user_id: str,
        query: str,
        user_data: Dict[str, Any] = None,
        include_user_docs: bool = False,
    ) -> Iterator[str]:
        """
        Stream response tokens for real-time TTS chunking.

        Yields clean text chunks (emoji/markdown stripped).
        Fast-path intents yield a single chunk without hitting the LLM.
        """
        if user_data:
            self.session_manager.create_session({**user_data, "user_id": user_id})
        user_context = self.session_manager.get_enhanced_context(user_id)

        # Intent routing
        intent = self.intent_router.classify(query)
        print(f"[Intent] Detected: {intent}")

        # Fast-path
        fast_answer = self.intent_router.handle_no_rag(intent, user_context)
        if fast_answer:
            self.session_manager.add_turn(user_id, "user", query)
            self.session_manager.add_turn(user_id, "assistant", fast_answer)
            yield fast_answer
            return

        # Retrieval with intent-aware filtering
        rewritten_query = rewrite_query(query)
        category_filter = self.intent_router.get_category_filter(intent)
        user_gate = user_context.get("gate", "A1")
        retrieved_facilities = self.retrieval.retrieve(
            rewritten_query,
            user_gate=user_gate,
            category_filter=category_filter,
            time_remaining_min=user_context.get("time_remaining_min", 999),
            include_user_docs=include_user_docs,
        )

        # Build prompts
        system_prompt = self.prompt_cache.get_system_prompt(user_id, user_context)
        context_compressed = PromptComposer.compress_context(retrieved_facilities)
        history = self.session_manager.get_history(user_id)
        history_str = PromptComposer.build_conversation_history(history)
        final_query = PromptComposer.build_user_query(
            query, context_compressed, user_context, history_str, intent
        )

        # Stream generation — yield raw tokens, let pipeline handle TTS cleaning
        # IMPORTANT: Do NOT call clean_for_tts on individual tokens here.
        # Tokens include leading whitespace (e.g. " Have") that gets stripped,
        # producing run-on text like "HaveapleasantjourneyonAI101".
        # Cleaning happens at the sentence level in enqueue_tts().
        full_response_parts = []
        for chunk in self.generator.generate_streaming(
            system_prompt=system_prompt,
            user_message=final_query,
            max_tokens=80,
        ):
            if chunk:
                full_response_parts.append(chunk)
                yield chunk

        # Store cleaned full response in session memory
        full_response = clean_for_tts("".join(full_response_parts))
        self.session_manager.add_turn(user_id, "user", query)
        self.session_manager.add_turn(user_id, "assistant", full_response)
