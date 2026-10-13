'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatNaira } from '@/lib/format';
import type { PlacedOrder } from '@/lib/types';
import { customerOrderMessage, whatsAppLink } from '@/lib/whatsapp';
import CheckoutNotice from '@/components/CheckoutNotice';
import { WhatsAppIcon } from '@/components/Icons';

interface Saved {
  order: PlacedOrder;
  customerName: string;
  city?: string;
  state?: string;
}

export default function OrderSent({ storeName, whatsapp }: { storeName: string; whatsapp: string | null }) {
  const [saved, setSaved] = useState<Saved | null | undefined>(undefined);

  useEffect(() => {
    try {
      setSaved(JSON.parse(sessionStorage.getItem('sh-last-order') || 'null'));
    } catch {
      setSaved(null);
    }
  }, []);

  if (saved === undefined) return <p className="muted">Loading…</p>;
  if (!saved) {
    return (
      <div className="card center" style={{ marginTop: 32 }}>
        <p>We could not find a recent order in this browser.</p>
        <Link href="/shop" className="btn">
          Back to the shop
        </Link>
      </div>
    );
  }

  const { order } = saved;
  const message = customerOrderMessage(order, {
    storeName,
    customerName: saved.customerName,
    city: saved.city,
    state: saved.state,
  });

  return (
    <div style={{ maxWidth: 640, margin: '32px auto 0' }} className="stack">
      <h1>Your order is saved</h1>
      <p>
        Your order number is <strong style={{ fontSize: '1.2rem' }}>{order.reference}</strong>. Please keep it for your records.
      </p>
      <div className="card stack">
        <h2 style={{ marginTop: 0 }}>One more step: send it to us on WhatsApp</h2>
        <p>Tap the button below. WhatsApp will open with your order details ready to send.</p>
        {whatsapp ? (
          <a className="btn btn-whatsapp btn-block" href={whatsAppLink(whatsapp, message)} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon /> Send order on WhatsApp
          </a>
        ) : (
          <p className="alert alert-info">Our WhatsApp number is not set yet. We have your order and will contact you.</p>
        )}
        <p className="small muted">
          Sending this message does <strong>not</strong> mean your order is paid or confirmed. We will reply to confirm stock, the
          delivery fee (if any) and your final total, then share payment details.
        </p>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Order summary</h3>
        {order.items.map((i, n) => (
          <div className="summary-row small" key={n}>
            <span>
              {i.quantity} × {i.name}
              {i.variant_label ? ` (${i.variant_label})` : ''}
            </span>
            <span>{formatNaira(i.line_total)}</span>
          </div>
        ))}
        <div className="summary-row total">
          <span>Items subtotal</span>
          <span>{formatNaira(order.subtotal)}</span>
        </div>
        <div className="summary-row">
          <span>Delivery fee</span>
          <span>{order.fulfilment_method === 'pickup' ? `${formatNaira(0)} (pickup)` : 'To be confirmed'}</span>
        </div>
      </div>
      <CheckoutNotice />
      <p className="center">
        <Link href="/shop">Continue shopping</Link>
      </p>
    </div>
  );
}
