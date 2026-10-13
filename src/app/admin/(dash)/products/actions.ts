'use server';

import { revalidatePath } from 'next/cache';
import { adminOrError } from '@/lib/auth';
import { friendlyError } from '@/lib/admin-errors';
import { IMAGE_BUCKET } from '@/lib/env';
import { slugify } from '@/lib/format';
import type { ProductStatus } from '@/lib/types';

export interface VariantInput {
  id?: string;
  size: string;
  colour: string;
  sku: string;
  stock: number | string;
  price: number | string;
  is_active: boolean;
}

export interface ProductInput {
  id?: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  price: number | string;
  sale_price: number | string;
  sku: string;
  status: ProductStatus;
  is_featured: boolean;
  is_bestseller: boolean;
  material: string;
  care_instructions: string;
  fit_notes: string;
  unit_of_sale: string;
  min_order_qty: number | string;
  tags: string;
  variants: VariantInput[];
}

const text = (v: unknown, max: number) => {
  const t = typeof v === 'string' ? v.trim().slice(0, max) : '';
  return t === '' ? null : t;
};
const money = (v: unknown) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
};
const STATUSES: ProductStatus[] = ['available', 'sold_out', 'hidden', 'archived'];

function refreshShop() {
  revalidatePath('/', 'layout');
}

export async function saveProduct(input: ProductInput): Promise<{ id?: string; error?: string }> {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  const { supabase } = auth;

  const name = text(input.name, 150);
  if (!name) return { error: 'Please enter a product name.' };
  const price = money(input.price);
  if (price === null || Number.isNaN(price)) return { error: 'Please enter a valid price.' };
  const sale = money(input.sale_price);
  if (Number.isNaN(sale)) return { error: 'Please enter a valid sale price, or leave it empty.' };
  if (sale !== null && sale >= price) return { error: 'The sale price must be lower than the normal price.' };
  const minQty = Math.floor(Number(input.min_order_qty) || 1);
  if (minQty < 1 || minQty > 999) return { error: 'Minimum order must be between 1 and 999.' };
  if (!STATUSES.includes(input.status)) return { error: 'Please choose a status.' };

  const variants = (input.variants ?? []).map((v) => ({
    id: v.id || undefined,
    size: text(v.size, 40),
    colour: text(v.colour, 40),
    sku: text(v.sku, 60),
    stock: Math.floor(Number(v.stock)),
    price: money(v.price),
    is_active: !!v.is_active,
  }));
  if (variants.length === 0) return { error: 'Add at least one option (size/colour) with a stock quantity.' };
  for (const v of variants) {
    if (!Number.isFinite(v.stock) || v.stock < 0) return { error: 'Stock must be a whole number, 0 or more.' };
    if (Number.isNaN(v.price)) return { error: 'Option prices must be numbers, or left empty.' };
  }

  const row = {
    name,
    slug: slugify(input.slug || name) || slugify(name),
    description: text(input.description, 5000),
    category_id: input.category_id || null,
    price,
    sale_price: sale,
    sku: text(input.sku, 60),
    status: input.status,
    is_featured: !!input.is_featured,
    is_bestseller: !!input.is_bestseller,
    material: text(input.material, 200),
    care_instructions: text(input.care_instructions, 1000),
    fit_notes: text(input.fit_notes, 1000),
    unit_of_sale: text(input.unit_of_sale, 30) ?? 'piece',
    min_order_qty: minQty,
    tags: text(input.tags, 500),
  };

  let id = input.id;
  if (id) {
    const { error } = await supabase.from('products').update(row).eq('id', id);
    if (error) return { error: friendlyError(error) };
  } else {
    const { data, error } = await supabase.from('products').insert(row).select('id').single();
    if (error) return { error: friendlyError(error) };
    id = data.id as string;
  }

  // Options (variants): delete removed ones, update existing, add new.
  const { data: existing } = await supabase.from('product_variants').select('id').eq('product_id', id);
  const keep = new Set(variants.filter((v) => v.id).map((v) => v.id));
  const toDelete = (existing ?? []).map((e) => e.id as string).filter((x) => !keep.has(x));
  if (toDelete.length) {
    const { error } = await supabase.from('product_variants').delete().in('id', toDelete);
    if (error) return { id, error: friendlyError(error) };
  }
  for (const [i, v] of variants.entries()) {
    const values = { size: v.size, colour: v.colour, sku: v.sku, stock: v.stock, price: v.price, is_active: v.is_active, sort_order: i };
    const { error } = v.id
      ? await supabase.from('product_variants').update(values).eq('id', v.id).eq('product_id', id)
      : await supabase.from('product_variants').insert({ ...values, product_id: id });
    if (error) return { id, error: friendlyError(error) };
  }

  refreshShop();
  return { id };
}

