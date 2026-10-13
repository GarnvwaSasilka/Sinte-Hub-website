import type { Metadata } from 'next';
import Link from 'next/link';
import { getCategories } from '@/lib/catalog';

export const revalidate = 60;
export const metadata: Metadata = { title: 'Categories' };

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <div className="container">
      <div className="page-head">
        <h1>Categories</h1>
        <hr className="divider" />
      </div>
      <div className="category-tiles">
        {categories.map((c) => (
          <Link key={c.id} href={`/category/${c.slug}`} className="category-tile">
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
