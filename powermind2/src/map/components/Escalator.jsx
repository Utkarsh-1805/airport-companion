import { useState } from 'react'
import Label from './Label.jsx'
import { COLORS } from '../data/airportData.js'

// Inclined slab + step ridges + side rails. Reads as an escalator.
// rotation = yaw; length = travel distance.
export default function Escalator({ name, position, rotation = 0, length = 8 }) {
  const [hovered, setHovered] = useState(false)
  const [x, , z] = position
  const width = 2
  const rise = 1.4

  return (
    <group
      position={[x, 0, z]}
      rotation={[0, rotation, 0]}
      scale={hovered ? 1.05 : 1}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
    >
      {/* inclined slab */}
      <mesh position={[0, rise / 2, 0]} rotation={[Math.atan2(rise, length) * 0.6, 0, 0]} castShadow>
        <boxGeometry args={[width, 0.2, length]} />
        <meshStandardMaterial
          color={COLORS.escalator}
          roughness={0.5}
          emissive={hovered ? COLORS.escalator : '#000000'}
          emissiveIntensity={hovered ? 0.4 : 0}
        />
      </mesh>

      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={i}
          position={[0, 0.2 + (i / 6) * rise, -length / 2 + (i / 6) * length + length / 12]}
          castShadow
        >
          <boxGeometry args={[width * 0.96, 0.08, length / 7]} />
          <meshStandardMaterial color="#5C8FD9" roughness={0.5} />
        </mesh>
      ))}

      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (width / 2 + 0.06), rise / 2 + 0.4, 0]}
          rotation={[Math.atan2(rise, length) * 0.6, 0, 0]}
          castShadow
        >
          <boxGeometry args={[0.08, 0.4, length]} />
          <meshStandardMaterial color="#1F2937" />
        </mesh>
      ))}

      <Label
        text={name}
        position={[0, rise + 1.0, 0]}
        tone="default"
        hovered={hovered}
        icon="↑"
        size="small"
      />
    </group>
  )
}
