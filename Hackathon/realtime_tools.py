"""MCP-style realtime tool layer for AeroAssist.

The single source of truth is `data/flight-realtime.json`. Each tool reads the
file fresh (cached by mtime) so editing the JSON is enough to drive a live
demo - no server restart, no cache busting.

Tools exposed to the agent:
    get_all_flights()          -> full flight board
    get_flight_status(number)  -> single flight by number
    find_flights_to(city)      -> flights matching a destination city or IATA
    get_gate_status(gate)      -> what is happening at a gate right now
    get_security_wait()        -> all security checkpoint waits
    get_immigration_wait()     -> all immigration counter waits
    get_shop_wait()            -> all retail wait times

The /query endpoint inspects the user query and calls the relevant tool(s).
Results are injected into the RAG context AND returned as a `tool_calls` trace
so the UI can render an MCP-style "the agent called X" hint.
"""

from __future__ import annotations

import json
import os
import re
import threading
from pathlib import Path
from typing import Any, Optional

REALTIME_PATH = Path(__file__).parent / "data" / "flight-realtime.json"

_state_lock = threading.Lock()
_cached: dict[str, Any] = {"mtime": 0.0, "snapshot": None, "etag": ""}


def _load_snapshot() -> dict[str, Any]:
    """Read the realtime JSON, refreshing the cache when the file's mtime
    advances. Always returns a dict; on parse error returns a minimal stub.
    """
    try:
        mtime = REALTIME_PATH.stat().st_mtime
    except FileNotFoundError:
        return {"flights": [], "security_wait": [], "immigration_wait": [], "shop_wait": []}

    with _state_lock:
        if _cached["snapshot"] is None or mtime > _cached["mtime"]:
            try:
                with REALTIME_PATH.open("r", encoding="utf-8") as fh:
                    snapshot = json.load(fh)
            except json.JSONDecodeError:
                snapshot = _cached["snapshot"] or {
                    "flights": [], "security_wait": [], "immigration_wait": [], "shop_wait": []
                }
            _cached["snapshot"] = snapshot
            _cached["mtime"] = mtime
            _cached["etag"] = f'"rt-{int(mtime * 1000)}"'
        return _cached["snapshot"]


def current_etag() -> str:
    _load_snapshot()
    return _cached["etag"]


def get_full_snapshot() -> dict[str, Any]:
    return _load_snapshot()


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def get_all_flights() -> list[dict[str, Any]]:
    return list(_load_snapshot().get("flights", []))


def get_flight_status(flight_number: str) -> Optional[dict[str, Any]]:
    target = (flight_number or "").upper().replace(" ", "")
    for flight in get_all_flights():
        if flight.get("number", "").upper() == target:
            return flight
    return None


def find_flights_to(city_or_code: str) -> list[dict[str, Any]]:
    needle = (city_or_code or "").lower().strip()
    if not needle:
        return []
    matches = []
    for flight in get_all_flights():
        if needle in flight.get("destination_city", "").lower() or needle == flight.get("destination_code", "").lower():
            matches.append(flight)
    return matches


def get_gate_status(gate: str) -> list[dict[str, Any]]:
    target = (gate or "").upper().replace("GATE", "").replace("_", "").strip()
    return [f for f in get_all_flights() if f.get("gate", "").upper() == target]


def get_security_wait() -> list[dict[str, Any]]:
    return list(_load_snapshot().get("security_wait", []))


def get_immigration_wait() -> list[dict[str, Any]]:
    return list(_load_snapshot().get("immigration_wait", []))


def get_shop_wait() -> list[dict[str, Any]]:
    return list(_load_snapshot().get("shop_wait", []))


# ---------------------------------------------------------------------------
# Agent-side: decide which tools to call for a given query
# ---------------------------------------------------------------------------

