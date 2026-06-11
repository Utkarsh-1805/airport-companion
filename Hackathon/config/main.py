"""Main entry point for AeroAssist RAG system."""

import json
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from src.rag import AeroAssistRAG


def main():
    """Initialize and run AeroAssist RAG system."""
    print("\n" + "="*60)
    print("🛫 AeroAssist - Airport RAG System")
    print("="*60)

    # Initialize RAG
    rag = AeroAssistRAG()

    # Load airport facilities
    print("\n📍 Loading airport facilities...")
    with open("data/airport_facilities.json", "r") as f:
        facilities = json.load(f)

    rag.load_facilities(facilities)
    print(f"✅ Loaded {len(facilities)} facilities\n")

    # Example queries
    examples = [
        {
            "user_id": "traveler_01",
            "user_data": {
                "flight_id": "AI-101",
                "gate": "B12",
                "boarding_time": "14:30",
                "status": "On-time",
            },
            "queries": [
                "Where can I get coffee?",
                "I need a quick bite before boarding",
                "Show me nearby shopping",
            ],
        },
        {
            "user_id": "traveler_02",
            "user_data": {
                "flight_id": "BA-205",
                "gate": "A2",
                "boarding_time": "15:45",
                "status": "On-time",
            },
            "queries": [
                "Where's Starbucks?",
                "I need to relax in a lounge",
            ],
        },
    ]

    # Process example queries
    for traveler in examples:
        print(f"\n{'='*60}")
        print(f"👤 User: {traveler['user_id']}")
        print(f"   Flight: {traveler['user_data']['flight_id']}")
        print(f"   Gate: {traveler['user_data']['gate']}")
        print(f"{'='*60}")

        for query in traveler["queries"]:
            print(f"\n💬 Query: {query}")
            print("-" * 60)

            result = rag.process_query(
                user_id=traveler["user_id"],
                query=query,
                user_data=traveler["user_data"],
            )

            print(f"\n📢 Response:\n{result['response']}")

            print(f"\n📊 Retrieved Facilities:")
            for facility in result["retrieved_facilities"]:
                print(
                    f"   • {facility['name']} ({facility['category']}) "
                    f"- {facility['distance_m']}m away - {facility['walking_time_sec']}s walk"
                )

            perf = result["performance"]
            print(
                f"\n⚡ Performance: "
                f"Retrieval: {perf['retrieval_ms']:.1f}ms | "
                f"Generation: {perf['generation_ms']:.1f}ms | "
                f"Total: {perf['total_ms']:.1f}ms"
            )
            print(
                f"   ✅ Latency targets: Retrieval {'✓' if perf['meets_latency']['retrieval'] else '✗'} | "
                f"Total {'✓' if perf['meets_latency']['total'] else '✗'}"
            )


if __name__ == "__main__":
    main()
