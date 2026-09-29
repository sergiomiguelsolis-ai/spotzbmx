import { NextResponse } from 'next/server';
import { db, removePhotos, uploadPhoto } from '@/lib/supabase';
import { fail } from '@/lib/api';
import { coords, imageFile, optionalName, spotTypes, str, ValidationError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/** Todos los spots (solo lo necesario para los pins). */
export async function GET() {
  try {
    const { data, error } = await db()
      .from('spots')
      .select('id, name, lat, lng, status, created_at')
      .order('created_at', { ascending: false })
      .limit(2000);
    if (error) throw error;
    return NextResponse.json({ spots: data });
  } catch (err) {
    return fail(err);
  }
}

/** Crear spot (sin cuenta). multipart/form-data */
export async function POST(req: Request) {
  let uploadedPath: string | null = null;
  try {
    const form = await req.formData();
    // Honeypot anti-bots: campo invisible que las personas nunca llenan.
    if (typeof form.get('website') === 'string' && form.get('website')) {
      return NextResponse.json({ error: 'Solicitud rechazada.' }, { status: 400 });
    }

    const name = str(form.get('name'), 'Nombre', 2, 80);
    const description = str(form.get('description'), 'Descripción', 5, 1000);
    let types: unknown;
    try {
      types = JSON.parse(String(form.get('types') ?? '[]'));
    } catch {
      throw new ValidationError('Tipos de spot inválidos.');
    }
    const cleanTypes = spotTypes(types);
    const { lat, lng } = coords(form.get('lat'), form.get('lng'));
    const created_by = form.get('anonymous') === 'true' ? null : optionalName(form.get('created_by'));
    const photo = imageFile(form.get('photo'));

    const spotId = crypto.randomUUID();
    const up = await uploadPhoto(photo, `spots/${spotId}`);
    uploadedPath = up.path;

    const { error: spotErr } = await db()
      .from('spots')
      .insert({ id: spotId, name, description, types: cleanTypes, lat, lng, created_by });
    if (spotErr) throw spotErr;

    const { error: photoErr } = await db()
      .from('spot_photos')
      .insert({ spot_id: spotId, storage_path: up.path, url: up.url, is_cover: true, source: 'creation' });
    if (photoErr) {
      await db().from('spots').delete().eq('id', spotId);
      throw photoErr;
    }

    return NextResponse.json({ id: spotId }, { status: 201 });
  } catch (err) {
    if (uploadedPath && !(err instanceof ValidationError)) await removePhotos([uploadedPath]).catch(() => {});
    return fail(err);
  }
}
