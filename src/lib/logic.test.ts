import { describe, expect, it } from 'vitest';
import { BUILTIN_EXERCISES } from '../data/exercises';
import { BUILTIN_FOODS } from '../data/foods';
import { PROGRAMS } from '../data/programs';
import { addDays, startOfWeek } from './dates';
import { bmr, dailyTargets, macrosFor, weightTrend } from './nutrition';
import { parseQuickLog } from './parse';
import { streak } from './summary';
import type { Profile, Workout } from './types';
import { buildExerciseMap, generateSession, newRecords, nextProgramDay, personalRecords, recommendExercise } from './workouts';

const map = buildExerciseMap([]);
const profile: Profile = { sex: 'male', age: 22, heightCm: 180, activity: 'moderate', surplusKcal: 300, proteinPerKg: 1.8, waterGoalMl: 2500, sleepGoalH: 8 };

const w = (date: string, exerciseId: string, values: number[], target?: number, extra: Partial<Workout> = {}): Workout => ({
  id: date + exerciseId,
  date,
  exercises: [{ exerciseId, sets: values.map((value) => ({ value })), target }],
  ...extra,
});

describe('nutrition', () => {
  it('computes Mifflin–St Jeor BMR', () => {
    expect(bmr(profile, 70)).toBeCloseTo(10 * 70 + 6.25 * 180 - 5 * 22 + 5);
  });

  it('builds lean-bulk targets', () => {
    const t = dailyTargets(profile, 70);
    expect(t.kcal - t.maintenance).toBeGreaterThanOrEqual(299);
    expect(t.protein).toBe(126);
    expect(t.protein * 4 + t.carbs * 4 + t.fat * 9).toBeCloseTo(t.kcal, -1);
  });

  it('scales per-100 g values by grams', () => {
    const pasta = BUILTIN_FOODS.find((f) => f.id === 'pasta-dry')!;
    expect(macrosFor(pasta, 180).kcal).toBeCloseTo(667.8);
  });

  it('reports weight trend after two weeks', () => {
    const ref = '2026-03-14';
    const few = [{ date: ref, kg: 70 }];
    expect(weightTrend(few, ref).status).toBe('insufficient');
    const slow = Array.from({ length: 14 }, (_, i) => ({ date: addDays(ref, -i), kg: 70 }));
    expect(weightTrend(slow, ref).status).toBe('too_slow');
    const good = Array.from({ length: 14 }, (_, i) => ({ date: addDays(ref, -i), kg: i < 7 ? 70.35 : 70 }));
    expect(weightTrend(good, ref).status).toBe('on_track');
  });
});

describe('quick log parser', () => {
  const parse = (s: string) => parseQuickLog(s, BUILTIN_EXERCISES);

  it.each([
    ['5x10 push ups', 'pushup', [10, 10, 10, 10, 10]],
    ['push-ups 3x12', 'pushup', [12, 12, 12]],
    ['5 sets of 10 pushups', 'pushup', [10, 10, 10, 10, 10]],
    ['3x30s plank', 'plank', [30, 30, 30]],
    ['2x1min wall sit', 'wall-sit', [60, 60]],
    ['10, 8, 8 dips', 'chair-dip', [10, 8, 8]],
    ['20 squats', 'squat', [20]],
    ['3×15 Bulgarian split squats', 'bulgarian-split-squat', [15, 15, 15]],
  ])('%s', (input, id, values) => {
    const r = parse(input);
    expect(r.errors).toEqual([]);
    expect(r.lines[0].exerciseId).toBe(id);
    expect(r.lines[0].sets.map((s) => s.value)).toEqual(values);
  });

  it('handles weight and multiple lines', () => {
    const r = parse('3x8 squats @ 12.5kg; 4x10 rows');
    expect(r.lines).toHaveLength(2);
    expect(r.lines[0].sets[0].weightKg).toBe(12.5);
    expect(r.lines[1].exerciseId).toBe('inverted-row');
  });

  it('flags unknown exercises', () => {
    const r = parse('3x10 kettlebell swings');
    expect(r.errors[0].reason).toBe('unknown_exercise');
    expect(r.errors[0].sets).toHaveLength(3);
  });
});

describe('recommendations', () => {
  const plan = { exerciseId: 'pushup', sets: 3, min: 6, max: 15 };

  it('starts at the bottom of the range', () => {
    expect(recommendExercise(plan, [], map).target).toBe(6);
  });

  it('adds a rep when every set hit the target', () => {
    expect(recommendExercise(plan, [w('2026-01-01', 'pushup', [8, 8, 8], 8)], map).target).toBe(9);
  });

  it('repeats the target when reps were missed', () => {
    expect(recommendExercise(plan, [w('2026-01-01', 'pushup', [10, 9, 7], 10)], map).target).toBe(10);
  });

  it('uses the weakest set for free-form logs', () => {
    expect(recommendExercise(plan, [w('2026-01-01', 'pushup', [10, 10, 10, 10, 10])], map).target).toBe(11);
  });

  it('levels up to the harder variation at the top of the range', () => {
    const r = recommendExercise(plan, [w('2026-01-01', 'pushup', [15, 15, 15], 15)], map);
    expect(r.exerciseId).toBe('decline-pushup');
    expect(r.target).toBe(6);
  });

  it('keeps using the harder variation once logged', () => {
    const hist = [w('2026-01-01', 'pushup', [15, 15, 15], 15), w('2026-01-03', 'decline-pushup', [6, 6, 6], 6)];
    const r = recommendExercise(plan, hist, map);
    expect(r.exerciseId).toBe('decline-pushup');
    expect(r.target).toBe(7);
  });

  it('rotates program days', () => {
    const p = PROGRAMS[0];
    expect(nextProgramDay(p, []).id).toBe('A');
    expect(nextProgramDay(p, [w('2026-01-01', 'pushup', [8], 8, { programId: p.id, dayId: 'A' })]).id).toBe('B');
  });

  it('generates a varied session without a pull-up bar', () => {
    const s = generateSession([], map, '2026-01-05', 42);
    expect(s.length).toBe(5);
    expect(new Set(s.map((r) => r.exerciseId)).size).toBe(5);
    expect(s.every((r) => map.get(r.exerciseId)!.equipment !== 'bar')).toBe(true);
  });

  it('skips muscles trained yesterday', () => {
    const s = generateSession([w('2026-01-04', 'squat', [20])], map, '2026-01-05', 1);
    expect(s.some((r) => map.get(r.exerciseId)!.muscles[0] === 'quads')).toBe(false);
  });
});

describe('records & streaks', () => {
  it('tracks first and best', () => {
    const hist = [w('2026-01-01', 'pushup', [10, 10]), w('2026-01-05', 'pushup', [14, 12])];
    const pr = personalRecords(hist)[0];
    expect(pr).toMatchObject({ first: 10, best: 14, bestDate: '2026-01-05', sessions: 2 });
    expect(newRecords(w('2026-01-08', 'pushup', [15]), hist)).toEqual(['pushup']);
    expect(newRecords(w('2026-01-08', 'pushup', [13]), hist)).toEqual([]);
  });

  it('counts streaks, not breaking on an unfinished today', () => {
    const done = new Set(['2026-01-08', '2026-01-09', '2026-01-10']);
    expect(streak((d) => done.has(d), '2026-01-11')).toBe(3);
    expect(streak((d) => done.has(d), '2026-01-10')).toBe(3);
    expect(streak((d) => done.has(d), '2026-01-13')).toBe(0);
  });

  it('weeks start on Monday', () => {
    expect(startOfWeek('2026-11-19')).toBe('2026-11-16');
  });
});
