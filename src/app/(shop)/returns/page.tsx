import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { DEFAULT_RETURNS } from '@/lib/content-defaults';
import { getSettings } from '@/lib/settings';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Returns and exchanges' };

export default async function Page() {
  const s = await getSettings();
  return <InfoPage title="Returns and exchanges" text={s.returns_policy || DEFAULT_RETURNS} />;
}
