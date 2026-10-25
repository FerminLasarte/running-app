import type { Metadata } from 'next';
import Semana from '@/components/semana/Semana';

export const metadata: Metadata = { title: 'Semana' };

export default function Page() {
  return <Semana />;
}
