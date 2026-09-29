import { NextResponse } from 'next/server';
import { db, removePhotos } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-guard';
import { fail } from '@/lib/api';
import { coords, optionalName, spotStatus, spotTypes, str } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

/** Editar spot */
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = await req.json();
    const { lat, lng } = coords(body.lat, body.lng);
    const update = {
      name: str(body.name, 'Nombre', 2, 80),
      description: str(body.description, 'Descripción', 5, 1000),
      types: spotTypes(body.types),
      status: spotStatus(body.status),
      created_by: optionalName(body.created_by),
      lat,
      lng,
    };
    const { error } = await db().from('spots').update(update).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

/** Eliminar spot + fotos + reportes (y sus archivos). */
export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const [{ data: photos }, { data: reports }] = await Promise.all([
      db().from('spot_photos').select('storage_path').eq('spot_id', id),
      db().from('reports').select('photo_path').eq('spot_id', id),
    ]);
    const paths = new Set<string>([
      ...(photos ?? []).map((p) => p.storage_path),
      ...(reports ?? []).map((r) => r.photo_path),
    ]);
    const { error } = await db().from('spots').delete().eq('id', id);
    if (error) throw error;
    await removePhotos([...paths]).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
