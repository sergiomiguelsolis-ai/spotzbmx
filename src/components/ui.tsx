'use client';

import { useEffect, useRef, useState } from 'react';
import { SPOT_TYPES, STATUS_META, type SpotStatus, type SpotType } from '@/lib/types';

export function StatusBadge({ status }: { status: SpotStatus }) {
  const m = STATUS_META[status];
  const dot = { active: 'bg-ok', doubtful: 'bg-warn', gone: 'bg-dead' }[status];
  return (
    <span className="hud inline-flex items-center gap-1.5 rounded-sm border border-line bg-ink/70 px-2 py-1 text-chrome">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      {m.label}
    </span>
  );
}

export function TypeTags({ types }: { types: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {types.map((t) => (
        <li key={t} className="rounded-sm bg-raise px-2 py-1 text-[12px] font-bold uppercase tracking-wide text-chrome">
          {t}
        </li>
      ))}
    </ul>
  );
}

export function TypePicker({ value, onChange }: { value: SpotType[]; onChange: (v: SpotType[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Tipos de spot">
      {SPOT_TYPES.map((t) => {
        const on = value.includes(t);
        return (
          <button
            type="button"
            key={t}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== t) : [...value, t])}
            className={`rounded-md border px-3 py-2 text-[13px] font-bold uppercase tracking-wide transition ${
              on ? 'border-volt bg-volt text-ink' : 'border-line bg-ink text-chrome hover:border-chrome/40'
            }`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

export function StatusPicker({ value, onChange }: { value: SpotStatus | null; onChange: (v: SpotStatus) => void }) {
  const ring = { active: 'border-ok', doubtful: 'border-warn', gone: 'border-dead' };
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Nuevo estado">
      {(Object.keys(STATUS_META) as SpotStatus[]).map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          onClick={() => onChange(s)}
          className={`flex flex-col items-center gap-1 rounded-md border px-2 py-3 text-center text-[12px] font-bold uppercase leading-tight transition ${
            value === s ? `${ring[s]} bg-raise text-chrome` : 'border-line bg-ink text-muted hover:text-chrome'
          }`}
        >
          <span className="text-lg" aria-hidden="true">{STATUS_META[s].emoji}</span>
          {STATUS_META[s].label}
        </button>
      ))}
    </div>
  );
}

/** Selector de foto con vista previa. Usa la cámara trasera en móvil. */
export function PhotoInput({
  id,
  file,
  onChange,
  label = 'Foto del spot',
}: {
  id: string;
  file: File | null;
  onChange: (f: File | null) => void;
  label?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <label htmlFor={id} className="label">{label} *</label>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="group relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-line bg-ink transition hover:border-volt"
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Vista previa" className="absolute inset-0 h-full w-full object-cover" />
            <span className="hud absolute bottom-2 right-2 rounded-sm bg-ink/80 px-2 py-1 text-chrome">Cambiar foto</span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-2 text-muted group-hover:text-chrome">
            <CameraIcon className="h-7 w-7" />
            <span className="text-[13px] font-bold uppercase tracking-wide">Tomar o subir foto</span>
          </span>
        )}
      </button>
    </div>
  );
}

export function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M3 8h3l2-3h8l2 3h3v12H3z" strokeLinejoin="round" />
      <circle cx="12" cy="13.5" r="4" />
    </svg>
  );
}

export function CloseButton({ onClick, label = 'Cerrar' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-md border border-line bg-ink/80 text-chrome transition hover:border-chrome/40"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-md border border-dead/40 bg-dead/10 px-3 py-2 text-[13px] text-dead">
      {children}
    </p>
  );
}
