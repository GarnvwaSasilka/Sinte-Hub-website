import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { DEFAULT_ABOUT } from '@/lib/content-defaults';
import { getSettings } from '@/lib/settings';

export const revalidate = 300;
export const metadata: Metadata = { title: 'About us' };

export default async function Page() {
  const s = await getSettings();
  return <InfoPage title="About us" text={s.about_text || DEFAULT_ABOUT} />;
}
