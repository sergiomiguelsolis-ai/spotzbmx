import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-guard';
import { fail } from '@/lib/api';
import { ValidationError } from '@/lib/validation';

/**
 * Aprobar o rechazar un reporte.
 * Aprobar: cambia el estado del spot y agrega la foto de evidencia a su galería.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const { action } = await req.json();
    if (action !== 'approve' && action !== 'reject') throw new ValidationError('Acción inválida.');

    const { data: report, error } = await db().from('reports').select('*').eq('id', id).single();
    if (error) throw error;
    if (report.status !== 'pending') throw new ValidationError('Este reporte ya fue revisado.');

    if (action === 'approve') {
      const { error: e1 } = await db().from('spots').update({ status: report.new_status }).eq('id', report.spot_id);
      if (e1) throw e1;
      const { count: covers } = await db()
        .from('spot_photos')
        .select('id', { count: 'exact', head: true })
        .eq('spot_id', report.spot_id)
        .eq('is_cover', true);
      const { error: e2 } = await db().from('spot_photos').insert({
        spot_id: report.spot_id,
        storage_path: report.photo_path,
        url: report.photo_url,
        source: 'report',
        is_cover: !covers,
      });
      if (e2) throw e2;
    }

    const { error: e3 } = await db()
      .from('reports')
      .update({ status: action === 'approve' ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (e3) throw e3;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