# Regex hints that route a user query to one or more tools. Tuned for the
# kinds of things passengers actually ask. The "agent" prompt is told the
# realtime snapshot is its source of truth for these categories, so when one
# of these patterns matches we run the tool, attach its output, and let the
# LLM phrase the answer.
_FLIGHT_NUMBER_RE = re.compile(r"\b([A-Z0-9]{2}\d{2,4}|\d[A-Z]\d{2,4})\b", re.IGNORECASE)
_GATE_RE = re.compile(r"\bgate\s*([ab]\s*\d{1,2})\b", re.IGNORECASE)
_FLIGHT_TOPIC_RE = re.compile(
    r"\b(flights?|board(?:ing)?|depart(?:ure|ing|ures)?|delay(?:ed|s)?|on[- ]?time|"
    r"final\s*call|cancel(?:led|lation)?|my\s*plane|status)\b",
    re.IGNORECASE,
)
_DESTINATION_RE = re.compile(r"\b(?:to|towards|heading\s+to|bound\s+for)\s+([A-Z][A-Za-z]{2,})", re.IGNORECASE)
_SECURITY_TOPIC_RE = re.compile(r"\b(security|frisking|scanner|checkpoint|tsa|tray)\b", re.IGNORECASE)
_IMMIGRATION_TOPIC_RE = re.compile(r"\b(immigration|passport\s*control|e[- ]?gate|visa\s*check)\b", re.IGNORECASE)
_QUEUE_TOPIC_RE = re.compile(r"\b(wait|queue|line|how\s*long|busy|crowd(?:ed)?)\b", re.IGNORECASE)
_SHOP_WAIT_TOPIC_RE = re.compile(
    r"\b(brewhub|mediquick|techspot|readzone|styledeck|coffee|pharmacy|book\s*store|electronics)\b",
    re.IGNORECASE,
)


def plan_tool_calls(query: str) -> list[dict[str, Any]]:
    """Return the list of tool calls the agent should run for this query.

    Each entry is {name, args, result} - the result is filled in immediately
    by `execute_tool_calls`. We keep planning + execution separate so the UI
    can show the call trace and the prompt can show the result.
    """
    text = query or ""
    plan: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    def add(name: str, args: dict[str, Any]):
        key = (name, json.dumps(args, sort_keys=True))
        if key in seen:
            return
        seen.add(key)
        plan.append({"name": name, "args": args})

    # 1. Specific flight number → exact lookup
    for match in _FLIGHT_NUMBER_RE.finditer(text):
        add("get_flight_status", {"flight_number": match.group(1).upper().replace(" ", "")})

    # 2. Specific gate → who is at that gate right now
    for match in _GATE_RE.finditer(text):
        add("get_gate_status", {"gate": match.group(1).upper().replace(" ", "")})

    # 3. Specific destination → narrow lookup
    dest_match = _DESTINATION_RE.search(text)
    if dest_match and _FLIGHT_TOPIC_RE.search(text):
        add("find_flights_to", {"city_or_code": dest_match.group(1)})

    # 4. Generic flight / boarding topic and no specific number / dest → full board
    if (
        _FLIGHT_TOPIC_RE.search(text)
        and not any(p["name"] in {"get_flight_status", "find_flights_to", "get_gate_status"} for p in plan)
    ):
        add("get_all_flights", {})

    # 4. Security wait
    if _SECURITY_TOPIC_RE.search(text) or (_QUEUE_TOPIC_RE.search(text) and "secur" in text.lower()):
        add("get_security_wait", {})

    # 5. Immigration wait
    if _IMMIGRATION_TOPIC_RE.search(text):
        add("get_immigration_wait", {})

    # 6. Shop wait - shop name OR "wait/queue" near a known shop topic
    if _SHOP_WAIT_TOPIC_RE.search(text) and _QUEUE_TOPIC_RE.search(text):
        add("get_shop_wait", {})

    return plan


_TOOL_DISPATCH = {
    "get_all_flights": lambda args: get_all_flights(),
    "get_flight_status": lambda args: get_flight_status(args.get("flight_number", "")),
    "find_flights_to": lambda args: find_flights_to(args.get("city_or_code", "")),
    "get_gate_status": lambda args: get_gate_status(args.get("gate", "")),
    "get_security_wait": lambda args: get_security_wait(),
    "get_immigration_wait": lambda args: get_immigration_wait(),
    "get_shop_wait": lambda args: get_shop_wait(),
}


