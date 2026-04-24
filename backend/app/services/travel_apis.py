import logging
from typing import Any

from ..core.config import settings
from .http_client import get_async_client
from ..utils.retry import ensure_success, with_retries

logger = logging.getLogger(__name__)


class TravelApiService:
    @with_retries
    async def get_attractions(self, destination: str) -> list[dict[str, Any]]:
        if not settings.opentripmap_api_key:
            logger.warning("OPENTRIPMAP_API_KEY is not configured. Returning empty attractions.")
            return []

        async with get_async_client() as client:
            geo_res = ensure_success(
                await client.get(
                    "https://api.opentripmap.com/0.1/en/places/geoname",
                    params={"name": destination, "apikey": settings.opentripmap_api_key},
                )
            )
            geo_data = geo_res.json()
            lat, lon = geo_data.get("lat"), geo_data.get("lon")
            if lat is None or lon is None:
                return []

            res = ensure_success(
                await client.get(
                    "https://api.opentripmap.com/0.1/en/places/radius",
                    params={
                        "radius": 5000,
                        "lon": lon,
                        "lat": lat,
                        "limit": 20,
                        "rate": 2,
                        "format": "json",
                        "apikey": settings.opentripmap_api_key,
                    },
                )
            )
            return res.json()

    @with_retries
    async def get_hotels(self, destination: str) -> list[dict[str, Any]]:
        if not settings.google_maps_api_key:
            logger.warning("GOOGLE_MAPS_API_KEY is not configured. Returning empty hotels.")
            return []

        async with get_async_client() as client:
            geocode = ensure_success(
                await client.get(
                    "https://maps.googleapis.com/maps/api/geocode/json",
                    params={"address": destination, "key": settings.google_maps_api_key},
                )
            ).json()
            results = geocode.get("results", [])
            if not results:
                return []

            location = results[0].get("geometry", {}).get("location", {})
            lat, lng = location.get("lat"), location.get("lng")
            if lat is None or lng is None:
                return []

            hotels = ensure_success(
                await client.get(
                    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
                    params={
                        "location": f"{lat},{lng}",
                        "radius": 4000,
                        "type": "lodging",
                        "key": settings.google_maps_api_key,
                    },
                )
            ).json()
            return hotels.get("results", [])[:10]

    @with_retries
    async def get_distances(self, destination: str, places: list[str]) -> list[dict[str, Any]]:
        if not settings.google_maps_api_key or not places:
            return []

        origins = destination
        destinations = "|".join(places[:8])
        async with get_async_client() as client:
            res = ensure_success(
                await client.get(
                    "https://maps.googleapis.com/maps/api/distancematrix/json",
                    params={
                        "origins": origins,
                        "destinations": destinations,
                        "key": settings.google_maps_api_key,
                    },
                )
            )
            data = res.json()

        rows = data.get("rows", [])
        if not rows:
            return []

        distances: list[dict[str, Any]] = []
        elements = rows[0].get("elements", [])
        for idx, element in enumerate(elements):
            distances.append(
                {
                    "place": places[idx] if idx < len(places) else f"place-{idx}",
                    "distance_text": element.get("distance", {}).get("text", "unknown"),
                    "duration_text": element.get("duration", {}).get("text", "unknown"),
                }
            )
        return distances

    @with_retries
    async def get_flights(self, destination: str) -> list[dict[str, Any]]:
        if not settings.skyscanner_api_key:
            logger.warning("SKYSCANNER_API_KEY is not configured. Returning empty flights.")
            return []

        async with get_async_client() as client:
            res = ensure_success(
                await client.get(
                    "https://partners.api.skyscanner.net/apiservices/v3/flights/live/search/create",
                    headers={"x-api-key": settings.skyscanner_api_key},
                    params={"destination": destination},
                )
            )
            return [res.json()]
