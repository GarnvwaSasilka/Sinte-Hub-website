import { createAuthClient } from '@/lib/supabase/server';
import { toCsv } from '@/lib/backup-format.mjs';
import { ordersQuery, type OrderFilters } from '@/lib/orders-query';

export const dynamic = 'force-dynamic';

// GET /admin/orders/export: the filtered orders list as a CSV file. Admin only.
export async function GET(request: Request) {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('Please log in.', { status: 401 });
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) return new Response('Only the store admin can export orders.', { status: 403 });

  const sp = Object.fromEntries(new URL(request.url).searchParams) as OrderFilters;
  const { data, error } = await ordersQuery(supabase, sp, '*, order_items(product_name, variant_label, quantity, unit_price)').limit(5000);
  if (error) return new Response('Export failed. Please try again.', { status: 500 });

  type Row = Record<string, unknown> & { order_items: { product_name: string; variant_label: string | null; quantity: number; unit_price: number }[] };
  const rows = ((data ?? []) as unknown as Row[]).map(({ order_items, ...o }) => ({
    ...o,
    items: order_items.map((i) => `${i.quantity} x ${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ''} @ ${i.unit_price}`).join('; '),
  }));
  const date = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sintes-hub-orders-${date}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
