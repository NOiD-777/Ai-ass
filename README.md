# AI Travel Itinerary Planner 

Production-ready travel itinerary planner with FastAPI backend and React + Tailwind frontend.

## Architecture

- Frontend: React + Tailwind
- Backend: FastAPI
- Agent system:
  - Research Agent (OpenTripMap + Google Maps + SerpAPI Google Flights)
  - Budget Agent
  - Planner Agent (Groq → Hugging Face → OpenRouter fallback)
  - Formatter Agent (strict JSON schema enforcement)
- MCP:
  - Tools: `get_attractions(destination)`, `get_hotels(destination)`, `estimate_costs(destination)`

## Output Contract

```json
{
  "destination": "",
  "total_budget": "",
  "days": [
    {
      "day": 1,
      "activities": [],
      "meals": [],
      "stay": "",
      "cost_breakdown": {}
    }
  ],
  "total_estimated_cost": ""
}
```

## Backend Setup

1. Open `backend/.env.example` and copy to `.env`.
2. Fill API keys.
3. Install dependencies:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

4. Run FastAPI:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## MCP Server

Run MCP server separately:

```bash
cd backend
python -m app.mcp_server
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Optional API base URL:

```bash
# frontend/.env
VITE_API_BASE_URL=http://localhost:8000
```

## API

### POST `/generate-itinerary`

Input:

```json
{
  "destination": "Paris",
  "budget": 1500,
  "days": 3,
  "preferences": ["food", "culture"]
}
```

## Reliability

- Retries for external API calls and LLM calls (max 3 attempts)
- Rate-limit/error aware retry on status codes: 408, 429, 500, 502, 503, 504
- LLM provider fallback chain:
  - Groq (primary)
  - Hugging Face (fallback)
  - OpenRouter (fallback)

## Notes

- n8n integration is intentionally left for your workflow ownership.
- **SerpAPI Google Flights**: Sign up at [serpapi.com](https://serpapi.com) for a free API key (100 searches/month free tier available).
