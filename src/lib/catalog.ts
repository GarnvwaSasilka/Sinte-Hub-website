import 'server-only';
import { cache } from 'react';
import { createPublicClient } from './supabase/server';
import type { CatalogItem, Category } from './types';

export const getCategories = cache(async (): Promise<Category[]> => {
  const { data, error } = await createPublicClient()
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .order('name');
  if (error) console.error('categories', error.message);
  return (data ?? []) as Category[];
});

export interface SearchParams {
  q?: string;
  category?: string;
  min?: string;
  max?: string;
  size?: string;
  colour?: string;
  instock?: string;
  sort?: string;
  page?: string;
}

export const PAGE_SIZE = 24;

function clean(v: string | undefined, max = 60): string | null {
  if (!v) return null;
  const t = v.trim().slice(0, max);
  return t || null;
}
function num(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function searchCatalog(sp: SearchParams) {
  const page = Math.max(1, Math.floor(Number(sp.page) || 1));
  const sort = ['newest', 'featured', 'price_asc', 'price_desc'].includes(sp.sort || '') ? sp.sort! : 'newest';
  const { data, error } = await createPublicClient().rpc('search_products', {
    p_query: clean(sp.q, 80),
    p_category: clean(sp.category),
    p_min_price: num(sp.min),
    p_max_price: num(sp.max),
    p_size: clean(sp.size),
    p_colour: clean(sp.colour),
    p_in_stock: sp.instock === '1',
    p_sort: sort,
    p_limit: PAGE_SIZE + 1,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) console.error('search_products', error.message);
  const rows = (data ?? []) as CatalogItem[];
  return { items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE, page, sort };
}

export async function getCatalogList(filter: 'featured' | 'bestseller' | 'new', limit = 8): Promise<CatalogItem[]> {
  let q = createPublicClient().from('product_catalog').select('*').in('status', ['available', 'sold_out']);
  if (filter === 'featured') q = q.eq('is_featured', true);
  if (filter === 'bestseller') q = q.eq('is_bestseller', true);
  const { data, error } = await q.order('in_stock', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
  if (error) console.error('catalog', error.message);
  return (data ?? []) as CatalogItem[];
}

/** Sizes and colours that exist in the shop, for the filter menus. */
export const getFilterOptions = cache(async () => {
  const { data } = await createPublicClient().from('product_catalog').select('sizes, colours').in('status', ['available', 'sold_out']);
  const sizes = new Set<string>();
  const colours = new Set<string>();
  for (const r of data ?? []) {
    (r.sizes as string[]).forEach((s) => sizes.add(s));
    (r.colours as string[]).forEach((c) => colours.add(c));
  }
  const sortSizes = (a: string, b: string) => {
    const order = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
    const ia = order.indexOf(a.toUpperCase());
    const ib = order.indexOf(b.toUpperCase());
    if (ia >= 0 && ib >= 0) return ia - ib;
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.localeCompare(b);
  };
  return { sizes: [...sizes].sort(sortSizes), colours: [...colours].sort() };
});
