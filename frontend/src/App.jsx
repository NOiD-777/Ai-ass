import { useEffect, useMemo, useState } from 'react';
import { generateItinerary, getUsdRates } from './api';
import ItineraryView from './components/ItineraryView';

const initialForm = {
  origin: 'New York',
  destination: 'Paris',
  travel_date: new Date().toISOString().split('T')[0],
  budget: 1500,
  days: 3,
  preferences: 'food,culture',
};

const FALLBACK_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
  JPY: 154,
  CAD: 1.36,
  AUD: 1.53,
  SGD: 1.35,
  AED: 3.67,
};

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'SGD', 'AED'];

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [rates, setRates] = useState({ USD: 1 });
  const [ratesError, setRatesError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [itinerary, setItinerary] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadRates() {
      try {
        const nextRates = await getUsdRates();
        if (!mounted) {
          return;
        }
        setRates({ ...FALLBACK_RATES, ...nextRates });
      } catch (err) {
        if (!mounted) {
          return;
        }
        setRates(FALLBACK_RATES);
        setRatesError(err.message || 'Could not load live exchange rates. Using built-in fallback rates.');
      }
    }

    loadRates();
    return () => {
      mounted = false;
    };
  }, []);

  const conversionRate = useMemo(
    () => rates[selectedCurrency] || FALLBACK_RATES[selectedCurrency] || 1,
    [rates, selectedCurrency],
  );

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const normalizedBudget = Number(form.budget);
      const payload = {
        origin: form.origin,
        destination: form.destination,
        travel_date: form.travel_date,
        budget: normalizedBudget / conversionRate,
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
            Multi-agent planning with budget governance, LLM failover, and strict JSON output.
          </p>

          <form onSubmit={onSubmit} className="mt-7 grid gap-4 md:grid-cols-2">
            <label className="font-body text-sm">
              <span>Origin</span>
              <input
                className="mt-1 w-full rounded-xl border border-black/20 bg-white px-3 py-2 outline-none ring-clay transition focus:ring"
                value={form.origin}
                onChange={(e) => onChange('origin', e.target.value)}
              />
            </label>

            <label className="font-body text-sm">
              <span>Destination</span>
              <input
                className="mt-1 w-full rounded-xl border border-black/20 bg-white px-3 py-2 outline-none ring-clay transition focus:ring"
                value={form.destination}
                onChange={(e) => onChange('destination', e.target.value)}
              />
            </label>

            <label className="font-body text-sm">
              <span>Travel Date</span>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-black/20 bg-white px-3 py-2 outline-none ring-clay transition focus:ring"
                value={form.travel_date}
                onChange={(e) => onChange('travel_date', e.target.value)}
              />
            </label>

            <label className="font-body text-sm">
              <span>Budget ({selectedCurrency})</span>
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-black/20 bg-white px-3 py-2 outline-none ring-clay transition focus:ring"
                value={form.budget}
                onChange={(e) => onChange('budget', e.target.value)}
              />
            </label>

            <label className="font-body text-sm">
              <span>Currency</span>
              <select
                className="mt-1 w-full rounded-xl border border-black/20 bg-white px-3 py-2 outline-none ring-clay transition focus:ring"
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
              >
                {SUPPORTED_CURRENCIES.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </label>

            <label className="font-body text-sm">
              <span>Days</span>
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-black/20 bg-white px-3 py-2 outline-none ring-clay transition focus:ring"
                value={form.days}
                onChange={(e) => onChange('days', e.target.value)}
              />
            </label>

            <label className="font-body text-sm">
              <span>Preferences (comma separated)</span>
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
          {ratesError ? <p className="mt-2 font-body text-xs text-amber-700">{ratesError}</p> : null}
        </header>

        <ItineraryView itinerary={itinerary} selectedCurrency={selectedCurrency} rate={conversionRate} />
      </div>
    </main>
  );
}
