import { SPOT_STATUSES, SPOT_TYPES, type SpotStatus, type SpotType } from './types';
import { insideEnsenada } from './geo';

export class ValidationError extends Error {}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
/** Fotos permitidas al registrar un spot (la primera es la portada). */
export const MAX_SPOT_PHOTOS = 3;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function str(v: FormDataEntryValue | unknown, field: string, min: number, max: number): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length < min) throw new ValidationError(`${field}: mínimo ${min} caracteres.`);
  if (s.length > max) throw new ValidationError(`${field}: máximo ${max} caracteres.`);
  return s;
}

export function optionalName(v: FormDataEntryValue | unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return null;
  if (s.length > 40) throw new ValidationError('El nickname admite máximo 40 caracteres.');
  return s;
}

export function spotTypes(v: unknown): SpotType[] {
  const list = Array.isArray(v) ? v : [];
  const clean = [...new Set(list.filter((t): t is SpotType => SPOT_TYPES.includes(t as SpotType)))];
  if (clean.length === 0) throw new ValidationError('Selecciona al menos un tipo de spot.');
  return clean;
}

export function spotStatus(v: unknown): SpotStatus {
  if (!SPOT_STATUSES.includes(v as SpotStatus)) throw new ValidationError('Estado inválido.');
  return v as SpotStatus;
}

export function coords(latRaw: unknown, lngRaw: unknown) {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new ValidationError('Ubicación inválida.');
  if (!insideEnsenada({ lat, lng })) throw new ValidationError('El spot debe estar dentro de Ensenada.');
  return { lat, lng };
}

export function imageFile(v: FormDataEntryValue | null, field = 'La fotografía'): File {
  if (!(v instanceof File) || v.size === 0) throw new ValidationError(`${field} es obligatoria.`);
  if (!IMAGE_TYPES.includes(v.type)) throw new ValidationError(`${field} debe ser JPG, PNG o WebP.`);
  if (v.size > MAX_UPLOAD_BYTES) throw new ValidationError(`${field} pesa más de 8 MB.`);
  return v;
}
