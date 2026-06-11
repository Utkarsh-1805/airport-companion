import { Html } from '@react-three/drei'

// Floating HTML label that always faces the camera. Two visual states:
//   default → readable but unobtrusive
//   hovered → scales up, gains a glowing amber ring, font becomes bolder
//
// Inline-styled (no Tailwind dependency) so it renders correctly in apps
// that don't ship Tailwind (e.g. powermind2).
const TONE_STYLES = {
  default: { background: 'rgba(255,255,255,0.96)', color: '#1F2937', border: '#cbd5e1' },
  gate:    { background: 'rgba(15,23,42,0.95)',    color: '#FFFFFF', border: '#334155' },
  food:    { background: 'rgba(236,254,255,0.96)', color: '#155E75', border: '#67E8F9' },
  retail:  { background: 'rgba(255,247,237,0.96)', color: '#9A3412', border: '#FDBA74' },
  rest:    { background: 'rgba(236,253,245,0.96)', color: '#065F46', border: '#34D399' },
  info:    { background: 'rgba(255,251,235,0.96)', color: '#92400E', border: '#FCD34D' },
}

export default function Label({
  text,
  position = [0, 0, 0],
  color,
  tone = 'default',
  icon,
  hovered = false,
  size = 'normal' // 'normal' | 'large' | 'small'
}) {
  const palette = TONE_STYLES[tone] || TONE_STYLES.default
  const baseFont  = size === 'large' ? 13 : size === 'small' ? 10 : 11
  const hoverFont = baseFont + 3

  // Smaller distanceFactor = label looks larger at any camera distance.
  // Defaults are tuned so labels are *legible* but never dominate the
  // scene; hover bumps the size by ~25%.
  const distanceFactor = hovered ? 22 : 32

  return (
    <Html
      position={position}
      center
      distanceFactor={distanceFactor}
      occlude={false}
      zIndexRange={[10, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        style={{
          background: palette.background,
          color: color || palette.color,
          border: `1.5px solid ${palette.border}`,
          padding: '4px 10px',
          borderRadius: 8,
          fontWeight: 700,
          letterSpacing: hovered ? '0.01em' : 0,
          fontSize: `${hovered ? hoverFont : baseFont}px`,
          lineHeight: 1.15,
          whiteSpace: 'nowrap',
          fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
          boxShadow: hovered
            ? '0 6px 18px rgba(245, 158, 11, 0.45), 0 0 0 2px rgba(251, 191, 36, 0.55)'
            : '0 1px 4px rgba(0,0,0,0.18)',
          transition: 'all 160ms cubic-bezier(.2, .9, .3, 1.3)',
          transform: hovered ? 'scale(1.18)' : 'scale(1)',
          transformOrigin: 'center bottom',
          userSelect: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {icon ? <span style={{ marginRight: 2 }}>{icon}</span> : null}
        {text}
      </div>
    </Html>
  )
}
