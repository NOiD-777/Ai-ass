import re
from ..models.schemas import ItineraryRequest, TravelContext


class BudgetAgent:
    async def run(self, request: ItineraryRequest, context: TravelContext) -> str:
        per_day = request.budget / request.days
        
        # Hotel guidance
        hotel_hint = "mid-range"
        if per_day < 80:
            hotel_hint = "hostel or budget hotel"
        elif per_day > 250:
            hotel_hint = "luxury or comfort hotel"

        # Transport estimate based on distances
        total_dist_km = 0.0
        for d in context.distances:
            dist_text = d.get("distance_text", "0")
            # Extract numbers (e.g., "5.2 km" -> 5.2)
            match = re.search(r"(\d+(\.\d+)?)", dist_text)
            if match:
                total_dist_km += float(match.group(1))
        
        # Estimate $1.5 per km for local transport (taxis/rideshare)
        # and add a base daily amount for public transport/walking
        transport_cost_total = (total_dist_km * 1.5) + (request.days * 10)
        daily_transport = round(transport_cost_total / request.days, 2) if request.days > 0 else 15.0

        # Meal guidance based on budget
        meal_budget = per_day * 0.25  # 25% for meals
        meal_hint = f"approx {meal_budget:.2f} per day"
        if meal_budget < 30:
            meal_hint += " (budget: focus on street food and local cafes)"
        elif meal_budget > 100:
            meal_hint += " (premium: includes fine dining and high-end restaurants)"
        else:
            meal_hint += " (moderate: mix of casual dining and local bistros)"

        attraction_count = len(context.attractions)
        return (
            f"Target daily budget is {per_day:.2f}. "
            f"Strongly prefer {hotel_hint} (estimated at {per_day * 0.4:.2f} per night). "
            f"Local transport estimate: approx {daily_transport:.2f} per day based on {total_dist_km:.1f}km total travel. "
            f"Meal budget: {meal_hint}. Allocate 10% for miscellaneous."
        )
