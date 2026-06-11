import { useState, useMemo } from 'react'
import * as THREE from 'three'
import Label from './Label.jsx'
import { COLORS } from '../data/airportData.js'

// A green amenity block. Accessible variants ("PRM" — Persons with Reduced
// Mobility) get a wheelchair indicator on the roof.
export default function Restroom({ name, position, size = [6, 3.5, 5], accessible = false, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const [w, h, d] = size
  const [x, , z] = position

  const baseColor  = useMemo(() => new THREE.Color(COLORS.restroom), [])
  const hoverColor = useMemo(() => new THREE.Color(COLORS.restroom).offsetHSL(0, 0, 0.08), [])

  return (
    <group
      position={[x, h / 2, z]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
      onClick={(e) => { e.stopPropagation(); onSelect?.({ name, position, size, kind: 'restroom' }) }}
      scale={hovered ? 1.05 : 1}
    >
      <mesh castShadow receiveShadow position={[0, hovered ? 0.4 : 0, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={hovered ? hoverColor : baseColor}
          roughness={0.85}
          emissive={hovered ? baseColor : '#000000'}
          emissiveIntensity={hovered ? 0.25 : 0}
        />
      </mesh>

      <mesh position={[0, h / 2 + 0.02, 0]}>
        <boxGeometry args={[w * 0.94, 0.05, d * 0.94]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
      </mesh>

      {accessible && (
        <mesh position={[w / 2 - 0.6, h / 2 + 0.12, -d / 2 + 0.6]}>
          <circleGeometry args={[0.5, 24]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      )}

      <Label
        text={accessible ? `♿ ${name}` : `🚻 ${name}`}
        position={[0, h / 2 + (hovered ? 1.0 : 0.6), 0]}
        tone="rest"
        hovered={hovered}
      />
    </group>
  )
}
