import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { DEFAULT_SIZE_GUIDE } from '@/lib/content-defaults';
import { getSettings } from '@/lib/settings';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Size guide' };

export default async function Page() {
  const s = await getSettings();
  return <InfoPage title="Size guide" text={s.size_guide_text || DEFAULT_SIZE_GUIDE} />;
}
