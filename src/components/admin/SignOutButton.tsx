'use client';

import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/browser';

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-outline btn-small"
      style={{ color: 'var(--cream)', borderColor: '#555' }}
      onClick={async () => {
        await getBrowserClient().auth.signOut();
        router.replace('/admin/login');
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}
