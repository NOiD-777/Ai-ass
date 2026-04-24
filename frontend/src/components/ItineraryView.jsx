function currency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function ItineraryView({ itinerary }) {
  if (!itinerary) return null;

  return (
    <section className="mt-10 animate-rise rounded-3xl border border-black/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-black/10 pb-4">
        <div>
          <h2 className="font-display text-3xl text-ink">{itinerary.destination}</h2>
          <p className="font-body text-sm text-black/70">
            Budget: {currency(itinerary.total_budget)} • Estimated: {currency(itinerary.total_estimated_cost)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {itinerary.days.map((day) => (
          <article key={day.day} className="rounded-2xl border border-black/10 bg-dawn/70 p-4">
            <h3 className="font-display text-xl text-pine">Day {day.day}</h3>

            <div className="mt-3 space-y-2 font-body text-sm text-black/80">
              <p><span className="font-semibold">Stay:</span> {day.stay}</p>
              <p><span className="font-semibold">Activities:</span> {day.activities.join(', ') || 'TBD'}</p>
              <p><span className="font-semibold">Meals:</span> {day.meals.join(', ') || 'TBD'}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {Object.entries(day.cost_breakdown).map(([key, value]) => (
                <div key={key} className="rounded-lg bg-white/80 px-2 py-1 font-body">
                  <span className="capitalize text-black/60">{key}:</span> {currency(value)}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
