"""
AI Providers — Vendor-Agnostic Multi-Provider Abstraction Layer
================================================================
Unified interface for 10+ AI providers with automatic fallback,
rate limiting, and usage tracking for billing.

Providers:
  1. Google (Gemini, Imagen, Embedding)
  2. Groq (Llama, Mixtral) — Ultra-fast inference
  3. OpenAI (GPT-4o, DALL-E, Whisper, Embeddings)
  4. Anthropic (Claude 3.5 Sonnet/Haiku)
  5. Mistral (Large, Small, Codestral)
  6. ElevenLabs (TTS Multilingual/Turbo)
  7. Deepgram (Nova-2 STT)
  8. Cloudflare Workers AI (Edge inference)
  9. HuggingFace Inference (NLP pipelines)
  10. OpenRouter (Multi-model proxy)
"""
import logging
import time
import httpx
from abc import ABC, abstractmethod
from typing import Optional, Dict, List
from dataclasses import dataclass, field
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


# ─── Data Classes ────────────────────────────────────────────────

@dataclass
class AIResponse:
    """Standardized response from any provider."""
    text: str = ""
    provider: str = ""
    model: str = ""
    tokens_in: int = 0
    tokens_out: int = 0
    latency_ms: float = 0
    cost_usd: float = 0.0
    raw: dict = field(default_factory=dict)
    error: Optional[str] = None


@dataclass
class EmbeddingResponse:
    """Standardized embedding response."""
    vectors: List[List[float]] = field(default_factory=list)
    provider: str = ""
    model: str = ""
    dimensions: int = 0
    tokens_used: int = 0


@dataclass
class TTSResponse:
    """Standardized TTS response."""
    audio_bytes: bytes = b""
    provider: str = ""
    model: str = ""
    duration_seconds: float = 0.0
    characters_used: int = 0


@dataclass
class STTResponse:
    """Standardized STT response."""
    text: str = ""
    provider: str = ""
    model: str = ""
    duration_seconds: float = 0.0
    confidence: float = 0.0


@dataclass
class ImageResponse:
    """Standardized image generation response."""
    url: str = ""
    base64: str = ""
    provider: str = ""
    model: str = ""
    revised_prompt: str = ""


# ─── Base Provider ───────────────────────────────────────────────

