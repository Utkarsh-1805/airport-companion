import {
  SHOPS,
  GATES,
  ZONES,
  RESTROOMS,
  ENTRANCES,
  CHECKIN_ROWS,
  SECURITY
} from '../data/airportData.js'

// Top-down 2D mini-map. Coordinates use the same world frame as the 3D
// scene: world X → svg X, world Z → svg Y. Floor extents are 360×130 so
// the projection is sized accordingly.
const W = 280
const H = 110
const WORLD_W = 360
const WORLD_H = 130
const SCALE_X = W / WORLD_W
const SCALE_Z = H / WORLD_H
const OFFSET_X = 160 // shifts world x so X=0 lands ~middle of the panel
const OFFSET_Z = 55  // shifts world z so airside Z=0 sits in the upper half

const project = (worldX, worldZ) => [
  (worldX + OFFSET_X) * SCALE_X,
  (worldZ + OFFSET_Z) * SCALE_Z
]

export default function MiniMap({ selected, userPosition, route = [] }) {
  const [ux, uz] = project(userPosition[0], userPosition[2])
  const routePoints = route
    .map((point) => project(point.position[0], point.position[2]).join(','))
    .join(' ')

  return (
    <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur rounded-lg shadow-lg border border-slate-200 p-2">
      <div className="flex items-center justify-between mb-1 px-1">
        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Mini-map</div>
        <div className="text-[9px] font-semibold text-amber-600">⚑ Your route</div>
      </div>

      <svg width={W} height={H} className="block">
        {/* zone backgrounds (airside + landside) */}
        {ZONES.map((z) => {
          const [zx, zz] = project(z.center[0], z.center[2])
          const w = z.size[0] * SCALE_X
          const h = z.size[1] * SCALE_Z
          return (
            <rect
              key={z.id}
              x={zx - w / 2}
              y={zz - h / 2}
              width={w}
              height={h}
              fill={z.color}
              opacity={0.7}
              rx={2}
            />
          )
        })}

        {/* security barrier — solid red line spanning the terminal */}
        {(() => {
          const [, sy] = project(0, SECURITY[0].position[2] - 2.5)
          return (
            <line
              x1={4}
              x2={W - 4}
              y1={sy}
              y2={sy}
              stroke="#DC2626"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )
        })()}

        {/* shops */}
        {SHOPS.map((s) => {
          const [px, pz] = project(s.position[0], s.position[2])
          return (
            <rect
              key={s.id}
              x={px - (s.size[0] * SCALE_X) / 2}
              y={pz - (s.size[2] * SCALE_Z) / 2}
              width={s.size[0] * SCALE_X}
              height={s.size[2] * SCALE_Z}
              fill={s.color}
              stroke={selected?.name === s.name ? '#1F2937' : 'none'}
              strokeWidth={1}
              opacity={0.9}
            />
          )
        })}

        {/* restrooms */}
        {RESTROOMS.map((r) => {
          const [px, pz] = project(r.position[0], r.position[2])
          return (
            <rect
              key={r.id}
              x={px - (r.size[0] * SCALE_X) / 2}
              y={pz - (r.size[2] * SCALE_Z) / 2}
              width={r.size[0] * SCALE_X}
              height={r.size[2] * SCALE_Z}
              fill="#7FB069"
              opacity={0.9}
            />
          )
        })}

        {/* check-in counters */}
        {CHECKIN_ROWS.map((c) => {
          const [px, pz] = project(c.position[0], c.position[2])
          const w = c.length * SCALE_X
          return (
            <rect
              key={c.id}
              x={px - w / 2}
              y={pz - 1.5}
              width={w}
              height={3}
              fill="#1E3A8A"
              opacity={0.85}
              rx={1}
            />
          )
        })}

        {/* security stations */}
        {SECURITY.map((s) => {
          const [px, pz] = project(s.position[0], s.position[2])
          const w = s.lanes * 2 * SCALE_X
          return (
            <rect
              key={s.id}
              x={px - w / 2}
              y={pz - 2}
              width={w}
              height={4}
              fill="#1F3A8A"
              stroke="#FBBF24"
              strokeWidth={0.5}
              opacity={0.95}
              rx={1}
            />
          )
        })}

        {/* entrances */}
        {ENTRANCES.map((e) => {
          const [px, pz] = project(e.position[0], e.position[2])
          return (
            <g key={e.id}>
              <rect x={px - 6} y={pz - 1.5} width={12} height={3} fill="#4ADE80" rx={1.5} />
              <text x={px} y={pz + 8} textAnchor="middle" fontSize={6} fill="#065F46" fontWeight="bold">
                ▼
              </text>
            </g>
          )
        })}

        {/* gates */}
        {GATES.map((g) => {
          const [px, pz] = project(g.position[0], g.position[2])
          return <circle key={g.id} cx={px} cy={pz} r={1.6} fill="#1F3A8A" />
        })}

        {/* user — pulsing red */}
        {routePoints && (
          <polyline
            points={routePoints}
            fill="none"
            stroke="#F59E0B"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 3"
          />
        )}

        <circle cx={ux} cy={uz} r={4} fill="#EF4444" stroke="white" strokeWidth={1.5}>
          <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>

      {/* compact legend */}
      <div className="text-[9px] text-slate-600 px-1 mt-1 flex gap-2 flex-wrap">
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-green-400" /> Entry</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-blue-900" /> Check-in</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 border border-red-500" /> Security</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-800" /> Gate</span>
      </div>
    </div>
  )
}
