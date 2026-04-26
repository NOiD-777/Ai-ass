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

  return (
    <section className="mt-10 animate-rise rounded-3xl border border-black/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-black/10 pb-4">
        <div>
          <h2 className="font-display text-3xl text-ink">{itinerary.destination}</h2>
          <p className="font-body text-sm text-black/70">
            Budget: {currency(itinerary.total_budget * rate, selectedCurrency)}
            {' '}
            • Estimated: {currency(itinerary.total_estimated_cost * rate, selectedCurrency)}
            {' '}
            • Flights: {currency((itinerary.flights_cost || 0) * rate, selectedCurrency)}
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

      <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <iframe
          title={`Map preview for ${itinerary.destination}`}
          src={mapEmbedUrl(itinerary.destination)}
          className="h-64 w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {itinerary.flight_suggestions?.length > 0 && (
        <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
          <p className="font-display text-lg text-pine">Flight Suggestions</p>
          <ul className="mt-2 list-inside list-disc font-body text-sm text-black/80">
            {itinerary.flight_suggestions.map((flight, i) => {
              if (typeof flight === 'string') {
                return <li key={i}>{flight}</li>;
              }
              return (
                <li key={i}>
                  {flight.airline}: {flight.route}, {flight.date}, {currency((flight.price || 0) * rate, selectedCurrency)}
                </li>
              );
            })}
          </ul>
        </div>
      )}

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
