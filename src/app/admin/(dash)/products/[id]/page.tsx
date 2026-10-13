import Link from 'next/link';
import { notFound } from 'next/navigation';
import ImageManager from '@/components/admin/ImageManager';
import ProductEditor from '@/components/admin/ProductEditor';
import ProductActions from '@/components/admin/ProductActions';
import { requireAdmin } from '@/lib/auth';
import type { Product, ProductImage, Variant } from '@/lib/types';

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: product }, { data: variants }, { data: images }, { data: categories }] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).maybeSingle(),
    supabase.from('product_variants').select('*').eq('product_id', id).order('sort_order'),
    supabase.from('product_images').select('*').eq('product_id', id).order('sort_order'),
    supabase.from('categories').select('id, name').order('sort_order'),
  ]);
  if (!product) notFound();
  const p = product as Product;

  return (
    <div className="stack">
      <Link href="/admin/products" className="small">← All products</Link>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>{p.name}</h1>
        {p.status === 'available' || p.status === 'sold_out' ? (
          <Link href={`/product/${p.slug}`} target="_blank" className="small">
            View in shop ↗
          </Link>
        ) : null}
      </div>
      {created ? <p className="alert alert-success">Product created. Now add some photos below.</p> : null}
      <ImageManager productId={p.id} productName={p.name} images={(images ?? []) as ProductImage[]} />
      <ProductEditor product={p} variants={(variants ?? []) as Variant[]} categories={categories ?? []} />
      <ProductActions id={p.id} status={p.status} name={p.name} />
    </div>
  );
}
