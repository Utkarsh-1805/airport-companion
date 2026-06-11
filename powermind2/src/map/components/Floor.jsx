import { useMemo } from 'react'
import * as THREE from 'three'
import { FLOOR, ZONES, Z_SECURITY, Z_CHECKIN, Z_ENTRANCE } from '../data/airportData.js'

// The base concourse floor + per-zone tinted underlays + landside zone
// tint + a thin wall along the security barrier so users can see the
// landside / airside boundary as a real edge.
export default function Floor() {
  const [w, d] = FLOOR.size
  const [cx, , cz] = FLOOR.center

  const overlays = useMemo(
    () =>
      ZONES.map((z) => ({
        ...z,
        geom: new THREE.PlaneGeometry(z.size[0], z.size[1])
      })),
    []
  )

  return (
    <group>
      {/* world ground — wide pale-grey plane that the external road network
          sits on. Slightly below the master floor to avoid z-fighting. */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[20, -0.01, 60]}>
        <planeGeometry args={[600, 280]} />
        <meshStandardMaterial color="#E8E8E2" roughness={0.95} />
      </mesh>

      {/* master floor — the terminal building footprint */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={FLOOR.color} roughness={0.95} />
      </mesh>

      {/* per-zone underlays */}
      {overlays.map((z) => (
        <mesh
          key={z.id}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[z.center[0], 0.005, z.center[2]]}
          receiveShadow
        >
          <primitive object={z.geom} attach="geometry" />
          <meshStandardMaterial color={z.color} roughness={0.95} transparent opacity={0.55} />
        </mesh>
      ))}

      {/* airside main concourse strip (centerline corridor) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.01, 0]}>
        <planeGeometry args={[w - 30, 6]} />
        <meshStandardMaterial color="#FAFAF5" roughness={0.9} />
      </mesh>

      {/* landside hall floor — a slightly different pale tone so the boundary reads */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.012, (Z_CHECKIN + Z_ENTRANCE) / 2]}>
        <planeGeometry args={[w - 20, 24]} />
        <meshStandardMaterial color="#EEF2F7" roughness={0.9} />
      </mesh>

      {/* security boundary line — a slim red strip across the full width */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.014, Z_SECURITY - 2.5]}>
        <planeGeometry args={[w - 10, 0.4]} />
        <meshBasicMaterial color="#DC2626" transparent opacity={0.7} />
      </mesh>

      {/* "SECURITY BOUNDARY" repeating tick marks just landside of the barrier */}
      {Array.from({ length: 24 }).map((_, i) => {
        const x = -150 + i * 14
        return (
          <mesh
            key={`tick-${i}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[x, 0.016, Z_SECURITY - 5]}
          >
            <planeGeometry args={[1.2, 0.18]} />
            <meshBasicMaterial color="#DC2626" />
          </mesh>
        )
      })}

      {/* dashed centerline guide along the airside concourse */}
      {Array.from({ length: 40 }).map((_, i) => {
        const x = -150 + i * 8
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.018, 0]}>
            <planeGeometry args={[3, 0.18]} />
            <meshBasicMaterial color="#C8C8BE" />
          </mesh>
        )
      })}
    </group>
  )
}
