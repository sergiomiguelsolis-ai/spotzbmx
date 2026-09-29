'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReportActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | 'approve' | 'reject'>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: 'approve' | 'reject') {
    setBusy(action);
    setError(null);
    const r = await fetch(`/api/admin/reports/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) return setError(j.error ?? 'Error');
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={!!busy} onClick={() => act('reject')} className="btn-ghost py-2.5">
          {busy === 'reject' ? '…' : 'Rechazar'}
        </button>
        <button type="button" disabled={!!busy} onClick={() => act('approve')} className="btn-volt py-2.5">
          {busy === 'approve' ? '…' : 'Aprobar'}
        </button>
      </div>
      {error && <p className="text-[12px] text-dead">{error}</p>}
    </div>
  );
}
