'use server';

import { createPublicClient } from '@/lib/supabase/server';
import type { PlacedOrder } from '@/lib/types';

export interface CheckoutInput {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  fulfilment_method: 'pickup' | 'delivery';
  delivery_state: string;
  delivery_city: string;
  delivery_address: string;
  customer_note: string;
  items: { variant_id: string; quantity: number }[];
  website?: string; // hidden "honeypot" field: real people leave it empty
}

export type CheckoutResult = { ok: true; order: PlacedOrder } | { ok: false; error: string };

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Saves the order in the database BEFORE WhatsApp opens. All the real checks
 * (prices, stock, minimum quantities, address) happen inside the database
 * function place_order, so they cannot be skipped from the browser.
 */
export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  if (input?.website) return { ok: false, error: 'Something went wrong. Please try again.' };
  if (!Array.isArray(input?.items) || input.items.length === 0 || input.items.length > 50) {
    return { ok: false, error: 'Your cart is empty.' };
  }

  const payload = {
    customer_name: str(input.customer_name, 100),
    customer_phone: str(input.customer_phone, 30),
    customer_email: str(input.customer_email, 200),
    fulfilment_method: input.fulfilment_method === 'delivery' ? 'delivery' : 'pickup',
    delivery_state: str(input.delivery_state, 60),
    delivery_city: str(input.delivery_city, 100),
    delivery_address: str(input.delivery_address, 500),
    customer_note: str(input.customer_note, 1000),
    items: input.items.map((i) => ({
      variant_id: str(i.variant_id, 36),
      quantity: Math.floor(Number(i.quantity)) || 0,
    })),
  };

  const { data, error } = await createPublicClient().rpc('place_order', { p_order: payload });
  if (error) {
    // P0001 = a friendly message written by us in place_order
    if (error.code === 'P0001') return { ok: false, error: error.message };
    console.error('place_order failed', error.code, error.message);
    return { ok: false, error: 'We could not place your order just now. Please try again, or contact us on WhatsApp.' };
  }
  return { ok: true, order: data as PlacedOrder };
}
