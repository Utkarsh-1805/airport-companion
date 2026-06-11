import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import Label from './Label.jsx'
import { COLORS } from '../data/airportData.js'

// A boarding gate marker: pylon + glowing pulsing top disc + bold label.
// Hover scales the whole pylon, intensifies the disc emission, and pops
// the label.
export default function Gate({ name, position, side = 'north', onSelect }) {
  const discRef = useRef()
  const [hovered, setHovered] = useState(false)
  const [x, , z] = position

  const labelOffsetZ = side === 'north' ? -2.4 : 2.4

  useFrame((state) => {
    if (!discRef.current) return
    const t = state.clock.getElapsedTime()
    const base = hovered ? 1.1 : 0.6
    discRef.current.material.emissiveIntensity = base + Math.sin(t * 2) * 0.3
  })

  return (
    <group
      position={[x, 0, z]}
      scale={hovered ? 1.08 : 1}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
      onClick={(e) => { e.stopPropagation(); onSelect?.({ name, position, side, kind: 'gate' }) }}
    >
      {/* base */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[2.6, 0.1, 2.6]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>

      {/* pylon */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.26, 2.8, 16]} />
        <meshStandardMaterial color="#1F2937" roughness={0.6} />
      </mesh>

      {/* glowing disc */}
      <mesh ref={discRef} position={[0, 2.9, 0]}>
        <cylinderGeometry args={[0.65, 0.65, 0.2, 24]} />
        <meshStandardMaterial
          color={COLORS.escalator}
          emissive={COLORS.escalator}
          emissiveIntensity={0.7}
          roughness={0.4}
        />
      </mesh>

      <Label
        text={name}
        position={[0, 3.9, labelOffsetZ]}
        tone="gate"
        size="large"
        hovered={hovered}
        icon="✈"
      />
    </group>
  )
}
