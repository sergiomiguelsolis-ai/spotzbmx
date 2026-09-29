import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase';
import { formatDateTime } from '@/lib/format';
import { directionsUrl } from '@/lib/geo';
import type { SpotDetail } from '@/lib/types';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { SpotEditor } from '@/components/admin/SpotEditor';
import { PhotoManager } from '@/components/admin/PhotoManager';
import { DeleteSpotButton } from '@/components/admin/DeleteSpotButton';

export const dynamic = 'force-dynamic';

export default async function AdminSpotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await db()
    .from('spots')
    .select(
      'id, name, description, types, lat, lng, status, created_by, created_at, updated_at, photos:spot_photos(id, url, is_cover, source, created_at)',
    )
    .eq('id', id)
    .order('created_at', { referencedTable: 'spot_photos', ascending: true })
    .maybeSingle();
  if (!data) notFound();
  const spot = data as SpotDetail & { updated_at: string };

  return (
    <div className="min-h-[100dvh]">
      <AdminHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href="/admin?tab=spots" className="hud text-muted hover:text-chrome">← Todos los spots</Link>
            <h1 className="display mt-2 text-3xl text-white">{spot.name}</h1>
            <p className="mt-1 font-mono text-[12px] text-muted">
              Registrado {formatDateTime(spot.created_at)} por {spot.created_by ?? 'Anónimo'} · Editado {formatDateTime(spot.updated_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <a href={directionsUrl(spot)} target="_blank" rel="noopener noreferrer" className="hud rounded-md border border-line px-3 py-2 text-chrome hover:border-volt">
              Ver en Google Maps
            </a>
            <DeleteSpotButton id={spot.id} name={spot.name} redirectTo="/admin?tab=spots" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <SpotEditor spot={spot} />
          <PhotoManager spotId={spot.id} photos={spot.photos} />
        </div>
      </main>
    </div>
  );
}
