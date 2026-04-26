/* eslint-disable react/prop-types */

import { useEffect, useState } from 'react';

function currency(value, code = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function mealAmountFormatter(value, code) {
  return `(${currency(value, code)})`;
}

function alignMealAmounts(meals, targetTotal, currencyCode) {
  if (!Array.isArray(meals) || !meals.length) {
    return [];
  }

  const amountRegex = /\(([^)]*?)([\d,]+(?:\.\d+)?)\)/;
  const parsed = meals.map((item) => {
    const text = String(item || '');
    const match = amountRegex.exec(text);
    const amount = match ? Number(match[2].replaceAll(',', '')) : 0;
    return { text, amount, hasAmount: Boolean(match) };
  });

  const sourceTotal = parsed.reduce((sum, item) => sum + item.amount, 0);
  const normalizedTarget = Number(targetTotal || 0);
  if (normalizedTarget <= 0) {
    return parsed.map((item) => item.text.replace(amountRegex, '').replaceAll(/\s+/g, ' ').trim());
  }

  if (sourceTotal > 0) {
    return parsed.map((item) => {
      const scaled = (item.amount / sourceTotal) * normalizedTarget;
      const replacement = mealAmountFormatter(scaled, currencyCode);
      if (item.hasAmount) {
        return item.text.replace(amountRegex, replacement);
      }
      return `${item.text} ${replacement}`.trim();
    });
  }

  const perMeal = normalizedTarget / parsed.length;
  return parsed.map((item) => `${item.text} ${mealAmountFormatter(perMeal, currencyCode)}`.trim());
}

function mapSearchUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function mapEmbedUrl(query) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

