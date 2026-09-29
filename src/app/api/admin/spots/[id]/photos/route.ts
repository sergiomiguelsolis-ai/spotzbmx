import { NextResponse } from 'next/server';
import { db, uploadPhoto } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-guard';
import { fail } from '@/lib/api';
import { imageFile } from '@/lib/validation';

/** Agregar foto a la galería de un spot. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const form = await req.formData();
    const photo = imageFile(form.get('photo'));
    const { count } = await db().from('spot_photos').select('id', { count: 'exact', head: true }).eq('spot_id', id);
    const up = await uploadPhoto(photo, `spots/${id}`);
    const { error } = await db()
      .from('spot_photos')
      .insert({ spot_id: id, storage_path: up.path, url: up.url, source: 'admin', is_cover: !count });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return fail(err);
  }
}
