import type { Metadata } from 'next';
import SesionPage from '@/components/sesion/Sesion';

export const metadata: Metadata = { title: 'Sesión' };

export default function Page() {
  return <SesionPage />;
}
