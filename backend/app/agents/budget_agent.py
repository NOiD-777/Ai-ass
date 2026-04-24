from ..models.schemas import ItineraryRequest, TravelContext


class BudgetAgent:
    async def run(self, request: ItineraryRequest, context: TravelContext) -> str:
        per_day = request.budget / request.days
        hotel_hint = "mid-range"
        if per_day < 80:
            hotel_hint = "hostel or budget hotel"
        elif per_day > 250:
            hotel_hint = "comfort hotel"

        attraction_count = len(context.attractions)
        return (
            f"Target daily budget is {per_day:.2f}. Prefer {hotel_hint}. "
            f"Found {attraction_count} attractions from data providers. "
            "Reserve 10-15% for contingency and local transport."
        )
