import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { formatDate, formatNaira, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '@/lib/format';
import { ordersQuery, type OrderFilters } from '@/lib/orders-query';
import type { Order } from '@/lib/types';

export default async function OrdersPage({ searchParams }: { searchParams: Promise<OrderFilters> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data, error } = await ordersQuery(supabase, sp).limit(300);
  const orders = (data ?? []) as unknown as Order[];
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => !!v) as [string, string][]).toString();

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Orders</h1>
        <a className="btn btn-outline btn-small" href={`/admin/orders/export${qs ? `?${qs}` : ''}`}>
          Export these orders (CSV)
        </a>
      </div>
      <form className="card form-grid" method="get">
        <div className="field">
          <label htmlFor="o-q">Search</label>
          <input id="o-q" type="search" name="q" defaultValue={sp.q ?? ''} placeholder="Order number, name or phone" />
        </div>
        <div className="field">
          <label htmlFor="o-status">Order status</label>
          <select id="o-status" name="status" defaultValue={sp.status ?? ''}>
            <option value="">Any status</option>
            {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="o-pay">Payment</label>
          <select id="o-pay" name="payment" defaultValue={sp.payment ?? ''}>
            <option value="">Any</option>
            {Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="o-from">From</label>
            <input id="o-from" type="date" name="from" defaultValue={sp.from ?? ''} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="o-to">To</label>
            <input id="o-to" type="date" name="to" defaultValue={sp.to ?? ''} />
          </div>
        </div>
        <div className="row full">
          <button className="btn btn-small">Filter</button>
          <Link href="/admin/orders" className="small">Clear</Link>
        </div>
      </form>
      {error ? <p className="alert alert-error">Could not load orders.</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Order</th><th>Customer</th><th>Type</th><th>Items</th><th>Delivery</th><th>Status</th><th>Payment</th><th>Date</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`} style={{ fontWeight: 600 }}>{o.reference}</Link></td>
                <td>{o.customer_name}<div className="small muted">{o.customer_phone}</div></td>
                <td>{o.fulfilment_method === 'pickup' ? 'Pickup' : 'Delivery'}</td>
                <td>{formatNaira(o.subtotal)}</td>
                <td>{o.fulfilment_method === 'pickup' ? '—' : o.delivery_fee == null ? <span className="badge badge-low">To confirm</span> : formatNaira(o.delivery_fee)}</td>
                <td><span className={`badge ${o.order_status === 'cancelled' ? 'badge-hidden' : o.order_status === 'pending' ? 'badge-low' : ''}`}>{ORDER_STATUS_LABEL[o.order_status]}</span></td>
                <td><span className={`badge ${o.payment_status === 'paid' ? 'badge-ok' : ''}`}>{PAYMENT_STATUS_LABEL[o.payment_status]}</span></td>
                <td className="small">{formatDate(o.created_at)}</td>
              </tr>
            ))}
            {orders.length === 0 ? <tr><td colSpan={8} className="muted">No orders match.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
