import type { Metadata } from 'next';
import Ritmo from '@/components/analisis/Ritmo';

export const metadata: Metadata = { title: 'Ritmo y eficiencia · Análisis' };

export default function Page() {
  return <Ritmo />;
}
