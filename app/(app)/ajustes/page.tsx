import type { Metadata } from 'next';
import SettingsView from '@/components/views/SettingsView';

export const metadata: Metadata = { title: 'Ajustes' };

export default function Page() {
  return <SettingsView />;
}
