/* Probar sin cuenta: la portada pone una cookie de invitado que el proxy deja pasar a las páginas de la app (no a
   /api). Con ella y sin sesión, el arranque entra con los datos de ejemplo y no guarda nada. Es de sesión: se va al
   cerrar el navegador. Al entrar con una cuenta (o al salir de la cuenta) se borra. */
export const GUEST_COOKIE = 'lo_guest';

export const hasGuestCookie = () => typeof document !== 'undefined' && document.cookie.split('; ').includes(GUEST_COOKIE + '=1');

export function clearGuestCookie() {
  document.cookie = GUEST_COOKIE + '=; path=/; max-age=0; samesite=lax';
}

/** desde la portada: a la semana, con los datos de ejemplo */
export function startGuest() {
  document.cookie = GUEST_COOKIE + '=1; path=/; samesite=lax';
  // recarga completa: el proxy tiene que ver la cookie y el arranque empieza de cero
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign('/semana');
}

/** deja de probar y vuelve a la portada */
export function endGuest() {
  clearGuestCookie();
  // recarga completa: los datos de ejemplo quedan atrás
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign('/');
}
