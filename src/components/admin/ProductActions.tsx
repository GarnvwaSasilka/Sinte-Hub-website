'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteProduct, duplicateProduct, setProductStatus } from '@/app/admin/(dash)/products/actions';
import ConfirmButton from './ConfirmButton';
import type { ProductStatus } from '@/lib/types';

export default function ProductActions({ id, status, name }: { id: string; status: ProductStatus; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="danger-zone stack">
      <h2 style={{ marginTop: 0 }}>More actions</h2>
      <div className="row">
        <button
          type="button"
          className="btn btn-outline btn-small"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await duplicateProduct(id);
              if (res.error) setError(res.error);
              else if (res.id) router.push(`/admin/products/${res.id}`);
            })
          }
        >
          Duplicate (as hidden, stock 0)
        </button>
        {status !== 'archived' ? (
          <ConfirmButton
            className="btn btn-outline btn-small"
            label="Archive"
            confirmText={`Archive "${name}"? It will be hidden from the shop. You can restore it later by changing its status.`}
            action={() => setProductStatus(id, 'archived')}
            onDone={() => router.refresh()}
          />
        ) : null}
        <ConfirmButton
          label="Delete permanently"
          confirmText={`Permanently delete "${name}" and all its photos? Past orders keep their details, but this cannot be undone. Tip: Archive instead if you might sell it again.`}
          action={() => deleteProduct(id)}
          onDone={() => router.push('/admin/products')}
        />
      </div>
      {error ? <p className="alert alert-error">{error}</p> : null}
    </section>
  );
}
