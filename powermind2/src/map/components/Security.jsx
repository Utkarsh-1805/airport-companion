import { useState } from 'react'
import Label from './Label.jsx'
import { COLORS } from '../data/airportData.js'

// Security check station — landside/airside barrier with x-ray belts,
// metal-detector arches, podium ends and a back wall.
export default function Security({ name, position, lanes = 4 }) {
  const [hovered, setHovered] = useState(false)
  const [x, , z] = position
  const laneW = 1.8
  const laneL = 7
  const wallH = 3.2
  const gap = 0.3

  return (
    <group
      position={[x, 0, z]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, wallH / 2, 2]} castShadow>
        <boxGeometry args={[lanes * (laneW + gap) + 1.2, wallH, 0.4]} />
        <meshStandardMaterial color="#1F2937" roughness={0.6} />
      </mesh>

      <mesh position={[0, wallH + 0.5, 2]}>
        <boxGeometry args={[lanes * (laneW + gap) + 1.2, 1.0, 0.3]} />
        <meshStandardMaterial
          color={COLORS.security}
          emissive={COLORS.security}
          emissiveIntensity={hovered ? 0.8 : 0.4}
        />
      </mesh>

      {Array.from({ length: lanes }).map((_, i) => {
        const offset = (i - (lanes - 1) / 2) * (laneW + gap)
        return (
          <group key={i} position={[offset, 0, 0]}>
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[laneW, 1, laneL]} />
              <meshStandardMaterial color={COLORS.security} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.6, -laneL / 2 - 0.5]} castShadow>
              <boxGeometry args={[laneW, 1.2, 1]} />
              <meshStandardMaterial color="#F4F4F0" />
            </mesh>
            <mesh position={[0, 0.6, +laneL / 2 + 0.5]} castShadow>
              <boxGeometry args={[laneW, 1.2, 1]} />
              <meshStandardMaterial color="#F4F4F0" />
            </mesh>
            <group position={[0, 0, -laneL / 2 - 0.2]}>
              <mesh position={[-laneW / 2 + 0.1, wallH / 2, 0]} castShadow>
                <boxGeometry args={[0.18, wallH, 0.18]} />
                <meshStandardMaterial color="#94A3B8" />
              </mesh>
              <mesh position={[+laneW / 2 - 0.1, wallH / 2, 0]} castShadow>
                <boxGeometry args={[0.18, wallH, 0.18]} />
                <meshStandardMaterial color="#94A3B8" />
              </mesh>
              <mesh position={[0, wallH - 0.1, 0]} castShadow>
                <boxGeometry args={[laneW + 0.1, 0.2, 0.18]} />
                <meshStandardMaterial color="#94A3B8" />
              </mesh>
            </group>
          </group>
        )
      })}

      <Label
        text={name}
        position={[0, hovered ? 6.5 : 5.5, 2]}
        tone="info"
        size="large"
        hovered={hovered}
        icon="🛂"
      />
    </group>
  )
}
