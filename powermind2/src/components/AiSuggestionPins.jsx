import React from "react";
import { Html } from "@react-three/drei";

// Thin glowing pin used to mark places the AI just suggested. Visually
// distinct from itinerary checkpoints (which use amber/green) so the user
// can read the map at a glance: amber = saved, violet = AI suggestion.
function Pin({ highlight, onPick }) {
  const lift = 3.0;
  return (
    <group position={[highlight.position[0], 0, highlight.position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[1.0, 1.9, 28]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, lift / 2, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, lift, 8]} />
        <meshStandardMaterial color="#7c3aed" roughness={0.4} />
      </mesh>
      <mesh position={[0, lift, 0]} castShadow>
        <sphereGeometry args={[0.55, 18, 14]} />
        <meshStandardMaterial color="#7c3aed" emissive="#a78bfa" emissiveIntensity={0.5} roughness={0.3} />
      </mesh>
      <Html
        position={[0, lift + 1.1, 0]}
        center
        distanceFactor={28}
        occlude={false}
        zIndexRange={[14, 0]}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPick?.(highlight); }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            background: "rgba(124, 58, 237, 0.95)",
            color: "#fff",
            border: "1.5px solid #c4b5fd",
            borderRadius: 999,
            fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 0.2,
            whiteSpace: "nowrap",
            boxShadow: "0 6px 16px rgba(124, 58, 237, 0.45), 0 0 0 2px rgba(167, 139, 250, 0.4)",
            cursor: "pointer",
          }}
        >
          <span style={{
            background: "#fff",
            color: "#7c3aed",
            padding: "1px 6px",
            borderRadius: 999,
            fontSize: 9,
            letterSpacing: 0.4,
          }}>AI</span>
          {highlight.label}
        </button>
      </Html>
    </group>
  );
}

export default function AiSuggestionPins({ highlights, onPick }) {
  if (!highlights?.length) return null;
  return (
    <group>
      {highlights.map((h) => (
        <Pin key={h.id} highlight={h} onPick={onPick} />
      ))}
    </group>
  );
}
