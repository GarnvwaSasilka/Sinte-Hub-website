import type { SupabaseClient } from '@supabase/supabase-js';

export type OrderFilters = { status?: string; payment?: string; from?: string; to?: string; q?: string };

const STATUSES = ['pending', 'confirmed', 'processing', 'ready_for_pickup', 'dispatched', 'delivered', 'collected', 'cancelled'];
const PAYMENTS = ['unpaid', 'paid', 'refunded'];

/** Builds the filtered orders query used by the list page and the CSV export. */
export function ordersQuery(supabase: SupabaseClient, f: OrderFilters, columns = '*') {
  let q = supabase.from('orders').select(columns);
  if (f.status && STATUSES.includes(f.status)) q = q.eq('order_status', f.status);
  if (f.payment && PAYMENTS.includes(f.payment)) q = q.eq('payment_status', f.payment);
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) q = q.gte('created_at', `${f.from}T00:00:00+01:00`);
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) q = q.lte('created_at', `${f.to}T23:59:59+01:00`);
  const term = (f.q || '').replace(/[^\p{L}\p{N}\s\-+]/gu, '').trim().slice(0, 60);
  if (term) q = q.or(`reference.ilike.%${term}%,customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`);
  return q.order('created_at', { ascending: false });
}
