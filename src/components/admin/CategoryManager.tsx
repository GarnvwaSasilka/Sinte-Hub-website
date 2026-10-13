'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteCategory, saveCategory, type CategoryInput } from '@/app/admin/(dash)/categories/actions';
import type { Category } from '@/lib/types';

function Row({ cat, count, onSaved }: { cat?: Category; count?: number; onSaved: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [f, setF] = useState<CategoryInput>({
    id: cat?.id,
    name: cat?.name ?? '',
    slug: cat?.slug ?? '',
    description: cat?.description ?? '',
    sort_order: cat?.sort_order ?? 0,
    is_active: cat?.is_active ?? true,
  });
  const save = () =>
    start(async () => {
      setError(null);
      const res = await saveCategory(f);
      if (res.error) setError(res.error);
      else {
        setOk(true);
        if (!cat) setF({ name: '', slug: '', description: '', sort_order: 0, is_active: true });
        onSaved();
      }
    });
  return (
    <tr>
      <td><input aria-label="Name" type="text" value={f.name} onChange={(e) => { setOk(false); setF({ ...f, name: e.target.value }); }} placeholder={cat ? '' : 'New category name'} /></td>
      <td><input aria-label="Web address" type="text" value={f.slug} onChange={(e) => { setOk(false); setF({ ...f, slug: e.target.value }); }} placeholder="auto" /></td>
      <td><input aria-label="Order" type="number" value={f.sort_order} onChange={(e) => { setOk(false); setF({ ...f, sort_order: e.target.value }); }} style={{ width: 70 }} /></td>
      <td><input aria-label="Shown in shop" type="checkbox" checked={f.is_active} onChange={(e) => { setOk(false); setF({ ...f, is_active: e.target.checked }); }} /></td>
      <td className="small">{cat ? count ?? 0 : ''}</td>
      <td>
        <div className="row" style={{ gap: 6 }}>
          <button type="button" className="btn btn-small" disabled={pending} onClick={save}>{cat ? 'Save' : 'Add'}</button>
          {cat ? (
            <button
              type="button"
              className="btn btn-danger btn-small"
              disabled={pending}
              onClick={() => {
                if (!window.confirm(`Delete "${cat.name}"? Its ${count ?? 0} products will stay, but without a category.`)) return;
                start(async () => {
                  const res = await deleteCategory(cat.id);
                  if (res.error) setError(res.error);
                  else onSaved();
                });
              }}
            >
              Delete
            </button>
          ) : null}
          {ok ? <span className="small" style={{ color: 'var(--success)' }}>Saved</span> : null}
        </div>
        {error ? <div className="small" style={{ color: 'var(--danger)' }}>{error}</div> : null}
      </td>
    </tr>
  );
}

export default function CategoryManager({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  const router = useRouter();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Name</th><th>Web address</th><th>Order</th><th>Shown</th><th>Products</th><th></th></tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <Row key={c.id} cat={c} count={counts[c.id]} onSaved={() => router.refresh()} />
          ))}
          <Row onSaved={() => router.refresh()} />
        </tbody>
      </table>
    </div>
  );
}
