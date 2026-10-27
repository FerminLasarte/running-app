import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'My Running App',
    short_name: 'Running',
    description: 'Registro y progreso. Fondos guiados por frecuencia cardíaca; series y tempos, por ritmo.',
    lang: 'es-AR',
    start_url: '/semana',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    /* el estadio (--hero): la marca en tartán se ve bien encima con los dos temas */
    background_color: '#151515',
    theme_color: '#151515',
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512m', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
