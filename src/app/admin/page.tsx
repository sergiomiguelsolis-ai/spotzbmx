import Link from 'next/link';
import { db } from '@/lib/supabase';
import { formatDate, formatDateTime } from '@/lib/format';
import { STATUS_META, type SpotStatus } from '@/lib/types';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { ReportActions } from '@/components/admin/ReportActions';
import { DeleteSpotButton } from '@/components/admin/DeleteSpotButton';
import { StatusBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';

type ReportRow = {
  id: string;
  new_status: SpotStatus;
  comment: string;
  photo_url: string;
  reporter: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  spot: { id: string; name: string; status: SpotStatus } | null;
};

type SpotRow = {
  id: string;
  name: string;
  status: SpotStatus;
  types: string[];
  created_by: string | null;
  created_at: string;
  photos: { url: string; is_cover: boolean }[];
  reports: { status: string }[];
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab === 'spots' ? 'spots' : 'reports';

  const [pendingRes, reviewedRes, spotsRes] = await Promise.all([
    db()
      .from('reports')
      .select('id, new_status, comment, photo_url, reporter, status, created_at, reviewed_at, spot:spots(id, name, status)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    db()
      .from('reports')
      .select('id, new_status, comment, photo_url, reporter, status, created_at, reviewed_at, spot:spots(id, name, status)')
      .neq('status', 'pending')
      .order('reviewed_at', { ascending: false })
      .limit(20),
    db()
      .from('spots')
      .select('id, name, status, types, created_by, created_at, photos:spot_photos(url, is_cover), reports(status)')
      .order('created_at', { ascending: false }),
  ]);

  const pending = (pendingRes.data ?? []) as unknown as ReportRow[];
  const reviewed = (reviewedRes.data ?? []) as unknown as ReportRow[];
  const spots = (spotsRes.data ?? []) as unknown as SpotRow[];
  const dbError = pendingRes.error || reviewedRes.error || spotsRes.error;

  return (
    <div className="min-h-[100dvh]">
      <AdminHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {dbError && (
          <p className="rounded-md border border-dead/40 bg-dead/10 px-3 py-2 text-[13px] text-dead">
            Error de base de datos: {dbError.message}
          </p>
        )}

        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
          <Stat label="Spots" value={spots.length} />
          <Stat label="Reportes pendientes" value={pending.length} highlight={pending.length > 0} />
          <Stat label="Ya no existen" value={spots.filter((s) => s.status === 'gone').length} />
        </div>

        <nav className="flex gap-1 border-b border-line" aria-label="Secciones">
          <TabLink href="/admin" active={tab === 'reports'}>
            Reportes {pending.length > 0 && <span className="ml-1 rounded-sm bg-volt px-1.5 text-ink">{pending.length}</span>}
          </TabLink>
          <TabLink href="/admin?tab=spots" active={tab === 'spots'}>Spots</TabLink>
        </nav>

        {tab === 'reports' ? (
          <div className="space-y-8">
            <section className="space-y-3">
              <h2 className="hud text-muted">Pendientes · los más antiguos primero</h2>
              {pending.length === 0 && <Empty>No hay reportes pendientes. Todo al día.</Empty>}
              <div className="grid gap-3 md:grid-cols-2">
                {pending.map((r) => (
                  <ReportCard key={r.id} r={r} actions />
                ))}
              </div>
            </section>
            {reviewed.length > 0 && (
              <section className="space-y-3">
                <h2 className="hud text-muted">Revisados recientemente</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {reviewed.map((r) => (
                    <ReportCard key={r.id} r={r} />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <section className="overflow-x-auto rounded-lg border border-line">
            {spots.length === 0 ? (
              <Empty>Aún no hay spots registrados.</Empty>
            ) : (
              <table className="w-full min-w-[760px] text-left text-[14px]">
                <thead className="hud bg-panel text-muted">
                  <tr>
                    <th className="px-3 py-3 font-normal">Spot</th>
                    <th className="px-3 py-3 font-normal">Estado</th>
                    <th className="px-3 py-3 font-normal">Registró</th>
                    <th className="px-3 py-3 font-normal">Fecha</th>
                    <th className="px-3 py-3 font-normal">Fotos</th>
                    <th className="px-3 py-3 font-normal"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {spots.map((s) => {
                    const cover = s.photos.find((p) => p.is_cover) ?? s.photos[0];
                    const pend = s.reports.filter((r) => r.status === 'pending').length;
                    return (
                      <tr key={s.id} className="bg-ink hover:bg-panel">
                        <td className="px-3 py-2.5">
                          <Link href={`/admin/spots/${s.id}`} className="flex items-center gap-3">
                            <span className="h-11 w-14 shrink-0 overflow-hidden rounded bg-raise">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {cover && <img src={cover.url} alt="" className="h-full w-full object-cover" />}
                            </span>
                            <span>
                              <span className="block font-bold text-white hover:text-volt">{s.name}</span>
                              <span className="text-[12px] text-muted">{s.types.join(' · ')}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={s.status} />
                          {pend > 0 && <span className="hud ml-2 text-volt">{pend} rep.</span>}
                        </td>
                        <td className="px-3 py-2.5 text-chrome">{s.created_by ?? <span className="text-muted">Anónimo</span>}</td>
                        <td className="px-3 py-2.5 font-mono text-[12px] text-chrome">{formatDate(s.created_at)}</td>
                        <td className="px-3 py-2.5 font-mono text-[12px] text-chrome">{s.photos.length}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-2">
                            <Link href={`/admin/spots/${s.id}`} className="hud rounded-md border border-line px-3 py-2 font-bold text-chrome hover:border-volt">
                              Editar
                            </Link>
                            <DeleteSpotButton id={s.id} name={s.name} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function ReportCard({ r, actions = false }: { r: ReportRow; actions?: boolean }) {
  const tone = { pending: 'text-volt', approved: 'text-ok', rejected: 'text-dead' }[r.status];
  const label = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' }[r.status];
  return (
    <article className="overflow-hidden rounded-lg border border-line bg-panel">
      <div className="grid grid-cols-[112px_1fr] gap-3 p-3 sm:grid-cols-[140px_1fr]">
        <a href={r.photo_url} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded bg-raise">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.photo_url} alt="Evidencia" className="h-full w-full object-cover" />
        </a>
        <div className="min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className={`hud font-bold ${tone}`}>{label}</span>
            <span className="font-mono text-[11px] text-muted">{formatDateTime(r.created_at)}</span>
          </div>
          {r.spot ? (
            <Link href={`/admin/spots/${r.spot.id}`} className="block truncate font-bold text-white hover:text-volt">
              {r.spot.name}
            </Link>
          ) : (
            <span className="text-muted">Spot eliminado</span>
          )}
          <p className="text-[13px] text-chrome">
            {r.spot && <>{STATUS_META[r.spot.status].emoji} → </>}
            <b>{STATUS_META[r.new_status].emoji} {STATUS_META[r.new_status].label}</b>
          </p>
          <p className="line-clamp-4 text-[13px] text-chrome/80">“{r.comment}”</p>
          <p className="hud text-muted">Por {r.reporter ?? 'Anónimo'}</p>
        </div>
      </div>
      {actions && (
        <div className="border-t border-line p-3">
          <ReportActions id={r.id} />
        </div>
      )}
    </article>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="bg-panel px-4 py-3">
      <p className="hud text-muted">{label}</p>
      <p className={`display mt-1 text-3xl tabular-nums ${highlight ? 'text-volt' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`hud -mb-px border-b-2 px-4 py-3 font-bold ${active ? 'border-volt text-white' : 'border-transparent text-muted hover:text-chrome'}`}
    >
      {children}
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-muted">{children}</p>;
}
