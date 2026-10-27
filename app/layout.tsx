import type { Metadata, Viewport } from 'next';
import { Archivo, Geist, Geist_Mono } from 'next/font/google';
import { THEME_SCRIPT } from '@/lib/theme';
import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/components/controls.css';
import './styles/components/fields.css';
import './styles/components/structure.css';
import './styles/components/meters.css';
import './styles/components/sport.css';
import './styles/components/charts.css';
import './styles/components/panels.css';
import './styles/components/palette.css';

/* Archivo variable con su eje de ancho: angosta para números y títulos de marca, itálica para la voz de marca */
const archivo = Archivo({ variable: '--font-archivo', subsets: ['latin'], style: ['normal', 'italic'], axes: ['wdth'], display: 'swap' });
const geist = Geist({ variable: '--font-geist', subsets: ['latin'], display: 'swap' });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Lane One', template: '%s · Lane One' },
  description: 'Registro y progreso. Fondos guiados por frecuencia cardíaca; series y tempos, por ritmo.',
  applicationName: 'Lane One',
  appleWebApp: { capable: true, title: 'Lane One', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0E0E0F' },
    { media: '(prefers-color-scheme: light)', color: '#F2F1ED' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${archivo.variable} ${geist.variable} ${geistMono.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* el tema se aplica antes de pintar, para que no parpadee */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
