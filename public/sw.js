/* Service worker: que la app instalada abra aunque no haya señal.
   Solo guarda la app (la página, el JS, el CSS, las letras, los íconos y el mapa de fondo). Los datos no pasan por
   acá: la app los lee de su caché local y de Supabase. Nada de /api, del login ni de otros dominios.
   - Páginas de las secciones: primero la red, así después de un deploy la primera apertura ya muestra lo nuevo. Si
     no hay señal o la red tarda más de NET_WAIT, la guardada (y la nueva se guarda igual cuando llega). Se guardan
     todas al instalar, así se puede navegar sin señal.
   - Archivos de /_next/static: llevan un hash en el nombre, nunca cambian; se guardan la primera vez que se piden.
   - Íconos, medallas y mapa: los guardados al instante, y se actualizan por detrás. */
/* v3: las páginas pasaron a pedirse primero a la red; al activarse se borra la caché vieja */
const PAGE = 'rr-page-v3',
  STATIC = 'rr-static-v1',
  ASSETS = 'rr-assets-v1';
const KEEP = [PAGE, STATIC, ASSETS];
/* las de components/shell/sections.ts, y la vitrina */
const PAGES = ['/semana', '/registro', '/analisis', '/carreras', '/mapa', '/logros', '/logros/vitrina', '/ajustes'];
/* cuánto se espera a la red antes de mostrar la página guardada (con señal mala) */
const NET_WAIT = 3000;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(PAGE)
      .then((c) => Promise.all(PAGES.map((p) => refreshPage(c, p).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const staticsOf = (html) => [...html.matchAll(/\/_next\/static\/[^"'\\\s)]+/g)].map((m) => m[0]);

/* guarda una página que vino bien (sin mandar al login) junto con los archivos que usa. Si cambió, borra los archivos
   que ya no usa ninguna de las páginas guardadas (lo que se cargue después se vuelve a guardar al pedirlo) */
async function savePage(cache, path, res) {
  if (!res.ok || res.type !== 'basic' || res.redirected || new URL(res.url).pathname !== path) return;
  const html = await res.clone().text();
  const st = await caches.open(STATIC);
  await Promise.all(staticsOf(html).map((u) => st.match(u).then((hit) => hit || st.add(u)).catch(() => {})));
  const prev = await cache.match(path);
  await cache.put(path, res.clone());
  if (prev && (await prev.text()) !== html) {
    const used = new Set();
    for (const r of await cache.keys()) staticsOf(await (await cache.match(r)).text()).forEach((u) => used.add(u));
    for (const r of await st.keys()) if (!used.has(new URL(r.url).pathname)) await st.delete(r);
  }
}
/* al instalar: baja cada página y la guarda */
async function refreshPage(cache, path) {
  await savePage(cache, path, await fetch(path, { cache: 'no-store', credentials: 'same-origin' }));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  if (p.startsWith('/api/') || p.startsWith('/auth/') || p.startsWith('/login')) return;

  /* la app instalada antes abría en «/»: sin señal, la mando a la semana como hace el servidor */
  if (req.mode === 'navigate' && p === '/') {
    e.respondWith(fetch(req).catch(() => Response.redirect('/semana', 302)));
    return;
  }
  if (req.mode === 'navigate' && PAGES.includes(p)) {
    /* el pedido original: si hace falta, el login redirige como siempre. Lo que llega se guarda aunque ya se haya
       mostrado la copia */
    const net = fetch(req).then((res) => ({ res, copy: res.clone() }));
    e.waitUntil(net.then(({ copy }) => caches.open(PAGE).then((c) => savePage(c, p, copy))).catch(() => {}));
    e.respondWith(
      (async () => {
        const late = new Promise((ok) => setTimeout(() => ok(null), NET_WAIT));
        const first = await Promise.race([net, late]).catch(() => null);
        if (first) return first.res;
        /* sin señal o con la red lenta, la guardada; si todavía no hay copia, se espera a la red */
        return (await caches.match(p, { cacheName: PAGE })) || net.then((x) => x.res);
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
