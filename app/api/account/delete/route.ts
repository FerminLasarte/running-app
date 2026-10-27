/* Elimina la cuenta de quien llama: desconecta Strava (lo revoca allá y borra lo que vino de ahí), borra el usuario con
   la función delete_account (lo demás se va en cascada) y cierra la sesión. */
import { NextResponse } from 'next/server';
import { requireUser, stravaDisconnect, svError } from '@/lib/strava/server';

export async function POST() {
  try {
    const { sb, user } = await requireUser();
    await stravaDisconnect(sb, user.id);
    const { error } = await sb.rpc('delete_account');
    if (error) throw error;
    /* borra las cookies de la sesión: el usuario ya no existe, así que Supabase puede contestar que no la encuentra */
    await sb.auth.signOut({ scope: 'local' }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return svError(e);
  }
}
