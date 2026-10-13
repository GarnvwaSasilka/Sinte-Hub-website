// All settings come from environment variables, so the same code runs on
// Netlify today and on any other host later. See .env.example.

function read(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local (or add it in your hosting settings).`,
    );
  }
  return value;
}

// NEXT_PUBLIC_ values are safe to show in the browser. They are written out
// in full so Next.js can include them in the browser bundle.
export const SUPABASE_URL = (): string =>
  read('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, '');

export const SUPABASE_ANON_KEY = (): string =>
  read(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

export const SITE_URL = (): string =>
  (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

export const IMAGE_BUCKET = 'product-images';
