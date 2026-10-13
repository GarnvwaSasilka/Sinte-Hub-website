import type { Metadata } from 'next';
import { getSettings } from '@/lib/settings';
import { toWhatsAppNumber } from '@/lib/whatsapp';
import OrderSent from './OrderSent';

export const metadata: Metadata = { title: 'Order saved', robots: { index: false } };

export default async function OrderSentPage() {
  const settings = await getSettings();
  return (
    <div className="container">
      <OrderSent storeName={settings.store_name} whatsapp={toWhatsAppNumber(settings.whatsapp_number)} />
    </div>
  );
}
