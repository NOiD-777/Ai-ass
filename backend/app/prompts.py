from .models.schemas import ItineraryRequest


def build_planner_prompt(
    request: ItineraryRequest,
    context_docs: list[str],
    hotels: list[dict],
    food_places: list[dict],
    flights: list[dict],
    budget_summary: str,
) -> str:
    context_text = "\n".join(context_docs[:20])
    preferences_text = ", ".join(request.preferences) if request.preferences else "general travel"
    hotel_names = [str(h.get("name", "")).strip() for h in hotels if str(h.get("name", "")).strip()]
    hotel_text = ", ".join(hotel_names[:12]) if hotel_names else "No provider hotel names available"
    food_names = [
        f"{str(item.get('name', '')).strip()} ({str(item.get('vicinity', '')).strip()})"
        for item in food_places
        if str(item.get("name", "")).strip()
    ]
    food_text = ", ".join(food_names[:12]) if food_names else "No provider food places available"
    flight_options = []
    for f in flights:
        price = f.get('price', 'Unknown')
        airline = f.get('flights', [{}])[0].get('airline', 'Unknown')
        flight_options.append(f"{airline} (Price: {price})")
    flight_text = ", ".join(flight_options[:5]) if flight_options else "No real-time flight data available"

    return f"""
You are a senior travel planning AI. Produce realistic, budget-aware, day-by-day itinerary JSON.

Constraints:
- Origin: {request.origin}
- Destination: {request.destination}
- Travel date: {request.travel_date}
- Total budget: {request.budget}
- Days: {request.days}
- Preferences: {preferences_text}
- Budget summary guidance: {budget_summary}
- Hotel candidates from live provider data: {hotel_text}
- Food place candidates from Google Maps: {food_text}
- Flight options from live provider data: {flight_text}

Retrieved travel context:
{context_text}

STRICT OUTPUT JSON SHAPE:
{{
  "destination": "string",
  "total_budget": number,
  "flights_cost": number,
  "flight_suggestions": [
    {{
      "airline": "string",
      "route": "string",
      "date": "string",
      "price": number
    }}
  ],
  "days": [
    {{
      "day": number,
      "activities": ["string"],
      "meals": ["string"],
      "stay": "string",
      "food_places": ["string"],
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
- Estimate flights_cost based on Origin to Destination and include it in total_estimated_cost. Base it on the "Flight options".
- Include 2 to 3 real flight options from the "Flight options" in 'flight_suggestions'. Use strictly numeric values for 'price' (USD). Do NOT include currency symbols.
- Ensure each day has practical travel time and meal suggestions.
- Use exact hotel names from "Hotel candidates" for each day's stay whenever available.
- Do NOT use generic stay labels like "budget hotel", "hostel", or "mid-range hotel".
- Include 2 to 4 real restaurant or cafe suggestions from "Food place candidates" in each day's "food_places" list when available.
- Use numeric values for all costs.
- Return valid JSON only.
""".strip()
