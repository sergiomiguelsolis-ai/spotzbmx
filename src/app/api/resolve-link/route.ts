import { NextResponse } from 'next/server';
import { parseCoords } from '@/lib/locate';

export const dynamic = 'force-dynamic';

// Solo seguimos links de Google Maps (evita usar el servidor para visitar sitios arbitrarios).
const ALLOWED_HOSTS = /^(maps\.app\.goo\.gl|goo\.gl|(www\.|maps\.)?google\.com(\.mx)?)$/i;

/** Convierte un link de Google Maps (incluidos los cortos maps.app.goo.gl) en coordenadas. */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get('url')?.trim() ?? '';
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return NextResponse.json({ error: 'Ese link no es válido.' }, { status: 400 });
  }

  for (let hop = 0; hop < 6; hop++) {
    if (url.protocol !== 'https:' || !ALLOWED_HOSTS.test(url.hostname)) {
      return NextResponse.json({ error: 'Solo se aceptan links de Google Maps.' }, { status: 400 });
    }
    const coords = parseCoords(url.toString());
    if (coords) return NextResponse.json(coords);

    let res: Response;
    try {
      res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (SPOTZ link resolver)' } });
    } catch {
      return NextResponse.json({ error: 'No se pudo abrir el link. Intenta de nuevo.' }, { status: 502 });
    }
    const next = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && next) {
      url = new URL(next, url);
      continue;
    }
    // Sin más redirecciones: a veces las coordenadas vienen dentro de la página.
    if (res.ok) {
      const html = (await res.text()).slice(0, 400_000);
      const inPage = parseCoords(html.match(/https?:\/\/[^"'\s]*google\.[^"'\s]*maps[^"'\s]*/i)?.[0] ?? '') ?? parseCoords(html.match(/!3d-?\d+\.\d+!4d-?\d+\.\d+/)?.[0] ?? '');
      if (inPage) return NextResponse.json(inPage);
    }
    break;
  }
  return NextResponse.json(
    { error: 'No encontré coordenadas en ese link. En Google Maps abre el lugar y usa Compartir → Copiar vínculo.' },
    { status: 422 },
  );
}
