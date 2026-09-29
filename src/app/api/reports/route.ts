import { NextResponse } from 'next/server';
import { db, removePhotos, uploadPhoto } from '@/lib/supabase';
import { fail } from '@/lib/api';
import { imageFile, optionalName, spotStatus, str, ValidationError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/** Enviar reporte de estado (queda pendiente para el admin). */
export async function POST(req: Request) {
  let uploadedPath: string | null = null;
  try {
    const form = await req.formData();
    if (typeof form.get('website') === 'string' && form.get('website')) {
      return NextResponse.json({ error: 'Solicitud rechazada.' }, { status: 400 });
    }
    const spot_id = str(form.get('spot_id'), 'Spot', 36, 36);
    const new_status = spotStatus(form.get('new_status'));
    const comment = str(form.get('comment'), 'Comentario', 5, 600);
    const reporter = optionalName(form.get('reporter'));
    const photo = imageFile(form.get('photo'), 'La foto de evidencia');

    const { data: spot } = await db().from('spots').select('id').eq('id', spot_id).maybeSingle();
    if (!spot) throw new ValidationError('Este spot ya no existe.');

    const up = await uploadPhoto(photo, `reports/${spot_id}`);
    uploadedPath = up.path;

    const { error } = await db()
      .from('reports')
      .insert({ spot_id, new_status, comment, reporter, photo_path: up.path, photo_url: up.url });
    if (error) throw error;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (uploadedPath) await removePhotos([uploadedPath]).catch(() => {});
    return fail(err);
  }
}
