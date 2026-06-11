"""Ollama integration for LLM-based response generation.

Uses the /api/chat endpoint (not /api/generate) so that Gemma2 correctly
separates system instructions from user messages. This dramatically
improves instruction following (conciseness, no-emoji, etc.).
"""

import json
import time
from typing import Dict, Any, List, Iterator
import httpx

from config.settings import OLLAMA_BASE_URL, OLLAMA_MODEL


class OllamaGenerator:
    """Manages inference with Ollama-hosted Gemma models."""

    def __init__(self):
        """Initialize Ollama client."""
        self.base_url = OLLAMA_BASE_URL
        self.model = OLLAMA_MODEL
        self.client = httpx.Client(timeout=30.0)
        self._verify_connection()

    def _verify_connection(self):
        """Verify Ollama is running and model is available."""
        try:
            response = self.client.get(f"{self.base_url}/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [m.get("name", "") for m in models]
                if self.model in model_names or any(self.model in m for m in model_names):
                    print(f"[Ollama] Connected to {self.model} at {self.base_url}")
                else:
                    print(f"[Ollama] Warning: {self.model} not found. Available: {model_names}")
            else:
                print(f"[Ollama] Connection failed: {response.status_code}")
        except Exception as e:
            print(f"[Ollama] Connection error: {e}")
            raise

    def generate(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 80,
    ) -> str:
        """
        Generate response using Ollama /api/chat (non-streaming).

        Args:
            system_prompt: System context for the model
            user_message: User's query
            max_tokens: Maximum tokens to generate

        Returns:
            Generated response text
        """
        start = time.time()

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "top_k": 30,
                "top_p": 0.85,
                "temperature": 0.3,    # Low — factual, not creative
                "repeat_penalty": 1.3, # High — prevents repetitive generic phrases
            },
        }

        try:
            response = self.client.post(
                f"{self.base_url}/api/chat",
                json=payload,
            )
            response.raise_for_status()

            result = response.json()
            generated_text = result.get("message", {}).get("content", "").strip()

            elapsed = time.time() - start
            print(f"[Ollama] Generated response in {elapsed:.2f}s ({len(generated_text)} chars)")

            return generated_text

        except Exception as e:
            print(f"[Ollama] Generation error: {e}")
            return f"Error generating response: {str(e)}"

    def generate_streaming(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 80,
    ) -> Iterator[str]:
        """
        Stream response tokens via Ollama /api/chat (streaming).

        Yields individual text chunks as they're generated.
        """
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "stream": True,
            "options": {
                "num_predict": max_tokens,
                "top_k": 30,
                "top_p": 0.85,
                "temperature": 0.3,
                "repeat_penalty": 1.3,
            },
        }

        try:
            with self.client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json=payload,
            ) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if line:
                        data = json.loads(line)
                        msg = data.get("message", {})
                        chunk = msg.get("content", "")
                        if chunk:
                            yield chunk
        except Exception as e:
            yield f"Error: {str(e)}"
