from ..core.config import settings
from .http_client import get_async_client
from ..utils.retry import ensure_success, with_retries


class EmbeddingService:
    @with_retries
    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if str(settings.embedding_provider).lower() == "openrouter":
            return await self._embed_openrouter(texts)
        return await self._embed_huggingface(texts)

    async def _embed_huggingface(self, texts: list[str]) -> list[list[float]]:
        if not settings.huggingface_api_key:
            raise ValueError("HUGGINGFACE_API_KEY is required for Hugging Face embeddings")

        async with get_async_client(timeout=60.0) as client:
            headers = {"Authorization": f"Bearer {settings.huggingface_api_key}"}
            body = {"inputs": texts, "options": {"wait_for_model": True}}
            endpoints = [
                f"https://router.huggingface.co/hf-inference/models/{settings.huggingface_embedding_model}",
                f"https://api-inference.huggingface.co/models/{settings.huggingface_embedding_model}",
                f"https://api-inference.huggingface.co/pipeline/feature-extraction/{settings.huggingface_embedding_model}",
            ]

            res = None
            for endpoint in endpoints:
                res = await client.post(endpoint, headers=headers, json=body)
                if res.status_code not in (403, 404, 405):
                    break

            if res is None:
                raise ValueError("Failed to call Hugging Face embeddings endpoint")

            payload = ensure_success(res).json()

        if isinstance(payload, list) and payload and isinstance(payload[0][0], float):
            return payload
        if isinstance(payload, list) and payload and isinstance(payload[0], list):
            return payload
        raise ValueError(f"Unexpected HF embedding payload shape: {type(payload)}")

    async def _embed_openrouter(self, texts: list[str]) -> list[list[float]]:
        if not settings.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY is required for OpenRouter embeddings")

        async with get_async_client(timeout=60.0) as client:
            res = ensure_success(
                await client.post(
                    "https://openrouter.ai/api/v1/embeddings",
                    headers={
                        "Authorization": f"Bearer {settings.openrouter_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={"model": settings.openrouter_embedding_model, "input": texts},
                )
            )
            payload = res.json()

        return [item["embedding"] for item in payload.get("data", [])]
