import { NextResponse } from 'next/server';
import { db, removePhotos } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-guard';
import { fail } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

/** Marcar como portada. */
export async function PATCH(_req: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const { data: photo, error } = await db().from('spot_photos').select('spot_id').eq('id', id).single();
    if (error) throw error;
    await db().from('spot_photos').update({ is_cover: false }).eq('spot_id', photo.spot_id).eq('is_cover', true);
    const { error: e2 } = await db().from('spot_photos').update({ is_cover: true }).eq('id', id);
    if (e2) throw e2;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

/** Eliminar foto. Si era la portada, la siguiente foto pasa a ser portada. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const { data: photo, error } = await db()
      .from('spot_photos')
      .select('spot_id, storage_path, is_cover')
      .eq('id', id)
      .single();
    if (error) throw error;
    const { error: delErr } = await db().from('spot_photos').delete().eq('id', id);
    if (delErr) throw delErr;
    // Las fotos que vienen de un reporte comparten archivo con el reporte: solo se borra si nadie más lo usa.
    const { count } = await db()
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('photo_path', photo.storage_path);
    if (!count) await removePhotos([photo.storage_path]).catch(() => {});
    if (photo.is_cover) {
      const { data: next } = await db()
        .from('spot_photos')
        .select('id')
        .eq('spot_id', photo.spot_id)
        .order('created_at')
        .limit(1)
        .maybeSingle();
      if (next) await db().from('spot_photos').update({ is_cover: true }).eq('id', next.id);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
