import re

from pydantic import ValidationError

from ..models.schemas import ItineraryRequest, ItineraryResponse, TravelContext


def _to_float(value: object) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = re.sub(r"[^0-9.\-]", "", value)
        if not cleaned:
            return 0.0
        try:
            return float(cleaned)
        except ValueError:
            return 0.0
    return 0.0


def _is_generic_stay(stay: str) -> bool:
    text = stay.strip().lower()
    generic_markers = [
        "tbd",
        "budget hotel",
        "mid-range hotel",
        "comfort hotel",
        "hostel",
        "accommodation",
    ]
    return any(marker in text for marker in generic_markers)


def _pick_stay(current_stay: str, hotel_names: list[str], index: int) -> str:
    if not hotel_names:
        return current_stay or "TBD"

    stay = current_stay.strip()
    known_hotel_in_stay = any(name.lower() in stay.lower() for name in hotel_names)
    if not stay or _is_generic_stay(stay) or not known_hotel_in_stay:
        return hotel_names[index % len(hotel_names)]
    return stay


def _recompute_breakdown(breakdown: dict) -> None:
    for key in ("transport", "activities", "meals", "stay", "misc"):
        breakdown[key] = _to_float(breakdown.get(key, 0.0))

    breakdown["daily_total"] = round(
        breakdown["transport"]
        + breakdown["activities"]
        + breakdown["meals"]
        + breakdown["stay"]
        + breakdown["misc"],
        2,
    )


def _sum_days_total(days: list[dict]) -> float:
    return round(
        sum(_to_float(day.get("cost_breakdown", {}).get("daily_total", 0.0)) for day in days),
        2,
    )


def _fix_missing_meals(day: dict, food_place_names: list[str], day_index: int) -> None:
    meals = day.get("meals", [])
    if not isinstance(meals, list):
        meals = []

    meal_types = ["Breakfast", "Lunch", "Dinner"]
    typed_meals = {mt: None for mt in meal_types}
    for m in meals:
        for mt in meal_types:
            if mt.lower() in str(m).lower() and typed_meals[mt] is None:
                typed_meals[mt] = m
                break

    new_meals = []
    for i, mt in enumerate(meal_types):
        if typed_meals[mt]:
            new_meals.append(typed_meals[mt])
        else:
            if food_place_names:
                # Rotate through available food places
                place = food_place_names[(day_index * 3 + i) % len(food_place_names)]
                new_meals.append(f"{mt} at {place} ($20)")
            else:
                new_meals.append(f"{mt} at local eatery ($15)")
    day["meals"] = new_meals


def _normalize_days(days: list[dict], hotel_names: list[str], food_place_names: list[str], distances: list[dict] = None) -> None:
    # Calculate a rough transport fallback if needed
    avg_transport = 15.0
    if distances:
        total_dist = 0.0
        for d in distances:
            match = re.search(r"(\d+(\.\d+)?)", d.get("distance_text", "0"))
            if match:
                total_dist += float(match.group(1))
        if total_dist > 0:
            avg_transport = round((total_dist * 1.5) / max(1, len(days)), 2)

    for i, day in enumerate(days, start=1):
        day.setdefault("day", i)
        day.setdefault("activities", [])
        day.setdefault("meals", [])
        day.setdefault("stay", "TBD")
        day.setdefault("food_places", [])
        day.setdefault("cost_breakdown", {})

        day["stay"] = _pick_stay(str(day.get("stay", "")), hotel_names, i - 1)
        _fix_missing_meals(day, food_place_names, i - 1)

        breakdown = day["cost_breakdown"]
        # If transport is 0 or missing, use the calculated average
        transport = _to_float(breakdown.get("transport", 0.0))
        if transport <= 0:
            breakdown["transport"] = avg_transport
        
        breakdown.setdefault("activities", 0.0)
        breakdown.setdefault("meals", 0.0)
        breakdown.setdefault("stay", 0.0)
        breakdown.setdefault("misc", 0.0)
        _recompute_breakdown(breakdown)


def _extract_food_place_names(food_places: list[dict]) -> list[str]:
    names: list[str] = []
    for item in food_places:
        name = str(item.get("name", "")).strip()
        if not name:
            continue
        vicinity = str(item.get("vicinity", "")).strip()
        if vicinity:
            names.append(f"{name} · {vicinity}")
        else:
            names.append(name)
    return names


def _attach_food_places(days: list[dict], food_place_names: list[str]) -> None:
    if not food_place_names:
        return

    for i, day in enumerate(days):
        existing = day.get("food_places", [])
        if isinstance(existing, list) and existing:
            continue

        start = (i * 3) % len(food_place_names)
        suggestions = [food_place_names[(start + offset) % len(food_place_names)] for offset in range(min(3, len(food_place_names)))]
        day["food_places"] = suggestions


def _scale_days_to_budget(days: list[dict], budget: float, total: float) -> None:
    if total <= budget or budget <= 0:
        return

    scale = budget / total
    for day in days:
        breakdown = day.get("cost_breakdown", {})
        for key in ("transport", "activities", "meals", "stay", "misc"):
            breakdown[key] = round(_to_float(breakdown.get(key, 0.0)) * scale, 2)
        _recompute_breakdown(breakdown)


class FormatterAgent:
    def run(self, request: ItineraryRequest, raw_plan: dict, context: TravelContext) -> ItineraryResponse:
        raw_plan.setdefault("destination", request.destination)
        raw_plan["total_budget"] = float(request.budget)

        hotel_names = [
            str(hotel.get("name", "")).strip()
            for hotel in context.hotels
            if str(hotel.get("name", "")).strip()
        ]

        days = raw_plan.get("days", [])
        if isinstance(days, list):
            food_place_names = _extract_food_place_names(context.food_places)
            _normalize_days(days, hotel_names, food_place_names, context.distances)
            _attach_food_places(days, food_place_names)
            total = _sum_days_total(days)
            _scale_days_to_budget(days, request.budget, total)
            total = _sum_days_total(days)
        else:
            total = 0.0

        # Include flights cost in total
        flights_cost = _to_float(raw_plan.get("flights_cost", 0.0))
        return_flights_cost = _to_float(raw_plan.get("return_flights_cost", 0.0))
        raw_plan["flights_cost"] = flights_cost
        raw_plan["return_flights_cost"] = return_flights_cost
        raw_plan["total_estimated_cost"] = round(total + flights_cost + return_flights_cost, 2)

        # Ensure return_flight_suggestions exists
        raw_plan.setdefault("return_flight_suggestions", [])

        try:
            return ItineraryResponse.model_validate(raw_plan)
        except ValidationError as exc:
            raise ValueError(f"Invalid itinerary JSON format: {exc}") from exc
