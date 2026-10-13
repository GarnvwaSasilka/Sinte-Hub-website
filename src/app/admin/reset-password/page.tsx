'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/browser';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getBrowserClient();
    const code = new URLSearchParams(window.location.search).get('code');
    (async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError('This reset link has expired or was opened on a different device. Request a new one.');
          return;
        }
      }
      const { data } = await supabase.auth.getUser();
      if (data.user) setReady(true);
      else setError('This reset link has expired. Request a new one from the login page.');
    })();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get('password'));
    if (password.length < 10) return setError('Use at least 10 characters.');
    if (password !== String(f.get('confirm'))) return setError('The two passwords do not match.');
    setBusy(true);
    const { error } = await getBrowserClient().auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.replace('/admin');
  }

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: 48 }}>
      <h1 style={{ fontSize: '1.6rem' }}>Choose a new password</h1>
      {error ? <p className="alert alert-error">{error} <a href="/admin/login">Back to login</a></p> : null}
      {ready ? (
        <form className="card" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="password">New password (at least 10 characters)</label>
            <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" />
          </div>
          <div className="field">
            <label htmlFor="confirm">Type it again</label>
            <input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" />
          </div>
          <button className="btn btn-block" disabled={busy}>
            Save new password
          </button>
        </form>
      ) : !error ? (
        <p className="muted">Checking your link…</p>
      ) : null}
    </div>
  );
}
