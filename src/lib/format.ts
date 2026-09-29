const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

export function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${formatDate(iso)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Un spot es "Nuevo" durante sus primeros 14 días. */
export const NEW_SPOT_DAYS = 14;
export function isNewSpot(createdAt: string, now = Date.now()) {
  return now - new Date(createdAt).getTime() < NEW_SPOT_DAYS * 86400000;
}
