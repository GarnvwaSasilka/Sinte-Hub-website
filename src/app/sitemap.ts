import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/env';
import { createPublicClient } from '@/lib/supabase/server';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL();
  const supabase = createPublicClient();
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from('products').select('slug, updated_at').in('status', ['available', 'sold_out']).limit(5000),
    supabase.from('categories').select('slug, updated_at').eq('is_active', true),
  ]);
  const pages = ['', '/shop', '/categories', '/about', '/contact', '/faq', '/size-guide', '/delivery', '/returns', '/privacy', '/terms'];
  return [
    ...pages.map((p) => ({ url: `${base}${p}` })),
    ...(categories ?? []).map((c) => ({ url: `${base}/category/${c.slug}`, lastModified: c.updated_at })),
    ...(products ?? []).map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updated_at })),
  ];
}
