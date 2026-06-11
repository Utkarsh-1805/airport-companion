"""Prompt engineering and context compression for efficient inference."""

import re
from typing import List, Dict, Any

from config.settings import (
    SYSTEM_PROMPT_BASE,
    URGENCY_BOARDING_THRESHOLD_MIN,
    SESSION_MEMORY_TURNS,
)


# ---------------------------------------------------------------------------
# Post-processing: clean LLM output before it reaches TTS
# ---------------------------------------------------------------------------

# Regex to strip all emoji / non-BMP unicode (covers emoji, symbols, pictographs)
_EMOJI_RE = re.compile(
    r"["
    r"\U0001F600-\U0001F64F"  # emoticons
    r"\U0001F300-\U0001F5FF"  # symbols & pictographs
    r"\U0001F680-\U0001F6FF"  # transport & map
    r"\U0001F1E0-\U0001F1FF"  # flags
    r"\U00002700-\U000027BF"  # dingbats
    r"\U0000FE00-\U0000FE0F"  # variation selectors
    r"\U00002600-\U000026FF"  # misc symbols
    r"\U0001FA00-\U0001FA6F"  # chess pieces / others
    r"\U0001FA70-\U0001FAFF"
    r"\U000023E9-\U000023F3"  # fast buttons
    r"\U000025AA-\U000025FE"  # geometric shapes
    r"\U00002B05-\U00002B07"  # arrows
    r"\U00002B1B-\U00002B1C"  # squares
    r"\U00002B50"             # star
    r"\U00002B55"             # circle
    r"]+",
    flags=re.UNICODE,
)

# Markdown patterns (bold, italic, headers, bullet dashes, code blocks)
_MARKDOWN_RE = re.compile(r"(\*{1,2}|_{1,2}|`{1,3}|#{1,6}\s|>\s|\-\s{1,2}(?=\w))")

# Generic chatbot filler phrases — replace with empty string
_FILLER_PHRASES = [
    r"I'?d be happy to (help|assist)[.!]?",
    r"That sounds like a (great|fun|wonderful) idea[.!]?",
    r"(Anything|Is there anything) else I can help you with[?.]?",
    r"(Of course|Absolutely|Sure)[,!.]? (I'?d be happy to|let me)[^.]*[.]?",
    r"Great (question|choice)[.!]?",
    r"Would you like (something to eat|to hear more)[?.]?",
    r"(Let me know|Tell me) if (you need|there (are|is))[^.?!]*[.?!]?",
    r"What can I help you with next[?.]?",
    r"Let's go[.!]?",
    r"I'?m (here|glad) to help[.!]?",
    r"No problem[.!]?",
    r"You got this[.!]?",
]
_FILLER_RE = re.compile(
    "|".join(_FILLER_PHRASES),
    flags=re.IGNORECASE,
)


def clean_for_tts(text: str) -> str:
    """
    Strip emojis, markdown, and generic chatbot filler from LLM output
    so that Kokoro TTS reads clean, professional speech.
    """
    text = _EMOJI_RE.sub("", text)
    text = _MARKDOWN_RE.sub("", text)
    text = _FILLER_RE.sub("", text)
    # Collapse multiple spaces / blank lines
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


# ---------------------------------------------------------------------------
# PromptComposer — builds structured prompts for each inference call
# ---------------------------------------------------------------------------

