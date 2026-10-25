import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  /* Phosphor exporta miles de íconos desde un solo archivo: que solo se carguen los que se usan */
  experimental: { optimizePackageImports: ['@phosphor-icons/react'] },
  /* el service worker siempre se pide de nuevo: así una versión nueva de la app se instala sola */
  async headers() {
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] }];
  },
};

export default nextConfig;
