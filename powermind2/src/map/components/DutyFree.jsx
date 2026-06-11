import { useState, useMemo } from 'react'
import * as THREE from 'three'
import Label from './Label.jsx'
import { COLORS } from '../data/airportData.js'

// Wide elliptical island for the Duty Free area in the middle of the
// food court. Hover lifts and brightens it like the other shops.
export default function DutyFree({ name, position, size, color = COLORS.dutyFree, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const [w, h, d] = size
  const [x, , z] = position

  const baseColor  = useMemo(() => new THREE.Color(color), [color])
  const hoverColor = useMemo(() => new THREE.Color(color).offsetHSL(0, 0, 0.08), [color])

  return (
    <group
      position={[x, h / 2, z]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
      onClick={(e) => { e.stopPropagation(); onSelect?.({ name, position, size, type: 'retail', kind: 'dutyfree' }) }}
      scale={hovered ? 1.04 : 1}
    >
      <mesh castShadow receiveShadow scale={[w / 2, h, d / 2]} position={[0, hovered ? 0.4 : 0, 0]}>
        <cylinderGeometry args={[1, 1, 1, 48]} />
        <meshStandardMaterial
          color={hovered ? hoverColor : baseColor}
          roughness={0.8}
          emissive={hovered ? baseColor : '#000000'}
          emissiveIntensity={hovered ? 0.2 : 0}
        />
      </mesh>

      <mesh position={[0, h / 2 + 0.02, 0]} scale={[w / 2 + 0.2, 0.05, d / 2 + 0.2]}>
        <cylinderGeometry args={[1, 1, 1, 48]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
      </mesh>

      <Label
        text={name}
        position={[0, h / 2 + (hovered ? 1.4 : 0.9), 0]}
        tone="info"
        size="large"
        hovered={hovered}
      />
    </group>
  )
}
