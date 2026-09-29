/**
 * Borrador del spot en progreso, guardado en el navegador.
 * Sirve para que, si el usuario sale a Street View y el navegador recarga SPOTZ al regresar,
 * recupere el pin y lo que ya escribió. Caduca a las 3 horas.
 */
import type { LatLng } from './geo';
import type { SpotType } from './types';

const KEY = 'spotz:draft:v1';
const TTL_MS = 3 * 60 * 60 * 1000;

export type DraftForm = {
  name: string;
  description: string;
  types: SpotType[];
  nick: string;
  anonymous: boolean;
};

export type Draft = {
  mode: 'placing' | 'form';
  center: LatLng;
  zoom: number;
  pin: LatLng | null;
  form?: Partial<DraftForm>;
  savedAt: number;
};

export function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (!d?.center || Date.now() - d.savedAt > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

export function saveDraft(patch: Partial<Omit<Draft, 'savedAt'>>) {
  try {
    const prev = readDraft();
    const next = { ...prev, ...patch, form: { ...prev?.form, ...patch.form }, savedAt: Date.now() };
    if (!next.center || !next.mode) return;
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* navegador sin almacenamiento (modo privado): se sigue sin borrador */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignorar */
  }
}
