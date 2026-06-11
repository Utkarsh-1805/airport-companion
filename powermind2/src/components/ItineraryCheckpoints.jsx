import React from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

// Renders a 3D pin at each itinerary stop on the map.
//   done       → green check, ring fades
//   completing → amber, spinning ring (verifying arrival)
//   active     → amber pulsing, "NEXT" badge
//   pending    → slate-blue, faded
//
// Stops are positioned at their node's [x, y, z]; the pin floats just
// above the floor and labels with the stop title.

const TONE = {
  done:       { primary: "#16a34a", ring: "#86efac", text: "DONE", icon: "✓" },
  completing: { primary: "#f59e0b", ring: "#fde68a", text: "VERIFYING", icon: "" },
  active:     { primary: "#f59e0b", ring: "#fde68a", text: "NEXT", icon: "" },
  pending:    { primary: "#475569", ring: "#cbd5e1", text: "", icon: "" },
};

function CompletingRing({ y }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 3;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <ringGeometry args={[1.6, 2.6, 32, 1, 0, Math.PI * 1.4]} />
      <meshBasicMaterial color="#f59e0b" transparent opacity={0.95} />
    </mesh>
  );
}

function Pin({ stop }) {
  const tone = TONE[stop.status] || TONE.pending;
  const lift = stop.status === "active" || stop.status === "completing" ? 4.4 : 3.4;
  const headSize = stop.status === "active" || stop.status === "completing" ? 0.85 : 0.65;
  return (
    <group position={[stop.position[0], 0, stop.position[2]]}>
      {/* Floor halo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[1.4, 2.4, 32]} />
        <meshBasicMaterial
          color={tone.ring}
          transparent
          opacity={stop.status === "active" || stop.status === "completing" ? 0.85 : 0.45}
        />
      </mesh>
      {stop.status === "completing" && <CompletingRing y={0.08} />}

      {/* Pole */}
      <mesh position={[0, lift / 2, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, lift, 8]} />
        <meshStandardMaterial color={tone.primary} roughness={0.4} />
      </mesh>
      {/* Head */}
      <mesh position={[0, lift, 0]} castShadow>
        <sphereGeometry args={[headSize, 18, 14]} />
        <meshStandardMaterial
          color={tone.primary}
          emissive={tone.primary}
          emissiveIntensity={stop.status === "active" || stop.status === "completing" ? 0.6 : 0.15}
          roughness={0.3}
        />
      </mesh>

      <Html
        position={[0, lift + 1.4, 0]}
        center
        distanceFactor={26}
        occlude={false}
        zIndexRange={[15, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            background:
              stop.status === "done"
                ? "rgba(220, 252, 231, 0.96)"
                : stop.status === "active" || stop.status === "completing"
                  ? "#fef3c7"
                  : "rgba(255,255,255,0.96)",
            color:
              stop.status === "done"
                ? "#065f46"
                : stop.status === "active" || stop.status === "completing"
                  ? "#7c2d12"
                  : "#1f2937",
            border: `1.5px solid ${tone.ring}`,
            borderRadius: 999,
            fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 0.2,
            whiteSpace: "nowrap",
            boxShadow:
              stop.status === "active" || stop.status === "completing"
                ? "0 6px 16px rgba(245, 158, 11, 0.45), 0 0 0 2px rgba(251, 191, 36, 0.55)"
                : stop.status === "done"
                  ? "0 4px 12px rgba(22, 163, 74, 0.35)"
                  : "0 1px 4px rgba(0,0,0,0.18)",
          }}
        >
          {tone.text && (
            <span
              style={{
                background: tone.primary,
                color: "white",
                padding: "1px 6px",
                borderRadius: 999,
                fontSize: 9,
                letterSpacing: 0.4,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              {tone.icon && <span>{tone.icon}</span>}
              {tone.text}
            </span>
          )}
          {stop.label}
        </div>
      </Html>
    </group>
  );
}

export default function ItineraryCheckpoints({ stops }) {
  if (!stops?.length) return null;
  return (
    <group>
      {stops.map((stop) => (
        <Pin key={stop.id} stop={stop} />
      ))}
    </group>
  );
}
