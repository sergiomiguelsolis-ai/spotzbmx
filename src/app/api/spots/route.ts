import { NextResponse } from 'next/server';
import { db, removePhotos, uploadPhoto } from '@/lib/supabase';
import { fail } from '@/lib/api';
import { coords, imageFile, MAX_SPOT_PHOTOS, optionalName, spotTypes, str, ValidationError } from '@/lib/validation';

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
  const uploadedPaths: string[] = [];
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
    const rawPhotos = form.getAll('photo');
    if (rawPhotos.length === 0) throw new ValidationError('La fotografía es obligatoria.');
    if (rawPhotos.length > MAX_SPOT_PHOTOS) throw new ValidationError(`Máximo ${MAX_SPOT_PHOTOS} fotos por spot.`);
    const photos = rawPhotos.map((p, i) => imageFile(p, `La foto ${i + 1}`));

    const spotId = crypto.randomUUID();
    const uploads = [];
    for (const photo of photos) {
      const up = await uploadPhoto(photo, `spots/${spotId}`);
      uploadedPaths.push(up.path);
      uploads.push(up);
    }

    const { error: spotErr } = await db()
      .from('spots')
      .insert({ id: spotId, name, description, types: cleanTypes, lat, lng, created_by });
    if (spotErr) throw spotErr;

    const { error: photoErr } = await db()
      .from('spot_photos')
      .insert(
        uploads.map((up, i) => ({ spot_id: spotId, storage_path: up.path, url: up.url, is_cover: i === 0, source: 'creation' })),
      );
    if (photoErr) {
      await db().from('spots').delete().eq('id', spotId);
      throw photoErr;
    }

    return NextResponse.json({ id: spotId }, { status: 201 });
  } catch (err) {
    if (uploadedPaths.length) await removePhotos(uploadedPaths).catch(() => {});
    return fail(err);
  }
}
