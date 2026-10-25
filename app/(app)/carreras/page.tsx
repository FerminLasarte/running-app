import type { Metadata } from 'next';
import RaceView from '@/components/views/RaceView';

export const metadata: Metadata = { title: 'Carreras' };

export default function Page() {
  return <RaceView />;
}
