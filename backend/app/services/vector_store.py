import logging
import uuid

import chromadb

from ..core.config import settings

logger = logging.getLogger(__name__)


class CloudVectorStore:
    def __init__(self) -> None:
        self.enabled = bool(settings.chroma_host and settings.chroma_api_key and settings.chroma_tenant and settings.chroma_database)
        self.collection = None

        if self.enabled:
            self.client = chromadb.HttpClient(
                host=settings.chroma_host,
                port=settings.chroma_port,
                ssl=settings.chroma_ssl,
                headers={"x-chroma-token": settings.chroma_api_key},
                tenant=settings.chroma_tenant,
                database=settings.chroma_database,
            )
            self.collection = self.client.get_or_create_collection(name=settings.chroma_collection)
        else:
            logger.warning("Chroma cloud config missing. RAG retrieval will fallback to direct API context.")

    async def index_texts(self, texts: list[str], embeddings: list[list[float]]) -> None:
        if not self.enabled or not self.collection or not texts:
            return

        ids = [str(uuid.uuid4()) for _ in texts]
        self.collection.add(ids=ids, documents=texts, embeddings=embeddings)

    async def query(self, query_embedding: list[float], top_k: int = 8) -> list[str]:
        if not self.enabled or not self.collection:
            return []

        result = self.collection.query(query_embeddings=[query_embedding], n_results=top_k)
        docs = result.get("documents", [])
        if not docs:
            return []
        return docs[0]
