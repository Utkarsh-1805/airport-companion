import { useState, useMemo } from 'react'
import * as THREE from 'three'
import Label from './Label.jsx'
import { COLORS } from '../data/airportData.js'

// A shop / retail block — extruded box with a label that pops up on hover.
// Hover lifts the block, brightens the material, and tells the Label to
// scale + glow. Click bubbles up via onSelect.
export default function Shop({
  name,
  type = 'retail',
  position = [0, 0, 0],
  size = [4, 4, 4],
  color = COLORS.retail,
  onSelect
}) {
  const [hovered, setHovered] = useState(false)
  const [w, h, d] = size
  const [x, , z] = position

  const baseColor  = useMemo(() => new THREE.Color(color), [color])
  const hoverColor = useMemo(() => new THREE.Color(color).offsetHSL(0, 0, 0.1), [color])

  const tone = type === 'food' ? 'food' : type === 'service' ? 'rest' : 'retail'
  // Bigger blocks get bigger base labels.
  const labelSize = w * d > 60 ? 'large' : w * d < 12 ? 'small' : 'normal'

  return (
    <group position={[x, h / 2, z]}>
      <mesh
        castShadow
        receiveShadow
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
        onClick={(e) => { e.stopPropagation(); onSelect?.({ name, type, position, size, color }) }}
        position={[0, hovered ? 0.5 : 0, 0]}
        scale={hovered ? 1.04 : 1}
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={hovered ? hoverColor : baseColor}
          roughness={0.85}
          metalness={0.05}
          emissive={hovered ? baseColor : '#000000'}
          emissiveIntensity={hovered ? 0.25 : 0}
        />
      </mesh>

      {/* roof highlight strip */}
      <mesh position={[0, h / 2 + 0.01, 0]}>
        <boxGeometry args={[w * 0.94, 0.05, d * 0.94]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
      </mesh>

      <Label
        text={name}
        position={[0, h / 2 + (hovered ? 1.0 : 0.6), 0]}
        tone={tone}
        size={labelSize}
        hovered={hovered}
      />
    </group>
  )
}
