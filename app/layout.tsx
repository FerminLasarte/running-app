import type { Metadata, Viewport } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import './globals.css';

const barlow = Barlow({ variable: '--font-barlow', subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });
const barlowCond = Barlow_Condensed({ variable: '--font-barlow-cond', subsets: ['latin'], weight: ['600', '700'], display: 'swap' });

export const metadata: Metadata = {
  title: 'My Running App',
  description: 'Registro y progreso. Fondos guiados por frecuencia cardíaca; series y tempos, por ritmo.',
  applicationName: 'My Running App',
  appleWebApp: { capable: true, title: 'Running', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#080B10' },
    { media: '(prefers-color-scheme: light)', color: '#EDF0F4' },
  ],
};

/* el tema elegido y la transparencia del vidrio se aplican antes de pintar, para que no parpadee */
const PREPAINT = `try{var t=localStorage.getItem('rr_theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);var g=localStorage.getItem('rr_glass');if(g)document.documentElement.style.setProperty('--glass-t',g)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${barlow.variable} ${barlowCond.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREPAINT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
