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
                "price_level": item.get("price_level"),
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
        # 1. Try to get curated attractions from SerpAPI first
        serp_attractions = []
        if settings.serpapi_api_key:
            try:
                async with get_async_client() as client:
                    res = await client.get(
                        "https://serpapi.com/search",
                        params={
                            "engine": "google",
                            "q": f"top sights in {destination}",
                            "api_key": settings.serpapi_api_key,
                        },
                    )
                    if res.status_code == 200:
                        data = res.json()
                        # Extract from top_sights or knowledge_graph
                        sights = data.get("top_sights", {}).get("sights", [])
                        if not sights:
                            sights = data.get("knowledge_graph", {}).get("top_attractions", [])
                        
                        for s in sights:
                            name = s.get("title") or s.get("name")
                            if name:
                                serp_attractions.append({
                                    "name": name,
                                    "description": s.get("description"),
                                    "source": "serpapi"
                                })
            except Exception as exc:
                logger.warning("SerpAPI attractions failed for %s: %s", destination, exc)

        # 2. Get data from Google Places (either as fallback or for details)
        google_attractions: list[dict[str, Any]] = []
        if settings.google_maps_api_key:
            try:
                async with get_async_client() as client:
                    geocode = await client.get(
                        "https://maps.googleapis.com/maps/api/geocode/json",
                        params={"address": destination, "key": settings.google_maps_api_key},
                    )
                    lat, lng = _extract_lat_lng(geocode.json())
                    
                    if lat is not None and lng is not None:
                        # Nearby search
                        nearby = await client.get(
                            "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
                            params={
                                "location": f"{lat},{lng}",
                                "radius": 10000,
                                "type": "tourist_attraction",
                                "key": settings.google_maps_api_key,
                            },
                        )
                        _append_places(google_attractions, nearby.json())

                        if not google_attractions:
                            # Text search fallback
                            text_search = await client.get(
                                "https://maps.googleapis.com/maps/api/place/textsearch/json",
                                params={
                                    "query": f"tourist attractions in {destination}",
                                    "key": settings.google_maps_api_key,
                                },
                            )
                            _append_places(google_attractions, text_search.json())
            except Exception as exc:
                logger.warning("Google Maps attractions failed for %s: %s", destination, exc)

        # 3. Merge and choose the best names
        # We prioritize SerpAPI names but use Google for metadata (rating, vicinity)
        final_attractions: list[dict[str, Any]] = []
        seen_names: set[str] = set()

        # Add SerpAPI ones first (curated)
        for sa in serp_attractions:
            name_lower = sa["name"].lower()
            if name_lower in seen_names:
                continue
            
            # Try to find matching Google data for ratings/vicinity
            match = next((ga for ga in google_attractions if ga["name"].lower() in name_lower or name_lower in ga["name"].lower()), None)
            if match:
                sa.update({
                    "vicinity": match.get("vicinity"),
                    "rating": match.get("rating"),
                    "user_ratings_total": match.get("user_ratings_total"),
                    "types": match.get("types", [])
                })
            
            final_attractions.append(sa)
            seen_names.add(name_lower)

        # Supplement with remaining Google ones
        for ga in google_attractions:
            name_lower = ga["name"].lower()
            if name_lower not in seen_names:
                final_attractions.append(ga)
                seen_names.add(name_lower)

        return final_attractions[:20]

    @with_retries
    async def get_hotels(self, destination: str) -> list[dict[str, Any]]:
        all_hotels = []

        # 1. Try Google Maps
        if settings.google_maps_api_key:
            try:
                async with get_async_client() as client:
                    geocode_res = await client.get(
                        "https://maps.googleapis.com/maps/api/geocode/json",
                        params={"address": destination, "key": settings.google_maps_api_key},
                    )
                    geocode = geocode_res.json()
                    lat, lng = _extract_lat_lng(geocode)
                    
                    results = []
                    if lat is not None and lng is not None:
                        hotels_res = await client.get(
                            "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
                            params={
                                "location": f"{lat},{lng}",
                                "radius": 8000, # Increased radius
                                "type": "lodging",
                                "key": settings.google_maps_api_key,
                            },
                        )
                        results = hotels_res.json().get("results", [])
                    
                    if not results:
                        # Fallback to text search (doesn't strictly require lat/lng)
                        hotels_res = await client.get(
                            "https://maps.googleapis.com/maps/api/place/textsearch/json",
                            params={
                                "query": f"top hotels in {destination}",
                                "key": settings.google_maps_api_key,
                            },
                        )
                        results = hotels_res.json().get("results", [])

                    for r in results:
                        all_hotels.append({
                            "name": r.get("name"),
                            "vicinity": r.get("vicinity", r.get("formatted_address")),
                            "rating": r.get("rating"),
                            "source": "google"
                        })
            except Exception as exc:
                logger.warning("Google Maps hotel search failed: %s", exc)

        # 2. Try SerpAPI fallback if needed
        if not all_hotels and settings.serpapi_api_key:
            try:
                async with get_async_client() as client:
                    # Try google_maps engine for better local results
                    res = await client.get(
                        "https://serpapi.com/search",
                        params={
                            "engine": "google_maps",
                            "type": "search",
                            "q": f"hotels in {destination}",
                            "api_key": settings.serpapi_api_key,
                        },
                        timeout=20.0
                    )
                    data = res.json()
                    results = data.get("local_results", [])
                    if not results:
                        results = data.get("place_results", [])
                    
                    for h in results:
                        title = h.get("title") or h.get("name")
                        if title:
                            all_hotels.append({
                                "name": title,
                                "vicinity": h.get("address") or h.get("description"),
                                "rating": h.get("rating"),
                                "source": "serpapi_maps"
                            })
                    
                    if not all_hotels:
                        # Fallback to regular search if maps engine fails
                        res = await client.get(
                            "https://serpapi.com/search",
                            params={
                                "engine": "google",
                                "q": f"best hotels in {destination}",
                                "api_key": settings.serpapi_api_key,
                            },
                            timeout=15.0
                        )
                        data = res.json()
                        for h in data.get("local_results", []):
                            if h.get("title"):
                                all_hotels.append({
                                    "name": h.get("title"),
                                    "vicinity": h.get("address"),
                                    "rating": h.get("rating"),
                                    "source": "serpapi_local"
                                })
                    
                    if not all_hotels:
                        for h in data.get("organic_results", []):
                            title = h.get("title", "")
                            if "hotel" in title.lower() or "resort" in title.lower():
                                all_hotels.append({
                                    "name": title,
                                    "source": "serpapi_organic"
                                })
            except Exception as exc:
                logger.warning("SerpAPI hotel search fallback failed: %s", exc)

        # Dedupe by name
        unique_hotels = []
        seen = set()
        for h in all_hotels:
            name_lower = h["name"].lower()
            if name_lower not in seen:
                seen.add(name_lower)
                unique_hotels.append(h)

        return unique_hotels[:10]

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
