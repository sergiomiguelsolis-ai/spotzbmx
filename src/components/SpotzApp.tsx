'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Marker, Source, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLES, MAPTILER_KEY, type MapStyleKey } from '@/lib/config';
import {
  boxAround,
  circlePolygon,
  distanceMeters,
  ENSENADA_BOUNDS,
  ENSENADA_CENTER,
  insideEnsenada,
  RADIUS_OPTIONS,
  streetViewUrl,
  type LatLng,
  type RadiusOption,
} from '@/lib/geo';
import { isNewSpot } from '@/lib/format';
import type { SpotPinData } from '@/lib/types';
import { SpotPin, UserDot } from './SpotPin';
import { SpotSheet } from './SpotSheet';
import { CreateSpotForm } from './CreateSpotForm';
import { Sprocket } from './Sprocket';
import { PlaceSearch } from './PlaceSearch';

type GeoState = 'locating' | 'ok' | 'denied' | 'outside' | 'unsupported';
type Mode = 'browse' | 'placing' | 'form';

// Límites del mapa: la zona de Ensenada con un poco de margen para poder moverse.
const MAX_BOUNDS: [number, number, number, number] = [
  ENSENADA_BOUNDS.west - 0.08,
  ENSENADA_BOUNDS.south - 0.06,
  ENSENADA_BOUNDS.east + 0.08,
  ENSENADA_BOUNDS.north + 0.06,
];
const FIT_PADDING = { top: 90, bottom: 150, left: 24, right: 24 };
const LABEL_MIN_ZOOM = 12.3;

export function SpotzApp() {
  if (!MAPTILER_KEY) return <MissingKey />;
  return <SpotzMap />;
}

