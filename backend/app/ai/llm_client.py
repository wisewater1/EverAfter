from typing import List, Dict, Any, Optional
import httpx
import os
import asyncio
from app.core.config import settings

# Global singleton for the native model engine
_native_model_instance = None
_native_model_lock = asyncio.Lock()


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

        # 1. Try NATIVE FIRST (in-process, truly native)
        try:
            return await self._generate_native_response(full_messages, max_tokens, temperature)
        except Exception as e:
            print(f"Native generation failed: {str(e)}")

        # 2. Try Ollama (local server)
        try:
            return await self._generate_ollama_response(full_messages)
        except Exception as e:
            print(f"Ollama generation failed: {str(e)}")

        # 3. Try OpenAI Fallback if API key is present
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

        # 4. Final Fallback to Canned Responses
        return await self._generate_fallback_response(full_messages)

    async def _get_native_engine(self):
        """Thread-safe access to the embedded LLM engine."""
        global _native_model_instance
        async with _native_model_lock:
            if _native_model_instance is None:
                try:
                    from llama_cpp import Llama
                    model_path = os.path.join(settings.LOCAL_MODELS_DIR, settings.NATIVE_LLM_MODEL)
                    
                    if not os.path.exists(model_path):
                        return None # Need to download model

                    print(f"Loading Native LLM engine: {model_path}...")
                    _native_model_instance = Llama(
                        model_path=model_path,
                        n_ctx=2048,
                        n_threads=os.cpu_count(),
                        verbose=False
                    )
                    print("Native engine loaded successfully.")
                except ImportError:
                    print("llama-cpp-python not installed. Native execution unavailable.")
                    return None
                except Exception as e:
                    print(f"Failed to load native engine: {e}")
                    return None
            return _native_model_instance

    async def _generate_native_response(self, messages: List[Dict[str, str]], max_tokens=None, temp=None) -> str:
        """Primary generation via embedded llama-cpp engine."""
        engine = await self._get_native_engine()
        if not engine:
            raise Exception("Native engine not initialized.")

        # Format prompt for Llama 3/Instruct style
        prompt = ""
        for m in messages:
            role = m["role"]
            content = m["content"]
            if role == "system":
                prompt += f"<|system|>\n{content}<|end|>\n"
            elif role == "user":
                prompt += f"<|user|>\n{content}<|end|>\n"
            elif role == "assistant":
                prompt += f"<|assistant|>\n{content}<|end|>\n"
        prompt += "<|assistant|>\n"

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: engine(
                prompt,
                max_tokens=max_tokens or self.max_tokens,
                temperature=temp or self.temperature,
                stop=["<|end|>", "User:", "Assistant:"]
            )
        )
        
        content = response["choices"][0]["text"].strip()
        # Add the [NATIVE] tag for visibility as requested
        return f"[NATIVE] {content}"

    async def _generate_ollama_response(self, messages: List[Dict[str, str]]) -> str:
        """Primary generation via local Ollama instance"""
        # Use settings for configuration
        ollama_url = settings.OLLAMA_URL.rstrip('/')
        model = settings.OLLAMA_MODEL

        try:
            async with httpx.AsyncClient() as client:
                # Try primary configured model
                try:
                    with open("backend_llm.log", "a") as f:
                        f.write(f"Attempting Ollama with model {model} at {ollama_url}\n")
                except:
                    pass

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
                     with open("backend_llm.log", "a") as f:
                        f.write(f"Ollama model {model} not found (404). Trying llama3...\n")
                     
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
                with open("backend_llm.log", "a") as f:
                    f.write(f"Ollama failed with status {response.status_code}: {response.text}\n")
                raise Exception(f"Ollama API returned status {response.status_code}: {response.text}")

        except Exception as e:
            # Re-raise to trigger fallback in generate_response
            with open("backend_llm.log", "a") as f:
                f.write(f"Ollama Exception: {e}\n")
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
