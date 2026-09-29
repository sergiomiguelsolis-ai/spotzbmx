/** Clave de MapTiler (gratis, sin tarjeta): https://cloud.maptiler.com/account/keys/ */
export const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? '';

/** Estilos de MapTiler: oscuro para el mapa normal, híbrido (satélite + calles) para satélite. */
export const MAP_STYLES = {
  map: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`,
  satellite: `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`,
} as const;
export type MapStyleKey = keyof typeof MAP_STYLES;

/** Ruta a tu PNG de pin personalizado (ej. "/pin.png"). Vacío = pin SVG integrado. */
export const PIN_IMAGE_URL = process.env.NEXT_PUBLIC_PIN_IMAGE_URL ?? '';
