"""Build text chunks from the authoritative 3D-map JSON for RAG retrieval.

The single source of truth is `Airport Rag/src/airportData.js`. Run
`node scripts/export-airport-data.mjs` from that folder whenever the JS data
changes - it writes `data/airport-corpus.json`, which we read here.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Iterable

REPO_ROOT = Path(__file__).resolve().parents[1]
CORPUS_JSON = REPO_ROOT / "Airport Rag" / "data" / "airport-corpus.json"
DIRECTORY_TXT = Path(__file__).resolve().parent / "airport_directory.txt"


def _shop_chunk(shop: dict) -> str:
    # The shop is mounted on a navigation node (shop['node_id']). When routing,
    # ALWAYS use the mount node id, not the shop's metadata id, because only
    # navigation nodes exist in the walkable graph.
    routing_id = shop.get("node_id") or shop["id"]
    fields = [
        f"Shop record id={shop['id']} name={shop['name']}",
        f"Category: {shop.get('category')} ({shop.get('tag', '')}).",
        f"Description: {shop.get('description', shop.get('offers', ''))}",
        f"Terminal: {shop.get('terminal')}, zone: {shop.get('zone') or shop.get('location_zone')}.",
        f"Hours: {shop.get('open_hours')}, wait time: {shop.get('wait_time')}, crowd: {shop.get('crowd_level', 'unknown')}, est visit: {shop.get('estimated_visit_minutes', '?')} min.",
        f"Rating: {shop.get('rating')} ({shop.get('review_count', '?')} reviews).",
        f"Price range: {shop.get('price_range', '?')} ({shop.get('currency', 'INR')}). Payments: {', '.join(shop.get('payment_methods', []))}.",
    ]
    if shop.get("signature_items"):
        items = "; ".join(
            f"{it.get('name')} - {it.get('price_currency', 'INR')} {it.get('price', '?')}"
            for it in shop["signature_items"]
        )
        fields.append(f"Signature items: {items}.")
    if shop.get("dietary"):
        d = shop["dietary"]
        diet_flags = [k for k, v in d.items() if v is True]
        allergens = d.get("allergens") if isinstance(d, dict) else None
        if diet_flags:
            fields.append(f"Dietary: {', '.join(diet_flags)}.")
        if allergens:
            fields.append(f"Allergens: {', '.join(allergens)}.")
    if shop.get("amenities"):
        am = shop["amenities"]
        amenity_flags = [k for k, v in am.items() if v is True]
        if amenity_flags:
            fields.append(f"Amenities: {', '.join(amenity_flags)}.")
        if am.get("seating"):
            fields.append(f"Seating capacity: {am['seating']}.")
        if am.get("power_outlets"):
            fields.append(f"Power outlets: {am['power_outlets']}.")
    if shop.get("accessibility"):
        ac = shop["accessibility"]
        ac_flags = [k for k, v in ac.items() if v is True]
        if ac_flags:
            fields.append(f"Accessibility: {', '.join(ac_flags)}.")
    if shop.get("languages_spoken"):
        fields.append(f"Languages spoken at counter: {', '.join(shop['languages_spoken'])}.")
    if shop.get("promotion"):
        fields.append(f"Current promotion: {shop['promotion']}")
    if shop.get("requires_boarding_pass"):
        fields.append("Requires a boarding pass for entry (duty-free).")
    fields.append(f"Map node id (use this for routing): {routing_id}")
    fields.append(f"3D position [x,y,z]: {shop.get('position')}")
    return "\n".join(fields)


def _zone_chunk(zone: dict) -> str:
    return (
        f"Zone {zone['id']} - {zone['name']}\n"
        f"Description: {zone.get('description', '')}\n"
        f"This is a passenger-journey zone. Passengers enter zones in this order: "
        f"landside -> security -> immigration -> airside_retail/airside_food/airside_services -> gate_piers -> arrival."
    )


def _service_chunk(service: dict) -> str:
    return (
        f"Service node id={service['id']} name={service['name']}\n"
        f"Type: {service.get('type')}, terminal: {service.get('terminal')}, zone: {service.get('zone')}\n"
        f"Available services: {', '.join(service.get('services', []))}\n"
        f"Accessibility: {', '.join(service.get('accessibility', []))}\n"
        f"Map node id (use this for routing): {service['id']}\n"
        f"3D position [x,y,z]: {service.get('position')}"
    )


def _faq_chunk(faq: dict) -> str:
    parts = [
        f"FAQ topic: {faq['query']}",
        f"Answer: {faq['answer']}",
        f"Recommended route destination (map node id): {faq.get('route_to', 'Service_Hub')}"
    ]
    if faq.get("zone_required"):
        parts.append(f"Required passenger zone: {faq['zone_required']}")
    return "\n".join(parts)


def _gate_chunk(gate: dict) -> str:
    return (
        f"Gate record id={gate['id']} terminal={gate['terminal']}\n"
        f"Zone: {gate.get('zone', 'gate_piers')}\n"
        f"Map node id: {gate['node_id']}\n"
        f"Flight info: {gate.get('flight_info')}\n"
        f"3D position [x,y,z]: {gate.get('position')}"
    )


def _terminal_chunk(terminal: dict) -> str:
    zones = "; ".join(
        f"{zone['name']} (type={zone['type']}, id={zone['id']})"
        for zone in terminal.get("zones", [])
    )
    return (
        f"Terminal {terminal['id']} - {terminal['name']}\n"
        f"Zones in this terminal: {zones}"
    )


def _edge_chunk(edge: dict) -> str:
    return (
        f"Walkable connection: {edge['from']} <-> {edge['to']} "
        f"(weight={edge['weight']}, bidirectional={edge['bidirectional']})."
    )


def _summary_chunks(data: dict) -> Iterable[str]:
    shop_names = [f"{s['name']} ({s['category']})" for s in data["shops"]]
    yield (
        "Master list of every shop and food outlet at the airport: "
        + ", ".join(shop_names)
        + ". The airport has exactly "
        + str(len(data["shops"]))
        + " retail/food outlets - do not invent any others."
    )

    by_category: dict[str, list[str]] = {}
    for shop in data["shops"]:
        by_category.setdefault(shop["category"], []).append(shop["name"])
    for category, names in sorted(by_category.items()):
        yield f"All {category} outlets: {', '.join(names)}."

    gate_ids = [g["id"] for g in data["gates"]]
    yield (
        "All boarding gates at the airport (use exact IDs): "
        + ", ".join(gate_ids)
        + f". Total {len(gate_ids)} gates across terminals "
        + ", ".join(sorted({g['terminal'] for g in data['gates']}))
        + "."
    )

    services = data.get("services", [])
    by_type: dict[str, list[str]] = {}
    for svc in services:
        by_type.setdefault(svc["type"], []).append(svc["name"])
    for svc_type, names in sorted(by_type.items()):
        yield f"All {svc_type} facilities: {', '.join(names)}."

    profile = data.get("passenger_profile", {})
    if profile:
        yield (
            f"Default passenger profile: {profile.get('name')}, flight {profile.get('flight')}, "
            f"terminal {profile.get('terminal')}, gate {profile.get('gate')}, "
            f"boarding {profile.get('boarding_time')}, currently at {profile.get('current_location')}, "
            f"preferences: {', '.join(profile.get('preferences', []))}."
        )


def build_documents() -> list[dict]:
    """Return a list of {text, metadata} chunks ready to embed."""
    if not CORPUS_JSON.exists():
        raise FileNotFoundError(
            f"Missing {CORPUS_JSON}. Run "
            "`node scripts/export-airport-data.mjs` from the Airport Rag folder first."
        )
    with CORPUS_JSON.open() as fh:
        data = json.load(fh)

    docs: list[dict] = []

    for zone in data.get("zones", []):
        docs.append({"text": _zone_chunk(zone), "metadata": {"kind": "zone", "id": zone["id"]}})
    for shop in data["shops"]:
        docs.append({"text": _shop_chunk(shop), "metadata": {"kind": "shop", "id": shop["id"]}})
    for gate in data["gates"]:
        docs.append({"text": _gate_chunk(gate), "metadata": {"kind": "gate", "id": gate["node_id"]}})
    for terminal in data["terminals"]:
        docs.append({"text": _terminal_chunk(terminal), "metadata": {"kind": "terminal", "id": terminal["id"]}})
    for service in data.get("services", []):
        docs.append({"text": _service_chunk(service), "metadata": {"kind": "service", "id": service["id"]}})
    for faq in data.get("faq", []):
        docs.append({"text": _faq_chunk(faq), "metadata": {"kind": "faq", "id": faq["query"]}})
    for edge in data["navigation_graph"]["edges"][:30]:  # cap edges to keep retrieval signal high
        docs.append({
            "text": _edge_chunk(edge),
            "metadata": {"kind": "edge", "id": f"{edge['from']}->{edge['to']}"},
        })
    for i, line in enumerate(_summary_chunks(data)):
        docs.append({"text": line, "metadata": {"kind": "summary", "id": f"summary_{i}"}})

    if DIRECTORY_TXT.exists():
        text = DIRECTORY_TXT.read_text()
        for i, block in enumerate(_split_directory(text)):
            docs.append({"text": block, "metadata": {"kind": "directory", "id": f"dir_{i}"}})

    return docs


def _split_directory(text: str) -> list[str]:
    sections: list[str] = []
    current: list[str] = []
    for line in text.splitlines():
        if line.startswith("#"):
            if current:
                sections.append("\n".join(current).strip())
            current = [line]
        else:
            current.append(line)
    if current:
        sections.append("\n".join(current).strip())
    return [s for s in sections if s]


def build_routing_index() -> dict:
    """Quick lookup so the API layer can resolve queries like 'coffee' -> 'FoodCourt_E1'.

    Resolution order at query time:
      1. FAQ phrase match (e.g. "lost passport" -> InfoDesk_C)
      2. Specific gate id (e.g. "gate b4")
      3. Service type keyword (e.g. "prayer room", "wheelchair")
      4. Shop keyword (e.g. "coffee", "starbucks")
      5. Zone keyword (e.g. "duty free")
    """
    with CORPUS_JSON.open() as fh:
        data = json.load(fh)

    index = {
        "shops_by_keyword": {},
        "gates_by_id": {f"gate_{g['id'].lower()}": g["node_id"] for g in data["gates"]},
        "services_by_keyword": {},
        "faq_by_phrase": {},
    }

    for shop in data["shops"]:
        # Route to the navigation graph node, not to the shop metadata id.
        routing_id = shop.get("node_id") or shop["id"]
        terms = {
            shop["name"].lower(),
            shop["category"].lower(),
            shop.get("tag", "").lower(),
            shop.get("location_zone", "").lower(),
        }
        for word in shop.get("offers", "").lower().replace(",", " ").split():
            if len(word) > 3:
                terms.add(word.strip(".,;()"))
        for term in terms:
            if term:
                index["shops_by_keyword"].setdefault(term, routing_id)

    for svc in data.get("services", []):
        for tag in svc.get("services", []):
            index["services_by_keyword"].setdefault(tag.replace("_", " "), svc["id"])
            index["services_by_keyword"].setdefault(tag, svc["id"])

    for faq in data.get("faq", []):
        index["faq_by_phrase"][faq["query"].lower()] = {
            "destination": faq.get("route_to"),
            "zone_required": faq.get("zone_required"),
            "answer": faq.get("answer"),
        }

    return index


if __name__ == "__main__":
    docs = build_documents()
    print(f"Built {len(docs)} chunks.")
    for doc in docs[:3]:
        print("-", doc["metadata"], doc["text"][:80].replace("\n", " "))
