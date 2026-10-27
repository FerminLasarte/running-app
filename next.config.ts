import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    /* Phosphor exporta miles de íconos desde un solo archivo: que solo se carguen los que se usan */
    optimizePackageImports: ['@phosphor-icons/react'],
    /* las páginas se dibujan solo en el navegador (use(browser()) en el shell): no hay nada del servidor que la
       validación de navegación instantánea pueda dibujar. Valida solo los segmentos que exporten `instant` */
    instantInsights: { validationLevel: 'manual-warning' },
  },
  /* «/» es la portada; con sesión, el proxy lleva a la semana */
  /* el service worker siempre se pide de nuevo: así una versión nueva de la app se instala sola */
  async headers() {
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] }];
  },
};

export default nextConfig;
