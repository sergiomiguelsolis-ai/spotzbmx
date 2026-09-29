export type LatLng = { lat: number; lng: number };

/** Ensenada, B.C. — centro y límites del área de SPOTZ. */
export const ENSENADA_CENTER: LatLng = { lat: 31.8667, lng: -116.5964 };
export const ENSENADA_BOUNDS = {
  north: 32.02,
  south: 31.68,
  west: -116.8,
  east: -116.45,
};

export function insideEnsenada({ lat, lng }: LatLng) {
  const b = ENSENADA_BOUNDS;
  return lat <= b.north && lat >= b.south && lng >= b.west && lng <= b.east;
}

export const RADIUS_OPTIONS = [200, 300, 400, 500, 'all'] as const;
export type RadiusOption = (typeof RADIUS_OPTIONS)[number];

/** Distancia en metros (haversine). */
export function distanceMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number) {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

export function directionsUrl({ lat, lng }: LatLng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

/** Polígono GeoJSON de un círculo (para dibujar el radio en el mapa). */
export function circlePolygon(center: LatLng, radiusM: number, steps = 64): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((center.lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    coords.push([center.lng + dLng * Math.cos(a), center.lat + dLat * Math.sin(a)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}

/** Caja [[oeste, sur], [este, norte]] alrededor de un punto. */
export function boxAround(center: LatLng, radiusM: number): [[number, number], [number, number]] {
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((center.lat * Math.PI) / 180));
  return [
    [center.lng - dLng, center.lat - dLat],
    [center.lng + dLng, center.lat + dLat],
  ];
}

/** Abre Google Street View en el punto (link público de Google Maps, no requiere API key). */
export function streetViewUrl({ lat, lng }: LatLng) {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
}
