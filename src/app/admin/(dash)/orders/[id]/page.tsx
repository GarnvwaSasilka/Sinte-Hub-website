import Link from 'next/link';
import { notFound } from 'next/navigation';
import OrderActions from '@/components/admin/OrderActions';
import { requireAdmin } from '@/lib/auth';
import { formatDate, formatNaira, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '@/lib/format';
import type { Order, OrderItem, Payment } from '@/lib/types';
import { toWhatsAppNumber, whatsAppLink } from '@/lib/whatsapp';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: order }, { data: items }, { data: payments }, { data: settings }] = await Promise.all([
    supabase.from('orders').select('*').eq('id', id).maybeSingle(),
    supabase.from('order_items').select('*').eq('order_id', id).order('created_at'),
    supabase.from('payments').select('*').eq('order_id', id).order('created_at'),
    supabase.from('store_settings').select('store_name, pickup_instructions').eq('id', 1).single(),
  ]);
  if (!order) notFound();
  const o = order as Order;
  const lines = (items ?? []) as OrderItem[];
  const pays = (payments ?? []) as Payment[];
  const total = Number(o.subtotal) + Number(o.delivery_fee ?? 0);

  const customerWa = toWhatsAppNumber(o.customer_phone);
  const message = [
    `Hello ${o.customer_name}, this is ${settings?.store_name ?? "Sinte's Hub"} about your order ${o.reference}.`,
    '',
    ...lines.map((l) => `• ${l.quantity} × ${l.product_name}${l.variant_label ? ` (${l.variant_label})` : ''} – ${formatNaira(l.line_total)}`),
    '',
    `Items: ${formatNaira(o.subtotal)}`,
    o.fulfilment_method === 'pickup'
      ? 'Pickup: no delivery fee.'
      : o.delivery_fee == null
        ? 'Delivery fee: to be confirmed.'
        : `Delivery fee: ${formatNaira(o.delivery_fee)}`,
    o.fulfilment_method === 'pickup' || o.delivery_fee != null ? `Total to pay: ${formatNaira(total)}` : '',
    o.order_status === 'ready_for_pickup' && settings?.pickup_instructions ? `\n${settings.pickup_instructions}` : '',
  ]
    .filter((x) => x !== '')
    .join('\n');

  return (
    <div className="stack">
      <Link href="/admin/orders" className="small">← All orders</Link>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Order {o.reference}</h1>
        {customerWa ? (
          <a className="btn btn-whatsapp btn-small" href={whatsAppLink(customerWa, message)} target="_blank" rel="noopener noreferrer">
            Message customer on WhatsApp
          </a>
        ) : null}
      </div>
      <div className="row">
        <span className="badge">{ORDER_STATUS_LABEL[o.order_status]}</span>
        <span className={`badge ${o.payment_status === 'paid' ? 'badge-ok' : ''}`}>{PAYMENT_STATUS_LABEL[o.payment_status]}</span>
        <span className="small muted">Placed {formatDate(o.created_at)}</span>
      </div>

      <div className="two-col">
        <div className="stack">
          <section className="card">
            <h2 style={{ marginTop: 0 }}>Items</h2>
            <p className="small muted">Prices are what the customer saw when ordering. They never change, even if you edit the product later.</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id}>
                      <td>
                        {l.product_id ? <Link href={`/admin/products/${l.product_id}`}>{l.product_name}</Link> : l.product_name}
                        {l.variant_label ? <div className="small muted">{l.variant_label}</div> : null}
                        {l.sku ? <div className="small muted">{l.sku}</div> : null}
                      </td>
                      <td>{l.quantity}{l.unit_of_sale !== 'piece' ? ` ${l.unit_of_sale}` : ''}</td>
                      <td>{formatNaira(l.unit_price)}</td>
                      <td>{formatNaira(l.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="summary-row"><span>Items subtotal</span><strong>{formatNaira(o.subtotal)}</strong></div>
              <div className="summary-row">
                <span>Delivery fee</span>
                <span>{o.fulfilment_method === 'pickup' ? `${formatNaira(0)} (pickup)` : o.delivery_fee == null ? 'Not agreed yet' : formatNaira(o.delivery_fee)}</span>
              </div>
              <div className="summary-row total"><span>Total</span><span>{o.fulfilment_method === 'delivery' && o.delivery_fee == null ? `${formatNaira(o.subtotal)} + delivery` : formatNaira(total)}</span></div>
            </div>
          </section>

          <section className="card">
            <h2 style={{ marginTop: 0 }}>Customer</h2>
            <p><strong>{o.customer_name}</strong><br />
              <a href={`tel:${o.customer_phone}`}>{o.customer_phone}</a>
              {o.customer_email ? <><br /><a href={`mailto:${o.customer_email}`}>{o.customer_email}</a></> : null}
            </p>
            <p>
              <strong>{o.fulfilment_method === 'pickup' ? 'Pickup' : 'Delivery'}</strong>
              {o.fulfilment_method === 'delivery' ? (
                <><br />{o.delivery_address}<br />{o.delivery_city}, {o.delivery_state}</>
              ) : null}
            </p>
            {o.customer_note ? <p className="notice" style={{ whiteSpace: 'pre-line' }}><strong>CUSTOMER NOTE</strong>{o.customer_note}</p> : null}
          </section>

          <section className="card">
            <h2 style={{ marginTop: 0 }}>Payments</h2>
            {pays.length === 0 ? <p className="muted">No payments recorded.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Reference / note</th></tr></thead>
                  <tbody>
                    {pays.map((p) => (
                      <tr key={p.id}>
                        <td className="small">{formatDate(p.verified_at ?? p.created_at)}</td>
                        <td>{p.status === 'refunded' ? 'Refund' : p.status === 'verified' ? 'Payment (verified)' : p.status}</td>
                        <td>{formatNaira(p.amount)}</td>
                        <td className="small">{[p.provider_reference, p.notes].filter(Boolean).join(' – ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="card small">
            <h3 style={{ marginTop: 0 }}>Timeline</h3>
            <ul>
              <li>Placed: {formatDate(o.created_at)}</li>
              {o.confirmed_at ? <li>Confirmed: {formatDate(o.confirmed_at)}</li> : null}
              {o.paid_at ? <li>Paid: {formatDate(o.paid_at)}</li> : null}
              {o.dispatched_at ? <li>Dispatched: {formatDate(o.dispatched_at)}</li> : null}
              {o.delivered_at ? <li>Delivered: {formatDate(o.delivered_at)}</li> : null}
              {o.collected_at ? <li>Collected: {formatDate(o.collected_at)}</li> : null}
              {o.cancelled_at ? <li>Cancelled: {formatDate(o.cancelled_at)}{o.cancellation_reason ? ` (${o.cancellation_reason})` : ''}</li> : null}
            </ul>
          </section>
        </div>
        <OrderActions order={o} total={total} />
      </div>
    </div>
  );
}
