import logging
from typing import Any
import httpx

from ..core.config import settings
from .http_client import get_async_client
from ..utils.retry import ensure_success, with_retries

logger = logging.getLogger(__name__)


def _extract_lat_lng(payload: dict[str, Any]) -> tuple[float | None, float | None]:
    results = payload.get("results", [])
    if not results:
        return None, None

    location = results[0].get("geometry", {}).get("location", {})
    return location.get("lat"), location.get("lng")


def _append_places(target: list[dict[str, Any]], response_json: dict[str, Any]) -> None:
    for item in response_json.get("results", []):
        name = str(item.get("name", "")).strip()
        if not name:
            continue
        target.append(
            {
                "name": name,
                "vicinity": item.get("vicinity", item.get("formatted_address", "")),
                "rating": item.get("rating"),
                "user_ratings_total": item.get("user_ratings_total"),
                "types": item.get("types", []),
            }
        )


def _dedupe_places(places: list[dict[str, Any]]) -> list[dict[str, Any]]:
    unique: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in places:
        key = str(item.get("name", "")).lower()
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


class TravelApiService:
    @with_retries
    async def get_attractions(self, destination: str) -> list[dict[str, Any]]:
        if not settings.opentripmap_api_key:
            logger.warning("OPENTRIPMAP_API_KEY is not configured. Returning empty attractions.")
            return []

        try:
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
        except httpx.HTTPError as exc:
            logger.warning("OpenTripMap request failed for destination=%s: %s", destination, exc)
            return []

    @with_retries
    async def get_hotels(self, destination: str) -> list[dict[str, Any]]:
        if not settings.google_maps_api_key:
            logger.warning("GOOGLE_MAPS_API_KEY is not configured. Returning empty hotels.")
            return []

        try:
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
        except httpx.HTTPError as exc:
            logger.warning("Google Maps hotel request failed for destination=%s: %s", destination, exc)
            return []

    @with_retries
    async def get_food_places(self, destination: str) -> list[dict[str, Any]]:
        if not settings.google_maps_api_key:
            logger.warning("GOOGLE_MAPS_API_KEY is not configured. Returning empty food places.")
            return []

        try:
            async with get_async_client() as client:
                geocode = ensure_success(
                    await client.get(
                        "https://maps.googleapis.com/maps/api/geocode/json",
                        params={"address": destination, "key": settings.google_maps_api_key},
                    )
                ).json()
                lat, lng = _extract_lat_lng(geocode)
                if lat is None or lng is None:
                    return []

                places: list[dict[str, Any]] = []

                for place_type in ("restaurant", "cafe", "bakery"):
                    response = ensure_success(
                        await client.get(
                            "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
                            params={
                                "location": f"{lat},{lng}",
                                "radius": 5000,
                                "type": place_type,
                                "key": settings.google_maps_api_key,
                            },
                        )
                    ).json()
                    _append_places(places, response)

                if not places:
                    for query in (
                        f"restaurants in {destination}",
                        f"cafes in {destination}",
                        f"food places in {destination}",
                    ):
                        response = ensure_success(
                            await client.get(
                                "https://maps.googleapis.com/maps/api/place/textsearch/json",
                                params={
                                    "query": query,
                                    "region": "us",
                                    "key": settings.google_maps_api_key,
                                },
                            )
                        ).json()
                        _append_places(places, response)
                        if len(places) >= 12:
                            break

                unique = _dedupe_places(places)
                if not unique:
                    logger.warning("Google Maps food search returned no candidates for destination=%s", destination)
                else:
                    logger.info(
                        "Google Maps food search returned %s candidates for destination=%s",
                        len(unique),
                        destination,
                    )

                return unique[:12]
        except httpx.HTTPError as exc:
            logger.warning("Google Maps food-place request failed for destination=%s: %s", destination, exc)
            return []

    @with_retries
    async def get_distances(self, destination: str, places: list[str]) -> list[dict[str, Any]]:
        if not settings.google_maps_api_key or not places:
            return []

        origins = destination
        destinations = "|".join(places[:8])
        try:
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
        except httpx.HTTPError as exc:
            logger.warning("Google Maps distance request failed for destination=%s: %s", destination, exc)
            return []

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
    async def get_flights(self, origin: str, destination: str, outbound_date: str) -> list[dict[str, Any]]:
        if not settings.serpapi_api_key:
            logger.warning("SERPAPI_API_KEY is not configured. Returning empty flights.")
            return []

        try:
            async with get_async_client() as client:
                res = ensure_success(
                    await client.get(
                        "https://serpapi.com/search",
                        params={
                            "engine": "google_flights",
                            "departure_id": origin,
                            "arrival_id": destination,
                            "outbound_date": outbound_date,
                            "type": "2",
                            "api_key": settings.serpapi_api_key,
                        },
                    )
                )
                data = res.json()
                flights = data.get("best_flights", [])
                if not flights:
                    flights = data.get("flights", [])
                return flights[:10]
        except httpx.HTTPError as exc:
            logger.warning("SerpAPI flight request failed for destination=%s: %s", destination, exc)
            return []
