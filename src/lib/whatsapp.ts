import { formatNaira } from './format';
import type { PlacedOrder } from './types';

/** WhatsApp click-to-chat needs digits only, in international format (e.g. 2348012345678). */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 11) digits = '234' + digits.slice(1); // Nigerian local format
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function whatsAppLink(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * The message the customer sends after checkout. It deliberately leaves out
 * the street address and phone number: the owner already has them in the
 * dashboard.
 */
export function customerOrderMessage(
  order: PlacedOrder,
  opts: { storeName: string; customerName: string; city?: string; state?: string },
): string {
  const lines = [
    `Hello ${opts.storeName}, I just placed an order on your website.`,
    '',
    `Order number: ${order.reference}`,
    `Name: ${opts.customerName}`,
    '',
    ...order.items.map(
      (i) =>
        `• ${i.quantity} ${i.unit_of_sale !== 'piece' ? i.unit_of_sale + ' ' : 'x '}${i.name}` +
        `${i.variant_label ? ` (${i.variant_label})` : ''} – ${formatNaira(i.line_total)}`,
    ),
    '',
    `Items subtotal: ${formatNaira(order.subtotal)}`,
    order.fulfilment_method === 'pickup'
      ? 'I will pick up the order (no delivery fee).'
      : `Delivery to ${[opts.city, opts.state].filter(Boolean).join(', ')} – delivery fee to be confirmed.`,
    '',
    'Please confirm availability and the final total. Thank you!',
  ];
  return lines.join('\n');
}
