import { defaultState } from './storage';
import type { AppState } from './types';

/**
 * The app state is split into "slices", each stored as its own cloud document:
 *   core            profile, settings, custom foods/exercises, meals, shopping…
 *   weights         all weigh-ins (small)
 *   entries-2026    food log for one year
 *   workouts-2026   workouts for one year
 *   habits-2026     water/sleep for one year
 * This keeps each document well under Firestore's 1 MB limit and means a new
 * food entry only re-uploads that year's food log, not everything.
 */
export type Slices = Record<string, unknown>;

const CORE_KEYS = [
  'profile',
  'customFoods',
  'savedMeals',
  'customExercises',
  'activeProgramId',
  'shopping',
  'staples',
  'restSeconds',
  'activeSession',
] as const satisfies readonly (keyof AppState)[];

const year = (date: string) => date.slice(0, 4);

function byYear<T>(items: T[], getDate: (t: T) => string, prefix: string, out: Slices) {
  for (const item of items) {
    const key = `${prefix}-${year(getDate(item))}`;
    ((out[key] ??= []) as T[]).push(item);
  }
}

export function splitState(s: AppState): Slices {
  const core: Record<string, unknown> = {};
  for (const k of CORE_KEYS) core[k] = s[k] ?? null;
  const out: Slices = { core, weights: s.weights };
  byYear(s.entries, (e) => e.date, 'entries', out);
  byYear(s.workouts, (w) => w.date, 'workouts', out);
  const habits: Record<string, Record<string, unknown>> = {};
  for (const [date, h] of Object.entries(s.habits)) (habits[`habits-${year(date)}`] ??= {})[date] = h;
  Object.assign(out, habits);
  return out;
}

export function joinState(slices: Slices): AppState {
  const s = defaultState();
  const core = (slices.core ?? {}) as Partial<AppState>;
  for (const k of CORE_KEYS) {
    const v = core[k];
    if (v !== undefined && v !== null) (s as unknown as Record<string, unknown>)[k] = v;
    else if (k === 'profile' || k === 'activeSession') (s as unknown as Record<string, unknown>)[k] = k === 'profile' ? null : undefined;
  }
  if (Array.isArray(slices.weights)) s.weights = slices.weights as AppState['weights'];
  for (const [key, value] of Object.entries(slices).sort(([a], [b]) => a.localeCompare(b))) {
    if (key.startsWith('entries-')) s.entries.push(...(value as AppState['entries']));
    else if (key.startsWith('workouts-')) s.workouts.push(...(value as AppState['workouts']));
    else if (key.startsWith('habits-')) Object.assign(s.habits, value);
  }
  return s;
}

/** Stable JSON (sorted object keys) so the same data always gives the same string. */
export function stableStringify(v: unknown): string {
  return JSON.stringify(v, (_k, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)))
      : val,
  );
}

/** Small fast string hash (cyrb53) — used to remember what was last synced without storing a second copy. */
export function hash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

type WithKey = Record<string, unknown>;

/** Union two lists by a key; `preferred` wins when both have the same item. */
function unionBy(preferred: unknown, other: unknown, key: (x: WithKey) => string): unknown[] {
  const a = Array.isArray(preferred) ? (preferred as WithKey[]) : [];
  const b = Array.isArray(other) ? (other as WithKey[]) : [];
  const seen = new Set(a.map(key));
  return [...a, ...b.filter((x) => !seen.has(key(x)))];
}

const itemKey = (x: WithKey) => String(x.id ?? x.date ?? x.name ?? stableStringify(x));

/**
 * Merge a slice that changed on both this device and in the cloud since the last sync
 * (e.g. edited offline on two phones). Nothing logged on either side is lost; for the
 * same item, this device's version wins.
 */
export function mergeSlice(key: string, local: unknown, remote: unknown): unknown {
  if (local === undefined) return remote;
  if (remote === undefined) return local;
  if (key === 'core') {
    const l = local as WithKey;
    const r = remote as WithKey;
    const out: WithKey = { ...r, ...l };
    for (const k of ['customFoods', 'savedMeals', 'customExercises', 'shopping', 'staples']) out[k] = unionBy(l[k], r[k], itemKey);
    out.profile = l.profile ?? r.profile ?? null;
    return out;
  }
  if (key.startsWith('habits-')) return { ...(remote as WithKey), ...(local as WithKey) };
  return unionBy(local, remote, itemKey);
}

export type Resolution =
  | { action: 'none' }
  | { action: 'take_remote'; value: unknown }
  | { action: 'push_local' }
  | { action: 'delete_remote' }
  | { action: 'merge'; value: unknown };

/**
 * Three-way decision for one slice, given the hash recorded at the last successful sync.
 */
export function resolveSlice(key: string, local: unknown, remote: unknown, baseHash: string | undefined): Resolution {
  const lh = local === undefined ? undefined : hash(stableStringify(local));
  const rh = remote === undefined ? undefined : hash(stableStringify(remote));
  if (lh === rh) return { action: 'none' };
  // Gone from the cloud: deleted on another device if we hadn't touched it, otherwise re-upload ours.
  if (rh === undefined) return lh === baseHash ? { action: 'take_remote', value: undefined } : { action: 'push_local' };
  if (lh === undefined && rh === baseHash) return { action: 'delete_remote' };
  if (lh === undefined || lh === baseHash) return { action: 'take_remote', value: remote };
  if (rh === baseHash) return { action: 'push_local' };
  return { action: 'merge', value: mergeSlice(key, local, remote) };
}

/** True if this device holds anything worth keeping. */
export function hasUserData(s: AppState): boolean {
  return !!s.profile || s.entries.length > 0 || s.workouts.length > 0 || s.weights.length > 0;
}
