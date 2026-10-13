import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { formatNaira } from '@/lib/format';
import type { CatalogItem } from '@/lib/types';

type SP = { q?: string; status?: string; category?: string; sort?: string };

export default async function ProductsAdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: cats }, { data: settings }] = await Promise.all([
    supabase.from('categories').select('id, name').order('sort_order'),
    supabase.from('store_settings').select('low_stock_threshold').eq('id', 1).single(),
  ]);

  let q = supabase.from('product_catalog').select('*');
  if (sp.status === 'archived') q = q.eq('status', 'archived');
  else if (sp.status === 'sold_out') q = q.or('status.eq.sold_out,and(status.eq.available,total_stock.lte.0)');
  else if (sp.status === 'available') q = q.eq('status', 'available').gt('total_stock', 0);
  else if (sp.status === 'hidden') q = q.eq('status', 'hidden');
  else q = q.neq('status', 'archived');
  if (sp.category) q = q.eq('category_id', sp.category);
  const term = (sp.q || '').replace(/[^\p{L}\p{N}\s\-]/gu, '').trim().slice(0, 60);
  if (term) q = q.or(`name.ilike.%${term}%,sku.ilike.%${term}%,tags.ilike.%${term}%`);
  if (sp.sort === 'name') q = q.order('name');
  else if (sp.sort === 'price') q = q.order('effective_price');
  else if (sp.sort === 'stock') q = q.order('total_stock');
  else q = q.order('created_at', { ascending: false });
  const { data, error } = await q.limit(500);
  const items = (data ?? []) as CatalogItem[];
  const low = settings?.low_stock_threshold ?? 3;

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Products</h1>
        <Link href="/admin/products/new" className="btn btn-gold">
          + Add product
        </Link>
      </div>
      <form className="row card" method="get">
        <input type="search" name="q" placeholder="Search name, SKU or keyword" defaultValue={sp.q ?? ''} style={{ flex: '2 1 200px' }} />
        <select name="status" defaultValue={sp.status ?? ''} style={{ flex: '1 1 140px' }}>
          <option value="">All (not archived)</option>
          <option value="available">Available</option>
          <option value="sold_out">Sold out</option>
          <option value="hidden">Hidden</option>
          <option value="archived">Archived</option>
        </select>
        <select name="category" defaultValue={sp.category ?? ''} style={{ flex: '1 1 140px' }}>
          <option value="">All categories</option>
          {(cats ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sp.sort ?? ''} style={{ flex: '1 1 120px' }}>
          <option value="">Newest</option>
          <option value="name">Name</option>
          <option value="price">Price</option>
          <option value="stock">Lowest stock</option>
        </select>
        <button className="btn btn-small">Filter</button>
      </form>
      {error ? <p className="alert alert-error">Could not load products.</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/products/${p.id}`} style={{ fontWeight: 600 }}>
                    {p.name}
                  </Link>
                  {p.sku ? <div className="small muted">{p.sku}</div> : null}
                </td>
                <td className="small">{p.category_name ?? '—'}</td>
                <td>
                  {formatNaira(p.effective_price)}
                  {p.sale_price != null ? <div className="small muted">on sale</div> : null}
                </td>
                <td>
                  {p.total_stock <= 0 ? (
                    <span className="badge badge-sold">0</span>
                  ) : p.total_stock <= low ? (
                    <span className="badge badge-low">{p.total_stock}</span>
                  ) : (
                    p.total_stock
                  )}
                </td>
                <td>
                  <StatusBadge status={p.status} stock={p.total_stock} />
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No products found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status, stock }: { status: string; stock: number }) {
  if (status === 'hidden') return <span className="badge badge-hidden">Hidden</span>;
  if (status === 'archived') return <span className="badge badge-hidden">Archived</span>;
  if (status === 'sold_out' || stock <= 0) return <span className="badge badge-sold">Sold out</span>;
  return <span className="badge badge-ok">Available</span>;
}
