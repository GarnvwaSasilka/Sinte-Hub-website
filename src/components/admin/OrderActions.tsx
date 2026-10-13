'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  changeOrderStatus,
  deleteCancelledOrder,
  recordPayment,
  recordRefund,
  saveAdminNotes,
  setDeliveryFee,
} from '@/app/admin/(dash)/orders/actions';
import { formatNaira, NEXT_STATUSES, ORDER_STATUS_LABEL } from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/types';

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Confirm order',
  processing: 'Mark processing',
  ready_for_pickup: 'Ready for pickup',
  dispatched: 'Mark dispatched',
  delivered: 'Mark delivered',
  collected: 'Mark collected',
};

export default function OrderActions({ order, total }: { order: Order; total: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function run(fn: () => Promise<{ error?: string }>, success: string) {
    setError(null);
    setOk(null);
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        setOk(success);
        router.refresh();
      }
    });
  }

  const next = NEXT_STATUSES[order.order_status].filter((s) => {
    if (s === 'ready_for_pickup' || s === 'collected') return order.fulfilment_method === 'pickup';
    if (s === 'dispatched' || s === 'delivered') return order.fulfilment_method === 'delivery';
    return true;
  });
  const needsFee = order.fulfilment_method === 'delivery' && order.order_status === 'pending';

  return (
    <aside className="stack">
      {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
      {ok ? <p className="alert alert-success" role="status">{ok}</p> : null}

      {needsFee ? (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            const fee = String(new FormData(e.currentTarget).get('fee'));
            run(() => setDeliveryFee(order.id, fee), 'Delivery fee saved.');
          }}
        >
          <h3 style={{ marginTop: 0 }}>1. Agree the delivery fee</h3>
          <p className="small muted">Agree the fee with the customer on WhatsApp, then enter it here. It locks once you confirm the order.</p>
          <div className="row">
            <input name="fee" type="number" min={0} step="0.01" defaultValue={order.delivery_fee ?? ''} placeholder="₦" style={{ flex: 1 }} required />
            <button className="btn btn-small" disabled={pending}>Save fee</button>
          </div>
        </form>
      ) : null}

      {next.length > 0 ? (
        <section className="card stack">
          <h3 style={{ marginTop: 0 }}>{needsFee ? '2. ' : ''}Update order status</h3>
          <p className="small muted">Now: {ORDER_STATUS_LABEL[order.order_status]}</p>
          <div className="row">
            {next
              .filter((s) => s !== 'cancelled')
              .map((s) => (
                <button
                  key={s}
                  type="button"
                  className="btn btn-small"
                  disabled={pending}
                  onClick={() => run(() => changeOrderStatus(order.id, s), `Order marked "${ORDER_STATUS_LABEL[s]}".`)}
                >
                  {ACTION_LABEL[s] ?? ORDER_STATUS_LABEL[s]}
                </button>
              ))}
          </div>
          {next.includes('cancelled') ? (
            <details>
              <summary className="small">Cancel this order</summary>
              <form
                className="stack"
                style={{ marginTop: 8 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const reason = String(new FormData(e.currentTarget).get('reason'));
                  if (!window.confirm('Cancel this order? The items go back into stock. This cannot be undone.')) return;
                  run(() => changeOrderStatus(order.id, 'cancelled', reason), 'Order cancelled and stock put back.');
                }}
              >
                <textarea name="reason" required placeholder="Reason (e.g. customer changed their mind)" maxLength={1000} style={{ minHeight: 60 }} />
                <button className="btn btn-danger btn-small" disabled={pending}>Cancel order</button>
              </form>
            </details>
          ) : null}
        </section>
      ) : null}

      {order.payment_status === 'unpaid' && order.order_status !== 'cancelled' ? (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (!window.confirm('Only record a payment after you have checked it arrived in your bank account. Continue?')) return;
            run(() => recordPayment(order.id, String(f.get('amount')), String(f.get('ref')), String(f.get('note'))), 'Payment recorded. Order marked paid.');
          }}
        >
          <h3 style={{ marginTop: 0 }}>Record a payment</h3>
          <p className="small muted">Do this only after you have seen the money in your account. Opening WhatsApp is not payment.</p>
          <div className="field">
            <label htmlFor="pay-amount">Amount received (₦)</label>
            <input id="pay-amount" name="amount" type="number" min={1} step="0.01" defaultValue={total || ''} required />
          </div>
          <div className="field">
            <label htmlFor="pay-ref">Bank / transfer reference <span className="hint">optional</span></label>
            <input id="pay-ref" name="ref" type="text" maxLength={200} />
          </div>
          <div className="field">
            <label htmlFor="pay-note">Note <span className="hint">optional</span></label>
            <input id="pay-note" name="note" type="text" maxLength={1000} />
          </div>
          <button className="btn btn-small" disabled={pending}>Record verified payment</button>
        </form>
      ) : null}

      {order.payment_status === 'paid' ? (
        <details className="card">
          <summary>Record a refund</summary>
          <form
            style={{ marginTop: 10 }}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (!window.confirm('Record this refund? It will be taken off your revenue.')) return;
              run(() => recordRefund(order.id, String(f.get('amount')), String(f.get('note'))), 'Refund recorded.');
            }}
          >
            <div className="field">
              <label htmlFor="ref-amount">Amount refunded (₦)</label>
              <input id="ref-amount" name="amount" type="number" min={1} step="0.01" required />
            </div>
            <div className="field">
              <label htmlFor="ref-note">Reason</label>
              <input id="ref-note" name="note" type="text" maxLength={1000} />
            </div>
            <button className="btn btn-danger btn-small" disabled={pending}>Record refund</button>
          </form>
        </details>
      ) : null}

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveAdminNotes(order.id, String(new FormData(e.currentTarget).get('notes'))), 'Notes saved.');
        }}
      >
        <h3 style={{ marginTop: 0 }}>Private notes</h3>
        <p className="small muted">Only you can see these.</p>
        <textarea name="notes" defaultValue={order.admin_notes ?? ''} maxLength={5000} />
        <button className="btn btn-outline btn-small" style={{ marginTop: 8 }} disabled={pending}>Save notes</button>
      </form>

      <section className="card small">
        <strong>Amount due:</strong>{' '}
        {order.fulfilment_method === 'delivery' && order.delivery_fee == null ? 'waiting for delivery fee' : formatNaira(total)}
      </section>

      {order.order_status === 'cancelled' ? (
        <button
          type="button"
          className="btn btn-danger btn-small"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Permanently delete cancelled order ${order.reference}? Download a backup first if you may need it.`)) return;
            start(async () => {
              const res = await deleteCancelledOrder(order.id);
              if (res.error) setError(res.error);
              else router.push('/admin/orders');
            });
          }}
        >
          Delete this cancelled order
        </button>
      ) : null}
    </aside>
  );
}
