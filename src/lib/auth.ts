import 'server-only';
import { redirect } from 'next/navigation';
import { createAuthClient } from './supabase/server';

/**
 * Use at the top of every admin page and admin action.
 * Sends anyone who is not logged in to the login page, and refuses anyone
 * who is logged in but not listed as an admin. The database rules check
 * again on every read and write, so this is a second lock, not the only one.
 */
export async function requireAdmin() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: isAdmin, error } = await supabase.rpc('is_admin');
  if (error || isAdmin !== true) redirect('/admin/login?error=not-admin');

  return { supabase, user };
}

/** For admin server actions: returns a friendly message instead of redirecting. */
export async function adminOrError() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Your login has expired. Please log in again.' as const };
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) return { error: 'Only the store admin can do this.' as const };
  return { supabase, user };
}
