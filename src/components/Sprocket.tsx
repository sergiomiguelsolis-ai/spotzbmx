/**
 * Sprocket (estrella) de BMX generada por código: dientes + 5 ventanas + eje.
 * Se dibuja en un viewBox de -12..12.
 */
const TEETH = 22;
const R_TIP = 11.4;
const R_ROOT = 9.6;
const HOLES = 5;

function pt(r: number, a: number) {
  return `${(r * Math.cos(a)).toFixed(3)} ${(r * Math.sin(a)).toFixed(3)}`;
}

function buildPath() {
  const step = (Math.PI * 2) / TEETH;
  let d = '';
  for (let i = 0; i < TEETH; i++) {
    const a = i * step - Math.PI / 2;
    d += `${i === 0 ? 'M' : 'L'}${pt(R_ROOT, a - step * 0.5)} L${pt(R_TIP, a - step * 0.2)} L${pt(R_TIP, a + step * 0.2)} L${pt(R_ROOT, a + step * 0.5)} `;
  }
  d += 'Z ';
  // Ventanas tipo "star" entre radio 3.6 y 7.4
  const span = (Math.PI * 2) / HOLES;
  for (let i = 0; i < HOLES; i++) {
    const a = i * span - Math.PI / 2;
    const s = span * 0.3;
    d += `M${pt(7.4, a - s)} A7.4 7.4 0 0 1 ${pt(7.4, a + s)} L${pt(3.8, a + s * 0.45)} A3.8 3.8 0 0 0 ${pt(3.8, a - s * 0.45)} Z `;
  }
  // Eje central
  d += `M2.1 0 A2.1 2.1 0 1 0 -2.1 0 A2.1 2.1 0 1 0 2.1 0 Z`;
  return d;
}

/** Trazo de la sprocket (viewBox -12..12) para usarla dentro de otro SVG. */
export const SPROCKET_PATH = buildPath();

export function Sprocket({ className, color = 'currentColor' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" className={className} aria-hidden="true">
      <path d={SPROCKET_PATH} fill={color} fillRule="evenodd" />
    </svg>
  );
}
