'use client';

import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import { formatNaira } from '@/lib/format';

export default function CartView() {
  const cart = useCart();
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
  return (
    <div className="two-col">
      <div>
        {cart.lines.map((l) => (
          <div className="cart-line" key={l.variantId}>
            {l.image ? <img src={l.image} alt="" /> : <div className="placeholder-img"><img src="/monogram.png" alt="" /></div>}
            <div>
              <Link href={`/product/${l.slug}`} style={{ fontWeight: 600, textDecoration: 'none' }}>
                {l.name}
              </Link>
              {l.variantLabel ? <div className="small muted">{l.variantLabel}</div> : null}
              <div className="small">
                {formatNaira(l.unitPrice)}
                {l.unitOfSale !== 'piece' ? ` per ${l.unitOfSale}` : ''}
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <div className="qty">
                  <button type="button" aria-label="Decrease quantity" onClick={() => cart.setQuantity(l.variantId, l.quantity - 1)}>
                    −
                  </button>
                  <input
                    type="number"
                    aria-label={`Quantity of ${l.name}`}
                    value={l.quantity}
                    min={l.minQty}
                    max={l.maxQty}
                    onChange={(e) => cart.setQuantity(l.variantId, Number(e.target.value))}
                  />
                  <button type="button" aria-label="Increase quantity" onClick={() => cart.setQuantity(l.variantId, l.quantity + 1)}>
                    +
                  </button>
                </div>
                <button className="link-button small" type="button" onClick={() => cart.remove(l.variantId)}>
                  Remove
                </button>
                <strong style={{ marginLeft: 'auto' }}>{formatNaira(l.unitPrice * l.quantity)}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
      <aside className="summary-box">
        <div className="summary-row">
          <span>Items subtotal</span>
          <strong>{formatNaira(cart.subtotal)}</strong>
        </div>
        <div className="summary-row">
          <span>Delivery</span>
          <span className="muted">Confirmed later (pickup is free)</span>
        </div>
        <p className="small muted">Prices and stock are checked again when you place your order.</p>
        <Link href="/checkout" className="btn btn-gold btn-block">
          Go to checkout
        </Link>
        <p className="center small">
          <Link href="/shop">Continue shopping</Link>
        </p>
      </aside>
    </div>
  );
}
