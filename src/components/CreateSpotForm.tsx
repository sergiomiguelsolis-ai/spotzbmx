'use client';

import { useEffect, useState } from 'react';
import { readDraft, saveDraft } from '@/lib/draft';
import type { SpotType } from '@/lib/types';
import type { LatLng } from '@/lib/geo';
import { compressImage } from '@/lib/image-client';
import { CloseButton, ErrorNote, MultiPhotoInput, TypePicker } from './ui';
import { MAX_SPOT_PHOTOS } from '@/lib/validation';

type Props = {
  position: LatLng;
  onChangeLocation: () => void;
  onCancel: () => void;
  onCreated: (id: string) => void;
};

/** Paso 2 de "Nuevo spot": datos del spot (la ubicación ya se eligió en el mapa). */
export function CreateSpotForm({ position, onChangeLocation, onCancel, onCreated }: Props) {
  const [photos, setPhotos] = useState<File[]>([]);
  // Lo escrito se recupera del borrador si el navegador recargó (p. ej. al volver de Street View).
  const [saved] = useState(() => readDraft()?.form ?? {});
  const [name, setName] = useState(saved.name ?? '');
  const [description, setDescription] = useState(saved.description ?? '');
  const [types, setTypes] = useState<SpotType[]>(saved.types ?? []);
  const [nick, setNick] = useState(saved.nick ?? '');
  const [anonymous, setAnonymous] = useState(saved.anonymous ?? false);

  useEffect(() => {
    const t = window.setTimeout(() => saveDraft({ form: { name, description, types, nick, anonymous } }), 400);
    return () => window.clearTimeout(t);
  }, [name, description, types, nick, anonymous]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (photos.length === 0) return setError('Agrega al menos una foto del spot.');
    if (name.trim().length < 2) return setError('Ponle nombre al spot.');
    if (description.trim().length < 5) return setError('Describe el spot (mínimo 5 caracteres).');
    if (types.length === 0) return setError('Elige al menos un tipo de spot.');
    if (!anonymous && !nick.trim()) return setError('Escribe tu nickname o marca “Anónimo”.');

    setBusy(true);
    try {
      const fd = new FormData();
      fd.set('name', name.trim());
      fd.set('description', description.trim());
      fd.set('types', JSON.stringify(types));
      fd.set('lat', String(position.lat));
      fd.set('lng', String(position.lng));
      fd.set('anonymous', String(anonymous));
      fd.set('created_by', anonymous ? '' : nick.trim());
      fd.set('website', String(new FormData(e.currentTarget).get('website') ?? ''));
      for (const p of photos) fd.append('photo', await compressImage(p));
      const r = await fetch('/api/spots', { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? 'No se pudo guardar el spot.');
      onCreated(j.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      className="sheet-in fixed inset-x-0 bottom-0 z-40 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-xl border-t border-line bg-panel shadow-sheet md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:max-h-none md:w-[440px] md:rounded-xl md:border"
      aria-label="Registrar spot"
    >
      <div className="hazard h-1 w-full shrink-0" aria-hidden="true" />
      <form onSubmit={submit} noValidate className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="hud text-volt">Paso 2 de 2</p>
            <h2 className="display mt-1 text-2xl leading-none text-white">Nuevo spot</h2>
          </div>
          <CloseButton onClick={onCancel} label="Cancelar" />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-ink px-3 py-2.5">
          <div>
            <p className="hud text-muted">Ubicación GPS</p>
            <p className="font-mono text-[13px] text-chrome">
              {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            </p>
          </div>
          <button type="button" onClick={onChangeLocation} className="hud rounded-sm border border-line px-2.5 py-2 text-chrome hover:border-volt">
            Mover pin
          </button>
        </div>

        <MultiPhotoInput id="spot-photos" files={photos} onChange={setPhotos} max={MAX_SPOT_PHOTOS} />

        <div>
          <label htmlFor="spot-name" className="label">Nombre *</label>
          <input id="spot-name" className="field" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Ledges del Malecón" />
        </div>

        <div>
          <label htmlFor="spot-desc" className="label">Descripción *</label>
          <textarea
            id="spot-desc"
            className="field min-h-[96px] resize-y"
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Piso, altura, run-up, mejor horario, si hay seguridad…"
          />
        </div>

        <div>
          <span className="label">Tipo de spot * <span className="normal-case tracking-normal">(uno o varios)</span></span>
          <TypePicker value={types} onChange={setTypes} />
        </div>

        <div>
          <label htmlFor="spot-nick" className="label">Registrado por *</label>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              id="spot-nick"
              className="field disabled:opacity-40"
              maxLength={40}
              value={nick}
              disabled={anonymous}
              onChange={(e) => setNick(e.target.value)}
              placeholder="Tu nickname"
            />
            <button
              type="button"
              aria-pressed={anonymous}
              onClick={() => setAnonymous((a) => !a)}
              className={`rounded-md border px-3 text-[13px] font-bold uppercase tracking-wide transition ${
                anonymous ? 'border-volt bg-volt text-ink' : 'border-line bg-ink text-chrome'
              }`}
            >
              Anónimo
            </button>
          </div>
        </div>

        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

        <ErrorNote>{error}</ErrorNote>

        <button type="submit" disabled={busy} className="btn-volt w-full py-4 text-[14px]">
          {busy ? 'Subiendo spot…' : 'Publicar spot'}
        </button>
      </form>
    </aside>
  );
}
