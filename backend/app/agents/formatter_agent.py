from pydantic import ValidationError

from ..models.schemas import ItineraryRequest, ItineraryResponse


class FormatterAgent:
    async def run(self, request: ItineraryRequest, raw_plan: dict) -> ItineraryResponse:
        raw_plan.setdefault("destination", request.destination)
        raw_plan.setdefault("total_budget", request.budget)

        if "days" in raw_plan and isinstance(raw_plan["days"], list):
            for i, day in enumerate(raw_plan["days"], start=1):
                day.setdefault("day", i)
                day.setdefault("activities", [])
                day.setdefault("meals", [])
                day.setdefault("stay", "TBD")
                day.setdefault("cost_breakdown", {})

                breakdown = day["cost_breakdown"]
                breakdown.setdefault("transport", 0.0)
                breakdown.setdefault("activities", 0.0)
                breakdown.setdefault("meals", 0.0)
                breakdown.setdefault("stay", 0.0)
                breakdown.setdefault("misc", 0.0)
                if "daily_total" not in breakdown:
                    breakdown["daily_total"] = float(
                        breakdown.get("transport", 0)
                        + breakdown.get("activities", 0)
                        + breakdown.get("meals", 0)
                        + breakdown.get("stay", 0)
                        + breakdown.get("misc", 0)
                    )

        if "total_estimated_cost" not in raw_plan:
            total = 0.0
            for day in raw_plan.get("days", []):
                total += float(day.get("cost_breakdown", {}).get("daily_total", 0.0))
            raw_plan["total_estimated_cost"] = total

        try:
            return ItineraryResponse.model_validate(raw_plan)
        except ValidationError as exc:
            raise ValueError(f"Invalid itinerary JSON format: {exc}") from exc
