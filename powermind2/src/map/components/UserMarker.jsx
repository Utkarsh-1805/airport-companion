import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { COLORS } from '../data/airportData.js'

// "You are here" marker — a glowing red puck with a pulsing ring on the
// floor plus a label tag floating above the user's avatar pylon.
export default function UserMarker({ position = [0, 0, 0] }) {
  const ringRef = useRef()
  const puckRef = useRef()

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (ringRef.current) {
      const s = 1 + (Math.sin(t * 2.4) + 1) * 0.6
      ringRef.current.scale.set(s, s, s)
      ringRef.current.material.opacity = 0.5 - (s - 1) * 0.25
    }
    if (puckRef.current) {
      puckRef.current.material.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.2
    }
  })

  const [x, , z] = position

  return (
    <group position={[x, 0, z]}>
      {/* ground puck */}
      <mesh ref={puckRef} position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.12, 32]} />
        <meshStandardMaterial color={COLORS.user} emissive={COLORS.user} emissiveIntensity={0.7} />
      </mesh>

      {/* expanding pulse ring */}
      <mesh ref={ringRef} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.95, 48]} />
        <meshBasicMaterial color={COLORS.user} transparent opacity={0.5} />
      </mesh>

      {/* avatar pylon */}
      <mesh position={[0, 1, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.9, 6, 12]} />
        <meshStandardMaterial color={COLORS.user} roughness={0.4} />
      </mesh>

      <Html position={[0, 2.4, 0]} center distanceFactor={26} style={{ pointerEvents: 'none' }}>
        <div className="px-2 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-bold shadow-lg border border-red-700">
          YOU ARE HERE
        </div>
      </Html>
    </group>
  )
}
