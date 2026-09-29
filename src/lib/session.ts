/**
 * Sesión de administrador: cookie firmada con HMAC-SHA256.
 * Usa Web Crypto, así que funciona tanto en middleware (edge) como en Node.
 */
export const ADMIN_COOKIE = 'spotz_admin';
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 h

const enc = new TextEncoder();

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('ADMIN_SESSION_SECRET debe tener al menos 32 caracteres.');
  return s;
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return toHex(sig);
}

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Comparación en tiempo constante de dos strings. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken() {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `admin.${exp}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySessionToken(token: string | undefined | null) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'admin') return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  try {
    return safeEqual(parts[2], await hmac(`admin.${exp}`));
  } catch {
    return false;
  }
}

/** Compara la contraseña contra ADMIN_PASSWORD sin filtrar longitud ni timing. */
export async function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 12) throw new Error('ADMIN_PASSWORD no está configurada (mín. 12 caracteres).');
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(input)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ]);
  return safeEqual(toHex(a), toHex(b));
}
