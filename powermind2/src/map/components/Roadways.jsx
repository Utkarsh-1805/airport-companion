import { useMemo, useState } from 'react'
import Label from './Label.jsx'

// Renders the external road network — curbside, main arterial, and the
// radiating access roads ("vehicle gates") that branch in from outside.
//
// Each segment is a flat plane in the XZ plane positioned + rotated so
// it points from `from` to `to`. White edge stripes + dashed yellow
// centerline give it the standard roadway read.

function segmentTransform(from, to) {
  const dx = to[0] - from[0]
  const dz = to[2] - from[2]
  const length = Math.hypot(dx, dz)
  // Y rotation that maps local +X (the plane's length axis after the
  // X-rotation flatten) to the from→to direction in the floor plane.
  const yaw = -Math.atan2(dz, dx)
  const cx = (from[0] + to[0]) / 2
  const cz = (from[2] + to[2]) / 2
  return { length, yaw, cx, cz }
}

export default function Roadways({ segments, gates = [] }) {
  return (
    <group>
      {segments.map((seg) => (
        <Roadway key={seg.id} {...seg} />
      ))}
      {gates.map((g) => (
        <VehicleGate key={g.id} {...g} />
      ))}
    </group>
  )
}

function Roadway({ from, to, width = 4, type = 'access' }) {
  const { length, yaw, cx, cz } = useMemo(() => segmentTransform(from, to), [from, to])

  const surfaceColor = type === 'curb' ? '#E5E5DC' : '#D8D8D2'
  const showDashes   = type !== 'curb'

  // dash spacing
  const dashCount = Math.max(0, Math.floor(length / 4))

  return (
    <group position={[cx, 0.004, cz]} rotation={[0, yaw, 0]}>
      {/* asphalt surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial color={surfaceColor} roughness={0.95} />
      </mesh>

      {/* white edge stripes */}
      {[+1, -1].map((s) => (
        <mesh
          key={s}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.001, s * (width / 2 - 0.1)]}
        >
          <planeGeometry args={[length, 0.18]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      ))}

      {/* yellow dashed centerline (skipped for curb) */}
      {showDashes &&
        Array.from({ length: dashCount }).map((_, i) => (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[-length / 2 + (i + 0.5) * 4, 0.002, 0]}
          >
            <planeGeometry args={[2, 0.18]} />
            <meshBasicMaterial color="#FBBF24" />
          </mesh>
        ))}
    </group>
  )
}

function VehicleGate({ name, position }) {
  const [hovered, setHovered] = useState(false)
  const [x, , z] = position

  return (
    <group
      position={[x, 0, z]}
      scale={hovered ? 1.1 : 1}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
    >
      {/* gate-arm pillars */}
      {[-1, +1].map((s) => (
        <mesh key={s} position={[s * 3.5, 1.3, 0]} castShadow>
          <boxGeometry args={[0.5, 2.6, 0.5]} />
          <meshStandardMaterial color="#1F2937" />
        </mesh>
      ))}
      {/* horizontal arm — yellow & black striped */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[7, 0.3, 0.3]} />
        <meshStandardMaterial color="#FBBF24" />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[7.02, 0.32, 0.32]} />
        <meshBasicMaterial color="#1F2937" wireframe />
      </mesh>

      <Label
        text={name}
        position={[0, hovered ? 3.4 : 2.6, 0]}
        tone="info"
        size="large"
        hovered={hovered}
        icon="🚗"
      />
    </group>
  )
}
