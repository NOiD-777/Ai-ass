import json
import logging

from ..models.schemas import ItineraryRequest, TravelContext
from ..services.travel_apis import TravelApiService
from ..services.llm import LLMService


logger = logging.getLogger(__name__)


class ResearchAgent:
    def __init__(self) -> None:
        self.travel_api = TravelApiService()
        self.llm = LLMService()

    async def run(self, request: ItineraryRequest) -> TravelContext:
        attractions = await self.travel_api.get_attractions(request.destination)
        hotels = await self.travel_api.get_hotels(request.destination)
        food_places = await self.travel_api.get_food_places(request.destination)

        iata_prompt = f"Return a JSON object with 'origin_iata' and 'destination_iata' containing the 3-letter uppercase IATA airport codes for '{request.origin}' and '{request.destination}'. ONLY JSON."
        try:
            iata_data = await self.llm.generate_json(iata_prompt)
            origin_iata = iata_data.get("origin_iata", request.origin)
            dest_iata = iata_data.get("destination_iata", request.destination)
        except Exception as exc:
            logger.warning("Failed to get IATA codes: %s", exc)
            origin_iata = request.origin
            dest_iata = request.destination

        flights = await self.travel_api.get_flights(origin_iata, dest_iata, request.travel_date)

        place_names = [item.get("name", "") for item in attractions if item.get("name")]
        distances = await self.travel_api.get_distances(request.destination, place_names)

        docs = [
            json.dumps({"source": "attraction", "data": a}, ensure_ascii=True)
            for a in attractions[:20]
        ] + [
            json.dumps({"source": "hotel", "data": h}, ensure_ascii=True)
            for h in hotels[:10]
        ] + [
            json.dumps({"source": "food_place", "data": f}, ensure_ascii=True)
            for f in food_places[:12]
        ] + [
            json.dumps({"source": "flight", "data": f}, ensure_ascii=True)
            for f in flights[:5]
        ] + [
            json.dumps({"source": "distance", "data": d}, ensure_ascii=True)
            for d in distances[:10]
        ]

        api_docs = docs[:8]

        return TravelContext(
            attractions=attractions,
            hotels=hotels,
            food_places=food_places,
            flights=flights,
            distances=distances,
            api_docs=api_docs,
        )
