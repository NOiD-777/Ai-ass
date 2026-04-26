from typing import Any

from pydantic import BaseModel, Field


class ItineraryRequest(BaseModel):
    origin: str = Field(min_length=2)
    destination: str = Field(min_length=2)
    travel_date: str = Field(min_length=2)
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
    date: str
    price: float


class ItineraryResponse(BaseModel):
    destination: str
    total_budget: float
    flights_cost: float = Field(default=0.0)
    flight_suggestions: list[FlightSuggestion] = Field(default_factory=list)
    days: list[DayPlan]
    total_estimated_cost: float


class ErrorResponse(BaseModel):
    detail: str


class TravelContext(BaseModel):
    attractions: list[dict[str, Any]] = Field(default_factory=list)
    hotels: list[dict[str, Any]] = Field(default_factory=list)
    food_places: list[dict[str, Any]] = Field(default_factory=list)
    flights: list[dict[str, Any]] = Field(default_factory=list)
    distances: list[dict[str, Any]] = Field(default_factory=list)
    api_docs: list[str] = Field(default_factory=list)
