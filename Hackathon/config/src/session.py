"""User session and context management with short-term conversational memory."""

import time as time_module
from collections import deque
from datetime import datetime
from typing import Dict, Any, List, Deque

from config.settings import SESSION_MEMORY_TURNS, SESSION_IDLE_EXPIRY_SEC


class SessionManager:
    """
    Manages user session data, conversational memory, and context.

    Design decisions:
    - Each session stores static traveler data (flight, gate, boarding time)
      and a rolling window of the last SESSION_MEMORY_TURNS conversation turns.
    - If a session has been idle for SESSION_IDLE_EXPIRY_SEC seconds, the
      conversation history is wiped but the static traveler data is preserved.
      This prevents stale context from confusing the model after long pauses.
    """

    def __init__(self):
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._histories: Dict[str, Deque[Dict[str, str]]] = {}

    # ------------------------------------------------------------------
    # Session lifecycle
    # ------------------------------------------------------------------

    def create_session(self, user_data: Dict[str, Any]) -> str:
        """
        Create or refresh a user session with boarding-pass data.

        Args:
            user_data: Must contain 'user_id'. Optionally flight_id, gate,
                       boarding_time, status.

        Returns:
            user_id string
        """
        user_id = user_data.get("user_id", "anonymous")
        now = time_module.time()

        if user_id not in self._sessions:
            self._sessions[user_id] = {}
            self._histories[user_id] = deque(maxlen=SESSION_MEMORY_TURNS)
            print(f"[Session] Created session for {user_id}")
        else:
            # Refresh last-activity but do NOT wipe static data
            self._sessions[user_id]["last_activity"] = now

        self._sessions[user_id].update(
            {
                **user_data,
                "created_at": self._sessions[user_id].get(
                    "created_at", datetime.now().isoformat()
                ),
                "last_activity": now,
            }
        )
        return user_id

    def close_session(self, user_id: str):
        """Fully remove a session (e.g. traveler has boarded)."""
        self._sessions.pop(user_id, None)
        self._histories.pop(user_id, None)
        print(f"[Session] Closed session for {user_id}")

    def update_session(self, user_id: str, updates: Dict[str, Any]):
        """Apply partial updates to an existing session (e.g. gate change)."""
        if user_id in self._sessions:
            self._sessions[user_id].update(updates)
            self._sessions[user_id]["last_activity"] = time_module.time()

    # ------------------------------------------------------------------
    # Conversational memory
    # ------------------------------------------------------------------

    def add_turn(self, user_id: str, role: str, text: str):
        """
        Append a single conversation turn to the session memory.

        Args:
            user_id: Session identifier
            role: "user" or "assistant"
            text: The spoken/generated text for this turn
        """
        if user_id not in self._histories:
            self._histories[user_id] = deque(maxlen=SESSION_MEMORY_TURNS)

        # Check idle expiry before adding
        self._maybe_expire_history(user_id)

        self._histories[user_id].append({"role": role, "text": text})
        if user_id in self._sessions:
            self._sessions[user_id]["last_activity"] = time_module.time()

    def get_history(self, user_id: str) -> List[Dict[str, str]]:
        """Return the current conversation history for a user."""
        self._maybe_expire_history(user_id)
        return list(self._histories.get(user_id, []))

    def _maybe_expire_history(self, user_id: str):
        """
        If the session has been idle for SESSION_IDLE_EXPIRY_SEC seconds,
        wipe the conversation history so stale turns don't pollute the next query.
        Static traveler data (gate, flight, etc.) is preserved.
        """
        session = self._sessions.get(user_id)
        if not session:
            return
        elapsed = time_module.time() - session.get("last_activity", time_module.time())
        if elapsed > SESSION_IDLE_EXPIRY_SEC:
            if user_id in self._histories:
                self._histories[user_id].clear()
            print(f"[Session] History expired for {user_id} after {elapsed:.0f}s idle")

    # ------------------------------------------------------------------
    # Context retrieval
    # ------------------------------------------------------------------

    def get_session(self, user_id: str) -> Dict[str, Any]:
        """Get raw session data."""
        return self._sessions.get(user_id, {})

    def get_time_remaining_minutes(self, user_id: str) -> int:
        """Calculate minutes remaining until boarding based on wall-clock time."""
        session = self._sessions.get(user_id)
        if not session:
            return 999

        boarding_time_str = session.get("boarding_time", "")
        if not boarding_time_str:
            return 999

        try:
            h, m = map(int, boarding_time_str.split(":"))
            boarding_seconds = h * 3600 + m * 60
            now = datetime.now()
            current_seconds = now.hour * 3600 + now.minute * 60 + now.second
            remaining_seconds = boarding_seconds - current_seconds
            if remaining_seconds < 0:
                remaining_seconds += 24 * 3600
            return max(0, remaining_seconds // 60)
        except Exception as e:
            print(f"[Session] Error parsing boarding time: {e}")
            return 999

    def get_enhanced_context(self, user_id: str) -> Dict[str, Any]:
        """
        Return session data enriched with calculated time_remaining_min.
        This is the primary context dict consumed by PromptComposer and RAG.
        """
        session = self._sessions.get(user_id, {})
        enhanced = session.copy()
        enhanced["time_remaining_min"] = self.get_time_remaining_minutes(user_id)
        return enhanced

    def list_active_sessions(self) -> List[str]:
        """Return all active user IDs."""
        return list(self._sessions.keys())
