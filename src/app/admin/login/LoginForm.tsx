'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/browser';

export default function LoginForm({ notAdmin }: { notAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    notAdmin ? 'This account is not allowed to open the dashboard. Log in with the owner account.' : null,
  );
  const [info, setInfo] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(f.get('email')),
      password: String(f.get('password')),
    });
    if (error) {
      setError('Wrong email or password, or too many attempts. Please wait a moment and try again.');
      setBusy(false);
      return;
    }
    router.replace('/admin');
    router.refresh();
  }

  async function onForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    await getBrowserClient().auth.resetPasswordForEmail(String(f.get('email')), {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });
    // Same message whether or not the email exists, so nobody can test emails.
    setInfo('If that email belongs to the owner account, a reset link is on its way. Open it on this same device.');
    setBusy(false);
  }

  if (mode === 'forgot') {
    return (
      <form className="card" onSubmit={onForgot}>
        <div className="field">
          <label htmlFor="email">Owner email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        {info ? <p className="alert alert-success">{info}</p> : null}
        <button className="btn btn-block" disabled={busy}>
          Send reset link
        </button>
        <p className="center small">
          <button type="button" className="link-button" onClick={() => setMode('login')}>
            Back to login
          </button>
        </p>
      </form>
    );
  }

  return (
    <form className="card" onSubmit={onLogin}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {error ? (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn-block" disabled={busy}>
        {busy ? 'Logging in…' : 'Log in'}
      </button>
      <p className="center small">
        <button type="button" className="link-button" onClick={() => setMode('forgot')}>
          Forgot password?
        </button>
      </p>
    </form>
  );
}
