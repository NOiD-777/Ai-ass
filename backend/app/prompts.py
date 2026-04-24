from .models.schemas import ItineraryRequest


def build_planner_prompt(request: ItineraryRequest, context_docs: list[str], budget_summary: str) -> str:
    context_text = "\n".join(context_docs[:20])
    preferences_text = ", ".join(request.preferences) if request.preferences else "general travel"

    return f"""
You are a senior travel planning AI. Produce realistic, budget-aware, day-by-day itinerary JSON.

Constraints:
- Destination: {request.destination}
- Total budget: {request.budget}
- Days: {request.days}
- Preferences: {preferences_text}
- Budget summary guidance: {budget_summary}

Retrieved travel context:
{context_text}

STRICT OUTPUT JSON SHAPE:
{{
  "destination": "string",
  "total_budget": number,
  "days": [
    {{
      "day": number,
      "activities": ["string"],
      "meals": ["string"],
      "stay": "string",
      "cost_breakdown": {{
        "transport": number,
        "activities": number,
        "meals": number,
        "stay": number,
        "misc": number,
        "daily_total": number
      }}
    }}
  ],
  "total_estimated_cost": number
}}

Rules:
- Keep total_estimated_cost <= total_budget whenever feasible.
- Ensure each day has practical travel time and meal suggestions.
- Use numeric values for all costs.
- Return valid JSON only.
""".strip()
