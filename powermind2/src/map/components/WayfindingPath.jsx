import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { COLORS } from '../data/airportData.js'

// Draws the recommended user route as a connected gold strip on the floor,
// with numbered waypoint markers and slowly travelling chevron arrows.
//
// Waypoints arrive as {position: [x,0,z], label}. We render each segment
// between consecutive waypoints as a flat strip on the floor (rotated
// onto Y=0). A Float32-backed travelling dot animates along each segment
// to indicate direction.
export default function WayfindingPath({ waypoints }) {
  const segments = useMemo(() => {
    const out = []
    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = new THREE.Vector3(...waypoints[i].position)
      const b = new THREE.Vector3(...waypoints[i + 1].position)
      const mid = a.clone().add(b).multiplyScalar(0.5)
      const dir = b.clone().sub(a)
      const length = dir.length()
      if (length < 0.05) continue
      const yaw = Math.atan2(dir.x, dir.z) // angle around Y so +Z aligns with the segment
      out.push({ a: a.toArray(), b: b.toArray(), mid: mid.toArray(), length, yaw })
    }
    return out
  }, [waypoints])

  return (
    <group>
      {segments.map((s, i) => (
        <PathSegment key={i} mid={s.mid} length={s.length} yaw={s.yaw} index={i} />
      ))}

      {/* numbered waypoint discs */}
      {waypoints
        .filter((wp) => wp.label)
        .map((wp, i) => (
          <Waypoint key={wp.id ?? i} index={i + 1} label={wp.label} position={wp.position} />
        ))}
    </group>
  )
}

function PathSegment({ mid, length, yaw, index }) {
  const arrowRef = useRef()

  useFrame((state) => {
    if (!arrowRef.current) return
    // travel from -length/2 → +length/2, then loop
    const t = (state.clock.getElapsedTime() * 4 + index * 1.3) % length
    arrowRef.current.position.z = -length / 2 + t
  })

  return (
    <group position={[mid[0], 0.04, mid[2]]} rotation={[0, yaw, 0]}>
      {/* solid gold strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.6, length]} />
        <meshBasicMaterial color={COLORS.wayfinding} transparent opacity={0.55} />
      </mesh>

      {/* dashed centre rule */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[0.25, length]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} />
      </mesh>

      {/* travelling chevron */}
      <mesh ref={arrowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.45, 24]} />
        <meshBasicMaterial color="#FBBF24" />
      </mesh>
    </group>
  )
}

function Waypoint({ index, label, position }) {
  const [x, , z] = position

  return (
    <group position={[x, 0.05, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.4, 32]} />
        <meshBasicMaterial color={COLORS.wayfinding} transparent opacity={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[1.4, 1.65, 32]} />
        <meshBasicMaterial color="#1F2937" />
      </mesh>

      <Html position={[0, 0.5, 0]} center distanceFactor={26} style={{ pointerEvents: 'none' }}>
        <div className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px] border border-amber-700 shadow-md">
          {label}
        </div>
      </Html>
    </group>
  )
}
