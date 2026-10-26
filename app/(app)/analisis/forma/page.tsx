import type { Metadata } from 'next';
import Forma from '@/components/analisis/Forma';

export const metadata: Metadata = { title: 'Forma y carga · Análisis' };

export default function Page() {
  return <Forma />;
}
