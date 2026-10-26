import type { Metadata } from 'next';
import WeekView from '@/components/views/WeekView';

export const metadata: Metadata = { title: 'Semana' };

export default function Page() {
  return <WeekView />;
}
