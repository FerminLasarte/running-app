import type { Metadata } from 'next';
import Zapatillas from '@/components/analisis/Zapatillas';

export const metadata: Metadata = { title: 'Zapatillas · Análisis' };

export default function Page() {
  return <Zapatillas />;
}