def execute_tool_calls(plan: list[dict[str, Any]]) -> list[dict[str, Any]]:
    executed = []
    for call in plan:
        handler = _TOOL_DISPATCH.get(call["name"])
        if handler is None:
            continue
        try:
            result = handler(call.get("args", {}))
        except Exception as exc:  # noqa: BLE001 - tool failures must not crash /query
            result = {"error": str(exc)}
        executed.append({**call, "result": result})
    return executed


# ---------------------------------------------------------------------------
# Format tool results for the LLM prompt
# ---------------------------------------------------------------------------

def format_tool_results_for_prompt(executed: list[dict[str, Any]]) -> str:
    """Render tool outputs as a compact, LLM-readable block. Empty when no
    tools fired so we don't waste tokens on every query.
    """
    if not executed:
        return ""
    lines = ["LIVE AIRPORT DATA (fetched just now via realtime tools - prefer this over any cached fact):"]
    for call in executed:
        result = call.get("result")
        args = call.get("args") or {}
        header = f"- tool: {call['name']}"
        if args:
            header += f"  args: {json.dumps(args)}"
        lines.append(header)

        if result is None:
            lines.append("    result: not found")
            continue
        if isinstance(result, dict) and "error" in result:
            lines.append(f"    result: error - {result['error']}")
            continue

        if call["name"] in {"get_all_flights", "find_flights_to"}:
            for f in result:
                lines.append(_format_flight_line(f))
        elif call["name"] in {"get_flight_status", "get_gate_status"}:
            items = result if isinstance(result, list) else [result]
            for f in items:
                lines.append(_format_flight_line(f))
        elif call["name"] == "get_security_wait":
            for s in result:
                lines.append(_format_wait_line(s, kind="Security"))
        elif call["name"] == "get_immigration_wait":
            for s in result:
                lines.append(_format_wait_line(s, kind="Immigration"))
        elif call["name"] == "get_shop_wait":
            for s in result:
                lines.append(
                    f"    {s.get('name')} wait {s.get('wait_minutes')} min ({s.get('queue_state')})"
                )
        else:
            lines.append(f"    result: {json.dumps(result)[:400]}")
    return "\n".join(lines)


def _format_flight_line(f: dict[str, Any]) -> str:
    if not f:
        return "    (flight not found)"
    delay = f.get("delay_minutes") or 0
    delay_part = f" delayed {delay}m" if delay else ""
    remarks = (f.get("remarks") or "").strip()
    remarks_part = f" - {remarks}" if remarks else ""
    return (
        f"    {f.get('number')} {f.get('airline','')} -> "
        f"{f.get('destination_city','')} ({f.get('destination_code','')}) "
        f"gate {f.get('gate','-')} dep {f.get('scheduled_departure','-')} "
        f"board {f.get('boarding_time','-')} status {f.get('status','-')}"
        f"{delay_part}{remarks_part}"
    )


def _format_wait_line(s: dict[str, Any], kind: str) -> str:
    return (
        f"    {kind}: {s.get('checkpoint_name')} wait {s.get('wait_minutes')} min, "
        f"{s.get('lanes_open')} lane(s) open, queue {s.get('queue_state')}"
    )


def tool_call_trace(executed: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Compact trace shipped to the frontend - one row per call."""
    trace = []
    for call in executed:
        trace.append({
            "name": call["name"],
            "args": call.get("args") or {},
            "summary": _summarize_result(call),
        })
    return trace


def _summarize_result(call: dict[str, Any]) -> str:
    name = call["name"]
    result = call.get("result")
    if result is None:
        return "no match"
    if isinstance(result, dict) and "error" in result:
        return f"error: {result['error']}"
    if name == "get_all_flights":
        return f"{len(result)} flight(s)"
    if name == "get_flight_status":
        return f"{result.get('number')} {result.get('status')}"
    if name == "get_gate_status":
        return f"{len(result)} flight(s) at this gate"
    if name == "find_flights_to":
        return f"{len(result)} match(es)"
    if name == "get_security_wait":
        return f"{len(result)} checkpoint(s)"
    if name == "get_immigration_wait":
        return f"{len(result)} counter(s)"
    if name == "get_shop_wait":
        return f"{len(result)} shop(s)"
    return "ok"
