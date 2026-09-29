'use client';

import { useEffect, useRef, useState } from 'react';
import { MAPTILER_KEY } from '@/lib/config';
import { ENSENADA_BOUNDS, ENSENADA_CENTER, insideEnsenada, type LatLng } from '@/lib/geo';
import { looksLikeUrl, parseCoords } from '@/lib/locate';

type Result = { id: string; label: string; sub: string; pos: LatLng };

/**
 * Buscador para colocar el pin: dirección (MapTiler), coordenadas o link de Google Maps.
 * Solo mueve el mapa; el usuario siempre confirma la ubicación final.
 */
export function PlaceSearch({ onPick, onError }: { onPick: (pos: LatLng) => void; onError: (msg: string) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  // Autocompletar direcciones mientras escribe (no para links ni coordenadas).
  useEffect(() => {
    const text = q.trim();
    setNote(null);
    if (text.length < 3 || looksLikeUrl(text) || parseCoords(text)) {
      setResults([]);
      return;
    }
    const t = window.setTimeout(() => geocode(text), 350);
    return () => window.clearTimeout(t);
  }, [q]);

  async function geocode(text: string) {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    const b = ENSENADA_BOUNDS;
    const params = new URLSearchParams({
      key: MAPTILER_KEY,
      language: 'es',
      country: 'mx',
      limit: '6',
      proximity: `${ENSENADA_CENTER.lng},${ENSENADA_CENTER.lat}`,
      bbox: `${b.west},${b.south},${b.east},${b.north}`,
    });
    try {
      const r = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(text)}.json?${params}`, {
        signal: ctrl.signal,
      });
      const j = await r.json();
      const list: Result[] = (j.features ?? []).map((f: { id: string; text?: string; place_name: string; center: [number, number] }) => ({
        id: f.id,
        label: f.text || f.place_name.split(',')[0],
        sub: f.place_name,
        pos: { lat: f.center[1], lng: f.center[0] },
      }));
      setResults(list.filter((x) => insideEnsenada(x.pos)));
      if (list.length === 0) setNote('Sin resultados. Prueba con la calle y la colonia, o pega un link de Google Maps.');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setNote('No se pudo buscar. Revisa tu conexión.');
    }
  }

  function go(pos: LatLng) {
    if (!insideEnsenada(pos)) return onError('Esa ubicación está fuera de Ensenada.');
    setResults([]);
    setNote(null);
    onPick(pos);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = q.trim();
    if (!text) return;
    const direct = parseCoords(text);
    if (direct) return go(direct);
    if (looksLikeUrl(text)) {
      setBusy(true);
      try {
        const r = await fetch(`/api/resolve-link?url=${encodeURIComponent(text)}`);
        const j = await r.json();
        if (!r.ok) return onError(j.error ?? 'No se pudo leer el link.');
        go(j);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (results[0]) return go(results[0].pos);
    await geocode(text);
  }

  return (
    <div className="pointer-events-auto w-full max-w-md">
      <form onSubmit={submit} className="glass flex items-center gap-2 rounded-lg p-1.5" role="search">
        <svg viewBox="0 0 24 24" className="ml-2 h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <label htmlFor="place-search" className="sr-only">Buscar dirección, coordenadas o link de Google Maps</label>
        <input
          id="place-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Dirección o link de Google Maps"
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-chrome placeholder:text-muted/80 outline-none focus-visible:outline-none"
        />
        {q && (
          <button type="button" onClick={() => setQ('')} aria-label="Borrar búsqueda" className="px-2 text-muted hover:text-chrome">
            ×
          </button>
        )}
        <button type="submit" disabled={busy || !q.trim()} className="rounded-md bg-volt px-3 py-2 text-[12px] font-extrabold uppercase tracking-wider text-ink disabled:opacity-40">
          {busy ? '…' : 'Ir'}
        </button>
      </form>

      {(results.length > 0 || note) && (
        <div className="glass mt-1.5 overflow-hidden rounded-lg">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => go(r.pos)}
              className="block w-full border-b border-white/5 px-3 py-2.5 text-left last:border-0 hover:bg-white/5"
            >
              <span className="block text-[14px] font-bold text-white">{r.label}</span>
              <span className="block truncate text-[12px] text-muted">{r.sub}</span>
            </button>
          ))}
          {note && <p className="px-3 py-2.5 text-[13px] text-muted">{note}</p>}
        </div>
      )}
    </div>
  );
}
