/* Las páginas de la app: sin sesión (ni la cookie de invitado) el proxy las manda al login. Cualquier otra dirección
   que no sea de la app llega al 404 («Te saliste del andarivel.»). Las secciones son las de
   components/shell/sections.ts: una página nueva de la app se suma acá. */
export const APP_PATHS = ['/semana', '/registro', '/analisis', '/carreras', '/mapa', '/logros', '/ajustes', '/sesion', '/sistema'];

export const isAppPath = (path: string) => APP_PATHS.some((p) => path === p || path.startsWith(p + '/'));