class PromptComposer:
    """Composes optimized prompts with compressed context."""

    @staticmethod
    def build_system_prompt(user_context: Dict[str, Any] = None) -> str:
        """
        Build the full system prompt by injecting live traveler context
        into the base operational prompt.

        Args:
            user_context: User session data (flight, gate, boarding time, time_remaining_min)

        Returns:
            Complete system prompt string
        """
        sections = [SYSTEM_PROMPT_BASE, ""]

        # --- Traveler Context Block ---
        if user_context:
            gate = user_context.get("gate", "Unknown")
            flight = user_context.get("flight_id", "Unknown")
            boarding = user_context.get("boarding_time", "Unknown")
            mins = user_context.get("time_remaining_min", "?")
            status = user_context.get("status", "Unknown")

            sections.append("TRAVELER CONTEXT:")
            sections.append(f"  Flight: {flight} | Gate: {gate} | Boarding: {boarding} | Status: {status}")
            sections.append(f"  Time until boarding: ~{mins} minutes")

            if isinstance(mins, int) and mins < URGENCY_BOARDING_THRESHOLD_MIN:
                sections.append(
                    f"  URGENT: Only {mins} minutes to boarding. "
                    "Prioritize getting the traveler to the gate. "
                    "Only suggest facilities within 3 minutes walking."
                )
        else:
            sections.append("TRAVELER CONTEXT: Not available.")

        return "\n".join(sections)

    @staticmethod
    def compress_context(
        retrieved_documents: List[Dict[str, Any]],
        max_chars: int = 1200,
    ) -> str:
        """
        Compress retrieved facility documents into a lean, LLM-readable context block.

        Each facility is rendered as a single line:
          <Name> | <Category> | <Distance>m (~<Walk>min) | Services: <s1>, <s2>

        Args:
            retrieved_documents: Retrieved facilities sorted by combined score
            max_chars: Hard character cap for the entire context block

        Returns:
            Compressed context string
        """
        if not retrieved_documents:
            return "Retrieved Facilities: None found for this query."

        lines = ["Retrieved Facilities:"]
        total = len(lines[0])

        for doc in retrieved_documents[:6]:
            name = doc.get("name", "Unknown")
            category = doc.get("category", "")
            dist_m = doc.get("distance_m")
            walk_sec = doc.get("walking_time_sec")
            services = doc.get("services", [])

            # Build distance string
            if dist_m is not None and dist_m > 0:
                walk_min = max(1, round(walk_sec / 60)) if walk_sec else "?"
                dist_str = f"distance {int(dist_m)} meters; walking time about {walk_min} minute"
            else:
                dist_str = "distance unknown"

            svc_str = ", ".join(services[:3]) if services else "N/A"
            line = f"\n- {name} | {category} | {dist_str} | Services: {svc_str}"

            if total + len(line) > max_chars:
                break

            lines.append(line)
            total += len(line)

        return "".join(lines)

    @staticmethod
    def build_conversation_history(turns: List[Dict[str, str]]) -> str:
        """
        Render the last N conversation turns into a compact history block.

        Args:
            turns: List of {"role": "user"|"assistant", "text": "..."} dicts

        Returns:
            Formatted history string for prompt injection
        """
        if not turns:
            return ""
        lines = ["Recent conversation:"]
        for turn in turns[-SESSION_MEMORY_TURNS:]:
            prefix = "Traveler" if turn["role"] == "user" else "AeroAssist"
            lines.append(f"  {prefix}: {turn['text']}")
        return "\n".join(lines)

    @staticmethod
    def build_user_query(
        user_input: str,
        retrieved_context: str,
        user_context: Dict[str, Any] = None,
        conversation_history: str = "",
        intent: str = "",
    ) -> str:
        """
        Build the final user-turn message that goes to the LLM.

        Args:
            user_input: Raw transcribed user speech
            retrieved_context: Compressed facility context
            user_context: Session data
            conversation_history: Recent turns for continuity
            intent: Detected intent label (for urgency escalation)

        Returns:
            Fully assembled user message
        """
        parts = []

        if conversation_history:
            parts.append(conversation_history)
            parts.append("")

        parts.append(retrieved_context)
        parts.append("")

        # Urgency escalation appended inline
        mins = user_context.get("time_remaining_min", 999) if user_context else 999
        if isinstance(mins, int) and mins < URGENCY_BOARDING_THRESHOLD_MIN:
            parts.append(
                f"[URGENT: Traveler has only {mins} min until boarding. "
                "Give gate directions first, then any other info.]"
            )

        parts.append(f"Traveler: {user_input}")

        return "\n".join(parts)


# ---------------------------------------------------------------------------
# PromptCache — avoids rebuilding system prompts on every turn
# ---------------------------------------------------------------------------

class PromptCache:
    """
    In-memory cache for system prompts.

    The cache key encodes gate + boarding_time + urgency so the cache
    is invalidated when context changes materially (e.g. urgency flips).
    """

    def __init__(self):
        self._cache: Dict[str, str] = {}

    def _make_key(self, user_id: str, user_context: Dict[str, Any]) -> str:
        mins = user_context.get("time_remaining_min", 0) if user_context else 0
        urgency = "urgent" if isinstance(mins, int) and mins < URGENCY_BOARDING_THRESHOLD_MIN else "normal"
        gate = user_context.get("gate", "") if user_context else ""
        return f"{user_id}:{gate}:{urgency}"

    def get_system_prompt(self, user_id: str, user_context: Dict[str, Any]) -> str:
        """Get or build a cached system prompt for this user/context combination."""
        key = self._make_key(user_id, user_context)

        if key not in self._cache:
            prompt = PromptComposer.build_system_prompt(user_context)
            self._cache[key] = prompt
        else:
            print("[Cache] System prompt cache hit")

        return self._cache[key]

    def invalidate(self, user_id: str = None):
        """Invalidate cache for a user, or clear all."""
        if user_id:
            keys_to_del = [k for k in self._cache if k.startswith(f"{user_id}:")]
            for k in keys_to_del:
                del self._cache[k]
        else:
            self._cache.clear()
