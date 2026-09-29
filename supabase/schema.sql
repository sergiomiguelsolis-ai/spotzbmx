-- ═══════════════════════════════════════════════════════════════
-- SPOTZ · Esquema de base de datos (Supabase / Postgres)
-- Ejecuta este archivo completo en Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

do $$ begin
  create type spot_status as enum ('active', 'doubtful', 'gone');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ── Spots ──────────────────────────────────────────────────────
create table if not exists public.spots (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 80),
  description  text not null check (char_length(description) between 5 and 1000),
  types        text[] not null check (cardinality(types) > 0),
  lat          double precision not null check (lat between -90 and 90),
  lng          double precision not null check (lng between -180 and 180),
  status       spot_status not null default 'active',
  created_by   text check (created_by is null or char_length(created_by) <= 40), -- null = Anónimo
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists spots_created_at_idx on public.spots (created_at desc);

-- ── Fotos de cada spot (portada + galería) ─────────────────────
create table if not exists public.spot_photos (
  id            uuid primary key default gen_random_uuid(),
  spot_id       uuid not null references public.spots(id) on delete cascade,
  storage_path  text not null,
  url           text not null,
  is_cover      boolean not null default false,
  source        text not null default 'creation' check (source in ('creation', 'report', 'admin')),
  created_at    timestamptz not null default now()
);

create index if not exists spot_photos_spot_idx on public.spot_photos (spot_id, created_at);
-- Máximo una portada por spot
create unique index if not exists spot_photos_one_cover on public.spot_photos (spot_id) where is_cover;

-- ── Reportes de estado (pendientes de revisión) ────────────────
create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  spot_id       uuid not null references public.spots(id) on delete cascade,
  new_status    spot_status not null,
  comment       text not null check (char_length(comment) between 5 and 600),
  photo_path    text not null,
  photo_url     text not null,
  reporter      text check (reporter is null or char_length(reporter) <= 40),
  status        report_status not null default 'pending',
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- ── updated_at automático ──────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists spots_touch on public.spots;
create trigger spots_touch before update on public.spots
  for each row execute function public.touch_updated_at();

-- ── Seguridad ──────────────────────────────────────────────────
-- RLS activado SIN políticas: nadie puede leer/escribir con la anon key.
-- Todo pasa por las rutas API de Next.js, que usan la service_role key
-- en el servidor y validan cada petición.
alter table public.spots        enable row level security;
alter table public.spot_photos  enable row level security;
alter table public.reports      enable row level security;

-- ── Storage: bucket público de solo lectura para las fotos ─────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('spot-photos', 'spot-photos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