function SpotzMap() {
  const mapRef = useRef<MapRef>(null);
  const [mapReady, setMapReady] = useState(false);
  const map = mapReady ? mapRef.current?.getMap() : undefined;
  const [spots, setSpots] = useState<SpotPinData[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [geo, setGeo] = useState<GeoState>('locating');
  const [radius, setRadius] = useState<RadiusOption>(500);
  const [mapType, setMapType] = useState<MapStyleKey>('map');
  // Los nombres de los pins se muestran solo al acercarse, para no saturar la vista de toda la ciudad.
  const [zoom, setZoom] = useState(12.5);
  const showLabels = zoom >= LABEL_MIN_ZOOM;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('browse');
  const [draftPos, setDraftPos] = useState<LatLng | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const firstFix = useRef(true);

  // ── Datos ────────────────────────────────────────────────────
  const loadSpots = useCallback(async () => {
    try {
      const r = await fetch('/api/spots', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setSpots(j.spots);
      setLoadError(null);
    } catch {
      setLoadError('No se pudieron cargar los spots. Revisa tu conexión.');
    }
  }, []);

  useEffect(() => {
    loadSpots();
    const onFocus = () => document.visibilityState === 'visible' && loadSpots();
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [loadSpots]);

  // ── Ubicación ────────────────────────────────────────────────
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeo('unsupported');
      setRadius('all');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        setUserPos(pos);
        const inside = insideEnsenada(pos);
        setGeo(inside ? 'ok' : 'outside');
        if (firstFix.current) {
          firstFix.current = false;
          if (!inside) {
            setRadius('all');
            flash('Estás fuera de Ensenada. Te mostramos toda la ciudad.');
          }
        }
      },
      () => {
        setGeo('denied');
        setRadius('all');
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 3800);
  }

  const canUseRadius = geo === 'ok' && !!userPos;
  const effectiveRadius: RadiusOption = canUseRadius ? radius : 'all';

  // ── Encuadre: al cambiar radio o al obtener la primera ubicación ──
  const fitView = useCallback(() => {
    if (!map) return;
    if (effectiveRadius === 'all' || !userPos) {
      // Toda la ciudad: encuadra todos los spots (o el centro de Ensenada si aún no hay).
      if (spots.length === 0) {
        map.flyTo({ center: ENSENADA_CENTER, zoom: 12.5 });
      } else if (spots.length === 1) {
        map.flyTo({ center: spots[0], zoom: 15 });
      } else {
        const lats = spots.map((p) => p.lat);
        const lngs = spots.map((p) => p.lng);
        map.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: { top: 165, bottom: 190, left: 64, right: 64 }, maxZoom: 16 },
        );
      }
      return;
    }
    map.fitBounds(boxAround(userPos, effectiveRadius * 1.15), { padding: FIT_PADDING });
  }, [map, effectiveRadius, userPos, spots]);

  useEffect(() => {
    fitView();
    // Solo cuando cambia el radio (incluye la primera ubicación: pasa de "todo" al radio elegido).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveRadius, map]);

  // Primera carga de spots en modo "toda la ciudad": encuadrarlos una vez.
  const didFitSpots = useRef(false);
  useEffect(() => {
    if (!map || didFitSpots.current || spots.length === 0 || effectiveRadius !== 'all') return;
    didFitSpots.current = true;
    fitView();
  }, [map, spots, effectiveRadius, fitView]);

  // ── Conteo: todos los spots siempre se ven; el radio solo encuadra y cuenta los cercanos ──
  const nearCount = useMemo(() => {
    if (effectiveRadius === 'all' || !userPos) return spots.length;
    return spots.filter((s) => distanceMeters(userPos, s) <= effectiveRadius).length;
  }, [spots, effectiveRadius, userPos]);
  const now = Date.now();

  // ── Crear spot ───────────────────────────────────────────────
  function startCreate() {
    setSelectedId(null);
    const start = userPos && insideEnsenada(userPos) ? userPos : (map?.getCenter() ?? ENSENADA_CENTER);
    map?.flyTo({ center: start, zoom: Math.max(map.getZoom(), 17.5) });
    setMode('placing');
  }

  function confirmLocation() {
    const center = map?.getCenter();
    if (!center) return;
    const c = { lat: center.lat, lng: center.lng };
    if (!insideEnsenada(c)) return flash('Por ahora SPOTZ solo acepta spots dentro de Ensenada.');
    setDraftPos(c);
    setMode('form');
  }

  function editLocation() {
    if (draftPos) map?.flyTo({ center: draftPos, zoom: Math.max(map.getZoom(), 17.5) });
    setMode('placing');
  }

  async function onCreated(id: string) {
    await loadSpots();
    setMode('browse');
    setDraftPos(null);
    setSelectedId(id);
    flash('Spot publicado. ¡Gracias por sumar!');
  }

  function goToMe() {
    if (!userPos) {
      flash(
        geo === 'denied'
          ? 'Activa el permiso de ubicación en tu navegador para usar esta función.'
          : 'Aún buscando tu ubicación…',
      );
      return;
    }
    if (effectiveRadius !== 'all') fitView();
    else map?.flyTo({ center: userPos, zoom: 16 });
  }

  const selectSpot = useCallback((id: string) => {
    setMode('browse');
    setSelectedId(id);
  }, []);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-ink">
      <Map
        ref={mapRef}
        onLoad={(e) => {
          // Sin rotación ni inclinación: el mapa siempre queda con el norte arriba.
          e.target.touchZoomRotate.disableRotation();
          setMapReady(true);
        }}
        initialViewState={{ longitude: ENSENADA_CENTER.lng, latitude: ENSENADA_CENTER.lat, zoom: 12.5 }}
        style={{ position: 'absolute', inset: 0 }}
        mapStyle={MAP_STYLES[mapType]}
        maxBounds={MAX_BOUNDS}
        minZoom={11}
        maxZoom={19.5}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        attributionControl={false}
        onClick={() => mode === 'browse' && setSelectedId(null)}
        onZoomEnd={(e) => setZoom(e.viewState.zoom)}
      >
        {canUseRadius && effectiveRadius !== 'all' && userPos && (
          <Source id="radius" type="geojson" data={circlePolygon(userPos, effectiveRadius)}>
            <Layer id="radius-fill" type="fill" paint={{ 'fill-color': '#FFE600', 'fill-opacity': 0.05 }} />
            <Layer id="radius-line" type="line" paint={{ 'line-color': '#FFE600', 'line-opacity': 0.6, 'line-width': 1.5 }} />
          </Source>
        )}

        {userPos && (
          <Marker longitude={userPos.lng} latitude={userPos.lat} anchor="center" style={{ zIndex: 5 }}>
            <UserDot />
          </Marker>
        )}

        {mode === 'browse' &&
          spots.map((s) => {
            const isNew = isNewSpot(s.created_at, now);
            return (
              <Marker
                key={s.id}
                longitude={s.lng}
                latitude={s.lat}
                anchor="bottom"
                style={{ zIndex: s.id === selectedId ? 20 : isNew ? 10 : 1, cursor: 'pointer' }}
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  selectSpot(s.id);
                }}
              >
                <button type="button" aria-label={s.name} title={s.name} className="block">
                  <SpotPin
                    selected={s.id === selectedId}
                    isNew={isNew}
                    status={s.status}
                    label={showLabels || s.id === selectedId ? s.name : undefined}
                  />
                </button>
              </Marker>
            );
          })}
      </Map>

      {/* ── Marca ─────────────────────────────────────────────── */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="glass pointer-events-auto flex items-center gap-2.5 rounded-lg px-3 py-2">
          <Sprocket className="h-7 w-7 text-volt" />
          <div className="leading-none">
            <h1 className="display text-[22px] leading-none tracking-tight text-white">
              SPOT<span className="text-volt">Z</span>
            </h1>
            <p className="hud mt-1 text-[9px] text-muted">Ensenada · B.C.</p>
          </div>
        </div>

        <div className="glass pointer-events-auto flex rounded-lg p-1" role="group" aria-label="Tipo de mapa">
          {(['map', 'satellite'] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={mapType === t}
              onClick={() => setMapType(t)}
              className={`hud rounded-md px-3 py-2 font-bold transition ${mapType === t ? 'bg-volt text-ink' : 'text-chrome hover:text-white'}`}
            >
              {t === 'map' ? 'Mapa' : 'Satélite'}
            </button>
          ))}
        </div>
      </header>

      {/* Créditos del mapa: requeridos por MapTiler y OpenStreetMap; integrados al estilo HUD */}
      <div className="glass hud absolute left-4 top-[calc(max(1rem,env(safe-area-inset-top))+60px)] z-20 flex items-center gap-2 rounded-md px-2 py-1 text-[8.5px] tracking-[0.1em] text-muted">
        <a href="https://www.maptiler.com" target="_blank" rel="noopener noreferrer" className="flex opacity-80 hover:opacity-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://api.maptiler.com/resources/logo.svg" alt="MapTiler" width={47} height={14} />
        </a>
        <span>
          <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer" className="hover:text-chrome">© MapTiler</a>{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:text-chrome">© OpenStreetMap</a>
        </span>
      </div>

      {/* ── Aviso / estado ─────────────────────────────────────── */}
      {(toast || loadError) && (
        <div role="status" className="glass hud absolute left-1/2 top-[calc(max(1rem,env(safe-area-inset-top))+96px)] z-30 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-md px-3 py-2.5 text-center normal-case tracking-normal text-chrome">
          <span className="font-sans text-[13px]">{toast ?? loadError}</span>
        </div>
      )}

      {/* ── Modo colocar pin ───────────────────────────────────── */}
      {mode === 'placing' && (
        <>
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-full">
            <SpotPin selected size={52} />
          </div>
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 blur-[1px]" />
          <div className="pointer-events-none absolute inset-x-0 top-[calc(max(1rem,env(safe-area-inset-top))+96px)] z-30 flex justify-center px-4">
            <PlaceSearch
              onPick={(pos) => map?.flyTo({ center: pos, zoom: 18 })}
              onError={flash}
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="glass sheet-in mx-auto max-w-md space-y-3 rounded-xl p-4">
              <div>
                <p className="hud text-volt">Paso 1 de 2</p>
                <p className="display mt-1 text-lg leading-tight text-white">Coloca el pin</p>
                <p className="mt-1 text-[13px] text-chrome/80">
                  Busca la dirección arriba o mueve el mapa hasta que la punta quede justo en el spot.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const c = map?.getCenter();
                  if (c) window.open(streetViewUrl({ lat: c.lat, lng: c.lng }), '_blank', 'noopener');
                }}
                className="hud w-full rounded-md border border-line py-2.5 text-chrome hover:border-volt hover:text-volt"
              >
                Revisar este punto en Street View ↗
              </button>
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <button type="button" onClick={() => setMode(draftPos ? 'form' : 'browse')} className="btn-ghost">Cancelar</button>
                <button type="button" onClick={confirmLocation} className="btn-volt">Confirmar ubicación</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Controles inferiores ───────────────────────────────── */}
      {mode === 'browse' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:pr-[max(1rem,calc(420px+2rem))]">
          <div className="pointer-events-auto flex min-w-0 flex-1 flex-col gap-2 md:max-w-md">
          <div className="glass rounded-lg p-2">
            <div className="flex items-center justify-between px-1 pb-1.5">
              <span className="hud text-muted">
                {geo === 'locating' ? 'Buscando tu ubicación…' : canUseRadius ? 'Radio' : 'Ubicación no disponible'}
              </span>
              <span className="hud font-bold text-chrome">
                <span className="text-volt">{String(nearCount).padStart(2, '0')}</span>{' '}
                {effectiveRadius === 'all' ? 'spots' : 'cerca'}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Radio de búsqueda">
              {RADIUS_OPTIONS.map((r) => {
                const active = effectiveRadius === r;
                const disabled = r !== 'all' && !canUseRadius;
                return (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={disabled}
                    onClick={() => {
                      setRadius(r);
                      if (r === effectiveRadius) fitView();
                    }}
                    className={`rounded-md py-2 font-mono text-[12px] font-bold transition disabled:opacity-30 ${
                      active ? 'bg-volt text-ink' : 'bg-ink/60 text-chrome hover:bg-raise'
                    }`}
                  >
                    {r === 'all' ? 'TODO' : `${r}m`}
                  </button>
                );
              })}
            </div>
          </div>
          </div>

          <div className="pointer-events-auto flex shrink-0 flex-col gap-2">
            <button type="button" onClick={goToMe} aria-label="Mi ubicación" title="Mi ubicación" className="glass grid h-12 w-12 place-items-center self-end rounded-lg text-chrome hover:text-volt">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
            </button>
            <button
              type="button"
              onClick={startCreate}
              className="display flex h-[62px] items-center gap-1.5 rounded-lg bg-volt px-4 text-[15px] text-ink shadow-[0_8px_24px_-6px_rgba(255,230,0,.45)] transition hover:brightness-110 active:scale-[.97]"
            >
              <span className="text-2xl leading-none">+</span> Spot
            </button>
          </div>
        </div>
      )}

      {mode === 'browse' && selectedId && (
        <SpotSheet spotId={selectedId} userPos={userPos} onClose={() => setSelectedId(null)} />
      )}

      {mode === 'form' && draftPos && (
        <CreateSpotForm
          position={draftPos}
          onChangeLocation={editLocation}
          onCancel={() => {
            setMode('browse');
            setDraftPos(null);
          }}
          onCreated={onCreated}
        />
      )}
    </div>
  );
}

function MissingKey() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-ink px-6">
      <div className="max-w-md space-y-4 text-center">
        <Sprocket className="mx-auto h-14 w-14 text-volt" />
        <h1 className="display text-4xl text-white">
          SPOT<span className="text-volt">Z</span>
        </h1>
        <p className="text-chrome/80">
          Falta la clave del mapa. Agrega <code className="font-mono text-volt">NEXT_PUBLIC_MAPTILER_KEY</code> en
          tu archivo <code className="font-mono">.env.local</code> y reinicia el servidor.
        </p>
      </div>
    </main>
  );
}
