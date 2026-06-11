import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { COLORS } from '../data/airportData.js'

// A seating cluster — instanced chairs to keep draw calls flat even with
// hundreds of seats across the terminal. Each cluster is rows × cols of
// linked seat units (cushion + backrest), oriented along X by default.
//
// The seat unit footprint is ~0.55m wide × 0.6m deep, rows spaced 1.2m apart.
const SEAT_W = 0.55
const SEAT_D = 0.6
const ROW_GAP = 1.2
const COL_GAP = 0.6

export default function Seating({ position, rows = 3, cols = 4, orientation = 'x' }) {
  const seatRef = useRef()
  const backRef = useRef()
  const count = rows * cols * 2 // chairs per cluster: each row has TWO seats back-to-back

  const matrices = useMemo(() => {
    const seats = []
    const backs = []
    const dummy = new THREE.Object3D()
    const totalW = cols * (SEAT_W + COL_GAP)
    const totalD = rows * ROW_GAP

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = -totalW / 2 + c * (SEAT_W + COL_GAP) + SEAT_W / 2
        const z = -totalD / 2 + r * ROW_GAP

        // forward-facing seat (cushion + backrest behind it)
        dummy.position.set(x, 0.22, z - 0.05)
        dummy.rotation.set(0, 0, 0)
        dummy.updateMatrix()
        seats.push(dummy.matrix.clone())

        dummy.position.set(x, 0.55, z - 0.32)
        dummy.scale.set(1, 1.4, 0.25)
        dummy.updateMatrix()
        backs.push(dummy.matrix.clone())
        dummy.scale.set(1, 1, 1)

        // back-to-back facing seat
        dummy.position.set(x, 0.22, z + 0.55)
        dummy.rotation.set(0, Math.PI, 0)
        dummy.updateMatrix()
        seats.push(dummy.matrix.clone())

        dummy.position.set(x, 0.55, z + 0.82)
        dummy.scale.set(1, 1.4, 0.25)
        dummy.updateMatrix()
        backs.push(dummy.matrix.clone())
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(1, 1, 1)
      }
    }

    return { seats, backs }
  }, [rows, cols])

  useEffect(() => {
    if (!seatRef.current || !backRef.current) return
    matrices.seats.forEach((m, i) => seatRef.current.setMatrixAt(i, m))
    matrices.backs.forEach((m, i) => backRef.current.setMatrixAt(i, m))
    seatRef.current.instanceMatrix.needsUpdate = true
    backRef.current.instanceMatrix.needsUpdate = true
  }, [matrices])

  const yawY = orientation === 'z' ? Math.PI / 2 : 0
  const [px, , pz] = position

  return (
    <group position={[px, 0, pz]} rotation={[0, yawY, 0]}>
      {/* cushions */}
      <instancedMesh ref={seatRef} args={[null, null, count]} castShadow receiveShadow>
        <boxGeometry args={[SEAT_W, 0.12, SEAT_D]} />
        <meshStandardMaterial color={COLORS.seating} roughness={0.7} />
      </instancedMesh>

      {/* backrests */}
      <instancedMesh ref={backRef} args={[null, null, count]} castShadow>
        <boxGeometry args={[SEAT_W, 0.5, 0.12]} />
        <meshStandardMaterial color={COLORS.seating} roughness={0.7} />
      </instancedMesh>
    </group>
  )
}
