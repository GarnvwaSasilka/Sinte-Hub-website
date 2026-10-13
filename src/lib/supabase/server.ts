import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

/**
 * Client for the admin area and anything that needs the logged-in user.
 * It uses the visitor's own login cookie, so the database security rules
 * (Row Level Security) decide what it may see and change.
 */
export async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Client for public shop pages. It never reads cookies, so it always acts
 * as an anonymous visitor and pages can be cached.
 */
export function createPublicClient() {
  return createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
