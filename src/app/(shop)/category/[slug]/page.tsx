import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ShopView from '@/components/ShopView';
import { getCategories, type SearchParams } from '@/lib/catalog';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = (await getCategories()).find((c) => c.slug === slug);
  if (!cat) return { title: 'Category not found' };
  return {
    title: cat.name,
    description: cat.description || `Shop ${cat.name} at Sinte's Hub.`,
    alternates: { canonical: `/category/${cat.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const cat = (await getCategories()).find((c) => c.slug === slug);
  if (!cat) notFound();
  return <ShopView sp={await searchParams} fixedCategory={cat.slug} title={cat.name} />;
}
