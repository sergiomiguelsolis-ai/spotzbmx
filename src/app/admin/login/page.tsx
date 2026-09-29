'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sprocket } from '@/components/Sprocket';
import { ErrorNote } from '@/components/ui';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(j.error ?? 'No se pudo iniciar sesión.');
    router.replace('/admin');
    router.refresh();
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-xl border border-line bg-panel p-6">
        <div className="flex items-center gap-3">
          <Sprocket className="h-9 w-9 text-volt" />
          <div>
            <h1 className="display text-2xl leading-none text-white">SPOTZ</h1>
            <p className="hud mt-1 text-muted">Panel de administración</p>
          </div>
        </div>
        <div>
          <label htmlFor="admin-password" className="label">Contraseña</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </div>
        <ErrorNote>{error}</ErrorNote>
        <button type="submit" disabled={busy || !password} className="btn-volt w-full">
          {busy ? 'Verificando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
