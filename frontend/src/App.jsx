import { useState } from 'react';
import { generateItinerary } from './api';
import ItineraryView from './components/ItineraryView';

const initialForm = {
  destination: 'Paris',
  budget: 1500,
  days: 3,
  preferences: 'food,culture',
};

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [itinerary, setItinerary] = useState(null);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        destination: form.destination,
        budget: Number(form.budget),
        days: Number(form.days),
        preferences: form.preferences
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      };
      const data = await generateItinerary(payload);
      setItinerary(data);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 text-ink">
      <div className="mx-auto max-w-5xl">
        <header className="animate-fade-in rounded-3xl border border-black/10 bg-white/75 p-7 shadow-2xl backdrop-blur-sm">
          <p className="font-display text-sm uppercase tracking-[0.2em] text-clay">Production-Ready AI Planner</p>
          <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">
            API-only Travel Itinerary Engine
          </h1>
          <p className="mt-3 max-w-2xl font-body text-base text-black/75">
            Multi-agent planning with RAG, budget governance, LLM failover, and strict JSON output.
          </p>

          <form onSubmit={onSubmit} className="mt-7 grid gap-4 md:grid-cols-2">
            <label className="font-body text-sm">
              Destination
              <input
                className="mt-1 w-full rounded-xl border border-black/20 bg-white px-3 py-2 outline-none ring-clay transition focus:ring"
                value={form.destination}
                onChange={(e) => onChange('destination', e.target.value)}
              />
            </label>

            <label className="font-body text-sm">
              Budget (USD)
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-black/20 bg-white px-3 py-2 outline-none ring-clay transition focus:ring"
                value={form.budget}
                onChange={(e) => onChange('budget', e.target.value)}
              />
            </label>

            <label className="font-body text-sm">
              Days
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-black/20 bg-white px-3 py-2 outline-none ring-clay transition focus:ring"
                value={form.days}
                onChange={(e) => onChange('days', e.target.value)}
              />
            </label>

            <label className="font-body text-sm">
              Preferences (comma separated)
              <input
                className="mt-1 w-full rounded-xl border border-black/20 bg-white px-3 py-2 outline-none ring-clay transition focus:ring"
                value={form.preferences}
                onChange={(e) => onChange('preferences', e.target.value)}
              />
            </label>

            <button
              type="submit"
              className="md:col-span-2 rounded-xl bg-pine px-5 py-3 font-display text-lg text-white transition hover:translate-y-[-2px] hover:bg-[#153a33] disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Itinerary'}
            </button>
          </form>

          {error ? <p className="mt-4 font-body text-sm text-red-700">{error}</p> : null}
        </header>

        <ItineraryView itinerary={itinerary} />
      </div>
    </main>
  );
}
