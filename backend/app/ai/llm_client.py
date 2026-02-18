from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings


class LLMClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.base_url = "https://api.openai.com/v1"
        self.model = "gpt-3.5-turbo"
        self.max_tokens = 500
        self.temperature = 0.7

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> str:
        full_messages = []

        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})

        full_messages.extend(messages)

        # 1. Try Ollama FIRST (local, privacy-focused, free)
        try:
            return await self._generate_ollama_response(full_messages)
        except Exception as e:
            print(f"Ollama generation failed (fallback to OpenAI): {str(e)}")

        # 2. Try OpenAI Fallback if API key is present
        if self.api_key and self.api_key.strip():
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.base_url}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": self.model,
                            "messages": full_messages,
                            "max_tokens": max_tokens or self.max_tokens,
                            "temperature": temperature or self.temperature
                        },
                        timeout=30.0
                    )

                    if response.status_code == 200:
                        data = response.json()
                        return data["choices"][0]["message"]["content"]
            except Exception as e:
                print(f"OpenAI API Error: {str(e)}")

        # 3. Final Fallback to Canned Responses
        return await self._generate_fallback_response(full_messages)

    async def _generate_ollama_response(self, messages: List[Dict[str, str]]) -> str:
        """Primary generation via local Ollama instance"""
        # Use settings for configuration
        ollama_url = settings.OLLAMA_URL.rstrip('/')
        model = settings.OLLAMA_MODEL

        try:
            async with httpx.AsyncClient() as client:
                # Try primary configured model
                response = await client.post(
                    f"{ollama_url}/api/chat",
                    json={
                        "model": model,
                        "messages": messages,
                        "stream": False
                    },
                    timeout=120.0 # Local LLMs can be slow
                )

                if response.status_code == 200:
                    data = response.json()
                    return data["message"]["content"]
                
                # If 404, maybe model not found. Try 'llama3' as backup
                if response.status_code == 404 and model != "llama3":
                     print(f"Ollama model '{model}' not found, trying 'llama3'...")
                     response = await client.post(
                        f"{ollama_url}/api/chat",
                        json={
                            "model": "llama3",
                            "messages": messages,
                            "stream": False
                        },
                        timeout=120.0
                    )
                     if response.status_code == 200:
                        data = response.json()
                        return data["message"]["content"]

                # If we get here, Ollama returned an error code
                raise Exception(f"Ollama API returned status {response.status_code}: {response.text}")

        except Exception as e:
            # Re-raise to trigger fallback in generate_response
            raise e
        
        # Final Fallback to Canned Responses
        return await self._generate_fallback_response(messages)

    async def _generate_fallback_response(self, messages: List[Dict[str, str]]) -> str:
        user_message: str = messages[-1]["content"].lower() if messages else ""

        fallback_responses = {
            "hello": "Hello! I'm here and ready to chat with you. How can I help you today?",
            "hi": "Hi there! It's nice to hear from you. What's on your mind?",
            "how are you": "I'm doing well, thank you for asking! I'm here and ready to help. How are you?",
            "what": "That's an interesting question. Based on what I know, let me share my thoughts with you.",
            "tell me": "I'd be happy to share that with you. Let me think about the best way to explain it.",
            "remember": "I remember quite a bit from our conversations. What specifically would you like to know about?",
            "when": "That's a good question about timing. Let me recall what I know about that.",
            "why": "That's worth exploring. The reason behind it involves several factors I can explain.",
        }

        for keyword, response in fallback_responses.items():
            if str(keyword) in str(user_message):
                return response

        return "I appreciate you reaching out. While I'm still learning and developing my personality, I'm here to listen and respond thoughtfully. Could you tell me more about what you'd like to discuss?"


def get_llm_client() -> LLMClient:
    return LLMClient()
