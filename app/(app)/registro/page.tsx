import type { Metadata } from 'next';
import LogView from '@/components/views/LogView';

export const metadata: Metadata = { title: 'Registro' };

export default function Page() {
  return <LogView />;
}
