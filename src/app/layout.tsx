import type { Metadata, Viewport } from 'next';
import { Archivo, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

const DESCRIPTION = 'Spots de street BMX y skate en Ensenada, B.C. Encuentra, graba y comparte.';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://spotzbmx.vercel.app'),
  title: 'SPOTZ · Ensenada',
  description: DESCRIPTION,
  icons: { icon: '/icon.svg' },
  openGraph: {
    type: 'website',
    siteName: 'SPOTZ',
    title: 'SPOTZ · Ensenada',
    description: DESCRIPTION,
    locale: 'es_MX',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SPOTZ · Ensenada',
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0A0B0D',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${archivo.variable} ${mono.variable}`}>
      <body className="bg-ink font-sans text-chrome antialiased">{children}</body>
    </html>
  );
}
