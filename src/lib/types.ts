export const SPOT_TYPES = [
  'Ledge',
  'Rail',
  'Escaleras',
  'Gap',
  'Bank',
  'Wallride',
  'Curbs',
  'Manual pad',
  'Skatepark',
  'Otro',
] as const;
export type SpotType = (typeof SPOT_TYPES)[number];

export const SPOT_STATUSES = ['active', 'doubtful', 'gone'] as const;
export type SpotStatus = (typeof SPOT_STATUSES)[number];

export const STATUS_META: Record<SpotStatus, { label: string; emoji: string; color: string }> = {
  active: { label: 'Activo', emoji: '🟢', color: 'text-ok' },
  doubtful: { label: 'Dudoso / revisar', emoji: '🟡', color: 'text-warn' },
  gone: { label: 'Ya no existe', emoji: '🔴', color: 'text-dead' },
};

/** Lo mínimo para pintar un pin en el mapa. */
export type SpotPinData = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: SpotStatus;
  created_at: string;
};

export type SpotPhoto = {
  id: string;
  url: string;
  is_cover: boolean;
  source: 'creation' | 'report' | 'admin';
  created_at: string;
};

export type SpotDetail = SpotPinData & {
  description: string;
  types: SpotType[];
  created_by: string | null;
  photos: SpotPhoto[];
};

export type Report = {
  id: string;
  spot_id: string;
  new_status: SpotStatus;
  comment: string;
  photo_url: string;
  reporter: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
};
