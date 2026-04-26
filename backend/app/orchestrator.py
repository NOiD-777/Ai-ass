from .agents.budget_agent import BudgetAgent
from .agents.formatter_agent import FormatterAgent
from .agents.planner_agent import PlannerAgent
from .agents.research_agent import ResearchAgent
from .models.schemas import ItineraryRequest, ItineraryResponse


class TravelPlannerOrchestrator:
    def __init__(self) -> None:
        self.research_agent = ResearchAgent()
        self.budget_agent = BudgetAgent()
        self.planner_agent = PlannerAgent()
        self.formatter_agent = FormatterAgent()

    async def generate_itinerary(self, request: ItineraryRequest) -> ItineraryResponse:
        context = await self.research_agent.run(request)
        budget_summary = await self.budget_agent.run(request, context)
        raw_plan = await self.planner_agent.run(request, context, budget_summary)
        return self.formatter_agent.run(request, raw_plan, context)
