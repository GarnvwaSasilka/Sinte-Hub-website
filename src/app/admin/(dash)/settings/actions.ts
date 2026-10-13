'use server';

import { revalidatePath } from 'next/cache';
import { adminOrError } from '@/lib/auth';
import { friendlyError } from '@/lib/admin-errors';
import { toWhatsAppNumber } from '@/lib/whatsapp';

const TEXT_FIELDS: Record<string, number> = {
  store_name: 100,
  tagline: 200,
  contact_phone: 40,
  contact_email: 200,
  address: 500,
  pickup_area: 300,
  pickup_instructions: 2000,
  announcement: 300,
  hero_title: 150,
  hero_subtitle: 400,
  about_text: 10000,
  delivery_policy: 10000,
  returns_policy: 10000,
  privacy_policy: 10000,
  terms_text: 10000,
  size_guide_text: 10000,
};
const URL_FIELDS = ['instagram_url', 'tiktok_url', 'facebook_url'];

/** FAQ box format: lines starting "Q:" then lines starting "A:". */
function parseFaq(raw: string) {
  const items: { q: string; a: string }[] = [];
  let cur: { q: string; a: string } | null = null;
  for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
    const t = line.trim();
    if (/^q:/i.test(t)) {
      if (cur && cur.q) items.push(cur);
      cur = { q: t.slice(2).trim(), a: '' };
    } else if (/^a:/i.test(t) && cur) {
      cur.a = (cur.a ? cur.a + '\n' : '') + t.slice(2).trim();
    } else if (cur && t) {
      cur.a = (cur.a ? cur.a + '\n' : '') + t;
    }
  }
  if (cur && cur.q) items.push(cur);
  return items.slice(0, 50).map((i) => ({ q: i.q.slice(0, 300), a: i.a.slice(0, 3000) }));
}

export async function saveSettings(form: Record<string, string>) {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };

  const values: Record<string, unknown> = {};
  for (const [k, max] of Object.entries(TEXT_FIELDS)) {
    const v = (form[k] ?? '').trim().slice(0, max);
    values[k] = v || null;
  }
  if (!values.store_name) values.store_name = "Sinte's Hub";

  const wa = (form.whatsapp_number ?? '').trim();
  if (wa) {
    const n = toWhatsAppNumber(wa);
    if (!n) return { error: 'The WhatsApp number does not look right. Use the full number, e.g. 08012345678 or 2348012345678.' };
    values.whatsapp_number = n;
  } else values.whatsapp_number = null;

  for (const k of URL_FIELDS) {
    const v = (form[k] ?? '').trim();
    if (v && !/^https:\/\/[^\s]+$/.test(v)) return { error: 'Social links must be full web addresses starting with https://' };
    values[k] = v || null;
  }
  const low = Math.floor(Number(form.low_stock_threshold));
  values.low_stock_threshold = Number.isFinite(low) && low >= 0 && low <= 1000 ? low : 3;
  values.faq = parseFaq(form.faq ?? '');

  const { error } = await auth.supabase.from('store_settings').update(values).eq('id', 1);
  if (error) return { error: friendlyError(error) };
  revalidatePath('/', 'layout');
  return {};
}

export async function uploadedHeroImage(path: string | null) {
  const auth = await adminOrError();
  if ('error' in auth) return { error: auth.error };
  if (path && !path.startsWith('site/')) return { error: 'Unexpected photo location.' };
  const { data: old } = await auth.supabase.from('store_settings').select('hero_image_path').eq('id', 1).single();
  const { error } = await auth.supabase.from('store_settings').update({ hero_image_path: path }).eq('id', 1);
  if (error) return { error: friendlyError(error) };
  if (old?.hero_image_path && old.hero_image_path !== path) {
    await auth.supabase.storage.from('product-images').remove([old.hero_image_path]);
  }
  revalidatePath('/', 'layout');
  return {};
}
