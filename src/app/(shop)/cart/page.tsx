import type { Metadata } from 'next';
import CartView from './CartView';

export const metadata: Metadata = { title: 'Your cart', robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container">
      <div className="page-head">
        <h1>Your cart</h1>
      </div>
      <CartView />
    </div>
  );
}
