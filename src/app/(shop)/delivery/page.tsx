import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { DEFAULT_DELIVERY } from '@/lib/content-defaults';
import { getSettings } from '@/lib/settings';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Delivery and pickup' };

export default async function Page() {
  const s = await getSettings();
  return <InfoPage title="Delivery and pickup" text={s.delivery_policy || DEFAULT_DELIVERY} />;
}
