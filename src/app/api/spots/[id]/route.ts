import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { fail } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data, error } = await db()
      .from('spots')
      .select(
        'id, name, description, types, lat, lng, status, created_by, created_at, photos:spot_photos(id, url, is_cover, source, created_at)',
      )
      .eq('id', id)
      .order('created_at', { referencedTable: 'spot_photos', ascending: true })
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Este spot ya no existe.' }, { status: 404 });
    // Portada primero
    data.photos.sort((a: { is_cover: boolean }, b: { is_cover: boolean }) => Number(b.is_cover) - Number(a.is_cover));
    return NextResponse.json({ spot: data });
  } catch (err) {
    return fail(err);
  }
}
