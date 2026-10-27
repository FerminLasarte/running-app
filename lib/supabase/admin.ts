/* Cliente de Supabase con la clave de servicio: se salta el RLS. Solo para lo que llega sin sesión de usuario (el aviso
   de Strava de que un atleta revocó el acceso). La clave vive solo en el servidor. */
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './env';

const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
export const supabaseAdminConfigured = () => !!(SUPABASE_URL && KEY);

export const supabaseAdmin = () => createClient(SUPABASE_URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
