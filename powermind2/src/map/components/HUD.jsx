import { GATES } from '../data/airportData.js'

// Top-left overlay: route controls plus selected entity card.
export default function HUD({
  selected,
  onClear,
  pickupGate,
  destination,
  destinationId,
  onDestinationChange,
  onResetTraveler,
  distanceToDestination
}) {
  return (
    <>
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur rounded-lg shadow-lg border border-slate-200 px-4 py-3 w-80">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Indoor Map</div>
        <div className="text-lg font-bold text-slate-900 leading-tight">Hyderabad Airport - T1</div>
        <div className="text-xs text-slate-500 mt-0.5">Departures &middot; Arrow-key wayfinding</div>

        <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Source
            </div>
            <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800">
              {pickupGate?.name ?? 'Pick-up gate'}
            </div>
          </div>

          <label className="block">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Destination
            </span>
            <select
              value={destinationId}
              onChange={(event) => onDestinationChange(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            >
              {GATES.map((gate) => (
                <option key={gate.id} value={gate.id}>
                  {gate.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Remaining
              </div>
              <div className="text-sm font-bold text-slate-900">
                {Math.round(distanceToDestination)} m to {destination?.id}
              </div>
            </div>
            <button
              type="button"
              onClick={onResetTraveler}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Reset
            </button>
          </div>

          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900">
            Use the arrow keys to move the traveler from the pick-up gate toward the selected destination.
          </div>
        </div>
      </div>

      {selected && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-lg shadow-xl border border-slate-200 px-4 py-3 w-72 animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {selected.kind === 'gate'
                  ? 'Boarding Gate'
                  : selected.kind === 'restroom'
                  ? 'Amenity'
                  : selected.kind === 'kiosk'
                  ? 'Information'
                  : selected.type === 'food'
                  ? 'Food & Beverage'
                  : selected.type === 'service'
                  ? 'Service'
                  : 'Retail'}
              </div>
              <div className="text-base font-bold text-slate-900 leading-tight">{selected.name}</div>
              {selected.position && (
                <div className="text-[11px] text-slate-500 mt-1 font-mono">
                  x: {selected.position[0].toFixed(1)} &middot; z: {selected.position[2].toFixed(1)}
                </div>
              )}
            </div>
            <button
              onClick={onClear}
              className="text-slate-400 hover:text-slate-700 text-lg leading-none"
              aria-label="close"
            >
              x
            </button>
          </div>
        </div>
      )}
    </>
  )
}
