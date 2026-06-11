import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Stats } from '@react-three/drei'

import Floor from '../components/Floor.jsx'
import Shop from '../components/Shop.jsx'
import Gate from '../components/Gate.jsx'
import Seating from '../components/Seating.jsx'
import Escalator from '../components/Escalator.jsx'
import Restroom from '../components/Restroom.jsx'
import InfoKiosk from '../components/InfoKiosk.jsx'
import Security from '../components/Security.jsx'
import DutyFree from '../components/DutyFree.jsx'
import UserMarker from '../components/UserMarker.jsx'
import Entrance from '../components/Entrance.jsx'
import CheckInCounter from '../components/CheckInCounter.jsx'
import WayfindingPath from '../components/WayfindingPath.jsx'
import Roadways from '../components/Roadways.jsx'

import {
  SHOPS,
  GATES,
  SEATING,
  ESCALATORS,
  RESTROOMS,
  KIOSKS,
  SECURITY,
  DUTY_FREE,
  ENTRANCES,
  CHECKIN_ROWS,
  LANDSIDE_AMENITIES,
  WAYFINDING,
  ROADWAYS,
  VEHICLE_GATES,
} from '../data/airportData.js'

// Composes the entire 3D scene. Each kind of entity is rendered by mapping
// the data array to its dedicated component. Adding/removing entities is a
// data-only change.
export default function AirportScene({ onSelect, travelerPosition, route, debug = false, children }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      camera={{ position: [40, 95, 130], fov: 38, near: 0.1, far: 900 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#F4F4F0']} />
      <fog attach="fog" args={['#F4F4F0', 240, 460]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={['#FFFFFF', '#A0A0A0', 0.4]} />
      <directionalLight
        position={[80, 130, 60]}
        intensity={1.05}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={140}
        shadow-camera-bottom={-140}
        shadow-bias={-0.0005}
      />

      <Suspense fallback={null}>
        <Floor />

        {/* ─── EXTERNAL ROAD NETWORK ─────────────────────────────────── */}
        <Roadways segments={ROADWAYS} gates={VEHICLE_GATES} />

        {/* ─── LANDSIDE ──────────────────────────────────────────────── */}
        {ENTRANCES.map((e) => (
          <Entrance key={e.id} name={e.name} position={e.position} />
        ))}
        {CHECKIN_ROWS.map((c) => (
          <CheckInCounter
            key={c.id}
            airline={c.airline}
            code={c.code}
            position={c.position}
            length={c.length}
          />
        ))}
        {LANDSIDE_AMENITIES.map((a) =>
          a.kind === 'kiosk' ? (
            <InfoKiosk key={a.id} name={a.name} position={a.position} onSelect={onSelect} />
          ) : (
            <Shop
              key={a.id}
              name={a.name}
              type="service"
              position={a.position}
              size={a.size}
              color={a.color}
              onSelect={onSelect}
            />
          )
        )}

        {/* ─── SECURITY BARRIER ──────────────────────────────────────── */}
        {SECURITY.map((s) => (
          <Security key={s.id} name={s.name} position={s.position} lanes={s.lanes} />
        ))}

        {/* ─── AIRSIDE — SHOPS / FOOD / RETAIL ───────────────────────── */}
        {SHOPS.map((s) => (
          <Shop
            key={s.id}
            name={s.name}
            type={s.type}
            position={s.position}
            size={s.size}
            color={s.color}
            onSelect={onSelect}
          />
        ))}
        {DUTY_FREE.map((d) => (
          <DutyFree key={d.id} name={d.name} position={d.position} size={d.size} color={d.color} />
        ))}

        {/* ─── BOARDING GATES ────────────────────────────────────────── */}
        {GATES.map((g) => (
          <Gate key={g.id} name={g.name} position={g.position} side={g.side} onSelect={onSelect} />
        ))}

        {/* ─── SEATING (instanced) ───────────────────────────────────── */}
        {SEATING.map((s) => (
          <Seating
            key={s.id}
            position={s.position}
            rows={s.rows}
            cols={s.cols}
            orientation={s.orientation}
          />
        ))}

        {/* ─── ESCALATORS ────────────────────────────────────────────── */}
        {ESCALATORS.map((e) => (
          <Escalator
            key={e.id}
            name={e.name}
            position={e.position}
            rotation={e.rotation}
            length={e.length}
          />
        ))}

        {/* ─── AMENITIES & KIOSKS ────────────────────────────────────── */}
        {RESTROOMS.map((r) => (
          <Restroom
            key={r.id}
            name={r.name}
            position={r.position}
            size={r.size}
            accessible={r.accessible}
            onSelect={onSelect}
          />
        ))}
        {KIOSKS.map((k) => (
          <InfoKiosk key={k.id} name={k.name} position={k.position} onSelect={onSelect} />
        ))}

        {/* ─── WAYFINDING & USER MARKER ──────────────────────────────── */}
        <WayfindingPath waypoints={route ?? WAYFINDING} />
        <UserMarker position={travelerPosition} />

        {/* Slot for app-level overlays (itinerary checkpoints, etc.) */}
        {children}

        <ContactShadows
          position={[0, 0.02, 0]}
          opacity={0.32}
          scale={460}
          blur={2.4}
          far={20}
          resolution={1024}
        />
        <Environment preset="city" />
      </Suspense>

      <OrbitControls
        makeDefault
        target={[20, 0, 25]}
        enablePan
        enableZoom
        enableRotate
        minDistance={20}
        maxDistance={340}
        minPolarAngle={Math.PI * 0.12}
        maxPolarAngle={Math.PI * 0.46}
        dampingFactor={0.08}
        zoomSpeed={0.8}
        rotateSpeed={0.7}
        keyPanSpeed={0}
      />

      {debug && <Stats className="!left-auto !right-2 !top-2" />}
    </Canvas>
  )
}
