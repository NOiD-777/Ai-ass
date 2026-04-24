const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function generateItinerary(payload) {
  const res = await fetch(`${API_BASE}/generate-itinerary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || 'Failed to generate itinerary');
  }
  return data;
}
