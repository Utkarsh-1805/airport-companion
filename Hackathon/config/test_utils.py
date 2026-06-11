"""Development and testing utilities for AeroAssist."""

import json
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.rag import AeroAssistRAG


def test_retrieval():
    """Test retrieval component."""
    print("\n" + "="*60)
    print("Testing Retrieval Component")
    print("="*60 + "\n")

    rag = AeroAssistRAG()

    with open("data/airport_facilities.json", "r") as f:
        facilities = json.load(f)

    rag.load_facilities(facilities)

    test_queries = [
        ("coffee", "B12"),
        ("shopping", "A2"),
        ("restaurant", "B10"),
        ("lounge", "C2"),
    ]

    for query, gate in test_queries:
        print(f"Query: '{query}' from gate {gate}")
        results = rag.retrieval.retrieve(query, user_gate=gate, top_k=3)

        for i, result in enumerate(results, 1):
            print(
                f"  {i}. {result['name']} - {result['distance_m']}m away "
                f"({result.get('retrieval_score', 0):.2f} score)"
            )
        print()


def test_generation():
    """Test generation component."""
    print("\n" + "="*60)
    print("Testing Generation Component")
    print("="*60 + "\n")

    rag = AeroAssistRAG()

    test_prompts = [
        "Hello, I'm boarding in 30 minutes. Can you help me find a good coffee shop?",
        "I need to do some shopping. What's nearby?",
    ]

    for prompt in test_prompts:
        print(f"Prompt: {prompt}\n")
        response = rag.generator.generate(
            system_prompt="You are a helpful airport assistant.",
            user_message=prompt,
            max_tokens=128,
        )
        print(f"Response: {response}\n")
        print("-" * 60 + "\n")


def test_latency():
    """Benchmark latency components."""
    import time

    print("\n" + "="*60)
    print("Latency Benchmarks")
    print("="*60 + "\n")

    rag = AeroAssistRAG()

    with open("data/airport_facilities.json", "r") as f:
        facilities = json.load(f)

    rag.load_facilities(facilities)

    # Retrieval latency
    print("Retrieval Latency Test:")
    queries = ["coffee", "restaurant", "shopping", "lounge", "charging"]

    latencies = []
    for query in queries:
        start = time.time()
        rag.retrieval.retrieve(query, user_gate="B12", top_k=5)
        latency = (time.time() - start) * 1000
        latencies.append(latency)
        print(f"  {query}: {latency:.1f}ms")

    print(f"\n  Avg: {sum(latencies)/len(latencies):.1f}ms")
    print(f"  Max: {max(latencies):.1f}ms")
    print(f"  Min: {min(latencies):.1f}ms")

    # Generation latency
    print("\n\nGeneration Latency Test:")
    test_queries = [
        "Where's coffee?",
        "Show me restaurants",
        "I need to shop",
    ]

    gen_latencies = []
    for query in test_queries:
        start = time.time()
        rag.generator.generate(
            system_prompt="You are helpful.",
            user_message=query,
            max_tokens=64,
        )
        latency = (time.time() - start) * 1000
        gen_latencies.append(latency)
        print(f"  {query}: {latency:.1f}ms")

    print(f"\n  Avg: {sum(gen_latencies)/len(gen_latencies):.1f}ms")


def test_end_to_end():
    """End-to-end RAG test."""
    print("\n" + "="*60)
    print("End-to-End RAG Test")
    print("="*60 + "\n")

    rag = AeroAssistRAG()

    with open("data/airport_facilities.json", "r") as f:
        facilities = json.load(f)

    rag.load_facilities(facilities)

    result = rag.process_query(
        user_id="test_user",
        query="I'm at gate B12 and need a quick coffee before boarding in 20 minutes",
        user_data={
            "user_id": "test_user",
            "flight_id": "TEST-01",
            "gate": "B12",
            "boarding_time": "14:30",
            "status": "On-time",
        },
    )

    print("Query:", result["query"])
    print("\nResponse:", result["response"])
    print("\nPerformance:")
    print(f"  Retrieval: {result['performance']['retrieval_ms']:.1f}ms")
    print(f"  Generation: {result['performance']['generation_ms']:.1f}ms")
    print(f"  Total: {result['performance']['total_ms']:.1f}ms")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AeroAssist testing utilities")
    parser.add_argument(
        "test",
        choices=["retrieval", "generation", "latency", "e2e"],
        help="Test to run",
    )

    args = parser.parse_args()

    if args.test == "retrieval":
        test_retrieval()
    elif args.test == "generation":
        test_generation()
    elif args.test == "latency":
        test_latency()
    elif args.test == "e2e":
        test_end_to_end()
