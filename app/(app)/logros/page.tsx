import type { Metadata } from 'next';
import LogrosView from '@/components/views/LogrosView';

export const metadata: Metadata = { title: 'Logros' };

export default function Page() {
  return <LogrosView />;
}
