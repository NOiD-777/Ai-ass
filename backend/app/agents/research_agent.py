import json

from ..models.schemas import ItineraryRequest, TravelContext
from ..services.embeddings import EmbeddingService
from ..services.travel_apis import TravelApiService
from ..services.vector_store import CloudVectorStore


class ResearchAgent:
    def __init__(self) -> None:
        self.travel_api = TravelApiService()
        self.embedding_service = EmbeddingService()
        self.vector_store = CloudVectorStore()

    async def run(self, request: ItineraryRequest) -> TravelContext:
        attractions = await self.travel_api.get_attractions(request.destination)
        hotels = await self.travel_api.get_hotels(request.destination)
        flights = await self.travel_api.get_flights(request.destination)

        place_names = [item.get("name", "") for item in attractions if item.get("name")]
        distances = await self.travel_api.get_distances(request.destination, place_names)

        docs = [
            json.dumps({"source": "attraction", "data": a}, ensure_ascii=True)
            for a in attractions[:20]
        ] + [
            json.dumps({"source": "hotel", "data": h}, ensure_ascii=True)
            for h in hotels[:10]
        ] + [
            json.dumps({"source": "flight", "data": f}, ensure_ascii=True)
            for f in flights[:5]
        ] + [
            json.dumps({"source": "distance", "data": d}, ensure_ascii=True)
            for d in distances[:10]
        ]

        rag_docs: list[str] = []
        if docs:
            embeddings = await self.embedding_service.embed_texts(docs)
            await self.vector_store.index_texts(docs, embeddings)

            query_embedding = (await self.embedding_service.embed_texts([
                f"{request.destination} {','.join(request.preferences)} budget {request.budget}"
            ]))[0]
            rag_docs = await self.vector_store.query(query_embedding, top_k=8)

        if not rag_docs:
            rag_docs = docs[:8]

        return TravelContext(
            attractions=attractions,
            hotels=hotels,
            flights=flights,
            distances=distances,
            rag_docs=rag_docs,
        )
