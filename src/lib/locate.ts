import type { LatLng } from './geo';

/**
 * Saca coordenadas de lo que el usuario pegó:
 * "31.87, -116.62", o un link largo de Google Maps (…!3d31.87!4d-116.62…, …@31.87,-116.62,17z…, ?q=31.87,-116.62).
 */
export function parseCoords(input: string): LatLng | null {
  let text = input.trim();
  try {
    text = decodeURIComponent(text);
  } catch {
    /* texto con % sueltos: se usa tal cual */
  }
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, // pin exacto del lugar
    /[?&](?:q|query|ll|destination|viewpoint|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/, // centro de la vista
    /^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/, // coordenadas sueltas
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
}

export function looksLikeUrl(input: string) {
  return /^https?:\/\//i.test(input.trim()) || /^(maps\.app\.goo\.gl|goo\.gl)\//i.test(input.trim());
}
