'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Borrado en dos pasos: primer toque arma, segundo confirma. */
export function DeleteSpotButton({ id, name, redirectTo }: { id: string; name: string; redirectTo?: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!armed) {
      setArmed(true);
      window.setTimeout(() => setArmed(false), 4000);
      return;
    }
    setBusy(true);
    const r = await fetch(`/api/admin/spots/${id}`, { method: 'DELETE' });
    setBusy(false);
    if (!r.ok) return alert('No se pudo eliminar el spot.');
    if (redirectTo) router.replace(redirectTo);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={del}
      disabled={busy}
      aria-label={`Eliminar ${name}`}
      className={`hud rounded-md border px-3 py-2 font-bold transition ${
        armed ? 'border-dead bg-dead text-ink' : 'border-line text-muted hover:border-dead hover:text-dead'
      }`}
    >
      {busy ? 'Eliminando…' : armed ? '¿Seguro? Toca de nuevo' : 'Eliminar'}
    </button>
  );
}
