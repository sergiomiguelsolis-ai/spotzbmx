'use client';

import { useEffect, useState } from 'react';
import type { SpotDetail, SpotStatus } from '@/lib/types';
import { directionsUrl, distanceMeters, formatDistance, streetViewUrl, type LatLng } from '@/lib/geo';
import { formatDate, isNewSpot } from '@/lib/format';
import { compressImage } from '@/lib/image-client';
import { CloseButton, ErrorNote, PhotoInput, StatusBadge, StatusPicker, TypeTags } from './ui';
import { Sprocket } from './Sprocket';

type Props = {
  spotId: string;
  userPos: LatLng | null;
  onClose: () => void;
};

/** Panel de detalle: bottom sheet en móvil, panel lateral en escritorio. */
export function SpotSheet({ spotId, userPos, onClose }: Props) {
  const [spot, setSpot] = useState<SpotDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'detail' | 'report' | 'sent'>('detail');
  const [viewer, setViewer] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setSpot(null);
    setError(null);
    setMode('detail');
    fetch(`/api/spots/${spotId}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? 'No se pudo cargar el spot.');
        if (alive) setSpot(j.spot);
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [spotId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (viewer !== null ? setViewer(null) : onClose());
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, viewer]);

  const distance = spot && userPos ? distanceMeters(userPos, spot) : null;
  const cover = spot?.photos[0];

  return (
    <>
      <aside
        className="sheet-in pointer-events-auto fixed inset-x-0 bottom-0 z-30 flex max-h-[82dvh] flex-col overflow-hidden rounded-t-xl border-t border-line bg-panel shadow-sheet md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:max-h-none md:w-[420px] md:rounded-xl md:border"
        aria-label="Detalle del spot"
      >
        <div className="hazard h-1 w-full shrink-0" aria-hidden="true" />
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line md:hidden" aria-hidden="true" />

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
          {error && (
            <div className="space-y-4 p-5">
              <div className="flex justify-end"><CloseButton onClick={onClose} /></div>
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          {!spot && !error && <SheetSkeleton onClose={onClose} />}

          {spot && mode === 'detail' && (
            <div>
              {/* Foto principal con overlay tipo cámara */}
              <div className="relative aspect-[4/3] w-full bg-ink">
                {cover ? (
                  <button type="button" onClick={() => setViewer(0)} className="absolute inset-0" aria-label="Ver foto completa">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover.url} alt={spot.name} className="h-full w-full object-cover" />
                  </button>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[repeating-linear-gradient(-45deg,#131519_0_14px,#101216_14px_28px)] px-8 text-center">
                    <Sprocket className="h-12 w-12 text-line" />
                    <p className="hud text-muted">Sin foto todavía</p>
                    <button
                      type="button"
                      onClick={() => setMode('report')}
                      className="hud rounded-sm border border-volt/60 px-3 py-2 font-bold text-volt hover:bg-volt hover:text-ink"
                    >
                      ¿Estuviste aquí? Sube una foto
                    </button>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-panel via-transparent to-ink/40" />
                <div className="hud pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 text-chrome">
                  <span className="rec-blink h-2 w-2 rounded-full bg-dead" aria-hidden="true" />
                  REC · {spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}
                </div>
                <div className="absolute right-3 top-3"><CloseButton onClick={onClose} /></div>
                {distance !== null && (
                  <div className="absolute bottom-3 left-3 rounded-sm bg-volt px-2 py-1 font-mono text-[13px] font-bold text-ink">
                    {formatDistance(distance)} de ti
                  </div>
                )}
              </div>

              <div className="space-y-4 px-5 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={spot.status} />
                  {isNewSpot(spot.created_at) && (
                    <span className="hud rounded-sm bg-volt px-2 py-1 font-bold text-ink">Nuevo</span>
                  )}
                </div>
                <h2 className="display text-balance text-[26px] leading-[1.02] text-white">{spot.name}</h2>
                <TypeTags types={spot.types} />
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-chrome/90">{spot.description}</p>

                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line">
                  <div className="bg-ink px-3 py-2.5">
                    <dt className="hud text-muted">Registrado</dt>
                    <dd className="mt-0.5 font-mono text-[13px] text-chrome">{formatDate(spot.created_at)}</dd>
                  </div>
                  <div className="bg-ink px-3 py-2.5">
                    <dt className="hud text-muted">Por</dt>
                    <dd className="mt-0.5 truncate text-[14px] font-bold text-chrome">{spot.created_by ?? 'Anónimo'}</dd>
                  </div>
                </dl>

                <div className="grid grid-cols-2 gap-2">
                  <a href={directionsUrl(spot)} target="_blank" rel="noopener noreferrer" className="btn-volt col-span-2">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M12 2 3 21l9-4 9 4z" /></svg>
                    Cómo llegar
                  </a>
                  <a href={streetViewUrl(spot)} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="5" r="2.5" />
                      <path d="M9 21v-6H7.5v-4a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v4H15v6" strokeLinejoin="round" />
                    </svg>
                    Street View
                  </a>
                  <button type="button" onClick={() => setMode('report')} className="btn-ghost">Reportar</button>
                </div>

                {spot.photos.length > 1 && (
                  <section>
                    <h3 className="hud mb-2 text-muted">Galería · {spot.photos.length} fotos</h3>
                    <div className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1">
                      {spot.photos.map((p, i) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setViewer(i)}
                          className="relative h-24 w-32 shrink-0 snap-start overflow-hidden rounded-md border border-line"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                          {p.source === 'report' && (
                            <span className="hud absolute bottom-1 left-1 rounded-sm bg-ink/80 px-1 text-[8.5px] text-chrome">Reporte</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          )}

          {spot && mode === 'report' && (
            <ReportForm spot={spot} onCancel={() => setMode('detail')} onSent={() => setMode('sent')} />
          )}

          {spot && mode === 'sent' && (
            <div className="space-y-4 p-6 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-volt text-ink">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
              </div>
              <h2 className="display text-xl text-white">Reporte enviado</h2>
              <p className="text-[14px] text-chrome/80">
                Gracias. Un admin lo revisará y, si se aprueba, el estado de <b>{spot.name}</b> se actualizará.
              </p>
              <button type="button" onClick={() => setMode('detail')} className="btn-ghost w-full">Volver al spot</button>
            </div>
          )}
        </div>
      </aside>

      {spot && viewer !== null && (
        <Lightbox photos={spot.photos.map((p) => p.url)} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />
      )}
    </>
  );
}

function ReportForm({ spot, onCancel, onSent }: { spot: SpotDetail; onCancel: () => void; onSent: () => void }) {
  const [status, setStatus] = useState<SpotStatus | null>(null);
  const [comment, setComment] = useState('');
  const [reporter, setReporter] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!status) return setError('Elige el nuevo estado del spot.');
    if (comment.trim().length < 5) return setError('Explica qué cambió (mínimo 5 caracteres).');
    if (!photo) return setError('Agrega una foto como evidencia.');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set('spot_id', spot.id);
      fd.set('new_status', status);
      fd.set('comment', comment.trim());
      fd.set('reporter', reporter.trim());
      fd.set('website', String(new FormData(e.currentTarget).get('website') ?? ''));
      fd.set('photo', await compressImage(photo));
      const r = await fetch('/api/reports', { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? 'No se pudo enviar el reporte.');
      onSent();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 p-5" noValidate>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="hud text-volt">Reportar estado</p>
          <h2 className="display mt-1 text-xl leading-tight text-white">{spot.name}</h2>
        </div>
        <CloseButton onClick={onCancel} label="Cancelar reporte" />
      </div>
      <p className="text-[13px] text-muted">
        Estado actual: <span className="text-chrome">{spot.status === 'active' ? 'Activo' : spot.status === 'doubtful' ? 'Dudoso' : 'Ya no existe'}</span>.
        Tu reporte queda pendiente hasta que un admin lo apruebe.
      </p>

      <div>
        <span className="label">Nuevo estado *</span>
        <StatusPicker value={status} onChange={setStatus} />
      </div>

      <div>
        <label htmlFor="report-comment" className="label">¿Qué cambió? *</label>
        <textarea
          id="report-comment"
          className="field min-h-[96px] resize-y"
          maxLength={600}
          placeholder="Ej. Le pusieron skatestoppers al ledge / tumbaron el rail / seguridad corre a todos."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <PhotoInput id="report-photo" file={photo} onChange={setPhoto} label="Foto de evidencia" />

      <div>
        <label htmlFor="report-nick" className="label">Tu nickname (opcional)</label>
        <input id="report-nick" className="field" maxLength={40} value={reporter} onChange={(e) => setReporter(e.target.value)} placeholder="Anónimo" />
      </div>

      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <ErrorNote>{error}</ErrorNote>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancelar</button>
        <button type="submit" disabled={busy} className="btn-volt">{busy ? 'Enviando…' : 'Enviar reporte'}</button>
      </div>
    </form>
  );
}

function SheetSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <div aria-busy="true" aria-label="Cargando spot">
      <div className="relative aspect-[4/3] w-full animate-pulse bg-raise">
        <div className="absolute right-3 top-3"><CloseButton onClick={onClose} /></div>
      </div>
      <div className="space-y-3 p-5">
        <div className="h-5 w-24 animate-pulse rounded bg-raise" />
        <div className="h-7 w-3/4 animate-pulse rounded bg-raise" />
        <div className="h-16 w-full animate-pulse rounded bg-raise" />
      </div>
    </div>
  );
}

function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
}: {
  photos: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const go = (d: number) => onIndex((index + d + photos.length) % photos.length);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4" role="dialog" aria-modal="true" aria-label="Foto">
      <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))]"><CloseButton onClick={onClose} /></div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photos[index]} alt="" className="max-h-full max-w-full object-contain" />
      {photos.length > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} className="btn-ghost absolute left-3 top-1/2 -translate-y-1/2 px-3" aria-label="Anterior">‹</button>
          <button type="button" onClick={() => go(1)} className="btn-ghost absolute right-3 top-1/2 -translate-y-1/2 px-3" aria-label="Siguiente">›</button>
          <p className="hud absolute bottom-[max(1rem,env(safe-area-inset-bottom))] text-chrome">
            {index + 1} / {photos.length}
          </p>
        </>
      )}
    </div>
  );
}
