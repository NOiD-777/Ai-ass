from typing import Any

from pydantic import BaseModel, Field


class ItineraryRequest(BaseModel):
    origin: str = Field(min_length=2)
    destination: str = Field(min_length=2)
    travel_date: str = Field(min_length=2)
    return_date: str = Field(default="", description="Return travel date (YYYY-MM-DD). Auto-computed from travel_date + days if empty.")
    budget: float = Field(gt=0)
    days: int = Field(gt=0, le=30)
    preferences: list[str] = Field(default_factory=list)


class DayPlan(BaseModel):
    day: int
    activities: list[str]
    meals: list[str]
    stay: str
    food_places: list[str] = Field(default_factory=list)
    cost_breakdown: dict[str, float]


class FlightSuggestion(BaseModel):
    airline: str
    route: str
    departure_time: str = Field(default="")
    arrival_time: str = Field(default="")
    duration: str = Field(default="")
    stops: int = Field(default=0)
    date: str
    price: float
    trip_type: str = Field(default="outbound", description="'outbound' or 'return'")


class GroundTransport(BaseModel):
    mode: str = Field(description="'bus' or 'train'")
    route: str
    duration: str
    price: float
    description: str


class ItineraryResponse(BaseModel):
    destination: str
    total_budget: float
    flights_cost: float = Field(default=0.0)
    return_flights_cost: float = Field(default=0.0)
    flight_suggestions: list[FlightSuggestion] = Field(default_factory=list)
    return_flight_suggestions: list[FlightSuggestion] = Field(default_factory=list)
    ground_transport: list[GroundTransport] = Field(default_factory=list)
    days: list[DayPlan]
    total_estimated_cost: float


class ErrorResponse(BaseModel):
    detail: str


class TravelContext(BaseModel):
    attractions: list[dict[str, Any]] = Field(default_factory=list)
    hotels: list[dict[str, Any]] = Field(default_factory=list)
    food_places: list[dict[str, Any]] = Field(default_factory=list)
    flights: list[dict[str, Any]] = Field(default_factory=list)
    return_flights: list[dict[str, Any]] = Field(default_factory=list)
    distances: list[dict[str, Any]] = Field(default_factory=list)
    api_docs: list[str] = Field(default_factory=list)
