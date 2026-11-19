import { describe, expect, it } from 'vitest';
import { defaultState } from './storage';
import { hash, joinState, resolveSlice, splitState, stableStringify } from './syncCore';
import type { AppState } from './types';

function sample(): AppState {
  const s = defaultState();
  s.profile = { sex: 'male', age: 23, heightCm: 178, activity: 'light', surplusKcal: 300, proteinPerKg: 1.8, waterGoalMl: 2500, sleepGoalH: 8 };
  s.entries = [
    { id: 'a', date: '2025-12-31', foodId: 'egg', grams: 100, meal: 'Breakfast' },
    { id: 'b', date: '2026-01-01', foodId: 'oats', grams: 80, meal: 'Breakfast' },
  ];
  s.workouts = [{ id: 'w1', date: '2026-01-02', exercises: [{ exerciseId: 'pushup', sets: [{ value: 10 }] }] }];
  s.weights = [{ date: '2026-01-01', kg: 68 }];
  s.habits = { '2026-01-01': { waterMl: 500, sleepH: 7 } };
  return s;
}

const h = (v: unknown) => hash(stableStringify(v));

describe('split / join', () => {
  it('round-trips the full state', () => {
    const s = sample();
    const slices = splitState(s);
    expect(Object.keys(slices).sort()).toEqual(['core', 'entries-2025', 'entries-2026', 'habits-2026', 'weights', 'workouts-2026']);
    expect(stableStringify(joinState(slices))).toBe(stableStringify(s));
  });

  it('round-trips an empty state', () => {
    const s = defaultState();
    expect(stableStringify(joinState(splitState(s)))).toBe(stableStringify(s));
  });

  it('stable stringify ignores key order and undefined', () => {
    expect(stableStringify({ b: 1, a: 2, c: undefined })).toBe(stableStringify({ a: 2, b: 1 }));
  });
});

describe('three-way resolve', () => {
  const base = [{ id: 'a' }];
  const changed = [{ id: 'a' }, { id: 'b' }];

  it('does nothing when equal', () => {
    expect(resolveSlice('entries-2026', base, base, h(base)).action).toBe('none');
  });
  it('takes remote when only the cloud changed', () => {
    expect(resolveSlice('entries-2026', base, changed, h(base))).toEqual({ action: 'take_remote', value: changed });
  });
  it('pushes when only this device changed', () => {
    expect(resolveSlice('entries-2026', changed, base, h(base)).action).toBe('push_local');
  });
  it('pushes a slice the cloud does not have', () => {
    expect(resolveSlice('entries-2027', changed, undefined, undefined).action).toBe('push_local');
  });
  it('drops a slice another device deleted', () => {
    expect(resolveSlice('entries-2025', base, undefined, h(base))).toEqual({ action: 'take_remote', value: undefined });
  });
  it('deletes a slice removed on this device', () => {
    expect(resolveSlice('entries-2025', undefined, base, h(base)).action).toBe('delete_remote');
  });
  it('propagates deletions from the cloud', () => {
    expect(resolveSlice('entries-2026', changed, base, h(changed))).toEqual({ action: 'take_remote', value: base });
  });
  it('merges when both sides changed', () => {
    const local = [{ id: 'a' }, { id: 'local' }];
    const remote = [{ id: 'a' }, { id: 'remote' }];
    const r = resolveSlice('entries-2026', local, remote, h(base));
    expect(r.action).toBe('merge');
    expect((r as { value: { id: string }[] }).value.map((x) => x.id).sort()).toEqual(['a', 'local', 'remote']);
  });
  it('merges first sign-in (no base) without losing either side', () => {
    const r = resolveSlice('weights', [{ date: '2026-01-02', kg: 69 }], [{ date: '2026-01-01', kg: 68 }], undefined);
    expect((r as { value: unknown[] }).value).toHaveLength(2);
  });
  it('merges core: keeps local profile, unions shopping', () => {
    const l = { profile: { age: 23 }, shopping: [{ id: 's1' }], restSeconds: 60 };
    const r = { profile: { age: 30 }, shopping: [{ id: 's2' }], restSeconds: 90 };
    const res = resolveSlice('core', l, r, 'x') as { value: Record<string, unknown> };
    expect(res.value.profile).toEqual({ age: 23 });
    expect(res.value.shopping).toHaveLength(2);
    expect(res.value.restSeconds).toBe(60);
  });
});
