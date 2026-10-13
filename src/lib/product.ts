import 'server-only';
import { cache } from 'react';
import { createPublicClient } from './supabase/server';
import type { Category, Product, ProductImage, Variant } from './types';

export type ProductDetail = Product & {
  category: Pick<Category, 'name' | 'slug'> | null;
  product_variants: Variant[];
  product_images: ProductImage[];
};

export const getProductBySlug = cache(async (slug: string): Promise<ProductDetail | null> => {
  const { data, error } = await createPublicClient()
    .from('products')
    .select('*, category:categories(name, slug), product_variants(*), product_images(*)')
    .eq('slug', slug)
    .in('status', ['available', 'sold_out'])
    .maybeSingle();
  if (error) console.error('product', error.message);
  if (!data) return null;
  const p = data as unknown as ProductDetail;
  p.product_variants = (p.product_variants ?? []).filter((v) => v.is_active).sort((a, b) => a.sort_order - b.sort_order);
  p.product_images = (p.product_images ?? []).sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  );
  return p;
});
