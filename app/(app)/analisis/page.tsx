import type { Metadata } from 'next';
import Volumen from '@/components/analisis/Volumen';

export const metadata: Metadata = { title: 'Análisis' };

export default function Page() {
  return <Volumen />;
}
