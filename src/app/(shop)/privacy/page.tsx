import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { DEFAULT_PRIVACY } from '@/lib/content-defaults';
import { getSettings } from '@/lib/settings';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Privacy policy' };

export default async function Page() {
  const s = await getSettings();
  return <InfoPage title="Privacy policy" text={s.privacy_policy || DEFAULT_PRIVACY} />;
}
