from ..models.schemas import ItineraryRequest
from ..prompts import build_planner_prompt
from ..services.llm import LLMService


class PlannerAgent:
    def __init__(self) -> None:
        self.llm_service = LLMService()

    async def run(self, request: ItineraryRequest, rag_docs: list[str], budget_summary: str) -> dict:
        prompt = build_planner_prompt(request, rag_docs, budget_summary)
        return await self.llm_service.generate_json(prompt)
