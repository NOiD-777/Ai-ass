from .models.schemas import ItineraryRequest


def build_planner_prompt(
    request: ItineraryRequest,
    context_docs: list[str],
    hotels: list[dict],
    food_places: list[dict],
    flights: list[dict],
    return_flights: list[dict],
    budget_summary: str,
) -> str:
    context_text = "\n".join(context_docs[:20])
    preferences_text = ", ".join(request.preferences) if request.preferences else "general travel"
    hotel_names = [str(h.get("name", "")).strip() for h in hotels if str(h.get("name", "")).strip()]
    hotel_text = ", ".join(hotel_names[:12]) if hotel_names else "No provider hotel names available"
    
    food_names = [
        f"{str(item.get('name', '')).strip()} (Price Level: {item.get('price_level', 'N/A')}, Location: {str(item.get('vicinity', '')).strip()})"
        for item in food_places
        if str(item.get("name", "")).strip()
    ]
    food_text = ", ".join(food_names[:12]) if food_names else "No provider food places available"

    # Format outbound flight options
    flight_options = []
    for f in flights:
        price = f.get('price', 'Unknown')
        legs = f.get('flights', [])
        airline = legs[0].get('airline', 'Unknown') if legs else 'Unknown'
        dep_time = legs[0].get('departure_airport', {}).get('time', '') if legs else ''
        arr_time = legs[-1].get('arrival_airport', {}).get('time', '') if legs else ''
        total_dur = f.get('total_duration', '')
        stops = max(0, len(legs) - 1)
        flight_options.append(f"{airline} (Price: {price}, Depart: {dep_time}, Arrive: {arr_time}, Duration: {total_dur}min, Stops: {stops})")
    flight_text = ", ".join(flight_options[:5]) if flight_options else "No real-time outbound flight data available"

    # Format return flight options
    return_flight_options = []
    for f in return_flights:
        price = f.get('price', 'Unknown')
        legs = f.get('flights', [])
        airline = legs[0].get('airline', 'Unknown') if legs else 'Unknown'
        dep_time = legs[0].get('departure_airport', {}).get('time', '') if legs else ''
        arr_time = legs[-1].get('arrival_airport', {}).get('time', '') if legs else ''
        total_dur = f.get('total_duration', '')
        stops = max(0, len(legs) - 1)
        return_flight_options.append(f"{airline} (Price: {price}, Depart: {dep_time}, Arrive: {arr_time}, Duration: {total_dur}min, Stops: {stops})")
    return_flight_text = ", ".join(return_flight_options[:5]) if return_flight_options else "No real-time return flight data available"

    return f"""
You are a senior travel planning AI. Produce realistic, budget-aware, day-by-day itinerary JSON.

Constraints:
- Origin: {request.origin}
- Destination: {request.destination}
- Travel date: {request.travel_date}
- Return date: {request.return_date or 'N/A'}
- Total budget: {request.budget}
- Days: {request.days}
- Preferences: {preferences_text}
- Budget summary guidance: {budget_summary}
- Hotel candidates from live provider data: {hotel_text}
- Food place candidates from Google Maps: {food_text}
- Outbound flight options from live provider data: {flight_text}
- Return flight options from live provider data: {return_flight_text}

Retrieved travel context:
{context_text}

STRICT OUTPUT JSON SHAPE:
{{
  "destination": "string",
  "total_budget": number,
  "flights_cost": number,
  "return_flights_cost": number,
  "flight_suggestions": [
    {{
      "airline": "string",
      "route": "string",
      "departure_time": "string (e.g. '08:30 AM')",
      "arrival_time": "string (e.g. '02:45 PM')",
      "duration": "string (e.g. '6h 15m')",
      "stops": number,
      "date": "string",
      "price": number,
      "trip_type": "outbound"
    }}
  ],
  "return_flight_suggestions": [
    {{
      "airline": "string",
      "route": "string",
      "departure_time": "string",
      "arrival_time": "string",
      "duration": "string",
      "stops": number,
      "date": "string",
      "price": number,
      "trip_type": "return"
    }}
  ],
  "ground_transport": [
    {{
      "mode": "string (bus or train)",
      "route": "string",
      "duration": "string",
      "price": number,
      "description": "string"
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
- Estimate flights_cost for outbound based on "Outbound flight options" and return_flights_cost for return based on "Return flight options". Include both in total_estimated_cost.
- If real-time flight data is NOT available, leave 'flight_suggestions' and 'return_flight_suggestions' as empty lists [].
- If flights are unavailable, you MUST provide at least 2 'ground_transport' options (e.g., one Bus and one Train) with realistic estimated costs and durations based on the distance.
- For ground transport, include a short 'description' of how to book or where to catch the transport.
- For each flight include departure_time, arrival_time, duration (human-readable like '6h 15m'), and stops count.
- Use strictly numeric values for 'price' (USD). Do NOT include currency symbols.
- Ensure each day has practical travel time and include specific suggestions for Breakfast, Lunch, and Dinner.
- In 'meals', provide 3 descriptive suggestions (one for each: Breakfast, Lunch, and Dinner) like 'Breakfast at [Place] ($[Cost])', 'Lunch at [Place] ($[Cost])', etc.
- Estimates for meals should be realistic based on the 'Price Level' (1=Budget, 2=Moderate, 3=Expensive, 4=Luxury).
- Use exact hotel names from "Hotel candidates" for each day's stay whenever available. If none are available, suggest a realistic hotel name based on the destination.
- Do NOT use generic stay labels like "budget hotel", "hostel", or "mid-range hotel".
- Use the "Local transport estimate" from the budget summary to fill in the "transport" cost in each day's cost_breakdown.
- Include 2 to 4 real restaurant or cafe suggestions from "Food place candidates" in each day's "food_places" list when available.
- Use numeric values for all costs.
- Return valid JSON only.
""".strip()
