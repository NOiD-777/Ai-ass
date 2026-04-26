import logging

import httpx
from fastapi import APIRouter, HTTPException

from ..models.schemas import ErrorResponse, ItineraryRequest, ItineraryResponse
from ..orchestrator import TravelPlannerOrchestrator
from ..services.http_client import get_async_client

router = APIRouter()
orchestrator = TravelPlannerOrchestrator()
logger = logging.getLogger(__name__)

FALLBACK_USD_RATES: dict[str, float] = {
    "USD": 1.0,
    "EUR": 0.92,
    "GBP": 0.79,
    "INR": 83.5,
    "JPY": 154.0,
    "CAD": 1.36,
    "AUD": 1.53,
    "SGD": 1.35,
    "AED": 3.67,
}


@router.post(
    "/generate-itinerary",
    response_model=ItineraryResponse,
    responses={500: {"model": ErrorResponse}},
)
async def generate_itinerary(payload: ItineraryRequest) -> ItineraryResponse:
    try:
        return await orchestrator.generate_itinerary(payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/exchange-rates")
async def exchange_rates() -> dict[str, object]:
    try:
        async with get_async_client(timeout=20.0) as client:
            res = await client.get("https://api.frankfurter.app/latest", params={"from": "USD"})
            res.raise_for_status()
            payload = res.json()

        rates = payload.get("rates", {})
        if not isinstance(rates, dict) or not rates:
            raise ValueError("Invalid rate payload")

        return {
            "base": "USD",
            "rates": {"USD": 1.0, **rates},
            "source": "frankfurter",
        }
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        logger.warning("Failed to load live exchange rates, using fallback values: %s", exc)
        return {
            "base": "USD",
            "rates": FALLBACK_USD_RATES,
            "source": "fallback",
        }
