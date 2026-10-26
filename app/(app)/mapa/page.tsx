import type { Metadata } from 'next';
import Mapa from '@/components/mapa/Mapa';

export const metadata: Metadata = { title: 'Mapa' };

export default function Page() {
  return <Mapa />;
}
