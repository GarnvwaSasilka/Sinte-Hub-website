import { IMAGE_BUCKET } from './env';

/** Public web address of a photo stored in the product-images bucket. */
export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const safe = path.split('/').map(encodeURIComponent).join('/');
  return `${base}/storage/v1/object/public/${IMAGE_BUCKET}/${safe}`;
}
