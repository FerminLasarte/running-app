/* Renueva la sesión de Supabase en cada pedido y manda al login a quien no entró. La portada (`/`) es pública; con
   sesión, lleva a la semana. Quien prueba sin cuenta (cookie de invitado) pasa a las páginas de la app, no a /api. */
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_KEY, SUPABASE_URL, isAllowed, supabaseConfigured } from '@/lib/supabase/env';
import { GUEST_COOKIE } from '@/lib/guest';

const PUBLIC = ['/', '/login', '/auth', '/privacidad', '/manifest.webmanifest', '/pwa-icon', '/sw.js'];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!supabaseConfigured()) return response;

  const sb = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getClaims valida el token (y lo renueva si hace falta): no hay que poner código entre el cliente y esta línea
  const { data } = await sb.auth.getClaims();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + '/'));
  const guest = request.cookies.get(GUEST_COOKIE)?.value === '1';
  const to = (pathname: string, search = '') => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search;
    return NextResponse.redirect(url);
  };

  if (!data?.claims && !isPublic && !path.startsWith('/api/') && !guest) return to('/login');
  const allowed = !!data?.claims && isAllowed(data.claims.email as string | undefined);
  if (data?.claims && !allowed && !isPublic) {
    return path.startsWith('/api/') ? NextResponse.json({ code: 'unauthorized' }, { status: 401 }) : to('/login', '?e=denied');
  }
  if (allowed && (path === '/' || path === '/login')) return to('/semana');
  return response;
}

export const config = {
  // todo menos archivos estáticos, imágenes (también la de la vista previa del link) y los datos del mapa
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|pwa-icon|opengraph-image|twitter-image|manifest.webmanifest|sw.js|medals/|map/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)'],
};
