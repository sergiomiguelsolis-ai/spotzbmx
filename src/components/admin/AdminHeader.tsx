'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sprocket } from '../Sprocket';

export function AdminHeader() {
  const router = useRouter();
  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2.5">
          <Sprocket className="h-7 w-7 text-volt" />
          <span className="display text-lg leading-none text-white">SPOTZ</span>
          <span className="hud rounded-sm bg-raise px-1.5 py-1 text-muted">Admin</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/" className="hud rounded-md border border-line px-3 py-2 text-chrome hover:border-chrome/40">Ver mapa</Link>
          <button type="button" onClick={logout} className="hud rounded-md border border-line px-3 py-2 text-chrome hover:border-dead hover:text-dead">
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