class BaseAIProvider(ABC):
    """Abstract base for all AI providers."""

    name: str = "base"
    base_url: str = ""

    def __init__(self, api_key: str = ""):
        self.api_key = api_key
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(60.0, connect=10.0),
                headers=self._default_headers(),
            )
        return self._client

    def _default_headers(self) -> Dict[str, str]:
        return {"Content-Type": "application/json"}

    @abstractmethod
    async def complete(
        self,
        prompt: str,
        model: str,
        system_prompt: str = "",
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> AIResponse:
        """Generate text completion."""
        ...

    async def embed(self, texts: List[str], model: str) -> EmbeddingResponse:
        raise NotImplementedError(f"{self.name} does not support embeddings")

    async def generate_image(self, prompt: str, model: str) -> ImageResponse:
        raise NotImplementedError(f"{self.name} does not support image generation")

    async def synthesize(self, text: str, model: str, voice: str = "default") -> TTSResponse:
        raise NotImplementedError(f"{self.name} does not support TTS")

    async def transcribe(self, audio_bytes: bytes, model: str) -> STTResponse:
        raise NotImplementedError(f"{self.name} does not support STT")

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# ─── 1. Google Provider ─────────────────────────────────────────

class GoogleProvider(BaseAIProvider):
    """Google Gemini via generativelanguage.googleapis.com"""

    name = "google"
    base_url = "https://generativelanguage.googleapis.com/v1beta"

    def _default_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }

    async def complete(self, prompt: str, model: str = "gemini-2.0-flash",
                       system_prompt: str = "", temperature: float = 0.7,
                       max_tokens: int = 1024) -> AIResponse:
        start = time.monotonic()
        client = await self._get_client()

        contents = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": system_prompt}]})
            contents.append({"role": "model", "parts": [{"text": "Understood."}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        try:
            resp = await client.post(
                f"{self.base_url}/models/{model}:generateContent",
                json={
                    "contents": contents,
                    "generationConfig": {
                        "temperature": temperature,
                        "maxOutputTokens": max_tokens,
                    },
                },
            )
            resp.raise_for_status()
            data = resp.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            usage = data.get("usageMetadata", {})

            return AIResponse(
                text=text,
                provider=self.name,
                model=model,
                tokens_in=usage.get("promptTokenCount", 0),
                tokens_out=usage.get("candidatesTokenCount", 0),
                latency_ms=(time.monotonic() - start) * 1000,
                raw=data,
            )
        except Exception as e:
            logger.error("Google AI error: %s", str(e))
            return AIResponse(error=str(e), provider=self.name, model=model)

    async def embed(self, texts: List[str], model: str = "text-embedding-004") -> EmbeddingResponse:
        client = await self._get_client()
        try:
            resp = await client.post(
                f"{self.base_url}/models/{model}:batchEmbedContents",
                json={
                    "requests": [
                        {"model": f"models/{model}", "content": {"parts": [{"text": t}]}}
                        for t in texts
                    ]
                },
            )
            resp.raise_for_status()
            data = resp.json()
            vectors = [e["values"] for e in data.get("embeddings", [])]
            return EmbeddingResponse(
                vectors=vectors,
                provider=self.name,
                model=model,
                dimensions=len(vectors[0]) if vectors else 0,
                tokens_used=len(texts),
            )
        except Exception as e:
            logger.error("Google Embedding error: %s", str(e))
            return EmbeddingResponse(provider=self.name, model=model)


# ─── 2. Groq Provider ───────────────────────────────────────────

class GroqProvider(BaseAIProvider):
    """Groq — Ultra-fast LLM inference (Llama, Mixtral)"""

    name = "groq"
    base_url = "https://api.groq.com/openai/v1"

    def _default_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

    async def complete(self, prompt: str, model: str = "llama-3.3-70b-versatile",
                       system_prompt: str = "", temperature: float = 0.7,
                       max_tokens: int = 1024) -> AIResponse:
        start = time.monotonic()
        client = await self._get_client()

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            usage = data.get("usage", {})

            return AIResponse(
                text=data["choices"][0]["message"]["content"],
                provider=self.name,
                model=model,
                tokens_in=usage.get("prompt_tokens", 0),
                tokens_out=usage.get("completion_tokens", 0),
                latency_ms=(time.monotonic() - start) * 1000,
                raw=data,
            )
        except Exception as e:
            logger.error("Groq error: %s", str(e))
            return AIResponse(error=str(e), provider=self.name, model=model)


# ─── 3. OpenAI Provider ─────────────────────────────────────────

class OpenAIProvider(BaseAIProvider):
    """OpenAI — GPT-4o, DALL-E, Whisper, Embeddings"""

    name = "openai"
    base_url = "https://api.openai.com/v1"

    def _default_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

    async def complete(self, prompt: str, model: str = "gpt-4o-mini",
                       system_prompt: str = "", temperature: float = 0.7,
                       max_tokens: int = 1024) -> AIResponse:
        start = time.monotonic()
        client = await self._get_client()

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            usage = data.get("usage", {})

            return AIResponse(
                text=data["choices"][0]["message"]["content"],
                provider=self.name,
                model=model,
                tokens_in=usage.get("prompt_tokens", 0),
                tokens_out=usage.get("completion_tokens", 0),
                latency_ms=(time.monotonic() - start) * 1000,
                raw=data,
            )
        except Exception as e:
            logger.error("OpenAI error: %s", str(e))
            return AIResponse(error=str(e), provider=self.name, model=model)

    async def embed(self, texts: List[str], model: str = "text-embedding-3-small") -> EmbeddingResponse:
        client = await self._get_client()
        try:
            resp = await client.post(
                f"{self.base_url}/embeddings",
                json={"model": model, "input": texts},
            )
            resp.raise_for_status()
            data = resp.json()
            vectors = [item["embedding"] for item in data["data"]]
            usage = data.get("usage", {})
            return EmbeddingResponse(
                vectors=vectors,
                provider=self.name,
                model=model,
                dimensions=len(vectors[0]) if vectors else 0,
                tokens_used=usage.get("total_tokens", 0),
            )
        except Exception as e:
            logger.error("OpenAI Embedding error: %s", str(e))
            return EmbeddingResponse(provider=self.name, model=model)

    async def generate_image(self, prompt: str, model: str = "dall-e-3") -> ImageResponse:
        client = await self._get_client()
        try:
            resp = await client.post(
                f"{self.base_url}/images/generations",
                json={"model": model, "prompt": prompt, "n": 1, "size": "1024x1024"},
            )
            resp.raise_for_status()
            data = resp.json()
            img = data["data"][0]
            return ImageResponse(
                url=img.get("url", ""),
                provider=self.name,
                model=model,
                revised_prompt=img.get("revised_prompt", ""),
            )
        except Exception as e:
            logger.error("OpenAI Image error: %s", str(e))
            return ImageResponse(provider=self.name, model=model)

    async def transcribe(self, audio_bytes: bytes, model: str = "whisper-1") -> STTResponse:
        client = await self._get_client()
        try:
            files = {"file": ("audio.webm", audio_bytes, "audio/webm")}
            data_payload = {"model": model}
            resp = await client.post(
                f"{self.base_url}/audio/transcriptions",
                files=files,
                data=data_payload,
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            resp.raise_for_status()
            data = resp.json()
            return STTResponse(
                text=data.get("text", ""),
                provider=self.name,
                model=model,
                confidence=1.0,
            )
        except Exception as e:
            logger.error("OpenAI Whisper error: %s", str(e))
            return STTResponse(provider=self.name, model=model)


# ─── 4. Anthropic Provider ──────────────────────────────────────

class AnthropicProvider(BaseAIProvider):
    """Anthropic — Claude 3.5 Sonnet, Haiku (200K context)"""

    name = "anthropic"
    base_url = "https://api.anthropic.com/v1"

    def _default_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
        }

    async def complete(self, prompt: str, model: str = "claude-3-5-haiku-latest",
                       system_prompt: str = "", temperature: float = 0.7,
                       max_tokens: int = 1024) -> AIResponse:
        start = time.monotonic()
        client = await self._get_client()

        body: Dict = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if system_prompt:
            body["system"] = system_prompt

        try:
            resp = await client.post(f"{self.base_url}/messages", json=body)
            resp.raise_for_status()
            data = resp.json()
            usage = data.get("usage", {})

            text_parts = [block["text"] for block in data.get("content", []) if block["type"] == "text"]

            return AIResponse(
                text="\n".join(text_parts),
                provider=self.name,
                model=model,
                tokens_in=usage.get("input_tokens", 0),
                tokens_out=usage.get("output_tokens", 0),
                latency_ms=(time.monotonic() - start) * 1000,
                raw=data,
            )
        except Exception as e:
            logger.error("Anthropic error: %s", str(e))
            return AIResponse(error=str(e), provider=self.name, model=model)


# ─── 5. Mistral Provider ────────────────────────────────────────

class MistralProvider(BaseAIProvider):
    """Mistral AI — GDPR-compliant European models"""

    name = "mistral"
    base_url = "https://api.mistral.ai/v1"

    def _default_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

    async def complete(self, prompt: str, model: str = "mistral-small-latest",
                       system_prompt: str = "", temperature: float = 0.7,
                       max_tokens: int = 1024) -> AIResponse:
        start = time.monotonic()
        client = await self._get_client()

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            usage = data.get("usage", {})

            return AIResponse(
                text=data["choices"][0]["message"]["content"],
                provider=self.name,
                model=model,
                tokens_in=usage.get("prompt_tokens", 0),
                tokens_out=usage.get("completion_tokens", 0),
                latency_ms=(time.monotonic() - start) * 1000,
                raw=data,
            )
        except Exception as e:
            logger.error("Mistral error: %s", str(e))
            return AIResponse(error=str(e), provider=self.name, model=model)

    async def embed(self, texts: List[str], model: str = "mistral-embed") -> EmbeddingResponse:
        client = await self._get_client()
        try:
            resp = await client.post(
                f"{self.base_url}/embeddings",
                json={"model": model, "input": texts},
            )
            resp.raise_for_status()
            data = resp.json()
            vectors = [item["embedding"] for item in data["data"]]
            usage = data.get("usage", {})
            return EmbeddingResponse(
                vectors=vectors,
                provider=self.name,
                model=model,
                dimensions=len(vectors[0]) if vectors else 0,
                tokens_used=usage.get("total_tokens", 0),
            )
        except Exception as e:
            logger.error("Mistral Embedding error: %s", str(e))
            return EmbeddingResponse(provider=self.name, model=model)


# ─── 6. ElevenLabs Provider ─────────────────────────────────────

class ElevenLabsProvider(BaseAIProvider):
    """ElevenLabs — Premium TTS (10K chars/mo free)"""

    name = "elevenlabs"
    base_url = "https://api.elevenlabs.io/v1"

    def _default_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "xi-api-key": self.api_key,
        }

    async def synthesize(self, text: str, model: str = "eleven_multilingual_v2",
                         voice: str = "21m00Tcm4TlvDq8ikWAM") -> TTSResponse:
        client = await self._get_client()
        try:
            resp = await client.post(
                f"{self.base_url}/text-to-speech/{voice}",
                json={
                    "text": text,
                    "model_id": model,
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                },
                headers={**self._default_headers(), "Accept": "audio/mpeg"},
            )
            resp.raise_for_status()
            return TTSResponse(
                audio_bytes=resp.content,
                provider=self.name,
                model=model,
                characters_used=len(text),
            )
        except Exception as e:
            logger.error("ElevenLabs TTS error: %s", str(e))
            return TTSResponse(provider=self.name, model=model)

    async def complete(self, prompt: str, model: str = "", **kwargs) -> AIResponse:
        return AIResponse(error="ElevenLabs does not support text completion", provider=self.name)


# ─── 7. Deepgram Provider ───────────────────────────────────────

class DeepgramProvider(BaseAIProvider):
    """Deepgram — High-accuracy STT ($200 free credit)"""

    name = "deepgram"
    base_url = "https://api.deepgram.com/v1"

    def _default_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Token {self.api_key}",
        }

    async def transcribe(self, audio_bytes: bytes, model: str = "nova-2") -> STTResponse:
        client = await self._get_client()
        try:
            resp = await client.post(
                f"{self.base_url}/listen?model={model}&language=en&smart_format=true",
                content=audio_bytes,
                headers={
                    **self._default_headers(),
                    "Content-Type": "audio/wav",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            result = data["results"]["channels"][0]["alternatives"][0]
            return STTResponse(
                text=result.get("transcript", ""),
                provider=self.name,
                model=model,
                confidence=result.get("confidence", 0.0),
                duration_seconds=data.get("metadata", {}).get("duration", 0.0),
            )
        except Exception as e:
            logger.error("Deepgram STT error: %s", str(e))
            return STTResponse(provider=self.name, model=model)

    async def complete(self, prompt: str, model: str = "", **kwargs) -> AIResponse:
        return AIResponse(error="Deepgram does not support text completion", provider=self.name)


# ─── 8. Cloudflare Workers AI Provider ──────────────────────────

class CloudflareProvider(BaseAIProvider):
    """Cloudflare Workers AI — Edge inference (10K neurons/day free)"""

    name = "cloudflare"
    # base_url set per account: https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run

    def __init__(self, api_key: str = "", account_id: str = ""):
        super().__init__(api_key)
        self.account_id = account_id
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run"

    def _default_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

    async def complete(self, prompt: str, model: str = "@cf/meta/llama-3.1-8b-instruct",
                       system_prompt: str = "", temperature: float = 0.7,
                       max_tokens: int = 1024) -> AIResponse:
        start = time.monotonic()
        client = await self._get_client()

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            resp = await client.post(
                f"{self.base_url}/{model}",
                json={"messages": messages, "max_tokens": max_tokens},
            )
            resp.raise_for_status()
            data = resp.json()
            result = data.get("result", {})

            return AIResponse(
                text=result.get("response", ""),
                provider=self.name,
                model=model,
                latency_ms=(time.monotonic() - start) * 1000,
                raw=data,
            )
        except Exception as e:
            logger.error("Cloudflare AI error: %s", str(e))
            return AIResponse(error=str(e), provider=self.name, model=model)


# ─── 9. HuggingFace Inference Provider ──────────────────────────

class HuggingFaceProvider(BaseAIProvider):
    """HuggingFace Inference API — NLP pipelines (sentiment, NER, translation)"""

    name = "huggingface"
    base_url = "https://api-inference.huggingface.co/models"

    def _default_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

    async def complete(self, prompt: str, model: str = "mistralai/Mistral-7B-Instruct-v0.3",
                       system_prompt: str = "", temperature: float = 0.7,
                       max_tokens: int = 1024) -> AIResponse:
        start = time.monotonic()
        client = await self._get_client()

        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

        try:
            resp = await client.post(
                f"{self.base_url}/{model}",
                json={
                    "inputs": full_prompt,
                    "parameters": {
                        "temperature": temperature,
                        "max_new_tokens": max_tokens,
                        "return_full_text": False,
                    },
                },
            )
            resp.raise_for_status()
            data = resp.json()
            text = data[0].get("generated_text", "") if isinstance(data, list) else ""

            return AIResponse(
                text=text,
                provider=self.name,
                model=model,
                latency_ms=(time.monotonic() - start) * 1000,
                raw=data if isinstance(data, dict) else {"results": data},
            )
        except Exception as e:
            logger.error("HuggingFace error: %s", str(e))
            return AIResponse(error=str(e), provider=self.name, model=model)

    async def analyze_sentiment(self, text: str, model: str = "cardiffnlp/twitter-roberta-base-sentiment-latest") -> dict:
        """NLP Pipeline: Sentiment Analysis"""
        client = await self._get_client()
        try:
            resp = await client.post(
                f"{self.base_url}/{model}",
                json={"inputs": text},
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error("HuggingFace Sentiment error: %s", str(e))
            return {"error": str(e)}

    async def detect_entities(self, text: str, model: str = "dslim/bert-base-NER") -> dict:
        """NLP Pipeline: Named Entity Recognition (allergens, ingredients)"""
        client = await self._get_client()
        try:
            resp = await client.post(
                f"{self.base_url}/{model}",
                json={"inputs": text},
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error("HuggingFace NER error: %s", str(e))
            return {"error": str(e)}


# ─── 10. OpenRouter Provider ────────────────────────────────────

class OpenRouterProvider(BaseAIProvider):
    """OpenRouter — Multi-model proxy with free models available"""

    name = "openrouter"
    base_url = "https://openrouter.ai/api/v1"

    def _default_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://restin.ai",
            "X-Title": "Restin.AI",
        }

    async def complete(self, prompt: str, model: str = "meta-llama/llama-3.3-70b-instruct:free",
                       system_prompt: str = "", temperature: float = 0.7,
                       max_tokens: int = 1024) -> AIResponse:
        start = time.monotonic()
        client = await self._get_client()

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            usage = data.get("usage", {})

            return AIResponse(
                text=data["choices"][0]["message"]["content"],
                provider=self.name,
                model=model,
                tokens_in=usage.get("prompt_tokens", 0),
                tokens_out=usage.get("completion_tokens", 0),
                latency_ms=(time.monotonic() - start) * 1000,
                raw=data,
            )
        except Exception as e:
            logger.error("OpenRouter error: %s", str(e))
            return AIResponse(error=str(e), provider=self.name, model=model)


# ─── 11. Gemini SDK Provider (Unified Bridge) ──────────────────

class GeminiSDKProvider(BaseAIProvider):
    """Wraps the existing gemini_service singleton (5-key rotation, google-genai SDK).
    
    This bridges the battle-tested GeminiService with its:
      - 5 API keys round-robin rotation
      - google-genai SDK (more reliable than HTTP)
      - Auto-retry on 429/quota exhaustion
      - Built-in usage logging
    
    Used as the PRIMARY Google provider in the router.
    The HTTP-based GoogleProvider is kept as 'google_http' fallback.
    """

    name = "google"
    base_url = "google-genai-sdk"  # Not HTTP-based

    def __init__(self, api_key: str = ""):
        super().__init__(api_key)
        # Import the singleton lazily to avoid circular imports
        self._service = None

    def _get_service(self):
        if self._service is None:
            from services.gemini_service import gemini_service
            self._service = gemini_service
        return self._service

    @property
    def is_configured(self) -> bool:
        return self._get_service().configured

    async def complete(self, prompt: str, model: str = "gemini-2.0-flash",
                       system_prompt: str = "", temperature: float = 0.7,
                       max_tokens: int = 1024) -> AIResponse:
        service = self._get_service()
        if not service.configured:
            return AIResponse(error="Gemini not configured (no API keys)", provider=self.name, model=model)

        start = time.monotonic()

        # Map model to task_type for gemini_service's internal router
        task_type = "chat"  # default
        if "2.5-flash" in model or "2.5-pro" in model:
            task_type = "analysis"

        try:
            result = await service.chat(
                prompt=prompt,
                system_instruction=system_prompt,
                max_tokens=max_tokens,
                task_type=task_type,
            )

            if result.get("model") == "error":
                return AIResponse(
                    error=result.get("text", "Unknown error"),
                    provider=self.name,
                    model=model,
                )

            return AIResponse(
                text=result.get("text", ""),
                provider=self.name,
                model=result.get("model", model),
                tokens_in=result.get("tokens_used", 0) // 2,
                tokens_out=result.get("tokens_used", 0) // 2,
                latency_ms=(time.monotonic() - start) * 1000,
                raw={"key": result.get("key", ""), "source": "gemini_sdk"},
            )
        except Exception as e:
            logger.error("GeminiSDK error: %s", str(e))
            return AIResponse(error=str(e), provider=self.name, model=model)

    async def embed(self, texts: List[str], model: str = "text-embedding-004") -> EmbeddingResponse:
        """Delegate to HTTP-based Google embedding (SDK doesn't have batch embed)."""
        service = self._get_service()
        if not service.configured or not service._keys:
            return EmbeddingResponse(provider=self.name, model=model)

        # Use first key for embeddings via HTTP
        http_provider = GoogleProvider(api_key=service._keys[0])
        return await http_provider.embed(texts, model)


# ─── Provider Registry ──────────────────────────────────────────

PROVIDER_CLASSES = {
    "google": GeminiSDKProvider,  # PRIMARY: Uses SDK with 5-key rotation
    "google_http": GoogleProvider,  # FALLBACK: HTTP-based (for when SDK unavailable)
    "groq": GroqProvider,
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "mistral": MistralProvider,
    "elevenlabs": ElevenLabsProvider,
    "deepgram": DeepgramProvider,
    "cloudflare": CloudflareProvider,
    "huggingface": HuggingFaceProvider,
    "openrouter": OpenRouterProvider,
}

# Provider pricing matrix (cost per 1M tokens or per unit)
# Updated to match ai_models_registry.py (69 models, 46 free)
PROVIDER_PRICING = {
    "google": {
        "gemini-2.0-flash": {"input": 0.0, "output": 0.0},  # Free tier
        "gemini-2.0-flash-lite": {"input": 0.0, "output": 0.0},  # Free tier
        "gemini-2.5-flash": {"input": 0.15, "output": 0.60},
        "gemini-2.5-pro": {"input": 1.25, "output": 10.0},
        "text-embedding-004": {"input": 0.0, "output": 0.0},  # Free
        "imagen-4-fast": {"per_image": 0.0},  # Free tier
    },
    "groq": {
        # All free tier (rate limited, not cost limited)
        "llama-3.3-70b-versatile": {"input": 0.0, "output": 0.0},
        "llama-3.1-8b-instant": {"input": 0.0, "output": 0.0},
        "meta-llama/llama-4-maverick-17b-128e-instruct": {"input": 0.0, "output": 0.0},
        "meta-llama/llama-4-scout-17b-16e-instruct": {"input": 0.0, "output": 0.0},
        "qwen/qwen3-32b": {"input": 0.0, "output": 0.0},
        "moonshotai/kimi-k2-instruct": {"input": 0.0, "output": 0.0},
        "openai/gpt-oss-120b": {"input": 0.0, "output": 0.0},
        "openai/gpt-oss-20b": {"input": 0.0, "output": 0.0},
        "groq/compound": {"input": 0.0, "output": 0.0},
        "whisper-large-v3": {"per_minute": 0.0},
        "whisper-large-v3-turbo": {"per_minute": 0.0},
    },
    "openai": {
        "gpt-4o": {"input": 2.50, "output": 10.0},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "dall-e-3": {"per_image": 0.04},
        "whisper-1": {"per_minute": 0.006},
        "text-embedding-3-small": {"input": 0.02, "output": 0.0},
    },
    "anthropic": {
        "claude-3-5-sonnet-latest": {"input": 3.0, "output": 15.0},  # Free: 5 RPM
        "claude-3-5-haiku-latest": {"input": 0.80, "output": 4.0},   # Free: 5 RPM
        "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25},  # Free: 5 RPM, 25K TPM
    },
    "mistral": {
        "mistral-large-latest": {"input": 2.0, "output": 6.0},
        "mistral-small-latest": {"input": 0.0, "output": 0.0},  # Free tier
        "codestral-latest": {"input": 0.3, "output": 0.9},
        "mistral-embed": {"input": 0.0, "output": 0.0},
    },
    "elevenlabs": {
        "eleven_v3": {"per_1k_chars": 0.30},
        "eleven_multilingual_v2": {"per_1k_chars": 0.30},
        "eleven_flash_v2_5": {"per_1k_chars": 0.15},
        "eleven_turbo_v2_5": {"per_1k_chars": 0.15},
        "eleven_flash_v2": {"per_1k_chars": 0.15},
        "eleven_multilingual_sts_v2": {"per_1k_chars": 0.30},
    },
    "deepgram": {
        "nova-2": {"per_minute": 0.0043},  # $200 free credit
    },
    "cloudflare": {
        "@cf/meta/llama-3.1-8b-instruct": {"input": 0.0, "output": 0.0},
        "@cf/mistral/mistral-7b-instruct-v0.2": {"input": 0.0, "output": 0.0},
    },
    "huggingface": {
        "mistralai/Mistral-7B-Instruct-v0.3": {"input": 0.0, "output": 0.0},
        "cardiffnlp/twitter-roberta-base-sentiment-latest": {"input": 0.0, "output": 0.0},
        "dslim/bert-base-NER": {"input": 0.0, "output": 0.0},
    },
    "openrouter": {
        # All :free models are $0.00
        "meta-llama/llama-3.3-70b-instruct:free": {"input": 0.0, "output": 0.0},
        "deepseek/deepseek-r1-0528:free": {"input": 0.0, "output": 0.0},
        "nousresearch/hermes-3-llama-3.1-405b:free": {"input": 0.0, "output": 0.0},
        "qwen/qwen3-next-80b-a3b-instruct:free": {"input": 0.0, "output": 0.0},
        "openai/gpt-oss-120b:free": {"input": 0.0, "output": 0.0},
        "google/gemma-3-27b-it:free": {"input": 0.0, "output": 0.0},
        "mistralai/mistral-small-3.1-24b-instruct:free": {"input": 0.0, "output": 0.0},
    },
}


def get_provider(provider_name: str, api_key: str = "", **kwargs) -> BaseAIProvider:
    """Factory function to create a provider instance."""
    cls = PROVIDER_CLASSES.get(provider_name)
    if not cls:
        raise ValueError(f"Unknown provider: {provider_name}. Available: {list(PROVIDER_CLASSES.keys())}")
    return cls(api_key=api_key, **kwargs)


def get_cost_estimate(provider: str, model: str, tokens_in: int = 0, tokens_out: int = 0) -> float:
    """Estimate cost in USD for a given usage."""
    pricing = PROVIDER_PRICING.get(provider, {}).get(model, {})
    if not pricing:
        return 0.0

    input_cost = pricing.get("input", 0.0) * (tokens_in / 1_000_000)
    output_cost = pricing.get("output", 0.0) * (tokens_out / 1_000_000)
    return input_cost + output_cost
