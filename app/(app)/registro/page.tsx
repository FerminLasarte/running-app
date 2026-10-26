import type { Metadata } from 'next';
import Registro from '@/components/registro/Registro';

export const metadata: Metadata = { title: 'Registro' };

export default function Page() {
  return <Registro />;
}
