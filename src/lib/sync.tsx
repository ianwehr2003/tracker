import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { auth, db } from './firebase';
import { defaultState } from './storage';
import { useStore } from './store';
import { hash, joinState, mergeSlice, resolveSlice, splitState, stableStringify, type Slices } from './syncCore';

/**
 * Cloud sync. The device keeps working from localStorage (offline-first);
 * when signed in, each slice of the state is mirrored to
 *   users/{uid}/data/{sliceKey}  →  { json, updatedAt, device }
 * `base` remembers the hash of every slice at the last successful sync, so we
 * can tell "changed here", "changed in the cloud" and "changed in both" apart.
 */

const META_KEY = 'fittrack:sync';
interface Meta {
  uid?: string;
  base: Record<string, string>;
}

function loadMeta(): Meta {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) ?? '');
    return { uid: m.uid, base: m.base ?? {} };
  } catch {
    return { base: {} };
  }
}
function saveMeta(m: Meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

const DEVICE = /iphone|ipad|android/i.test(navigator.userAgent) ? 'phone' : 'computer';

export type SyncStatus = 'signed_out' | 'loading' | 'synced' | 'saving' | 'offline' | 'error';

interface SyncCtx {
  user: User | null;
  /** Firebase hasn't told us yet whether someone is signed in. */
  authLoading: boolean;
  status: SyncStatus;
  error: string;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SyncCtx | null>(null);

function friendlyError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
    'auth/network-request-failed': 'No internet connection.',
    'auth/popup-closed-by-user': 'Sign-in window was closed.',
    'auth/unauthorized-domain': 'This website isn’t allowed to sign in yet. Add it under Firebase → Authentication → Settings → Authorized domains.',
    'auth/operation-not-allowed': 'This sign-in method isn’t enabled in Firebase (Authentication → Sign-in method).',
    'permission-denied': 'The cloud refused access. Check the Firestore security rules.',
  };
  return map[code] ?? (e instanceof Error ? e.message : 'Something went wrong.');
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { state, replace } = useStore();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [status, setStatus] = useState<SyncStatus>('signed_out');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  const stateRef = useRef(state);
  stateRef.current = state;
  const meta = useRef<Meta>(loadMeta());

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthLoading(false);
      }),
    [],
  );

  const busy = useRef(new Set<string>());
  const rerun = useRef(false);

  /** Put one slice into the current local state (merging if it changed here meanwhile). */
  const applyLocal = useCallback(
    (key: string, value: unknown, basedOn: unknown) => {
      const slices = splitState(stateRef.current);
      const current = slices[key];
      if (stableStringify(current) !== stableStringify(basedOn) && value !== undefined) value = mergeSlice(key, current, value);
      if (value === undefined) delete slices[key];
      else slices[key] = value;
      const next = joinState(slices);
      stateRef.current = next;
      replace(next);
    },
    [replace],
  );

  /**
   * Sync one slice inside a Firestore transaction: read the cloud copy, decide
   * (keep / upload / merge / take theirs) against the last-synced hash, write.
   * Because it re-reads the cloud right before writing, a device coming back
   * online can never blindly overwrite changes made elsewhere.
   */
  const syncSlice = useCallback(
    async (uid: string, key: string) => {
      if (busy.current.has(key)) {
        rerun.current = true;
        return;
      }
      busy.current.add(key);
      setStatus('saving');
      try {
        const ref = doc(db, 'users', uid, 'data', key);
        const { r, local } = await runTransaction(db, async (tx) => {
          const snap = await tx.get(ref);
          const remote = snap.exists() ? JSON.parse(snap.data().json as string) : undefined;
          const local = splitState(stateRef.current)[key];
          const r = resolveSlice(key, local, remote, meta.current.base[key]);
          const payload = (v: unknown) => ({ json: stableStringify(v), updatedAt: serverTimestamp(), device: DEVICE });
          if (r.action === 'push_local') tx.set(ref, payload(local));
          else if (r.action === 'merge') tx.set(ref, payload(r.value));
          else if (r.action === 'delete_remote') tx.delete(ref);
          return { r, local };
        });
        const base = meta.current.base;
        switch (r.action) {
          case 'none':
          case 'push_local':
            base[key] = hash(stableStringify(local));
            break;
          case 'delete_remote':
            delete base[key];
            break;
          case 'merge':
          case 'take_remote':
            if (r.value === undefined) delete base[key];
            else base[key] = hash(stableStringify(r.value));
            applyLocal(key, r.value, local);
            break;
        }
        saveMeta(meta.current);
        setError('');
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code === 'unavailable' || !navigator.onLine) setStatus('offline');
        else {
          setError(friendlyError(e));
          setStatus('error');
        }
        throw e;
      } finally {
        busy.current.delete(key);
      }
    },
    [applyLocal],
  );

  /** Sync every slice that differs from what was last synced. */
  const pushAll = useCallback(
    async (uid: string) => {
      const local = splitState(stateRef.current);
      const base = meta.current.base;
      const keys = [...new Set([...Object.keys(local), ...Object.keys(base)])].filter(
        (k) => !(k in local) || hash(stableStringify(local[k])) !== base[k],
      );
      try {
        await Promise.all(keys.map((k) => syncSlice(uid, k)));
        if (rerun.current) {
          rerun.current = false;
          await pushAll(uid);
          return;
        }
        if (!busy.current.size) setStatus('synced');
      } catch {
        /* status already set */
      }
    },
    [syncSlice],
  );

  // ---- Listen to the cloud while signed in ----
  useEffect(() => {
    setReady(false);
    if (!user) {
      setStatus('signed_out');
      return;
    }
    setStatus('loading');

    // Data on this device belongs to a different account → don't mix it in.
    if (meta.current.uid && meta.current.uid !== user.uid) {
      replace(defaultState());
      stateRef.current = defaultState();
      meta.current = { base: {} };
    }

    const uid = user.uid;
    let gotServer = false;
    const unsub = onSnapshot(
      collection(db, 'users', uid, 'data'),
      (snap) => {
        // Ignore cache-only snapshots until we've heard from the server once.
        if (!gotServer && snap.metadata.fromCache) return;
        gotServer = true;

        const remote: Slices = {};
        snap.forEach((d) => {
          if (d.metadata.hasPendingWrites) return;
          try {
            remote[d.id] = JSON.parse(d.data().json as string);
          } catch {
            /* corrupt doc: ignore */
          }
        });

        const local = splitState(stateRef.current);
        const next: Slices = { ...local };
        let changedLocal = false;
        let needsPush = false;
        for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
          if (busy.current.has(key)) continue;
          const r = resolveSlice(key, local[key], remote[key], meta.current.base[key]);
          if (r.action === 'none') meta.current.base[key] = hash(stableStringify(local[key]));
          else if (r.action === 'take_remote') {
            if (r.value === undefined) {
              delete next[key];
              delete meta.current.base[key];
            } else {
              next[key] = r.value;
              meta.current.base[key] = hash(stableStringify(r.value));
            }
            changedLocal = true;
          } else needsPush = true; // upload / merge / delete: done safely in a transaction
        }

        meta.current.uid = uid;
        saveMeta(meta.current);
        if (changedLocal) {
          const merged = joinState(next);
          stateRef.current = merged;
          replace(merged);
        }
        if (needsPush) pushAll(uid);
        else if (!busy.current.size) setStatus('synced');
        setReady(true);
      },
      (e) => {
        setError(friendlyError(e));
        setStatus('error');
      },
    );
    return unsub;
  }, [user, replace, pushAll]);

  // ---- Push local changes (debounced), and again when back online ----
  useEffect(() => {
    if (!user || !ready || !online) return;
    const t = setTimeout(() => pushAll(user.uid), 800);
    return () => clearTimeout(t);
  }, [state, user, ready, online, pushAll]);

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(friendlyError(e));
      throw e;
    }
  }, []);

  const value = useMemo<SyncCtx>(
    () => ({
      user,
      authLoading,
      status: user && !online && status !== 'error' ? 'offline' : status,
      error,
      signInGoogle: () =>
        run(async () => {
          const provider = new GoogleAuthProvider();
          try {
            await signInWithPopup(auth, provider);
          } catch (e) {
            const code = (e as { code?: string }).code;
            // Home-screen apps often can't open popups: fall back to a full-page redirect.
            if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') await signInWithRedirect(auth, provider);
            else throw e;
          }
        }),
      signInEmail: (email, password) => run(() => signInWithEmailAndPassword(auth, email.trim(), password)),
      signUpEmail: (email, password) => run(() => createUserWithEmailAndPassword(auth, email.trim(), password)),
      resetPassword: (email) => run(() => sendPasswordResetEmail(auth, email.trim())),
      signOut: async () => {
        await fbSignOut(auth);
        // Clear this device so the next person doesn't see your data. It's safe in the cloud.
        meta.current = { base: {} };
        saveMeta(meta.current);
        replace(defaultState());
      },
    }),
    [user, authLoading, status, online, error, run, replace],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSync(): SyncCtx {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSync must be used inside <SyncProvider>');
  return s;
}
