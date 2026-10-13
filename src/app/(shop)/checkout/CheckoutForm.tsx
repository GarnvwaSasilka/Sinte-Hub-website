'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from '@/components/CartProvider';
import CheckoutNotice from '@/components/CheckoutNotice';
import { formatNaira } from '@/lib/format';
import { NIGERIAN_STATES } from '@/lib/states';
import { placeOrder } from './actions';

export const LAST_ORDER_KEY = 'sh-last-order';

export default function CheckoutForm({ pickupArea }: { pickupArea: string | null }) {
  const cart = useCart();
  const router = useRouter();
  const [method, setMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!cart.ready) return <p className="muted">Loading your cart…</p>;
  if (cart.lines.length === 0) {
    return (
      <div className="card center">
        <p>Your cart is empty.</p>
        <Link href="/shop" className="btn">
          Start shopping
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? '');
    try {
      const result = await placeOrder({
        customer_name: get('name'),
        customer_phone: get('phone'),
        customer_email: get('email'),
        fulfilment_method: method,
        delivery_state: get('state'),
        delivery_city: get('city'),
        delivery_address: get('address'),
        customer_note: get('note'),
        website: get('website'),
        items: cart.lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
      });
      if (!result.ok) {
        setError(result.error);
        setBusy(false);
        return;
      }
      try {
        sessionStorage.setItem(
          LAST_ORDER_KEY,
          JSON.stringify({ order: result.order, customerName: get('name'), city: get('city'), state: get('state') }),
        );
      } catch {
        /* still continue */
      }
      cart.clear();
      router.push('/order-sent');
    } catch {
      setError('We could not reach the shop. Please check your internet connection and try again.');
      setBusy(false);
    }
  }

  return (
    <form className="two-col" onSubmit={onSubmit} noValidate={false}>
      <div className="stack">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Your details</h2>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" type="text" required minLength={2} maxLength={100} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="phone">
              Phone number <span className="hint">(preferably your WhatsApp number)</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              inputMode="tel"
              pattern="^\+?[0-9\s\-\(\)]{7,20}$"
              placeholder="0801 234 5678"
              autoComplete="tel"
            />
          </div>
          <div className="field">
            <label htmlFor="email">
              Email <span className="hint">(optional)</span>
            </label>
            <input id="email" name="email" type="email" maxLength={200} autoComplete="email" />
          </div>
          <div className="hp" aria-hidden="true">
            <label htmlFor="website">Leave this empty</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Pickup or delivery?</h2>
          <div className="choice-cards" role="radiogroup">
            <label className="choice-card">
              <input type="radio" name="method" value="pickup" checked={method === 'pickup'} onChange={() => setMethod('pickup')} />
              <strong>Pickup</strong>
              <div className="small muted">No delivery fee{pickupArea ? `. ${pickupArea}` : ''}</div>
            </label>
            <label className="choice-card">
              <input type="radio" name="method" value="delivery" checked={method === 'delivery'} onChange={() => setMethod('delivery')} />
              <strong>Delivery</strong>
              <div className="small muted">Fee confirmed on WhatsApp</div>
            </label>
          </div>
          {method === 'delivery' ? (
            <div style={{ marginTop: 16 }}>
              <div className="field">
                <label htmlFor="state">State</label>
                <select id="state" name="state" required defaultValue="">
                  <option value="" disabled>
                    Choose your state
                  </option>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="city">City / area</label>
                <input id="city" name="city" type="text" required maxLength={100} autoComplete="address-level2" />
              </div>
              <div className="field">
                <label htmlFor="address">Delivery address</label>
                <textarea id="address" name="address" required maxLength={500} autoComplete="street-address" />
              </div>
            </div>
          ) : (
            <p className="small muted" style={{ marginTop: 12 }}>
              We will send pickup details on WhatsApp once your order is confirmed.
            </p>
          )}
          <div className="field">
            <label htmlFor="note">
              Note for us <span className="hint">(optional)</span>
            </label>
            <textarea id="note" name="note" maxLength={1000} style={{ minHeight: 70 }} />
          </div>
        </section>
      </div>

      <aside className="summary-box stack">
        <h2 style={{ marginTop: 0 }}>Order summary</h2>
        {cart.lines.map((l) => (
          <div className="summary-row small" key={l.variantId}>
            <span>
              {l.quantity} × {l.name}
              {l.variantLabel ? ` (${l.variantLabel})` : ''}
            </span>
            <span>{formatNaira(l.unitPrice * l.quantity)}</span>
          </div>
        ))}
        <div className="summary-row total">
          <span>Items subtotal</span>
          <span>{formatNaira(cart.subtotal)}</span>
        </div>
        <div className="summary-row">
          <span>Delivery fee</span>
          <span>{method === 'pickup' ? formatNaira(0) : 'To be confirmed'}</span>
        </div>
        <CheckoutNotice />
        {error ? (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        ) : null}
        <button className="btn btn-gold btn-block" type="submit" disabled={busy}>
          {busy ? 'Saving your order…' : 'Place order'}
        </button>
        <p className="small muted">
          Next, you will send your order to us on WhatsApp. Sending it does not mean your order is paid or confirmed: we will confirm
          stock and your final total first.
        </p>
      </aside>
    </form>
  );
}
