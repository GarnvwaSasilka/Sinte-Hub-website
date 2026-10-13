import Link from 'next/link';
import ProductEditor from '@/components/admin/ProductEditor';
import { requireAdmin } from '@/lib/auth';

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  const { data: categories } = await supabase.from('categories').select('id, name').order('sort_order');
  return (
    <div className="stack">
      <Link href="/admin/products" className="small">← All products</Link>
      <h1>Add a product</h1>
      <p className="muted">Fill in the details and stock first. You can add photos after you create it.</p>
      <ProductEditor categories={categories ?? []} />
    </div>
  );
}
