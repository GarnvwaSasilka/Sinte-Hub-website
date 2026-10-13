import type { OrderStatus, PaymentStatus } from './types';

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatNaira(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return naira.format(Number.isFinite(n) ? n : 0);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'New – awaiting confirmation',
  confirmed: 'Confirmed',
  processing: 'Processing',
  ready_for_pickup: 'Ready for pickup',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  collected: 'Collected',
  cancelled: 'Cancelled',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  paid: 'Paid (verified)',
  refunded: 'Refunded',
};

/** Mirrors the rules in the database (guard_order_update). */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'ready_for_pickup', 'dispatched', 'cancelled'],
  processing: ['ready_for_pickup', 'dispatched', 'cancelled'],
  ready_for_pickup: ['collected', 'cancelled'],
  dispatched: ['delivered', 'cancelled'],
  delivered: [],
  collected: [],
  cancelled: [],
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function variantLabel(v: { size: string | null; colour: string | null }): string {
  return [v.size, v.colour].filter(Boolean).join(' / ');
}
