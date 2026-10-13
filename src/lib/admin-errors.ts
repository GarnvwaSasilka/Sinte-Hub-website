import type { PostgrestError } from '@supabase/supabase-js';

/** Turns database errors into plain-English messages for the owner. */
export function friendlyError(error: PostgrestError | null | undefined, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;
  if (error.code === '23505') {
    if (error.message.includes('slug')) return 'Another item already uses that web address (slug). Please change it.';
    if (error.message.includes('sku')) return 'That SKU / product code is already used by another item.';
    if (error.message.includes('variant_unique')) return 'Two options have the same size and colour. Please make each one different.';
    return 'That value is already used by another item.';
  }
  if (error.code === '23514') {
    if (error.message.includes('sale_below_price')) return 'The sale price must be lower than the normal price.';
    if (error.message.includes('slug')) return 'The web address (slug) can only use lowercase letters, numbers and dashes.';
    if (error.message.includes('stock')) return 'Stock cannot be below zero.';
    if (error.message.includes('whatsapp')) return 'Enter the WhatsApp number in international format, digits only, e.g. 2348012345678.';
    if (error.message.includes('_url')) return 'Social links must start with https://';
    return 'One of the values is not allowed. Please check the form.';
  }
  if (error.code === '23503') return 'This item is still linked to something else and cannot be removed.';
  if (error.code === '42501') return 'Only the store admin can do this. Please log in again.';
  if (error.code === 'P0001') return error.message;
  console.error(error);
  return fallback;
}
