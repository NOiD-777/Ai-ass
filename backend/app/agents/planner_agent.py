from ..models.schemas import ItineraryRequest, TravelContext
from ..prompts import build_planner_prompt
from ..services.llm import LLMService


class PlannerAgent:
    def __init__(self) -> None:
        self.llm_service = LLMService()

    async def run(self, request: ItineraryRequest, context: TravelContext, budget_summary: str) -> dict:
        prompt = build_planner_prompt(request, context.api_docs, context.hotels, context.food_places, context.flights, context.return_flights, budget_summary)
        return await self.llm_service.generate_json(prompt)
