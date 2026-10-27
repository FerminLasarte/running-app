/* Vuelta del link de «Olvidé mi contraseña»: crea la sesión y lleva a Ajustes con el campo de la contraseña nueva abierto.
   Es una ruta aparte (y no `?next=` en /auth/callback) para que en Supabase alcance con la dirección exacta en las
   Redirect URLs. */
import type { NextRequest } from 'next/server';
import { authReturn } from '@/lib/supabase/authReturn';

export function GET(request: NextRequest) {
  return authReturn(request, '/ajustes?clave=1');
}
