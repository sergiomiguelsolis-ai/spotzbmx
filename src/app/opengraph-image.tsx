import { ImageResponse } from 'next/og';
import { SPROCKET_PATH } from '@/components/Sprocket';

// Portada que muestran Messenger, WhatsApp, Instagram, etc. al compartir el link.
export const alt = 'SPOTZ · Spots de BMX y skate en Ensenada, B.C.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#0A0B0D';
const VOLT = '#FFE600';
const CHROME = '#D5D9DF';
const MUTED = '#80868F';

const HEADLINE = 'SPOTZ';
const TAGLINE = 'SPOTS DE BMX Y SKATE';
const HUD = 'REC ENSENADA · B.C. 31.87°N 116.60°W MAPA DE LA COMUNIDAD';

/** Descarga solo los caracteres necesarios de una fuente de Google Fonts (TTF). */
async function googleFont(family: string, text: string) {
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`)
  ).text();
  const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error(`No se pudo cargar la fuente ${family}`);
  return (await fetch(url)).arrayBuffer();
}

export default async function OpengraphImage() {
  const [display, mono] = await Promise.all([
    googleFont('Archivo:wdth,wght@125,900', HEADLINE + TAGLINE),
    googleFont('JetBrains+Mono:wght@500', HUD),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: `radial-gradient(circle at 50% 42%, #1B1E23 0%, ${INK} 62%)`,
          position: 'relative',
        }}
      >
        {/* Retícula tenue de calles */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.035) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.035) 2px, transparent 2px)',
            backgroundSize: '84px 84px',
          }}
        />

        {/* HUD de cámara */}
        <div
          style={{
            position: 'absolute',
            top: 38,
            left: 48,
            right: 48,
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'Mono',
            fontSize: 22,
            letterSpacing: 4,
            color: CHROME,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 16, height: 16, borderRadius: 16, background: '#FF3B47' }} />
            REC
          </div>
          <div style={{ display: 'flex', color: MUTED }}>31.87°N 116.60°W</div>
        </div>

        {/* Centro: pin + marca */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
            paddingBottom: 34,
          }}
        >
          <svg width="150" height="191" viewBox="0 0 44 56">
            <path
              d="M22 54.5C22 54.5 3.5 34.5 3.5 21.5a18.5 18.5 0 0 1 37 0C40.5 34.5 22 54.5 22 54.5Z"
              fill={INK}
              stroke={VOLT}
              strokeWidth="2.5"
            />
            <g transform="translate(22 21.5) scale(1.08)">
              <path d={SPROCKET_PATH} fill={VOLT} fillRule="evenodd" />
            </g>
          </svg>
          <div style={{ display: 'flex', fontFamily: 'Display', fontSize: 132, lineHeight: 1, color: '#FFFFFF', letterSpacing: -2 }}>
            SPOT<span style={{ color: VOLT }}>Z</span>
          </div>
          <div style={{ display: 'flex', fontFamily: 'Display', fontSize: 30, color: CHROME, letterSpacing: 2 }}>{TAGLINE}</div>
          <div style={{ display: 'flex', fontFamily: 'Mono', fontSize: 22, color: MUTED, letterSpacing: 6 }}>
            ENSENADA · B.C.
          </div>
        </div>

        {/* Cinta de precaución */}
        <div
          style={{
            height: 26,
            display: 'flex',
            backgroundImage: `repeating-linear-gradient(-45deg, ${VOLT} 0px, ${VOLT} 22px, ${INK} 22px, ${INK} 44px)`,
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Display', data: display, weight: 900, style: 'normal' },
        { name: 'Mono', data: mono, weight: 500, style: 'normal' },
      ],
    },
  );
}
