import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, checkPassword, createSessionToken, SESSION_TTL_SECONDS } from '@/lib/session';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password : '';
  let ok = false;
  try {
    ok = await checkPassword(password);
  } catch (err) {
    console.error('[spotz]', err);
    return NextResponse.json({ error: 'El panel no está configurado. Revisa las variables de entorno.' }, { status: 500 });
  }
  if (!ok) {
    // Retraso fijo para frenar ataques de fuerza bruta
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
