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
        if not self.api_key or self.api_key == "":
            return await self._generate_fallback_response(messages)

        full_messages = []

        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})

        full_messages.extend(messages)

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
                else:
                    return await self._generate_fallback_response(messages)

        except Exception as e:
            print(f"LLM API Error: {str(e)}")
            return await self._generate_fallback_response(messages)

    async def _generate_fallback_response(self, messages: List[Dict[str, str]]) -> str:
        user_message = messages[-1]["content"].lower() if messages else ""

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
            if keyword in user_message:
                return response

        return "I appreciate you reaching out. While I'm still learning and developing my personality, I'm here to listen and respond thoughtfully. Could you tell me more about what you'd like to discuss?"


def get_llm_client() -> LLMClient:
    return LLMClient()
