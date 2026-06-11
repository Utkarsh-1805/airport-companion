import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import Label from './Label.jsx'

// Information kiosk — a low octagonal counter with a spinning "i" beacon.
export default function InfoKiosk({ name, position, onSelect }) {
  const beaconRef = useRef()
  const [hovered, setHovered] = useState(false)
  const [x, , z] = position

  useFrame((state) => {
    if (!beaconRef.current) return
    beaconRef.current.rotation.y = state.clock.getElapsedTime() * (hovered ? 1.6 : 0.6)
  })

  return (
    <group
      position={[x, 0, z]}
      scale={hovered ? 1.1 : 1}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
      onClick={(e) => { e.stopPropagation(); onSelect?.({ name, position, kind: 'kiosk' }) }}
    >
      {/* counter base */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.95, 0.95, 0.8, 8]} />
        <meshStandardMaterial color="#1F2937" roughness={0.6} />
      </mesh>

      {/* counter top */}
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[1.05, 1.05, 0.1, 8]} />
        <meshStandardMaterial color="#F4F4F0" />
      </mesh>

      {/* spinning info beacon */}
      <group ref={beaconRef} position={[0, 1.7, 0]}>
        <mesh>
          <sphereGeometry args={[0.4, 24, 16]} />
          <meshStandardMaterial
            color="#1F3A8A"
            emissive="#1F3A8A"
            emissiveIntensity={hovered ? 1.0 : 0.6}
          />
        </mesh>
        <mesh position={[0, 0, 0.42]}>
          <ringGeometry args={[0.2, 0.32, 24]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>

      <Label
        text={name}
        position={[0, hovered ? 3 : 2.5, 0]}
        tone="info"
        hovered={hovered}
        icon="ⓘ"
      />
    </group>
  )
}
