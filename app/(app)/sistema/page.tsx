import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Sistema from '@/components/pista/Sistema';

export const metadata: Metadata = { title: 'Sistema de diseño' };

/* las piezas sueltas del rediseño, para revisarlas: no existe fuera de desarrollo */
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <Sistema />;
}
