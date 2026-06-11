import { useMemo, useState } from 'react'
import Label from './Label.jsx'
import { COLORS } from '../data/airportData.js'

// A long counter row for one airline. Hover lights up the back-wall and
// makes the row label pop.
export default function CheckInCounter({ airline, code, position, length = 28 }) {
  const [hovered, setHovered] = useState(false)
  const [x, , z] = position
  const stationCount = Math.max(3, Math.round(length / 4))

  const stations = useMemo(
    () =>
      Array.from({ length: stationCount }).map((_, i) => {
        const offset = -length / 2 + (i + 0.5) * (length / stationCount)
        return offset
      }),
    [length, stationCount]
  )

  return (
    <group
      position={[x, 0, z]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[length, 1, 1.6]} />
        <meshStandardMaterial color="#F4F4F0" roughness={0.7} />
      </mesh>

      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[length + 0.2, 0.1, 1.8]} />
        <meshStandardMaterial color="#1F2937" roughness={0.5} />
      </mesh>

      {stations.map((sx, i) => (
        <group key={i} position={[sx, 0, 0]}>
          <mesh position={[0, 1.4, 0.6]}>
            <boxGeometry args={[0.05, 0.7, 0.6]} />
            <meshStandardMaterial color="#94A3B8" />
          </mesh>
          <mesh position={[0, 1.7, 0.4]} rotation={[0, Math.PI, 0]}>
            <boxGeometry args={[0.6, 0.4, 0.05]} />
            <meshStandardMaterial color="#0F172A" emissive="#1E40AF" emissiveIntensity={hovered ? 0.8 : 0.4} />
          </mesh>
        </group>
      ))}

      {/* tall airline back-wall display */}
      <mesh position={[0, 3, -1.4]} castShadow>
        <boxGeometry args={[length, 4, 0.3]} />
        <meshStandardMaterial
          color={COLORS.airline}
          roughness={0.6}
          emissive={hovered ? COLORS.airline : '#000000'}
          emissiveIntensity={hovered ? 0.4 : 0}
        />
      </mesh>

      <mesh position={[-length / 2 + 1.5, 4.2, -1.25]}>
        <boxGeometry args={[2, 1.2, 0.15]} />
        <meshStandardMaterial color="#FBBF24" emissive="#FBBF24" emissiveIntensity={hovered ? 0.8 : 0.4} />
      </mesh>

      <mesh position={[0, 0.18, -2.4]}>
        <boxGeometry args={[length, 0.2, 0.8]} />
        <meshStandardMaterial color="#374151" roughness={0.4} />
      </mesh>

      <Label
        text={`${code} · ${airline}`}
        position={[0, hovered ? 6 : 5.3, -1]}
        tone="info"
        size="large"
        hovered={hovered}
        icon="✈"
      />
    </group>
  )
}
