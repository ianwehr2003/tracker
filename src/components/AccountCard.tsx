import { useState } from 'react';
import { useSync, type SyncStatus } from '../lib/sync';

const STATUS_TEXT: Record<SyncStatus, string> = {
  signed_out: 'Not signed in: data is only on this device',
  loading: 'Loading your data…',
  synced: 'All changes saved to the cloud',
  saving: 'Saving…',
  offline: 'Offline: changes will sync when you’re back online',
  error: 'Sync problem',
};

export function SyncBadge() {
  const { status, user } = useSync();
  const icon = !user ? '☁︎' : status === 'synced' ? '✓' : status === 'error' ? '!' : status === 'offline' ? '⦸' : '↻';
  return (
    <span className={`sync-badge ${status}`} title={STATUS_TEXT[status]} aria-label={STATUS_TEXT[status]}>
      {icon}
    </span>
  );
}

/** Sign in / account panel. `compact` is used on the welcome screen. */
export function AccountPanel({ compact = false }: { compact?: boolean }) {
  const { user, status, error, signInGoogle, signInEmail, signUpEmail, resetPassword, signOut } = useSync();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');

  const go = async (fn: () => Promise<void>, done?: string) => {
    setBusy(true);
    setInfo('');
    try {
      await fn();
      if (done) setInfo(done);
    } catch {
      /* error shown from context */
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <div className="stack">
        <div className="row gap-s">
          <SyncBadge />
          <div className="grow">
            <b>{user.displayName ?? user.email}</b>
            <div className="hint">{STATUS_TEXT[status]}</div>
          </div>
        </div>
        {error && <p className="hint warn">{error}</p>}
        <p className="hint">Your data syncs to every phone or computer where you sign in with this account.</p>
        <button
          className="btn"
          onClick={() => confirm('Sign out? Your data stays safe in the cloud. This device will be cleared until you sign in again.') && signOut()}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      {!compact && (
        <p className="hint">
          Sign in to back up your data and use it on several devices. Each person gets their own private account.
        </p>
      )}
      <button className="btn google" disabled={busy} onClick={() => go(signInGoogle)}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continue with Google
      </button>
      <div className="divider">or with email</div>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          go(() => (mode === 'signin' ? signInEmail(email, password) : signUpEmail(email, password)));
        }}
      >
        <input type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" required />
        <input
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          placeholder={mode === 'signup' ? 'Password (6+ characters)' : 'Password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="Password"
          required
          minLength={6}
        />
        <button className="btn primary" disabled={busy || !email || password.length < 6}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <div className="row between">
        <button className="link" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </button>
        {mode === 'signin' && (
          <button
            className="link muted"
            onClick={() => (email ? go(() => resetPassword(email), 'Password reset email sent.') : setInfo('Type your email first.'))}
          >
            Forgot password?
          </button>
        )}
      </div>
      {error && <p className="hint warn">{error}</p>}
      {info && <p className="hint ok">{info}</p>}
    </div>
  );
}
