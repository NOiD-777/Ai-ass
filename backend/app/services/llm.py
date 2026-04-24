import json
import logging
from typing import Any
from json import JSONDecodeError

from ..core.config import settings
from .http_client import get_async_client
from ..utils.retry import ensure_success, with_retries

logger = logging.getLogger(__name__)


class LLMService:
    async def generate_json(self, prompt: str) -> dict[str, Any]:
        providers = [self._call_groq, self._call_huggingface, self._call_openrouter]
        last_error: Exception | None = None

        for provider in providers:
            try:
                response_text = await provider(prompt)
                return self._extract_json(response_text)
            except (ValueError, RuntimeError, KeyError, TypeError, JSONDecodeError) as exc:
                logger.exception("Provider %s failed", provider.__name__)
                last_error = exc

        raise RuntimeError(f"All LLM providers failed. Last error: {last_error}")

    @with_retries
    async def _call_groq(self, prompt: str) -> str:
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY missing")

        async with get_async_client(timeout=90.0) as client:
            res = ensure_success(
                await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.groq_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.groq_model,
                        "temperature": 0.2,
                        "response_format": {"type": "json_object"},
                        "messages": [
                            {"role": "system", "content": "Return strictly valid JSON only."},
                            {"role": "user", "content": prompt},
                        ],
                    },
                )
            )
            payload = res.json()
        return payload["choices"][0]["message"]["content"]

    @with_retries
    async def _call_huggingface(self, prompt: str) -> str:
        if not settings.huggingface_api_key:
            raise ValueError("HUGGINGFACE_API_KEY missing")

        async with get_async_client(timeout=90.0) as client:
            res = ensure_success(
                await client.post(
                    f"https://api-inference.huggingface.co/models/{settings.huggingface_model}",
                    headers={"Authorization": f"Bearer {settings.huggingface_api_key}"},
                    json={
                        "inputs": prompt,
                        "parameters": {"temperature": 0.2, "return_full_text": False},
                        "options": {"wait_for_model": True},
                    },
                )
            )
            payload = res.json()

        if isinstance(payload, list) and payload:
            return payload[0].get("generated_text", "")
        if isinstance(payload, dict) and "generated_text" in payload:
            return payload["generated_text"]
        raise ValueError(f"Unexpected Hugging Face payload: {payload}")

    @with_retries
    async def _call_openrouter(self, prompt: str) -> str:
        if not settings.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY missing")

        async with get_async_client(timeout=90.0) as client:
            res = ensure_success(
                await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.openrouter_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.openrouter_model,
                        "temperature": 0.2,
                        "response_format": {"type": "json_object"},
                        "messages": [
                            {"role": "system", "content": "Return strictly valid JSON only."},
                            {"role": "user", "content": prompt},
                        ],
                    },
                )
            )
            payload = res.json()
        return payload["choices"][0]["message"]["content"]

    def _extract_json(self, text: str) -> dict[str, Any]:
        text = text.strip()
        if text.startswith("```"):
            text = text.strip("`")
            text = text.replace("json", "", 1).strip()
        return json.loads(text)
