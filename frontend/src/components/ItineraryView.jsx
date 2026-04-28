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

  // Improved regex to handle ( $ 222 ), ($222), (222) etc.
  const amountRegex = /\(\s*[^0-9)]*?\s*([\d,]+(?:\.\d+)?)\s*\)/;
  const parsed = meals.map((item) => {
    const text = String(item || '');
    const match = amountRegex.exec(text);
    const amount = match ? Number(match[1].replaceAll(',', '')) : 0;
    return { text, amount, hasAmount: Boolean(match) };
  });

  const sourceTotal = parsed.reduce((sum, item) => sum + item.amount, 0);
  const normalizedTarget = Number(targetTotal || 0);
  
  // If target is 0, remove amounts entirely for a cleaner look
  if (normalizedTarget <= 0) {
    return parsed.map((item) => item.text.replace(amountRegex, '').replaceAll(/\s+/g, ' ').trim());
  }

  if (sourceTotal > 0) {
    return parsed.map((item) => {
      const scaled = (item.amount / sourceTotal) * normalizedTarget;
      const replacement = mealAmountFormatter(scaled, currencyCode);
      if (item.hasAmount) {
        // Use global regex to replace all matches if there are multiple (just in case)
        const globalRegex = new RegExp(amountRegex.source, 'g');
        return item.text.replace(globalRegex, replacement);
      }
      return `${item.text} ${replacement}`.trim();
    });
  }

  const perMeal = normalizedTarget / parsed.length;
  return parsed.map((item) => {
    const replacement = mealAmountFormatter(perMeal, currencyCode);
    return `${item.text.replace(amountRegex, '').trim()} ${replacement}`.trim();
  });
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
    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
    : stops === 1
      ? 'bg-amber-50 text-amber-600 border-amber-100'
      : 'bg-red-50 text-red-600 border-red-100';

  return (
    <div
      className="flight-card group border"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 font-bold text-xs">
            {(flight.airline || '??').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-display text-sm font-bold text-secondary-900">{flight.airline || 'Unknown'}</p>
            <p className="text-[10px] text-secondary-400 font-medium uppercase tracking-wider">{flight.flight_number || 'FL-000'}</p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${stopsColor}`}>
          {stopsLabel}
        </span>
      </div>

      <div className="flex items-center gap-4 relative py-2">
        <div className="flex-1">
          <p className="font-display text-xl font-bold text-secondary-900 leading-none mb-1">
            {flight.departure_time || '--:--'}
          </p>
          <p className="text-[11px] text-secondary-400 font-medium uppercase">{flight.route?.split('→')[0]?.trim() || 'Origin'}</p>
        </div>

        <div className="flex-[1.5] flex flex-col items-center gap-1">
           <span className="text-[9px] font-bold text-secondary-300 uppercase tracking-tighter">{flight.duration || '—'}</span>
           <div className="flight-connector w-full" />
        </div>

        <div className="flex-1 text-right">
          <p className="font-display text-xl font-bold text-secondary-900 leading-none mb-1">
            {flight.arrival_time || '--:--'}
          </p>
          <p className="text-[11px] text-secondary-400 font-medium uppercase">{flight.route?.split('→')[1]?.trim() || 'Dest'}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 flex items-center justify-between border-t border-secondary-50">
        <span className="font-medium text-[11px] text-secondary-400">{flight.date || ''}</span>
        <span className="flight-price">{currency(price * rate, selectedCurrency)}</span>
      </div>
    </div>
  );
}

/* ───── Ground transport card component ───── */
function GroundTransportCard({ transport, selectedCurrency, rate, index }) {
  const isBus = transport.mode?.toLowerCase() === 'bus';
  const icon = isBus ? (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  return (
    <div
      className="flight-card group border border-secondary-100 hover:border-primary-200"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isBus ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'} font-bold`}>
            {icon}
          </div>
          <div>
            <p className="font-display text-sm font-bold text-secondary-900 capitalize">{transport.mode || 'Ground Transport'}</p>
            <p className="text-[10px] text-secondary-400 font-medium uppercase tracking-wider">Alternate Route</p>
          </div>
        </div>
        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border bg-secondary-50 text-secondary-600 border-secondary-100">
          Available
        </span>
      </div>

      <div className="space-y-2 py-2">
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-secondary-400 font-medium uppercase">Route</span>
          <span className="text-sm font-bold text-secondary-900">{transport.route || 'N/A'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-secondary-400 font-medium uppercase">Duration</span>
          <span className="text-sm font-bold text-secondary-900">{transport.duration || 'N/A'}</span>
        </div>
        <p className="text-[11px] text-secondary-500 mt-2 leading-relaxed">
          {transport.description}
        </p>
      </div>

      <div className="mt-4 pt-3 flex items-center justify-between border-t border-secondary-50">
        <span className="font-medium text-[11px] text-secondary-400">Est. Charge</span>
        <span className="flight-price">{currency(Number(transport.price || 0) * rate, selectedCurrency)}</span>
      </div>
    </div>
  );
}

