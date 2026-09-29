import { PIN_IMAGE_URL } from '@/lib/config';
import type { SpotStatus } from '@/lib/types';
import { SPROCKET_PATH } from './Sprocket';

/**
 * Pin único de SPOTZ. Todos los spots usan el mismo diseño.
 * Si NEXT_PUBLIC_PIN_IMAGE_URL está definido se usa tu PNG; si no, el SVG con sprocket.
 * El ancla (punta del pin) queda en el centro inferior — así lo coloca AdvancedMarker.
 */
export function SpotPin({
  selected = false,
  isNew = false,
  status = 'active',
  size = 44,
  label,
}: {
  selected?: boolean;
  isNew?: boolean;
  status?: SpotStatus;
  size?: number;
  /** Nombre del spot; se recorta con "…" si es largo. Sin label, los nuevos llevan un punto amarillo. */
  label?: string;
}) {
  const h = Math.round(size * 1.27);
  return (
    <div
      className="relative origin-bottom transition-transform duration-150"
      style={{
        width: size,
        height: h,
        transform: selected ? 'scale(1.18)' : undefined,
        opacity: status === 'gone' ? 0.45 : 1,
        filter: status === 'gone' ? 'grayscale(1)' : undefined,
      }}
    >
      {PIN_IMAGE_URL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={PIN_IMAGE_URL} alt="" width={size} height={h} draggable={false} className="h-full w-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,.6)]" />
      ) : (
        <PinSvg selected={selected} />
      )}
      {label ? (
        <span
          className={`hud pointer-events-none absolute bottom-full left-1/2 mb-1 block max-w-[128px] -translate-x-1/2 truncate whitespace-nowrap rounded-sm px-1.5 py-[3px] text-[9.5px] font-bold leading-none tracking-[0.06em] shadow-[0_2px_6px_rgba(0,0,0,.6)] ${
            isNew && status !== 'gone' ? 'bg-volt text-ink' : 'border border-white/10 bg-ink/90 text-chrome'
          }`}
        >
          {label}
        </span>
      ) : (
        isNew &&
        status !== 'gone' && (
          <span className="absolute -right-0.5 top-0 h-2.5 w-2.5 rounded-full border-2 border-ink bg-volt" aria-label="Nuevo" />
        )
      )}
      {status === 'doubtful' && (
        <span className="absolute -left-0.5 top-0 h-2.5 w-2.5 rounded-full border-2 border-ink bg-warn" aria-label="Dudoso" />
      )}
    </div>
  );
}

function PinSvg({ selected }: { selected: boolean }) {
  return (
    <svg viewBox="0 0 44 56" className="h-full w-full drop-shadow-[0_5px_6px_rgba(0,0,0,.65)]" aria-hidden="true">
      <path
        d="M22 54.5C22 54.5 3.5 34.5 3.5 21.5a18.5 18.5 0 0 1 37 0C40.5 34.5 22 54.5 22 54.5Z"
        fill={selected ? '#FFE600' : '#0A0B0D'}
        stroke={selected ? '#0A0B0D' : '#FFE600'}
        strokeWidth="2.5"
      />
      <circle cx="22" cy="21.5" r="14.2" fill="none" stroke={selected ? '#0A0B0D' : '#2A2E35'} strokeWidth="1" />
      <g transform="translate(22 21.5) scale(1.08)">
        <path d={SPROCKET_PATH} fill={selected ? '#0A0B0D' : '#FFE600'} fillRule="evenodd" />
      </g>
    </svg>
  );
}

/** Punto de ubicación del usuario. */
export function UserDot() {
  return (
    <div className="relative h-5 w-5">
      <span className="pulse-ring absolute inset-0 rounded-full bg-volt/60" />
      <span className="absolute inset-[3px] rounded-full border-[3px] border-ink bg-volt shadow-[0_0_0_2px_rgba(255,230,0,.35)]" />
    </div>
  );
}
