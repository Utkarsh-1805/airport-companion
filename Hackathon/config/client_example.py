"""
AeroAssist API Client - Example usage and testing
"""

import requests
import json
from typing import Dict, Any
import time

API_BASE_URL = "http://localhost:8000"


class AeroAssistClient:
    """Python client for AeroAssist API."""

    def __init__(self, base_url: str = API_BASE_URL):
        """Initialize client."""
        self.base_url = base_url
        self.session = requests.Session()

    def health_check(self) -> Dict[str, Any]:
        """Check API health."""
        response = self.session.get(f"{self.base_url}/health")
        return response.json()

    def query(
        self,
        user_id: str,
        query: str,
        flight_id: str,
        gate: str,
        boarding_time: str,
    ) -> Dict[str, Any]:
        """
        Send query to AeroAssist.
        
        Args:
            user_id: Unique user identifier
            query: User's question
            flight_id: Flight number
            gate: Current gate
            boarding_time: Boarding time (HH:MM format)
            
        Returns:
            Complete response with facilities and answer
        """
        payload = {
            "user_id": user_id,
            "query": query,
            "user_context": {
                "user_id": user_id,
                "flight_id": flight_id,
                "gate": gate,
                "boarding_time": boarding_time,
                "status": "On-time",
            },
        }

        response = self.session.post(
            f"{self.base_url}/query",
            json=payload,
        )
        response.raise_for_status()
        return response.json()

    def stream_query(
        self,
        user_id: str,
        query: str,
        gate: str,
    ):
        """
        Stream response tokens.
        
        Args:
            user_id: User identifier
            query: User's question
            gate: Current gate
            
        Yields:
            Text chunks as they're generated
        """
        response = self.session.get(
            f"{self.base_url}/query/stream",
            params={
                "user_id": user_id,
                "query": query,
                "gate": gate,
            },
            stream=True,
        )
        response.raise_for_status()

        for line in response.iter_lines():
            if line:
                yield line.decode('utf-8')

    def create_session(
        self,
        user_id: str,
        flight_id: str,
        gate: str,
        boarding_time: str,
    ) -> Dict[str, Any]:
        """Create or update user session."""
        payload = {
            "user_id": user_id,
            "flight_id": flight_id,
            "gate": gate,
            "boarding_time": boarding_time,
            "status": "On-time",
        }

        response = self.session.post(
            f"{self.base_url}/session",
            json=payload,
        )
        response.raise_for_status()
        return response.json()

    def list_sessions(self) -> Dict[str, Any]:
        """List active sessions."""
        response = self.session.get(f"{self.base_url}/sessions")
        response.raise_for_status()
        return response.json()

    def get_config(self) -> Dict[str, Any]:
        """Get system configuration."""
        response = self.session.get(f"{self.base_url}/config")
        response.raise_for_status()
        return response.json()


def example_usage():
    """Example usage of AeroAssist client."""
    print("\n" + "="*60)
    print("AeroAssist API Client - Example")
    print("="*60 + "\n")

    client = AeroAssistClient()

    # Health check
    try:
        health = client.health_check()
        print("✅ API Health:", health["status"])
    except Exception as e:
        print(f"❌ API not responding: {e}")
        print("Make sure the server is running: python -m uvicorn src.app:app --reload")
        return

    # Get config
    config = client.get_config()
    print(f"📋 Config: {config['models']['llm']}")

    # Example travelers
    travelers = [
        {
            "user_id": "traveler_1",
            "flight_id": "AI-101",
            "gate": "B12",
            "boarding_time": "14:30",
            "queries": [
                "Where can I get coffee?",
                "Show me nearby restaurants",
            ],
        },
        {
            "user_id": "traveler_2",
            "flight_id": "BA-205",
            "gate": "A2",
            "boarding_time": "15:45",
            "queries": [
                "I need to do some shopping",
                "Where's the nearest lounge?",
            ],
        },
    ]

    for traveler in travelers:
        print(f"\n{'='*60}")
        print(f"👤 {traveler['user_id']} - Flight {traveler['flight_id']}")
        print(f"   Gate: {traveler['gate']}, Boarding: {traveler['boarding_time']}")
        print(f"{'='*60}")

        # Create session
        session = client.create_session(
            user_id=traveler["user_id"],
            flight_id=traveler["flight_id"],
            gate=traveler["gate"],
            boarding_time=traveler["boarding_time"],
        )
        print(f"✅ Session created: {session['session_id']}")

        # Query examples
        for query in traveler["queries"]:
            print(f"\n💬 Query: {query}")
            print("-" * 60)

            start = time.time()
            result = client.query(
                user_id=traveler["user_id"],
                query=query,
                flight_id=traveler["flight_id"],
                gate=traveler["gate"],
                boarding_time=traveler["boarding_time"],
            )
            elapsed = time.time() - start

            # Display response
            print(f"\n📢 Response:\n{result['response']}")

            # Display retrieved facilities
            print(f"\n📍 Retrieved Facilities ({len(result['retrieved_facilities'])}):")
            for facility in result["retrieved_facilities"]:
                print(
                    f"   • {facility['name']} ({facility['category']}) "
                    f"- {facility['distance_m']}m away"
                )

            # Display performance
            perf = result["performance"]
            print(f"\n⚡ Performance:")
            print(f"   Retrieval: {perf['retrieval_ms']:.1f}ms")
            print(f"   Generation: {perf['generation_ms']:.1f}ms")
            print(f"   Total: {perf['total_ms']:.1f}ms (Client: {elapsed*1000:.1f}ms)")
            print(f"   Status: {'✅ Latency OK' if perf['meets_latency']['total'] else '⚠️ Latency Warning'}")

    # Streaming example
    print(f"\n{'='*60}")
    print("🔄 Streaming Response Example")
    print(f"{'='*60}\n")

    print("💬 Query: Tell me about quick lunch options\n")
    print("📢 Streaming Response:\n")

    for chunk in client.stream_query(
        user_id="traveler_stream",
        query="Tell me about quick lunch options",
        gate="B12",
    ):
        print(chunk, end="", flush=True)

    print("\n")

    # List active sessions
    sessions = client.list_sessions()
    print(f"📊 Active Sessions: {sessions['count']}")
    for session_id in sessions["active_sessions"]:
        print(f"   • {session_id}")


if __name__ == "__main__":
    example_usage()
