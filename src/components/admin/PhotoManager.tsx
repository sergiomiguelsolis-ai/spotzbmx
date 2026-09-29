'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SpotPhoto } from '@/lib/types';
import { compressImage } from '@/lib/image-client';
import { CameraIcon } from '../ui';

const SOURCE_LABEL = { creation: 'Registro', report: 'Reporte', admin: 'Admin' } as const;

export function PhotoManager({ spotId, photos }: { spotId: string; photos: SpotPhoto[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<Response>) {
    setBusy(key);
    setError(null);
    const r = await fn();
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) return setError(j.error ?? 'Error');
    router.refresh();
  }

  async function upload(file: File) {
    const fd = new FormData();
    fd.set('photo', await compressImage(file));
    await run('upload', () => fetch(`/api/admin/spots/${spotId}/photos`, { method: 'POST', body: fd }));
    if (input.current) input.current.value = '';
  }

  return (
    <section className="space-y-4 rounded-lg border border-line bg-panel p-5">
      <div className="flex items-center justify-between">
        <h2 className="hud text-volt">Fotografías · {photos.length}</h2>
        <input
          ref={input}
          id="admin-photo"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <button type="button" onClick={() => input.current?.click()} disabled={!!busy} className="btn-ghost py-2">
          <CameraIcon className="h-4 w-4" /> {busy === 'upload' ? 'Subiendo…' : 'Agregar'}
        </button>
      </div>
      {error && <p className="text-[13px] text-dead">{error}</p>}
      {photos.length === 0 && <p className="text-muted">Sin fotos todavía. Sube una aquí o aprueba un reporte con foto.</p>}
      <ul className="grid grid-cols-2 gap-3">
        {photos.map((p) => (
          <li key={p.id} className={`overflow-hidden rounded-md border ${p.is_cover ? 'border-volt' : 'border-line'} bg-ink`}>
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              <span className="hud absolute left-1.5 top-1.5 rounded-sm bg-ink/85 px-1.5 py-0.5 text-[9px] text-chrome">
                {p.is_cover ? 'Portada' : SOURCE_LABEL[p.source]}
              </span>
            </a>
            <div className="grid grid-cols-2 divide-x divide-line border-t border-line">
              <button
                type="button"
                disabled={p.is_cover || !!busy}
                onClick={() => run(p.id + 'c', () => fetch(`/api/admin/photos/${p.id}`, { method: 'PATCH' }))}
                className="hud py-2 text-chrome hover:text-volt disabled:opacity-30"
              >
                Portada
              </button>
              <button
                type="button"
                disabled={!!busy || photos.length === 1}
                title={photos.length === 1 ? 'El spot debe conservar al menos una foto' : undefined}
                onClick={() => run(p.id + 'd', () => fetch(`/api/admin/photos/${p.id}`, { method: 'DELETE' }))}
                className="hud py-2 text-muted hover:text-dead disabled:opacity-30"
              >
                {busy === p.id + 'd' ? '…' : 'Borrar'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
