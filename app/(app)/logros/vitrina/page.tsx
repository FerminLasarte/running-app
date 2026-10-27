import type { Metadata } from 'next';
import Vitrina from '@/components/logros/Vitrina';

export const metadata: Metadata = { title: 'Vitrina' };

export default function Page() {
  return <Vitrina />;
}
