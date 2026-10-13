'use client';

import { useState, useTransition } from 'react';

/**
 * A button that asks "are you sure?" before running a destructive action.
 * The action returns { error } on failure.
 */
export default function ConfirmButton({
  action,
  label,
  confirmText,
  className = 'btn btn-danger btn-small',
  onDone,
}: {
  action: () => Promise<{ error?: string } | void>;
  label: string;
  confirmText: string;
  className?: string;
  onDone?: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => {
          if (!window.confirm(confirmText)) return;
          setError(null);
          start(async () => {
            const res = await action();
            if (res && res.error) setError(res.error);
            else onDone?.();
          });
        }}
      >
        {pending ? 'Working…' : label}
      </button>
      {error ? <span className="alert alert-error small" style={{ display: 'inline-block' }}>{error}</span> : null}
    </>
  );
}
