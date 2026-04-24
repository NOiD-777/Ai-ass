from typing import Any

from pydantic import BaseModel, Field


class ItineraryRequest(BaseModel):
    destination: str = Field(min_length=2)
    budget: float = Field(gt=0)
    days: int = Field(gt=0, le=30)
    preferences: list[str] = Field(default_factory=list)


class DayPlan(BaseModel):
    day: int
    activities: list[str]
    meals: list[str]
    stay: str
    cost_breakdown: dict[str, float]


class ItineraryResponse(BaseModel):
    destination: str
    total_budget: float
    days: list[DayPlan]
    total_estimated_cost: float


class ErrorResponse(BaseModel):
    detail: str


class TravelContext(BaseModel):
    attractions: list[dict[str, Any]] = Field(default_factory=list)
    hotels: list[dict[str, Any]] = Field(default_factory=list)
    flights: list[dict[str, Any]] = Field(default_factory=list)
    distances: list[dict[str, Any]] = Field(default_factory=list)
    rag_docs: list[str] = Field(default_factory=list)
