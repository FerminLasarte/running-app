import type { Metadata } from 'next';
import Logros from '@/components/logros/Logros';

export const metadata: Metadata = { title: 'Logros' };

export default function Page() {
  return <Logros />;
}
