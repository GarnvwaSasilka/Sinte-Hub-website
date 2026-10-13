import 'server-only';
import { cache } from 'react';
import { createPublicClient } from './supabase/server';
import type { StoreSettings } from './types';

const FALLBACK: StoreSettings = {
  store_name: "Sinte's Hub",
  tagline: 'Style • Quality • You',
  whatsapp_number: null,
  contact_phone: null,
  contact_email: null,
  address: null,
  pickup_area: null,
  pickup_instructions: null,
  instagram_url: null,
  tiktok_url: null,
  facebook_url: null,
  low_stock_threshold: 3,
  announcement: null,
  hero_title: null,
  hero_subtitle: null,
  hero_image_path: null,
  about_text: null,
  delivery_policy: null,
  returns_policy: null,
  privacy_policy: null,
  terms_text: null,
  size_guide_text: null,
  faq: [],
};

export const getSettings = cache(async (): Promise<StoreSettings> => {
  const { data, error } = await createPublicClient().from('store_settings').select('*').eq('id', 1).maybeSingle();
  if (error || !data) {
    console.error('Could not load store settings', error?.message);
    return FALLBACK;
  }
  return { ...FALLBACK, ...data, faq: Array.isArray(data.faq) ? data.faq : [] } as StoreSettings;
});
