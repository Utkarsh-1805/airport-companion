import { useState } from 'react'
import Label from './Label.jsx'

// Landside entrance portal — wide doorway with glowing lintel & "ENTRANCE"
// label. Hover scales the portal slightly and pops the label.
export default function Entrance({ name, position }) {
  const [hovered, setHovered] = useState(false)
  const [x, , z] = position
  const W = 12
  const H = 4.5
  const D = 1.2

  return (
    <group
      position={[x, 0, z]}
      scale={hovered ? 1.05 : 1}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, H + 0.4, 0]} castShadow>
        <boxGeometry args={[W + 4, 0.6, D + 1.5]} />
        <meshStandardMaterial color="#2D3748" roughness={0.6} />
      </mesh>

      <mesh position={[-W / 2 - 0.2, H / 2, 0]} castShadow>
        <boxGeometry args={[0.5, H, D]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      <mesh position={[+W / 2 + 0.2, H / 2, 0]} castShadow>
        <boxGeometry args={[0.5, H, D]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>

      <mesh position={[0, H / 2, 0]}>
        <boxGeometry args={[W, H - 0.4, 0.1]} />
        <meshStandardMaterial color="#A0CFE3" transparent opacity={0.45} roughness={0.1} metalness={0.2} />
      </mesh>

      <mesh position={[0, H + 0.05, 0]}>
        <boxGeometry args={[W + 0.4, 0.3, D + 0.4]} />
        <meshStandardMaterial
          color="#4ADE80"
          emissive="#4ADE80"
          emissiveIntensity={hovered ? 1.0 : 0.6}
        />
      </mesh>

      <mesh position={[0, 0.04, -D / 2 - 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W - 1, 1.5]} />
        <meshStandardMaterial color="#7F1D1D" roughness={0.95} />
      </mesh>

      <Label
        text={`▼ ${name}`}
        position={[0, H + (hovered ? 2 : 1.5), 0]}
        tone="info"
        size="large"
        hovered={hovered}
      />
    </group>
  )
}
