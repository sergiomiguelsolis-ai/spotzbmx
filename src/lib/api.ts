import 'server-only';
import { NextResponse } from 'next/server';
import { ValidationError } from './validation';

export function fail(err: unknown) {
  if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
  console.error('[spotz]', err);
  return NextResponse.json({ error: 'Algo salió mal en el servidor. Intenta de nuevo.' }, { status: 500 });
}
