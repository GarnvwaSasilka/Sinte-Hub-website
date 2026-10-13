'use server';

import { revalidatePath } from 'next/cache';
import { adminOrError } from '@/lib/auth';
import { friendlyError } from '@/lib/admin-errors';
import { NEXT_STATUSES } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';

function refresh(id: string) {
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  revalidatePath('/', 'layout'); // stock may have changed
}

export async function setDeliveryFee(id: string, fee: string) {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  const n = Number(fee);
  if (fee.trim() === '' || !Number.isFinite(n) || n < 0) return { error: 'Enter the delivery fee in naira (0 or more).' };
  const { error } = await auth.supabase.from('orders').update({ delivery_fee: Math.round(n * 100) / 100 }).eq('id', id);
  if (error) return { error: friendlyError(error) };
  refresh(id);
  return {};
}

export async function changeOrderStatus(id: string, status: OrderStatus, reason?: string) {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  if (!(status in NEXT_STATUSES)) return { error: 'Unknown status.' };
  const values: Record<string, unknown> = { order_status: status };
  if (status === 'cancelled') {
    const r = (reason || '').trim();
    if (!r) return { error: 'Please write a short reason for cancelling.' };
    values.cancellation_reason = r.slice(0, 1000);
  }
  const { error } = await auth.supabase.from('orders').update(values).eq('id', id);
  if (error) return { error: friendlyError(error) };
  refresh(id);
  return {};
}

export async function saveAdminNotes(id: string, notes: string) {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  const { error } = await auth.supabase.from('orders').update({ admin_notes: notes.trim().slice(0, 5000) || null }).eq('id', id);
  if (error) return { error: friendlyError(error) };
  refresh(id);
  return {};
}

export async function recordPayment(id: string, amount: string, reference: string, notes: string) {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return { error: 'Enter the amount you received.' };
  const { error } = await auth.supabase.rpc('admin_record_payment', {
    p_order_id: id,
    p_amount: n,
    p_reference: reference.slice(0, 200),
    p_notes: notes.slice(0, 1000),
  });
  if (error) return { error: friendlyError(error) };
  refresh(id);
  return {};
}

export async function recordRefund(id: string, amount: string, notes: string) {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return { error: 'Enter the amount you refunded.' };
  const { error } = await auth.supabase.rpc('admin_record_refund', { p_order_id: id, p_amount: n, p_notes: notes.slice(0, 1000) });
  if (error) return { error: friendlyError(error) };
  refresh(id);
  return {};
}

export async function deleteCancelledOrder(id: string) {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  const { data, error } = await auth.supabase.from('orders').delete().eq('id', id).eq('order_status', 'cancelled').select('id');
  if (error) return { error: friendlyError(error) };
  if (!data?.length) return { error: 'Only cancelled orders can be deleted.' };
  revalidatePath('/admin/orders');
  return {};
}
