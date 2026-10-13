'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveProduct, type ProductInput, type VariantInput } from '@/app/admin/(dash)/products/actions';
import { slugify } from '@/lib/format';
import type { Category, Product, Variant } from '@/lib/types';

const emptyVariant = (): VariantInput => ({ size: '', colour: '', sku: '', stock: 0, price: '', is_active: true });

export default function ProductEditor({
  product,
  variants,
  categories,
}: {
  product?: Product;
  variants?: Variant[];
  categories: Pick<Category, 'id' | 'name'>[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [form, setForm] = useState({
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    category_id: product?.category_id ?? '',
    price: product?.price?.toString() ?? '',
    sale_price: product?.sale_price?.toString() ?? '',
    sku: product?.sku ?? '',
    status: product?.status ?? 'available',
    is_featured: product?.is_featured ?? false,
    is_bestseller: product?.is_bestseller ?? false,
    material: product?.material ?? '',
    care_instructions: product?.care_instructions ?? '',
    fit_notes: product?.fit_notes ?? '',
    unit_of_sale: product?.unit_of_sale ?? 'piece',
    min_order_qty: product?.min_order_qty?.toString() ?? '1',
    tags: product?.tags ?? '',
  });
  const [rows, setRows] = useState<VariantInput[]>(
    variants && variants.length
      ? variants.map((v) => ({
          id: v.id,
          size: v.size ?? '',
          colour: v.colour ?? '',
          sku: v.sku ?? '',
          stock: v.stock,
          price: v.price?.toString() ?? '',
          is_active: v.is_active,
        }))
      : [emptyVariant()],
  );

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setSaved(false);
    setForm((f) => {
      const next = { ...f, [k]: value };
      if (k === 'name' && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
  };
  const setRow = (i: number, k: keyof VariantInput, value: string | boolean) => {
    setSaved(false);
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [k]: value } : row)));
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const input: ProductInput = { ...form, id: product?.id, status: form.status as ProductInput['status'], variants: rows };
      const res = await saveProduct(input);
      if (res.error) {
        setError(res.error);
        if (res.id && !product) router.replace(`/admin/products/${res.id}`);
        return;
      }
      setSaved(true);
      if (!product && res.id) router.replace(`/admin/products/${res.id}?created=1`);
      else router.refresh();
    });
  }

  const totalStock = rows.reduce((n, r) => n + (Number(r.stock) || 0), 0);

  return (
    <form onSubmit={onSubmit} className="stack">
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Details</h2>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="p-name">Product name</label>
            <input id="p-name" type="text" value={form.name} onChange={set('name')} required maxLength={150} />
          </div>
          <div className="field">
            <label htmlFor="p-cat">Category</label>
            <select id="p-cat" value={form.category_id} onChange={set('category_id')}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="p-status">Status</label>
            <select id="p-status" value={form.status} onChange={set('status')}>
              <option value="available">Available: shown and can be bought</option>
              <option value="sold_out">Sold out: shown, cannot be bought</option>
              <option value="hidden">Hidden: not shown in the shop</option>
              <option value="archived">Archived: hidden and moved out of the way</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="p-price">Price (₦)</label>
            <input id="p-price" type="number" min={0} step="0.01" value={form.price} onChange={set('price')} required />
          </div>
          <div className="field">
            <label htmlFor="p-sale">
              Sale price (₦) <span className="hint">optional, must be lower</span>
            </label>
            <input id="p-sale" type="number" min={0} step="0.01" value={form.sale_price} onChange={set('sale_price')} />
          </div>
          <div className="field">
            <label htmlFor="p-sku">
              SKU / product code <span className="hint">optional</span>
            </label>
            <input id="p-sku" type="text" value={form.sku} onChange={set('sku')} maxLength={60} />
          </div>
          <div className="field">
            <label htmlFor="p-slug">
              Web address <span className="hint">/product/…</span>
            </label>
            <input
              id="p-slug"
              type="text"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set('slug')(e);
              }}
              onBlur={() => setForm((f) => ({ ...f, slug: slugify(f.slug || f.name) }))}
            />
          </div>
          <div className="field">
            <label htmlFor="p-unit">
              Sold per <span className="hint">e.g. piece, pair, yard, metre</span>
            </label>
            <input id="p-unit" type="text" value={form.unit_of_sale} onChange={set('unit_of_sale')} maxLength={30} />
          </div>
          <div className="field">
            <label htmlFor="p-min">Minimum order quantity</label>
            <input id="p-min" type="number" min={1} max={999} value={form.min_order_qty} onChange={set('min_order_qty')} />
          </div>
          <div className="field full">
            <label htmlFor="p-desc">Description</label>
            <textarea id="p-desc" value={form.description} onChange={set('description')} maxLength={5000} />
          </div>
          <div className="field">
            <label htmlFor="p-material">Material</label>
            <input id="p-material" type="text" value={form.material} onChange={set('material')} maxLength={200} />
          </div>
          <div className="field">
            <label htmlFor="p-tags">
              Search keywords <span className="hint">help customers find it</span>
            </label>
            <input id="p-tags" type="text" value={form.tags} onChange={set('tags')} maxLength={500} />
          </div>
          <div className="field">
            <label htmlFor="p-care">Care instructions</label>
            <textarea id="p-care" value={form.care_instructions} onChange={set('care_instructions')} maxLength={1000} style={{ minHeight: 70 }} />
          </div>
          <div className="field">
            <label htmlFor="p-fit">Fit notes</label>
            <textarea id="p-fit" value={form.fit_notes} onChange={set('fit_notes')} maxLength={1000} style={{ minHeight: 70 }} />
          </div>
          <div className="field row">
            <label className="checkbox">
              <input type="checkbox" checked={form.is_featured} onChange={set('is_featured')} /> Featured on home page
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={form.is_bestseller} onChange={set('is_bestseller')} /> Bestseller
            </label>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Sizes, colours and stock</h2>
        <p className="small muted">
          Add one row for each size/colour combination and how many you have. If the item has no sizes or colours, keep one row with
          both empty. Leave &ldquo;Price&rdquo; empty to use the product price. Total stock: <strong>{totalStock}</strong>
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Size</th>
                <th>Colour</th>
                <th>Stock</th>
                <th>Price ₦</th>
                <th>SKU</th>
                <th>On sale</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id ?? `new-${i}`}>
                  <td><input aria-label="Size" type="text" value={r.size} onChange={(e) => setRow(i, 'size', e.target.value)} style={{ minWidth: 70 }} /></td>
                  <td><input aria-label="Colour" type="text" value={r.colour} onChange={(e) => setRow(i, 'colour', e.target.value)} style={{ minWidth: 90 }} /></td>
                  <td><input aria-label="Stock" type="number" min={0} value={r.stock} onChange={(e) => setRow(i, 'stock', e.target.value)} style={{ width: 80 }} /></td>
                  <td><input aria-label="Option price" type="number" min={0} step="0.01" value={r.price} onChange={(e) => setRow(i, 'price', e.target.value)} style={{ width: 100 }} /></td>
                  <td><input aria-label="Option SKU" type="text" value={r.sku} onChange={(e) => setRow(i, 'sku', e.target.value)} style={{ minWidth: 90 }} /></td>
                  <td><input aria-label="Option on sale" type="checkbox" checked={r.is_active} onChange={(e) => setRow(i, 'is_active', e.target.checked)} /></td>
                  <td>
                    <button
                      type="button"
                      className="link-button small"
                      onClick={() => {
                        if (rows.length === 1) return;
                        if (r.id && !window.confirm('Remove this option? Its stock count will be deleted.')) return;
                        setRows((all) => all.filter((_, j) => j !== i));
                      }}
                      disabled={rows.length === 1}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="btn btn-outline btn-small" style={{ marginTop: 10 }} onClick={() => setRows((r) => [...r, emptyVariant()])}>
          + Add option
        </button>
      </section>

      {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
      {saved ? <p className="alert alert-success" role="status">Saved. The shop updates within a minute.</p> : null}
      <div className="row">
        <button className="btn btn-gold" disabled={pending}>
          {pending ? 'Saving…' : product ? 'Save changes' : 'Create product'}
        </button>
      </div>
    </form>
  );
}
