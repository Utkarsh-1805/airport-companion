import { COLORS } from '../data/airportData.js'

const items = [
  { color: COLORS.food,     label: 'Food / Cafes' },
  { color: COLORS.retail,   label: 'Retail / Brands' },
  { color: COLORS.dutyFree, label: 'Duty Free' },
  { color: COLORS.restroom, label: 'Amenities' },
  { color: COLORS.escalator,label: 'Escalator / Security' },
  { color: COLORS.user,     label: 'You' }
]

export default function Legend() {
  return (
    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-lg shadow-lg border border-slate-200 p-3 w-44">
      <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-2">Legend</div>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2 text-xs text-slate-700">
            <span
              className="inline-block w-4 h-4 rounded border border-slate-300"
              style={{ background: it.color }}
            />
            {it.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
