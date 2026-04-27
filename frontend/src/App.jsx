import { useEffect, useMemo, useState } from 'react';
import { generateItinerary, getUsdRates } from './api';
import ItineraryView from './components/ItineraryView';

function addDays(dateStr, count) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + count);
  return d.toISOString().split('T')[0];
}

const todayStr = new Date().toISOString().split('T')[0];

const initialForm = {
  origin: 'New York',
  destination: 'Paris',
  travel_date: todayStr,
  return_date: addDays(todayStr, 3),
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
      const numDays = Number(form.days);
      const returnDate = form.return_date || addDays(form.travel_date, numDays);
      const payload = {
        origin: form.origin,
        destination: form.destination,
        travel_date: form.travel_date,
        return_date: returnDate,
        budget: normalizedBudget / conversionRate,
        days: numDays,
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
    <main className="min-h-screen px-4 py-12 text-secondary-900">
      <div className="mx-auto max-w-5xl">
        <header className="animate-fade-in glass rounded-[2rem] p-8 md:p-12 shadow-premium">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-block px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-xs font-bold uppercase tracking-wider mb-4">
                AI Itinerary Planner
              </span>
              <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
                Your Next Adventure, <span className="text-primary-500">Perfectly Planned.</span>
              </h1>
              <p className="mt-4 text-lg text-secondary-500 font-body leading-relaxed">
                Experience seamless travel planning with AI-powered itineraries, 
                real-time budget management, and curated local insights.
              </p>
            </div>
            <div className="hidden lg:block">
               {/* Visual element placeholder or logo could go here */}
               <div className="w-32 h-32 rounded-[2.5rem] bg-white shadow-premium flex items-center justify-center relative overflow-hidden group border border-secondary-100">
                  <svg className="w-16 h-16 text-black drop-shadow-sm relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
               </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-secondary-400 ml-1">Origin</label>
              <div className="relative">
                <input
                  className="w-full rounded-2xl border border-secondary-200 bg-white/50 px-4 py-3.5 pl-11 outline-none ring-primary-500/20 transition focus:border-primary-500 focus:ring-4"
                  placeholder="e.g. New York"
                  value={form.origin}
                  onChange={(e) => onChange('origin', e.target.value)}
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-secondary-400 ml-1">Destination</label>
              <div className="relative">
                <input
                  className="w-full rounded-2xl border border-secondary-200 bg-white/50 px-4 py-3.5 pl-11 outline-none ring-primary-500/20 transition focus:border-primary-500 focus:ring-4"
                  placeholder="e.g. Paris"
                  value={form.destination}
                  onChange={(e) => onChange('destination', e.target.value)}
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-secondary-400 ml-1">Departure</label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full rounded-2xl border border-secondary-200 bg-white/50 px-4 py-3.5 pl-11 outline-none ring-primary-500/20 transition focus:border-primary-500 focus:ring-4"
                  value={form.travel_date}
                  onChange={(e) => {
                    onChange('travel_date', e.target.value);
                    onChange('return_date', addDays(e.target.value, Number(form.days)));
                  }}
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-secondary-400 ml-1">Return</label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full rounded-2xl border border-secondary-200 bg-white/50 px-4 py-3.5 pl-11 outline-none ring-primary-500/20 transition focus:border-primary-500 focus:ring-4"
                  value={form.return_date}
                  onChange={(e) => onChange('return_date', e.target.value)}
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-secondary-400 ml-1">Budget</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="w-full rounded-2xl border border-secondary-200 bg-white/50 px-4 py-3.5 outline-none ring-primary-500/20 transition focus:border-primary-500 focus:ring-4"
                  value={form.budget}
                  onChange={(e) => onChange('budget', e.target.value)}
                />
                <select
                  className="rounded-2xl border border-secondary-200 bg-white/50 px-2 py-3.5 outline-none focus:border-primary-500 transition"
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                >
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-secondary-400 ml-1">Duration (Days)</label>
              <input
                type="number"
                className="w-full rounded-2xl border border-secondary-200 bg-white/50 px-4 py-3.5 outline-none ring-primary-500/20 transition focus:border-primary-500 focus:ring-4"
                value={form.days}
                onChange={(e) => onChange('days', e.target.value)}
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-secondary-400 ml-1">Preferences</label>
              <input
                className="w-full rounded-2xl border border-secondary-200 bg-white/50 px-4 py-3.5 outline-none ring-primary-500/20 transition focus:border-primary-500 focus:ring-4"
                placeholder="e.g. museums, night life, beaches"
                value={form.preferences}
                onChange={(e) => onChange('preferences', e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="md:col-span-2 lg:col-span-4 mt-4 btn-primary rounded-2xl py-4 text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <div className="flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating Itinerary...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Plan My Trip</span>
                  </>
                )}
              </div>
            </button>
          </form>

          {error ? (
            <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-3">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          ) : null}
          {ratesError ? (
            <div className="mt-4 text-xs text-secondary-400 italic text-center">
              * {ratesError}
            </div>
          ) : null}
        </header>

        <div className="mt-12">
          <ItineraryView itinerary={itinerary} selectedCurrency={selectedCurrency} rate={conversionRate} />
        </div>
      </div>
    </main>
  );
}
