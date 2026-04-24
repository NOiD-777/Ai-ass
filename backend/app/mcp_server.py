from mcp.server.fastmcp import FastMCP

from .services.travel_apis import TravelApiService

mcp = FastMCP("travel-planner-mcp")
travel_api = TravelApiService()


@mcp.tool()
async def get_attractions(destination: str) -> list[dict]:
    return await travel_api.get_attractions(destination)


@mcp.tool()
async def get_hotels(destination: str) -> list[dict]:
    return await travel_api.get_hotels(destination)


@mcp.tool()
async def estimate_costs(destination: str) -> dict:
    attractions = await travel_api.get_attractions(destination)
    hotels = await travel_api.get_hotels(destination)

    avg_activity_cost = max(15, min(45, len(attractions) * 2))
    avg_stay_cost = 65 if not hotels else 110

    return {
        "destination": destination,
        "estimated_daily_cost": {
            "activities": avg_activity_cost,
            "stay": avg_stay_cost,
            "meals": 35,
            "transport": 20,
            "misc": 15,
        },
    }


if __name__ == "__main__":
    mcp.run()