export async function setProductStatus(id: string, status: ProductStatus) {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  if (!STATUSES.includes(status)) return { error: 'Unknown status.' };
  const { error } = await auth.supabase.from('products').update({ status }).eq('id', id);
  if (error) return { error: friendlyError(error) };
  refreshShop();
  revalidatePath('/admin/products');
  return {};
}

export async function duplicateProduct(id: string): Promise<{ id?: string; error?: string }> {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  const { supabase } = auth;
  const { data: p, error } = await supabase.from('products').select('*, product_variants(*)').eq('id', id).single();
  if (error || !p) return { error: friendlyError(error, 'Product not found.') };

  const suffix = Math.random().toString(36).slice(2, 6);
  const { id: _id, created_at: _c, updated_at: _u, product_variants, ...rest } = p;
  const { data: copy, error: e2 } = await supabase
    .from('products')
    .insert({ ...rest, name: `${p.name} (copy)`, slug: `${p.slug}-copy-${suffix}`.slice(0, 90), sku: null, status: 'hidden' })
    .select('id')
    .single();
  if (e2 || !copy) return { error: friendlyError(e2) };
  const variants = (product_variants as { size: string | null; colour: string | null; price: number | null; sort_order: number; is_active: boolean }[]).map((v) => ({
    product_id: copy.id,
    size: v.size,
    colour: v.colour,
    price: v.price,
    sort_order: v.sort_order,
    is_active: v.is_active,
    stock: 0,
    sku: null,
  }));
  if (variants.length) await supabase.from('product_variants').insert(variants);
  return { id: copy.id };
}

export async function deleteProduct(id: string) {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  const { supabase } = auth;
  const { data: images } = await supabase.from('product_images').select('path, thumb_path').eq('product_id', id);
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return { error: friendlyError(error) };
  const files = (images ?? []).flatMap((i) => [i.path, i.thumb_path]).filter(Boolean) as string[];
  if (files.length) await supabase.storage.from(IMAGE_BUCKET).remove(files);
  refreshShop();
  revalidatePath('/admin/products');
  return {};
}

// ----------------------------- photos -----------------------------

export async function addProductImage(productId: string, path: string, thumbPath: string, alt: string) {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  const { supabase } = auth;
  if (!path.startsWith(`products/${productId}/`) || !thumbPath.startsWith(`products/${productId}/`)) {
    return { error: 'Unexpected photo location.' };
  }
  const { data: current } = await supabase.from('product_images').select('id, is_primary, sort_order').eq('product_id', productId);
  const hasPrimary = (current ?? []).some((c) => c.is_primary);
  const nextOrder = Math.max(-1, ...(current ?? []).map((c) => c.sort_order)) + 1;
  const { error } = await supabase.from('product_images').insert({
    product_id: productId,
    path,
    thumb_path: thumbPath,
    alt_text: text(alt, 200),
    sort_order: nextOrder,
    is_primary: !hasPrimary,
  });
  if (error) {
    await supabase.storage.from(IMAGE_BUCKET).remove([path, thumbPath]);
    return { error: friendlyError(error) };
  }
  refreshShop();
  return {};
}

export async function updateImageAlt(imageId: string, alt: string) {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  const { error } = await auth.supabase.from('product_images').update({ alt_text: text(alt, 200) }).eq('id', imageId);
  if (error) return { error: friendlyError(error) };
  refreshShop();
  return {};
}

export async function setPrimaryImage(productId: string, imageId: string) {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  const { supabase } = auth;
  await supabase.from('product_images').update({ is_primary: false }).eq('product_id', productId);
  const { error } = await supabase.from('product_images').update({ is_primary: true }).eq('id', imageId).eq('product_id', productId);
  if (error) return { error: friendlyError(error) };
  refreshShop();
  return {};
}

export async function reorderImages(productId: string, orderedIds: string[]) {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  for (const [i, id] of orderedIds.entries()) {
    const { error } = await auth.supabase.from('product_images').update({ sort_order: i }).eq('id', id).eq('product_id', productId);
    if (error) return { error: friendlyError(error) };
  }
  refreshShop();
  return {};
}

export async function deleteImage(productId: string, imageId: string) {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  const { supabase } = auth;
  const { data: img } = await supabase.from('product_images').select('*').eq('id', imageId).eq('product_id', productId).single();
  if (!img) return { error: 'Photo not found.' };
  const { error } = await supabase.from('product_images').delete().eq('id', imageId);
  if (error) return { error: friendlyError(error) };
  await supabase.storage.from(IMAGE_BUCKET).remove([img.path, img.thumb_path].filter(Boolean));
  if (img.is_primary) {
    const { data: next } = await supabase
      .from('product_images')
      .select('id')
      .eq('product_id', productId)
      .order('sort_order')
      .limit(1)
      .maybeSingle();
    if (next) await supabase.from('product_images').update({ is_primary: true }).eq('id', next.id);
  }
  refreshShop();
  return {};
}
