import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, verifySessionToken } from './session';

/** Segunda capa de protección (además del middleware) para rutas /api/admin. */
export async function requireAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  return null;
}