/* ───── Section Header ───── */
function SectionHeader({ icon, title, subtitle, colorClass = "text-primary-500" }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-sm border border-secondary-100 ${colorClass}`}>
        {icon}
      </div>
      <div>
        <h3 className="font-display text-xl font-bold text-secondary-900 leading-none">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-secondary-400 font-medium uppercase tracking-wider">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function ItineraryView({ itinerary, selectedCurrency = 'USD', rate = 1 }) {
  const [selectedPreviewByDay, setSelectedPreviewByDay] = useState({});

  useEffect(() => {
    if (!itinerary) return;
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

  const outboundFlights = (itinerary.flight_suggestions || []).filter(f => f.airline !== 'Not Available');
  const returnFlights = (itinerary.return_flight_suggestions || []).filter(f => f.airline !== 'Not Available');
  const groundTransport = itinerary.ground_transport || [];
  
  const hasAnyFlights = outboundFlights.length > 0 || returnFlights.length > 0;
  const hasGroundTransport = groundTransport.length > 0;

  const outboundCost = Number(itinerary.flights_cost || 0);
  const returnCost = Number(itinerary.return_flights_cost || 0);
  const totalFlightCost = outboundCost + returnCost;

  return (
    <section className="animate-rise space-y-10 pb-20">
      {/* Overview Card */}
      <div className="glass rounded-[2rem] p-8 shadow-premium overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <span className="px-2 py-0.5 rounded-md bg-accent-100 text-accent-700 text-[10px] font-bold uppercase tracking-wider">Confirmed Plan</span>
               <span className="text-secondary-300">•</span>
               <span className="text-secondary-400 text-xs font-medium">{itinerary.days.length} Days in {itinerary.destination}</span>
            </div>
            <h2 className="font-display text-5xl font-extrabold text-secondary-900 tracking-tight">{itinerary.destination}</h2>
            <div className="mt-4 flex flex-wrap gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] text-secondary-400 font-bold uppercase tracking-widest mb-1">Total Budget</span>
                <span className="text-xl font-display font-bold text-secondary-900">{currency(itinerary.total_budget * rate, selectedCurrency)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-secondary-400 font-bold uppercase tracking-widest mb-1">Estimated Cost</span>
                <span className={`text-xl font-display font-bold ${itinerary.total_estimated_cost > itinerary.total_budget ? 'text-red-500' : 'text-emerald-500'}`}>
                  {currency(itinerary.total_estimated_cost * rate, selectedCurrency)}
                </span>
              </div>
            </div>
          </div>
          <a
            href={destinationMapUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary rounded-xl px-6 py-3 text-sm font-bold flex items-center gap-2 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Explore Destination
          </a>
        </div>
        
        <div className="mt-8 overflow-hidden rounded-2xl border border-secondary-100 shadow-inner bg-secondary-50">
          <iframe
            title={`Map preview for ${itinerary.destination}`}
            src={mapEmbedUrl(itinerary.destination)}
            className="h-80 w-full grayscale-[0.2] contrast-[1.1]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>

      {/* ═══════ FLIGHTS SECTION ═══════ */}
      {hasAnyFlights ? (
        <div className="space-y-6">
          <div className="flights-cost-banner border border-secondary-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <div>
                 <p className="text-[10px] uppercase font-black tracking-[0.2em] text-secondary-400">Travel Logistics</p>
                 <h3 className="text-secondary-900 font-display font-bold text-lg leading-none">Flight Expenses</h3>
              </div>
            </div>
            <div className="flex items-center gap-8 text-right">
              {outboundCost > 0 && (
                <div>
                  <p className="text-[9px] uppercase font-bold tracking-widest text-secondary-400 mb-0.5">Outbound</p>
                  <p className="font-display font-bold text-secondary-900">{currency(outboundCost * rate, selectedCurrency)}</p>
                </div>
              )}
              {returnCost > 0 && (
                <div>
                  <p className="text-[9px] uppercase font-bold tracking-widest text-secondary-400 mb-0.5">Return</p>
                  <p className="font-display font-bold text-secondary-900">{currency(returnCost * rate, selectedCurrency)}</p>
                </div>
              )}
              <div className="border-l border-secondary-100 pl-8 ml-2">
                <p className="text-[9px] uppercase font-bold tracking-widest text-primary-600 mb-0.5">Total Flight Cost</p>
                <p className="font-display text-2xl font-black text-secondary-900">{currency(totalFlightCost * rate, selectedCurrency)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-1">
            {outboundFlights.length > 0 && (
              <div className="space-y-4">
                <SectionHeader 
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>}
                  title="Departure Flights"
                  subtitle={`${itinerary.destination} Bound`}
                />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {outboundFlights.map((flight, i) => (
                    <FlightCard key={`out-${i}`} flight={flight} selectedCurrency={selectedCurrency} rate={rate} index={i} />
                  ))}
                </div>
              </div>
            )}

            {returnFlights.length > 0 && (
              <div className="space-y-4">
                <SectionHeader 
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>}
                  title="Return Flights"
                  subtitle="Heading Home"
                  colorClass="text-accent-500"
                />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {returnFlights.map((flight, i) => (
                    <FlightCard key={`ret-${i}`} flight={flight} selectedCurrency={selectedCurrency} rate={rate} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : hasGroundTransport && (
        <div className="space-y-6">
          <SectionHeader 
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h5a1 1 0 011 1v10a1 1 0 01-1 1h-1" /></svg>}
            title="Alternative Travel Options"
            subtitle="Flights Unavailable • Bus & Train Estimates"
            colorClass="text-amber-500"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groundTransport.map((item, i) => (
              <GroundTransportCard key={`ground-${i}`} transport={item} selectedCurrency={selectedCurrency} rate={rate} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ═══════ DAY-BY-DAY PLANS ═══════ */}
      <div className="space-y-8">
        <SectionHeader 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          title="Daily Itinerary"
          subtitle="A Curated Experience"
        />

        <div className="space-y-4">
          {itinerary.days.map((day, idx) => {
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
              <article key={day.day} className="timeline-item group">
                <div className="glass rounded-[1.5rem] p-6 md:p-8 shadow-sm border border-secondary-100 transition-all hover:shadow-md hover:border-primary-100">
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center justify-between">
                         <h3 className="font-display text-3xl font-extrabold text-secondary-900">Day {day.day}</h3>
                         <span className="text-[10px] font-bold uppercase tracking-widest text-secondary-300">Detailed Schedule</span>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Stay info */}
                        <div className="space-y-2">
                           <div className="flex items-center gap-2 text-primary-500">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                              <span className="text-[10px] font-black uppercase tracking-[0.1em]">Accommodation</span>
                           </div>
                           <p className="text-secondary-700 font-bold leading-tight">{day.stay || 'Self-arranged'}</p>
                           {day.stay && (
                             <button
                               onClick={() => setPreviewForDay(day.day, `${day.stay}, ${itinerary.destination}`)}
                               className="text-[10px] text-primary-500 font-bold uppercase hover:underline"
                             >
                               Locate on Map
                             </button>
                           )}
                        </div>

                        {/* Cost breakdown */}
                        <div className="space-y-2">
                           <div className="flex items-center gap-2 text-emerald-500">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              <span className="text-[10px] font-black uppercase tracking-[0.1em]">Daily Expenses</span>
                           </div>
                           <div className="flex flex-wrap gap-2">
                              {Object.entries(day.cost_breakdown).map(([key, value]) => (
                                <span key={key} className="px-2 py-1 rounded-lg bg-secondary-50 border border-secondary-100 text-[10px] font-medium text-secondary-500">
                                  <span className="capitalize">{key.replace(/_/g, ' ')}:</span> {currency(value * rate, selectedCurrency)}
                                </span>
                              ))}
                           </div>
                        </div>
                      </div>

                      {/* Activities */}
                      <div className="space-y-3">
                         <div className="flex items-center gap-2 text-accent-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-1.205 1.84-1.902 1.22l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.697.62-2.204-.298-1.902-1.22l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                            <span className="text-[10px] font-black uppercase tracking-[0.1em]">Key Activities</span>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {day.activities.map((activity, i) => (
                              <button
                                key={i}
                                onClick={() => setPreviewForDay(day.day, `${activity}, ${itinerary.destination}`)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${activePreviewQuery.includes(activity) ? 'bg-primary-500 text-white border-primary-500 shadow-md' : 'bg-white text-secondary-600 border-secondary-100 hover:border-primary-200'}`}
                              >
                                {activity}
                              </button>
                            ))}
                         </div>
                      </div>

                      {/* Dining */}
                      <div className="space-y-3">
                         <div className="flex items-center gap-2 text-secondary-900">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18z" /></svg>
                            <span className="text-[10px] font-black uppercase tracking-[0.1em]">Culinary Suggestions</span>
                         </div>
                         <p className="text-sm text-secondary-500 italic font-medium">{mealsWithAlignedAmounts.join(', ')}</p>
                         <div className="flex flex-wrap gap-2 pt-1">
                            {foodPlaces.slice(0, 5).map((place, i) => {
                              const name = typeof place === 'string' ? place : place.name;
                              return (
                                <button
                                  key={i}
                                  onClick={() => setPreviewForDay(day.day, `${name}, ${itinerary.destination}`)}
                                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition border ${activePreviewQuery.includes(name) ? 'bg-secondary-900 text-white border-secondary-900' : 'bg-secondary-50 text-secondary-500 border-secondary-100 hover:border-secondary-300'}`}
                                >
                                  {name}
                                </button>
                              );
                            })}
                         </div>
                      </div>
                    </div>

                    <div className="w-full md:w-80 lg:w-96 space-y-4">
                       <div className="rounded-2xl overflow-hidden border border-secondary-100 shadow-sm aspect-[4/3] md:aspect-auto md:h-full max-h-96">
                          <iframe
                            title={`Day ${day.day} map preview`}
                            src={mapEmbedUrl(activePreviewQuery)}
                            className="h-full w-full grayscale-[0.1] contrast-[1.05]"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                       </div>
                       <a
                          href={mapSearchUrl(activePreviewQuery)}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full btn-secondary rounded-xl py-3 text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          Open in Google Maps
                        </a>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

