'use server';

import { revalidatePath } from 'next/cache';
import { adminOrError } from '@/lib/auth';
import { friendlyError } from '@/lib/admin-errors';
import { slugify } from '@/lib/format';

export interface CategoryInput {
  id?: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number | string;
  is_active: boolean;
}

export async function saveCategory(input: CategoryInput) {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  const name = (input.name || '').trim().slice(0, 80);
  if (!name) return { error: 'Please enter a category name.' };
  const row = {
    name,
    slug: slugify(input.slug || name),
    description: (input.description || '').trim().slice(0, 1000) || null,
    sort_order: Math.floor(Number(input.sort_order) || 0),
    is_active: !!input.is_active,
  };
  const { error } = input.id
    ? await auth.supabase.from('categories').update(row).eq('id', input.id)
    : await auth.supabase.from('categories').insert(row);
  if (error) return { error: friendlyError(error) };
  revalidatePath('/', 'layout');
  return {};
}

export async function deleteCategory(id: string) {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  const { error } = await auth.supabase.from('categories').delete().eq('id', id);
  if (error) return { error: friendlyError(error) };
  revalidatePath('/', 'layout');
  return {};
}