/* ───── Flight card component ───── */
function FlightCard({ flight, selectedCurrency, rate, index }) {
  const price = Number(flight.price || 0);
  const stops = flight.stops || 0;
  const stopsLabel = stops === 0 ? 'Nonstop' : stops === 1 ? '1 stop' : `${stops} stops`;
  const stopsColor = stops === 0
    ? 'bg-emerald-100 text-emerald-700'
    : stops === 1
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700';

  return (
    <div
      className="flight-card group"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Airline badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pine/20 to-pine/5 text-xs font-bold text-pine">
            {(flight.airline || '??').slice(0, 2).toUpperCase()}
          </span>
          <span className="font-display text-sm font-semibold text-ink">{flight.airline || 'Unknown'}</span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${stopsColor}`}>
          {stopsLabel}
        </span>
      </div>

      {/* Route visualization */}
      <div className="mt-3 flex items-center gap-3">
        {/* Departure */}
        <div className="flex-1 text-center">
          <p className="font-display text-lg font-bold text-ink leading-tight">
            {flight.departure_time || '--:--'}
          </p>
          <p className="mt-0.5 text-[11px] text-black/50 font-body">{flight.route?.split('→')[0]?.trim() || 'Origin'}</p>
        </div>

        {/* Connector */}
        <div className="flex flex-1 flex-col items-center gap-0.5">
          <p className="text-[10px] font-semibold text-pine/70 tracking-wide">{flight.duration || '—'}</p>
          <div className="flight-connector" />
        </div>

        {/* Arrival */}
        <div className="flex-1 text-center">
          <p className="font-display text-lg font-bold text-ink leading-tight">
            {flight.arrival_time || '--:--'}
          </p>
          <p className="mt-0.5 text-[11px] text-black/50 font-body">{flight.route?.split('→')[1]?.trim() || 'Dest'}</p>
        </div>
      </div>

      {/* Date & Price */}
      <div className="mt-3 flex items-center justify-between border-t border-dashed border-black/10 pt-2">
        <span className="font-body text-xs text-black/50">{flight.date || ''}</span>
        <span className="flight-price">{currency(price * rate, selectedCurrency)}</span>
      </div>
    </div>
  );
}

/* ───── Flight section header with icon ───── */
function FlightSectionHeader({ icon, title, subtitle, accentClass = 'text-pine' }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className={`flight-section-icon ${accentClass}`}>{icon}</span>
      <div>
        <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
        {subtitle && <p className="font-body text-xs text-black/50">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function ItineraryView({ itinerary, selectedCurrency = 'USD', rate = 1 }) {
  const [selectedPreviewByDay, setSelectedPreviewByDay] = useState({});

  useEffect(() => {
    if (!itinerary) {
      return;
    }
    setSelectedPreviewByDay({});
  }, [itinerary]);

  if (!itinerary) return null;

  const destinationMapUrl = mapSearchUrl(itinerary.destination);

  const setPreviewForDay = (dayNumber, query) => {
    setSelectedPreviewByDay((prev) => ({
      ...prev,
      [dayNumber]: query,
    }));
  };

  const outboundFlights = itinerary.flight_suggestions || [];
  const returnFlights = itinerary.return_flight_suggestions || [];
  const hasAnyFlights = outboundFlights.length > 0 || returnFlights.length > 0;
  const outboundCost = Number(itinerary.flights_cost || 0);
  const returnCost = Number(itinerary.return_flights_cost || 0);
  const totalFlightCost = outboundCost + returnCost;

  return (
    <section className="mt-10 animate-rise rounded-3xl border border-black/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
      {/* Header summary */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-black/10 pb-4">
        <div>
          <h2 className="font-display text-3xl text-ink">{itinerary.destination}</h2>
          <p className="font-body text-sm text-black/70">
            Budget: {currency(itinerary.total_budget * rate, selectedCurrency)}
            {' '}
            • Estimated: {currency(itinerary.total_estimated_cost * rate, selectedCurrency)}
          </p>
        </div>
        <a
          href={destinationMapUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-black/15 bg-white px-3 py-2 font-body text-sm text-pine transition hover:bg-pine hover:text-white"
        >
          View Destination on Maps
        </a>
      </div>

      {/* Map preview */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <iframe
          title={`Map preview for ${itinerary.destination}`}
          src={mapEmbedUrl(itinerary.destination)}
          className="h-64 w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* ═══════ FLIGHTS SECTION ═══════ */}
      {hasAnyFlights && (
        <div className="flights-panel mt-6">
          {/* Cost summary banner */}
          <div className="flights-cost-banner">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span className="font-display text-sm text-white/90 tracking-wide uppercase">Flight Expenses</span>
            </div>
            <div className="flex items-center gap-4 text-right">
              {outboundCost > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/60">Outbound</p>
                  <p className="font-display text-sm font-bold text-white">{currency(outboundCost * rate, selectedCurrency)}</p>
                </div>
              )}
              {returnCost > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/60">Return</p>
                  <p className="font-display text-sm font-bold text-white">{currency(returnCost * rate, selectedCurrency)}</p>
                </div>
              )}
              <div className="border-l border-white/20 pl-4">
                <p className="text-[10px] uppercase tracking-wider text-white/60">Total</p>
                <p className="font-display text-lg font-bold text-white">{currency(totalFlightCost * rate, selectedCurrency)}</p>
              </div>
            </div>
          </div>

          {/* Outbound flights */}
          {outboundFlights.length > 0 && (
            <div className="mt-5">
              <FlightSectionHeader
                icon="✈"
                title="Outbound Flights"
                subtitle={`${itinerary.destination} bound`}
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {outboundFlights.map((flight, i) => (
                  <FlightCard
                    key={`out-${i}`}
                    flight={flight}
                    selectedCurrency={selectedCurrency}
                    rate={rate}
                    index={i}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Return flights */}
          {returnFlights.length > 0 && (
            <div className="mt-5">
              <FlightSectionHeader
                icon="↩"
                title="Return Flights"
                subtitle="Back home"
                accentClass="text-amber-600"
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {returnFlights.map((flight, i) => (
                  <FlightCard
                    key={`ret-${i}`}
                    flight={flight}
                    selectedCurrency={selectedCurrency}
                    rate={rate}
                    index={i}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ DAY-BY-DAY PLANS ═══════ */}
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {itinerary.days.map((day) => {
          let dayPreviewQuery = itinerary.destination;
          if (day.stay) {
            dayPreviewQuery = `${day.stay}, ${itinerary.destination}`;
          } else if (day.activities.length) {
            dayPreviewQuery = `${day.activities[0]}, ${itinerary.destination}`;
          }

          const activePreviewQuery = selectedPreviewByDay[day.day] || dayPreviewQuery;
          const mealsWithAlignedAmounts = alignMealAmounts(
            day.meals,
            Number(day.cost_breakdown?.meals || 0) * rate,
            selectedCurrency,
          );
          const foodPlaces = Array.isArray(day.food_places) ? day.food_places : [];

          return (
          <article key={day.day} className="rounded-2xl border border-black/10 bg-dawn/70 p-4">
            <h3 className="font-display text-xl text-pine">Day {day.day}</h3>

            <div className="mt-3 space-y-2 font-body text-sm text-black/80">
              <p><span className="font-semibold">Stay:</span> {day.stay}</p>
              <p><span className="font-semibold">Activities:</span> {day.activities.join(', ') || 'TBD'}</p>
              <p><span className="font-semibold">Meals:</span> {mealsWithAlignedAmounts.join(', ') || 'TBD'}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {day.stay ? (
                <button
                  type="button"
                  onClick={() => setPreviewForDay(day.day, `${day.stay}, ${itinerary.destination}`)}
                  className="rounded-md border border-black/15 bg-white px-2 py-1 font-body text-xs text-pine transition hover:bg-pine hover:text-white"
                >
                  Hotel/Stay on Maps
                </button>
              ) : null}
              {day.activities.slice(0, 3).map((activity) => {
                const activityQuery = `${activity}, ${itinerary.destination}`;
                return (
                <button
                  type="button"
                  key={`${day.day}-${activity}`}
                  onClick={() => setPreviewForDay(day.day, activityQuery)}
                  className="rounded-md border border-black/15 bg-white px-2 py-1 font-body text-xs text-pine transition hover:bg-pine hover:text-white"
                >
                  {activity.length > 26 ? `${activity.slice(0, 26)}...` : activity}
                </button>
                );
              })}
              <a
                href={mapSearchUrl(activePreviewQuery)}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-black/15 bg-white px-2 py-1 font-body text-xs text-pine transition hover:bg-pine hover:text-white"
              >
                Open Selected in Maps
              </a>
            </div>

            {foodPlaces.length ? (
              <div className="mt-4">
                <p className="font-body text-sm font-semibold text-black/70">Food places</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {foodPlaces.slice(0, 4).map((place) => {
                    let placeName = '';
                    let placeQuery = itinerary.destination;
                    if (typeof place === 'string') {
                      placeName = place;
                      placeQuery = `${place}, ${itinerary.destination}`;
                    } else {
                      const vicinity = place.vicinity ? ` · ${place.vicinity}` : '';
                      placeName = `${place.name}${vicinity}`;
                      placeQuery = `${place.name}, ${itinerary.destination}`;
                    }
                    return (
                      <button
                        type="button"
                        key={`${day.day}-${placeName}`}
                        onClick={() => setPreviewForDay(day.day, placeQuery)}
                        className="rounded-md border border-black/15 bg-white px-2 py-1 font-body text-xs text-pine transition hover:bg-pine hover:text-white"
                      >
                        {placeName.length > 30 ? `${placeName.slice(0, 30)}...` : placeName}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-4 overflow-hidden rounded-xl border border-black/10 bg-white">
              <iframe
                title={`Day ${day.day} map preview`}
                src={mapEmbedUrl(activePreviewQuery)}
                className="h-44 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {Object.entries(day.cost_breakdown).map(([key, value]) => (
                <div key={key} className="rounded-lg bg-white/80 px-2 py-1 font-body">
                  <span className="capitalize text-black/60">{key}:</span> {currency(value * rate, selectedCurrency)}
                </div>
              ))}
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}
