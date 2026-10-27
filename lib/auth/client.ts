'use client';
/* Sesión del usuario desde el navegador: entrar con mail y contraseña, cambiar la contraseña y salir. Las cuentas se
   crean en Supabase (README): la app no tiene alta. */
import type { AuthError } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/client';
import { clearGuestCookie } from '@/lib/guest';

export const PASS_MIN = 8;

const AUTH_MSG: Record<string, string> = {
  invalid_credentials: 'Mail o contraseña incorrectos.',
  weak_password: 'La contraseña es muy corta o muy fácil: usá ' + PASS_MIN + ' caracteres o más.',
  same_password: 'Es la misma contraseña que ya tenías.',
  email_address_invalid: 'Revisá el mail.',
  over_request_rate_limit: 'Demasiados intentos seguidos. Esperá un rato y probá de nuevo.',
  reauthentication_needed: 'Por seguridad, cerrá sesión, volvé a entrar y cambiala enseguida.',
};
/** el error de Supabase, dicho para quien lo lee */
const authMsg = (e: AuthError) => (e.code && AUTH_MSG[e.code]) || 'No pude: ' + e.message;
/** lo que falla antes de preguntarle a Supabase */
export const passErr = (pass: string) => (pass.length < PASS_MIN ? 'La contraseña tiene que tener ' + PASS_MIN + ' caracteres o más.' : '');

/** ya con la sesión: a la semana, con una recarga completa (el proxy tiene que ver la cookie nueva y el estado de la
    app arranca de cero, sin los datos de ejemplo si estaba probando) */
function enter() {
  clearGuestCookie();
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign('/semana');
}

/** Entrar con mail y contraseña. Devuelve el error para mostrar, o entra. */
export async function signIn(email: string, password: string): Promise<string | void> {
  const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
  if (error) return authMsg(error);
  enter();
}

/** Cambia la contraseña. Devuelve el error para mostrar, o nada si salió bien. */
export async function setPassword(password: string): Promise<string | void> {
  const bad = passErr(password);
  if (bad) return bad;
  const { error } = await supabaseBrowser().auth.updateUser({ password });
  if (error) return authMsg(error);
}

export async function signOut() {
  await supabaseBrowser().auth.signOut();
  try {
    localStorage.removeItem('rr1');
  } catch {
    /* sin almacenamiento local */
  }
  // recarga completa: borra el estado de la app en memoria
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = '/login';
}
