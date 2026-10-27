'use client';
/* Sesión del usuario desde el navegador: entrar (mail y contraseña o Google), crear la cuenta, la contraseña, salir y
   eliminar la cuenta. No se manda ningún mail salvo «Olvidé mi contraseña», que solo existe con un SMTP propio. */
import type { AuthError } from '@supabase/supabase-js';
import { S } from '@/lib/store';
import { supabaseBrowser } from '@/lib/supabase/client';
import { AUTH_GOOGLE } from '@/lib/supabase/env';
import { clearGuestCookie } from '@/lib/guest';

export const PASS_MIN = 8;

const EXISTS = 'Ya hay una cuenta con ese mail. Entrá con tu contraseña' + (AUTH_GOOGLE ? ' o con Google.' : '.');
const AUTH_MSG: Record<string, string> = {
  invalid_credentials: 'Mail o contraseña incorrectos.',
  user_already_exists: EXISTS,
  email_exists: EXISTS,
  weak_password: 'La contraseña es muy corta o muy fácil: usá ' + PASS_MIN + ' caracteres o más.',
  same_password: 'Es la misma contraseña que ya tenías.',
  signup_disabled: 'Por ahora no se pueden crear cuentas nuevas.',
  email_address_invalid: 'Revisá el mail.',
  email_not_confirmed: 'Falta confirmar el mail: buscá el mensaje que te llegó.',
  over_request_rate_limit: 'Demasiados intentos seguidos. Esperá un rato y probá de nuevo.',
  over_email_send_rate_limit: 'Ya te mandé varios mails seguidos. Esperá un rato y probá de nuevo.',
  reauthentication_needed: 'Por seguridad, cerrá sesión, volvé a entrar y cambiala enseguida.',
};
/** el error de Supabase, dicho para quien lo lee */
const authMsg = (e: AuthError) => (e.code && AUTH_MSG[e.code]) || 'No pude: ' + e.message;
/** lo que falla antes de preguntarle a Supabase */
export const passErr = (pass: string) => (pass.length < PASS_MIN ? 'La contraseña tiene que tener ' + PASS_MIN + ' caracteres o más.' : '');

/* las vueltas de Supabase: las de cada vez y la del link para poner una contraseña nueva (README: Redirect URLs) */
const back = (path: string) => window.location.origin + path;

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

/** Crear la cuenta con mail y contraseña. Sin confirmación por mail (Supabase → Confirm email apagado) entra enseguida;
    si estuviera prendida, avisa que llegó un mail (`sent`). */
export async function signUp(email: string, password: string): Promise<{ msg: string; sent?: boolean } | void> {
  const bad = passErr(password);
  if (bad) return { msg: bad };
  const { data, error } = await supabaseBrowser().auth.signUp({ email, password, options: { emailRedirectTo: back('/auth/callback'), data: { has_password: true } } });
  if (error) return { msg: authMsg(error) };
  if (!data.session) return { msg: 'Te mandé un mail a ' + email + ' para confirmar la cuenta: abrilo desde este dispositivo y entrás.', sent: true };
  enter();
}

/** Entrar (o crear la cuenta) con Google: vuelve por /auth/callback. Si el mail ya tiene cuenta, Supabase la suma a esa
    misma cuenta. */
export async function signInGoogle(): Promise<string | void> {
  const { error } = await supabaseBrowser().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back('/auth/callback') } });
  if (error) return authMsg(error);
}

/** «Olvidé mi contraseña» (solo con SMTP propio): el link entra y lleva a Ajustes a poner una nueva */
export async function sendReset(email: string): Promise<{ msg: string; ok?: boolean }> {
  const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, { redirectTo: back('/auth/clave') });
  return error ? { msg: authMsg(error) } : { msg: 'Listo: si hay una cuenta con ' + email + ', te llega un link para poner una contraseña nueva.', ok: true };
}

/** ¿puso alguna vez una contraseña? (quien entraba con el link por mail o con Google no tiene) */
export async function hasPassword() {
  const { data } = await supabaseBrowser().auth.getSession();
  return !!data.session?.user.user_metadata?.has_password;
}

/** Pone o cambia la contraseña. Devuelve el error para mostrar, o nada si salió bien. */
export async function setPassword(password: string): Promise<string | void> {
  const bad = passErr(password);
  if (bad) return bad;
  const { error } = await supabaseBrowser().auth.updateUser({ password, data: { has_password: true } });
  if (error) return authMsg(error);
}

/** todo lo que la app guarda en el navegador (sus claves empiezan con «rr»: datos, cambios sin subir, el borrador…) */
function wipeLocal() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('rr'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* sin almacenamiento local */
  }
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

/** Elimina la cuenta con todo lo suyo (sin cuenta, lo de este navegador) y limpia lo guardado acá. Si falla, tira error y
    no toca nada de acá. */
export async function deleteAccount() {
  const cloud = S.mode === 'cloud';
  if (cloud) {
    const r = await fetch('/api/account/delete', { method: 'POST' });
    if (!r.ok) throw new Error(String(r.status));
    await supabaseBrowser()
      .auth.signOut({ scope: 'local' })
      .catch(() => null);
  }
  wipeLocal();
  // recarga completa: borra el estado de la app en memoria (sin cuenta, arranca de cero con la bienvenida)
  window.location.href = cloud ? '/login' : '/semana';
}
