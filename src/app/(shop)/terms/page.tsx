import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { DEFAULT_TERMS } from '@/lib/content-defaults';
import { getSettings } from '@/lib/settings';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Terms of service' };

export default async function Page() {
  const s = await getSettings();
  return <InfoPage title="Terms of service" text={s.terms_text || DEFAULT_TERMS} />;
}
