import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { formatDate, formatNaira, ORDER_STATUS_LABEL } from '@/lib/format';
import type { Order } from '@/lib/types';

export default async function OverviewPage() {
  const { supabase } = await requireAdmin();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [catalog, orders, payments, settings, movements] = await Promise.all([
    supabase.from('product_catalog').select('id, name, slug, status, total_stock'),
    supabase
      .from('orders')
      .select('id, reference, customer_name, order_status, payment_status, subtotal, delivery_fee, created_at')
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase.from('payments').select('amount, status'),
    supabase.from('store_settings').select('low_stock_threshold, whatsapp_number').eq('id', 1).single(),
    supabase
      .from('stock_movements')
      .select('id, change, stock_after, reason, created_at, product:products(name), variant:product_variants(size, colour)')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const products = catalog.data ?? [];
  const threshold = settings.data?.low_stock_threshold ?? 3;
  const visible = products.filter((p) => p.status === 'available' || p.status === 'sold_out');
  const available = products.filter((p) => p.status === 'available' && p.total_stock > 0);
  const soldOut = visible.filter((p) => p.status === 'sold_out' || p.total_stock <= 0);
  const hidden = products.filter((p) => p.status === 'hidden');

  const { data: lowVariants } = await supabase
    .from('product_variants')
    .select('id, size, colour, stock, product:products!inner(id, name, status)')
    .lte('stock', threshold)
    .eq('is_active', true)
    .eq('product.status', 'available')
    .order('stock')
    .limit(20);

  const o = (orders.data ?? []) as Pick<Order, 'id' | 'reference' | 'customer_name' | 'order_status' | 'payment_status' | 'subtotal' | 'delivery_fee' | 'created_at'>[];
  const newToday = o.filter((x) => new Date(x.created_at) >= startOfToday).length;
  const awaitingConfirmation = o.filter((x) => x.order_status === 'pending').length;
  const paid = o.filter((x) => x.payment_status === 'paid').length;
  const awaitingFulfilment = o.filter((x) => ['confirmed', 'processing'].includes(x.order_status)).length;
  const unpaidValue = o
    .filter((x) => x.payment_status === 'unpaid' && x.order_status !== 'cancelled')
    .reduce((n, x) => n + Number(x.subtotal) + Number(x.delivery_fee ?? 0), 0);

  const pay = payments.data ?? [];
  const verified = pay.filter((p) => p.status === 'verified').reduce((n, p) => n + Number(p.amount), 0);
  const refunded = pay.filter((p) => p.status === 'refunded').reduce((n, p) => n + Number(p.amount), 0);

  type Movement = {
    id: number;
    change: number;
    stock_after: number;
    reason: string;
    created_at: string;
    product: { name: string } | null;
    variant: { size: string | null; colour: string | null } | null;
  };
  type LowVariant = { id: string; size: string | null; colour: string | null; stock: number; product: { id: string; name: string } };

  return (
    <div className="stack">
      <h1>Overview</h1>
      {!settings.data?.whatsapp_number ? (
        <p className="alert alert-error">
          Your WhatsApp number is not set, so customers cannot send you their orders. <Link href="/admin/settings">Add it in Settings</Link>.
        </p>
      ) : null}

      <h2>Orders</h2>
      <div className="stat-grid">
        <Link className="stat" href="/admin/orders"><div className="num">{newToday}</div><div className="lbl">New today</div></Link>
        <Link className="stat" href="/admin/orders?status=pending"><div className="num">{awaitingConfirmation}</div><div className="lbl">Awaiting confirmation</div></Link>
        <Link className="stat" href="/admin/orders?payment=paid"><div className="num">{paid}</div><div className="lbl">Paid orders</div></Link>
        <Link className="stat" href="/admin/orders?status=confirmed"><div className="num">{awaitingFulfilment}</div><div className="lbl">Awaiting fulfilment</div></Link>
      </div>

      <h2>Money</h2>
      <div className="stat-grid">
        <div className="stat"><div className="num">{formatNaira(verified - refunded)}</div><div className="lbl">Revenue (verified payments, minus refunds)</div></div>
        <div className="stat"><div className="num">{formatNaira(verified)}</div><div className="lbl">Verified payments received</div></div>
        <div className="stat"><div className="num">{formatNaira(refunded)}</div><div className="lbl">Refunded</div></div>
        <div className="stat"><div className="num">{formatNaira(unpaidValue)}</div><div className="lbl">Unpaid open orders (not revenue)</div></div>
      </div>

      <h2>Products</h2>
      <div className="stat-grid">
        <Link className="stat" href="/admin/products"><div className="num">{products.filter((p) => p.status !== 'archived').length}</div><div className="lbl">Total products</div></Link>
        <Link className="stat" href="/admin/products?status=available"><div className="num">{available.length}</div><div className="lbl">Available</div></Link>
        <Link className="stat" href="/admin/products?status=sold_out"><div className="num">{soldOut.length}</div><div className="lbl">Sold out</div></Link>
        <Link className="stat" href="/admin/products?status=hidden"><div className="num">{hidden.length}</div><div className="lbl">Hidden</div></Link>
      </div>

      <h2>Low stock (at or below {threshold})</h2>
      {(lowVariants ?? []).length === 0 ? (
        <p className="muted">Nothing is running low.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Option</th><th>Left</th></tr></thead>
            <tbody>
              {(lowVariants as unknown as LowVariant[]).map((v) => (
                <tr key={v.id}>
                  <td><Link href={`/admin/products/${v.product.id}`}>{v.product.name}</Link></td>
                  <td>{[v.size, v.colour].filter(Boolean).join(' / ') || 'Standard'}</td>
                  <td>{v.stock === 0 ? <span className="badge badge-sold">0</span> : <span className="badge badge-low">{v.stock}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Recent orders</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Items</th><th>Date</th></tr></thead>
          <tbody>
            {o.slice(0, 8).map((x) => (
              <tr key={x.id}>
                <td><Link href={`/admin/orders/${x.id}`}>{x.reference}</Link></td>
                <td>{x.customer_name}</td>
                <td>{ORDER_STATUS_LABEL[x.order_status]}</td>
                <td>{formatNaira(x.subtotal)}</td>
                <td className="small">{formatDate(x.created_at)}</td>
              </tr>
            ))}
            {o.length === 0 ? <tr><td colSpan={5} className="muted">No orders yet.</td></tr> : null}
          </tbody>
        </table>
      </div>

      <h2>Recent stock changes</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>When</th><th>Product</th><th>Change</th><th>Now</th><th>Why</th></tr></thead>
          <tbody>
            {((movements.data ?? []) as unknown as Movement[]).map((m) => (
              <tr key={m.id}>
                <td className="small">{formatDate(m.created_at)}</td>
                <td>
                  {m.product?.name ?? 'Deleted product'}
                  {m.variant ? <span className="muted small"> {[m.variant.size, m.variant.colour].filter(Boolean).join(' / ')}</span> : null}
                </td>
                <td>{m.change > 0 ? `+${m.change}` : m.change}</td>
                <td>{m.stock_after}</td>
                <td className="small">{m.reason}</td>
              </tr>
            ))}
            {(movements.data ?? []).length === 0 ? <tr><td colSpan={5} className="muted">No stock changes yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
