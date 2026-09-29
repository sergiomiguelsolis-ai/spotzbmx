'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SpotDetail, SpotStatus, SpotType } from '@/lib/types';
import { ErrorNote, StatusPicker, TypePicker } from '../ui';

export function SpotEditor({ spot }: { spot: SpotDetail }) {
  const router = useRouter();
  const [name, setName] = useState(spot.name);
  const [description, setDescription] = useState(spot.description);
  const [types, setTypes] = useState<SpotType[]>(spot.types);
  const [status, setStatus] = useState<SpotStatus>(spot.status);
  const [createdBy, setCreatedBy] = useState(spot.created_by ?? '');
  const [lat, setLat] = useState(String(spot.lat));
  const [lng, setLng] = useState(String(spot.lng));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const r = await fetch(`/api/admin/spots/${spot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, types, status, created_by: createdBy, lat, lng }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(j.error ?? 'No se pudo guardar.');
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-5 rounded-lg border border-line bg-panel p-5">
      <h2 className="hud text-volt">Datos del spot</h2>
      <div>
        <label htmlFor="ed-name" className="label">Nombre</label>
        <input id="ed-name" className="field" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label htmlFor="ed-desc" className="label">Descripción</label>
        <textarea id="ed-desc" className="field min-h-[110px]" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <span className="label">Tipos</span>
        <TypePicker value={types} onChange={setTypes} />
      </div>
      <div>
        <span className="label">Estado</span>
        <StatusPicker value={status} onChange={setStatus} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="ed-lat" className="label">Latitud</label>
          <input id="ed-lat" className="field font-mono" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} />
        </div>
        <div>
          <label htmlFor="ed-lng" className="label">Longitud</label>
          <input id="ed-lng" className="field font-mono" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor="ed-by" className="label">Registrado por (vacío = Anónimo)</label>
        <input id="ed-by" className="field" maxLength={40} value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
      </div>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="btn-volt">{busy ? 'Guardando…' : 'Guardar cambios'}</button>
        {saved && <span role="status" className="hud text-ok">Guardado</span>}
      </div>
    </form>
  );
}
