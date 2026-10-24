/* Variables públicas de Supabase. Acepta la clave nueva (publishable) o la anterior (anon). */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const supabaseConfigured = () => !!(SUPABASE_URL && SUPABASE_KEY);

/** Mails con acceso (variable ALLOWED_EMAILS, separados por coma). Vacía = cualquiera con cuenta. Solo en el servidor. */
export function isAllowed(email: string | null | undefined) {
  const list = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  return !list.length || (!!email && list.includes(email.toLowerCase()));
}
