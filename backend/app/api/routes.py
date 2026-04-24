from fastapi import APIRouter, HTTPException

from ..models.schemas import ErrorResponse, ItineraryRequest, ItineraryResponse
from ..orchestrator import TravelPlannerOrchestrator

router = APIRouter()
orchestrator = TravelPlannerOrchestrator()


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
