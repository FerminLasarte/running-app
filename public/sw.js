/* Service worker: que la app instalada abra aunque no haya señal.
   Solo guarda la app (la página, el JS, el CSS, las letras, los íconos y el mapa de fondo). Los datos no pasan por
   acá: la app los lee de su caché local y de Supabase. Nada de /api, del login ni de otros dominios.
   - Página principal: se muestra la guardada al instante y se actualiza por detrás (la versión nueva entra en la
     próxima apertura).
   - Archivos de /_next/static: llevan un hash en el nombre, nunca cambian; se guardan la primera vez que se piden.
   - Íconos, medallas y mapa: los guardados al instante, y se actualizan por detrás. */
const PAGE = 'rr-page-v1',
  STATIC = 'rr-static-v1',
  ASSETS = 'rr-assets-v1';
const KEEP = [PAGE, STATIC, ASSETS];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(PAGE).then((c) => refreshPage(c)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/* baja la página principal; si vino bien (sin mandar al login), la guarda junto con los archivos que usa y borra
   los de versiones anteriores que ya no usa */
async function refreshPage(cache) {
  const res = await fetch('/', { cache: 'no-store', credentials: 'same-origin' });
  if (!res.ok || res.redirected || new URL(res.url).pathname !== '/') return res;
  const html = await res.clone().text();
  const used = new Set([...html.matchAll(/\/_next\/static\/[^"'\\\s)]+/g)].map((m) => m[0]));
  const st = await caches.open(STATIC);
  await Promise.all([...used].map((u) => st.match(u).then((hit) => hit || st.add(u)).catch(() => {})));
  const prev = await cache.match('/');
  await cache.put('/', res.clone());
  /* versión nueva: lo de antes que no se usa más se va (lo que se cargue después se vuelve a guardar al pedirlo) */
  if (prev && (await prev.text()) !== html) for (const r of await st.keys()) if (!used.has(new URL(r.url).pathname)) await st.delete(r);
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  if (p.startsWith('/api/') || p.startsWith('/auth/') || p.startsWith('/login')) return;

  if (req.mode === 'navigate' && p === '/') {
    e.respondWith(
      (async () => {
        const c = await caches.open(PAGE),
          hit = await c.match('/');
        e.waitUntil(refreshPage(c).catch(() => {}));
        /* sin copia guardada todavía: el pedido original (así el login, si hace falta, redirige como siempre) */
        return hit || fetch(req);
      })(),
    );
    return;
  }
  if (p.startsWith('/_next/static/')) {
    e.respondWith(
      caches.open(STATIC).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }
  if (/^\/(pwa-icon|medals|map)\/|^\/(icon|apple-icon|manifest\.webmanifest)/.test(p)) {
    e.respondWith(
      caches.open(ASSETS).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req)
          .then((res) => {
            if (res.ok) c.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        if (hit) {
          e.waitUntil(net);
          return hit;
        }
        return net;
      }),
    );
  }
});
