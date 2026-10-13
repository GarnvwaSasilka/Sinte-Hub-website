import type { Metadata } from 'next';
import { getSettings } from '@/lib/settings';
import CheckoutForm from './CheckoutForm';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default async function CheckoutPage() {
  const settings = await getSettings();
  return (
    <div className="container">
      <div className="page-head">
        <h1>Checkout</h1>
      </div>
      <CheckoutForm pickupArea={settings.pickup_area} />
    </div>
  );
}
