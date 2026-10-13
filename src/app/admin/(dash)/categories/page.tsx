import CategoryManager from '@/components/admin/CategoryManager';
import { requireAdmin } from '@/lib/auth';
import type { Category } from '@/lib/types';

export default async function CategoriesAdminPage() {
  const { supabase } = await requireAdmin();
  const [{ data: cats }, { data: counts }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order').order('name'),
    supabase.from('products').select('category_id').neq('status', 'archived'),
  ]);
  const countBy: Record<string, number> = {};
  (counts ?? []).forEach((p) => {
    if (p.category_id) countBy[p.category_id] = (countBy[p.category_id] ?? 0) + 1;
  });
  return (
    <div className="stack">
      <h1>Categories</h1>
      <p className="muted">Lower &ldquo;order&rdquo; numbers appear first. Turn a category off to hide it from the shop menu.</p>
      <CategoryManager categories={(cats ?? []) as Category[]} counts={countBy} />
    </div>
  );
}
