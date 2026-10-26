import type { Metadata } from 'next';
import Carreras from '@/components/carreras/Carreras';

export const metadata: Metadata = { title: 'Carreras' };

export default function Page() {
  return <Carreras />;
}
