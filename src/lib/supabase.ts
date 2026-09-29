import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Cliente con service_role. SOLO se usa en el servidor. */
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export const BUCKET = process.env.SUPABASE_BUCKET || 'spot-photos';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Sube una imagen al bucket y devuelve su ruta y URL pública. */
export async function uploadPhoto(file: File, folder: string) {
  const path = `${folder}/${crypto.randomUUID()}.${EXT[file.type] ?? 'jpg'}`;
  const { error } = await db()
    .storage.from(BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);
  const { data } = db().storage.from(BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function removePhotos(paths: string[]) {
  if (paths.length === 0) return;
  await db().storage.from(BUCKET).remove(paths);
}
