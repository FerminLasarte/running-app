/* Privacidad y condiciones de uso: una sola página, pública (está en PUBLIC de proxy.ts), para leer antes de entrar y
   para la revisión de Strava. El texto está en Privacidad.tsx. */
import '@/app/styles/screens/privacidad.css';
import type { Metadata } from 'next';
import Privacidad from './Privacidad';

export const metadata: Metadata = { title: 'Privacidad', description: 'Qué guarda Lane One, dónde, qué lee de Strava y cómo borrar todo.' };

export default function PrivacidadPage() {
  return <Privacidad />;
}
