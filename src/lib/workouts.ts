import { BUILTIN_EXERCISES } from '../data/exercises';
import { addDays, daysBetween, startOfWeek } from './dates';
import type { Exercise, ExerciseLog, ISODate, MuscleGroup, PlannedExercise, Program, ProgramDay, Workout } from './types';
import { MUSCLE_GROUPS } from './types';

export type ExerciseMap = Map<string, Exercise>;

export function buildExerciseMap(custom: Exercise[]): ExerciseMap {
  return new Map([...BUILTIN_EXERCISES, ...custom].map((e) => [e.id, e]));
}

/** Newest first. Same-day workouts keep insertion order reversed (later = newer). */
export function sortWorkouts(workouts: Workout[]): Workout[] {
  return workouts
    .map((w, i) => ({ w, i }))
    .sort((a, b) => b.w.date.localeCompare(a.w.date) || b.i - a.i)
    .map(({ w }) => w);
}

export function lastLog(workouts: Workout[], exerciseId: string): { log: ExerciseLog; date: ISODate } | undefined {
  for (const w of sortWorkouts(workouts)) {
    const log = w.exercises.find((e) => e.exerciseId === exerciseId && e.sets.length > 0);
    if (log) return { log, date: w.date };
  }
  return undefined;
}

/** Follow the progression chain and return the most advanced variation you've already logged. */
export function currentVariant(baseId: string, workouts: Workout[], map: ExerciseMap): string {
  let current = baseId;
  let cursor = map.get(baseId)?.harder;
  const seen = new Set([baseId]);
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    if (lastLog(workouts, cursor)) current = cursor;
    cursor = map.get(cursor)?.harder;
  }
  return current;
}

export interface Recommendation {
  exerciseId: string;
  sets: number;
  target: number;
  min: number;
  max: number;
  note: string;
  /** What you did last time, for display. */
  last?: number[];
}

export function stepFor(ex: Exercise | undefined): number {
  return ex?.kind === 'time' ? 5 : 1;
}

export function unitFor(ex: Exercise | undefined): string {
  return ex?.kind === 'time' ? 's' : ' reps';
}

/**
 * Double progression:
 * - Hit the target on every set → next time +1 rep (or +5 s).
 * - At the top of the range → move to the harder variation at the bottom of the range.
 * - Missed reps → repeat the same target.
 */
export function recommendExercise(plan: PlannedExercise, workouts: Workout[], map: ExerciseMap): Recommendation {
  const exerciseId = currentVariant(plan.exerciseId, workouts, map);
  const ex = map.get(exerciseId);
  const step = stepFor(ex);
  const unit = unitFor(ex);
  const prev = lastLog(workouts, exerciseId);
  const base = { exerciseId, sets: plan.sets, min: plan.min, max: plan.max };

  if (!prev) {
    return {
      ...base,
      target: plan.min,
      note: exerciseId === plan.exerciseId ? 'First time: aim for the low end and focus on form.' : `New variation: start at ${plan.min}${unit}.`,
    };
  }

  const values = prev.log.sets.map((s) => s.value);
  const lastTarget = prev.log.target ?? Math.min(...values);
  const allHit = values.length >= plan.sets && values.slice(0, plan.sets).every((v) => v >= lastTarget);

  if (!allHit) {
    const target = Math.max(plan.min, Math.min(lastTarget, plan.max));
    return { ...base, target, last: values, note: `Repeat ${target}${unit} — beat last time's sets.` };
  }

  if (lastTarget >= plan.max) {
    const harder = ex?.harder ? map.get(ex.harder) : undefined;
    if (harder) {
      return {
        ...base,
        exerciseId: harder.id,
        target: plan.min,
        last: values,
        note: `You've mastered ${ex!.name}! Level up to ${harder.name}.`,
      };
    }
    return { ...base, target: lastTarget + step, last: values, note: `Top of the range — keep adding ${unit.trim()}, or add weight (backpack).` };
  }

  const target = Math.min(Math.max(lastTarget + step, plan.min), plan.max);
  return { ...base, target, last: values, note: `Hit every set last time → +${step}${ex?.kind === 'time' ? 's' : step === 1 ? ' rep' : ' reps'}.` };
}

// ---------- Programs ----------

export function nextProgramDay(program: Program, workouts: Workout[]): ProgramDay {
  const last = sortWorkouts(workouts).find((w) => w.programId === program.id && w.dayId);
  if (!last) return program.days[0];
  const idx = program.days.findIndex((d) => d.id === last.dayId);
  return program.days[(idx + 1) % program.days.length];
}

export function musclesWorked(w: Workout, map: ExerciseMap): Set<MuscleGroup> {
  const set = new Set<MuscleGroup>();
  for (const e of w.exercises) map.get(e.exerciseId)?.muscles.forEach((m) => set.add(m));
  return set;
}

export interface MuscleRecovery {
  muscle: MuscleGroup;
  lastDate?: ISODate;
  /** Days since last trained, undefined if never. */
  days?: number;
  recovered: boolean;
}

/** Muscles need roughly 48 h between hard sessions. */
export function recovery(workouts: Workout[], map: ExerciseMap, date: ISODate): MuscleRecovery[] {
  const sorted = sortWorkouts(workouts.filter((w) => w.date <= date));
  return MUSCLE_GROUPS.map((muscle) => {
    const w = sorted.find((x) => musclesWorked(x, map).has(muscle));
    const days = w ? daysBetween(w.date, date) : undefined;
    return { muscle, lastDate: w?.date, days, recovered: days === undefined || days >= 2 };
  });
}

export interface DayPlan {
  day: ProgramDay;
  items: Recommendation[];
  advice?: string;
  doneToday: boolean;
}

export function recommendDay(program: Program, workouts: Workout[], map: ExerciseMap, date: ISODate): DayPlan {
  const doneToday = workouts.some((w) => w.date === date && w.programId === program.id);
  const day = nextProgramDay(program, workouts);
  const items = day.exercises.map((p) => recommendExercise(p, workouts, map));

  const weekStart = startOfWeek(date);
  const thisWeek = workouts.filter((w) => w.date >= weekStart && w.date <= date);
  const trainedDays = new Set(thisWeek.map((w) => w.date)).size;

  let advice: string | undefined;
  const rec = recovery(workouts, map, date);
  const needed = new Set(items.flatMap((i) => map.get(i.exerciseId)?.muscles ?? []));
  const tired = rec.filter((r) => needed.has(r.muscle) && !r.recovered).map((r) => r.muscle);

  if (doneToday) advice = 'Done for today. Eat well and sleep — muscle grows while you recover.';
  else if (trainedDays >= program.daysPerWeek) advice = `You've trained ${trainedDays}× this week (plan: ${program.daysPerWeek}). Rest or go for a walk.`;
  else if (tired.length >= 2) advice = `Trained in the last 48 h: ${tired.join(', ')} may still be recovering. Consider resting, or pick a session for other muscles.`;

  return { day, items, advice, doneToday };
}

// ---------- "Something new" generator ----------

/** Small deterministic PRNG so "shuffle" is reproducible per seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Pattern = 'push' | 'pull' | 'legs' | 'core';
export function patternOf(ex: Exercise): Pattern {
  const m = ex.muscles[0];
  if (m === 'chest' || m === 'shoulders' || m === 'triceps') return 'push';
  if (m === 'back' || m === 'biceps') return 'pull';
  if (m === 'core') return 'core';
  return 'legs';
}

/**
 * Builds a fresh session: favours recovered muscles and exercises you haven't
 * done lately, covering push / pull / legs / core where possible.
 */
export function generateSession(workouts: Workout[], map: ExerciseMap, date: ISODate, seed: number, size = 5): Recommendation[] {
  const rng = mulberry32(seed);
  const rec = new Map(recovery(workouts, map, date).map((r) => [r.muscle, r]));
  const hasBar = workouts.some((w) => w.exercises.some((e) => map.get(e.exerciseId)?.equipment === 'bar'));

  const candidates = [...map.values()]
    .filter((ex) => (ex.equipment !== 'bar' || hasBar) && rec.get(ex.muscles[0])?.recovered !== false)
    .map((ex) => {
      const prev = lastLog(workouts, ex.id);
      const since = prev ? daysBetween(prev.date, date) : 30;
      return { ex, score: Math.min(since, 30) + rng() * 12 };
    })
    .sort((a, b) => b.score - a.score);

  const picked: Exercise[] = [];
  for (const pattern of ['push', 'pull', 'legs', 'core'] as Pattern[]) {
    const c = candidates.find((c) => patternOf(c.ex) === pattern && !picked.includes(c.ex));
    if (c) picked.push(c.ex);
  }
  for (const c of candidates) {
    if (picked.length >= size) break;
    if (!picked.includes(c.ex) && !picked.some((p) => p.muscles[0] === c.ex.muscles[0])) picked.push(c.ex);
  }

  return picked.slice(0, size).map((ex) => {
    const [min, max] = ex.kind === 'time' ? [20, 60] : ex.perSide ? [6, 15] : [8, 20];
    const r = recommendExercise({ exerciseId: ex.id, sets: 3, min, max }, workouts, map);
    // Keep the generated exercise itself (don't jump to a harder variant the user hasn't chosen).
    return r.exerciseId === ex.id ? r : { ...r, exerciseId: ex.id, target: max, note: 'Easy for you now — try the harder variation soon.' };
  });
}

// ---------- Personal records ----------

export interface PersonalRecord {
  exerciseId: string;
  best: number;
  bestDate: ISODate;
  bestWeightKg?: number;
  first: number;
  firstDate: ISODate;
  sessions: number;
  totalVolume: number;
}

function bestSet(log: ExerciseLog): { value: number; weightKg?: number } {
  return log.sets.reduce(
    (best, s) => {
      const better = (s.weightKg ?? 0) > (best.weightKg ?? 0) || ((s.weightKg ?? 0) === (best.weightKg ?? 0) && s.value > best.value);
      return better ? { value: s.value, weightKg: s.weightKg } : best;
    },
    { value: 0 } as { value: number; weightKg?: number },
  );
}

export function personalRecords(workouts: Workout[]): PersonalRecord[] {
  const chrono = [...sortWorkouts(workouts)].reverse();
  const out = new Map<string, PersonalRecord>();
  for (const w of chrono) {
    for (const log of w.exercises) {
      if (!log.sets.length) continue;
      const b = bestSet(log);
      const vol = log.sets.reduce((s, x) => s + x.value, 0);
      const pr = out.get(log.exerciseId);
      if (!pr) {
        out.set(log.exerciseId, {
          exerciseId: log.exerciseId,
          best: b.value,
          bestWeightKg: b.weightKg,
          bestDate: w.date,
          first: b.value,
          firstDate: w.date,
          sessions: 1,
          totalVolume: vol,
        });
        continue;
      }
      pr.sessions++;
      pr.totalVolume += vol;
      const heavier = (b.weightKg ?? 0) > (pr.bestWeightKg ?? 0);
      const sameLoadMore = (b.weightKg ?? 0) === (pr.bestWeightKg ?? 0) && b.value > pr.best;
      if (heavier || sameLoadMore) Object.assign(pr, { best: b.value, bestWeightKg: b.weightKg, bestDate: w.date });
    }
  }
  return [...out.values()].sort((a, b) => b.sessions - a.sessions);
}

/** Exercise ids where `workout` beats everything logged before it. */
export function newRecords(workout: Workout, previous: Workout[]): string[] {
  const before = new Map(personalRecords(previous).map((p) => [p.exerciseId, p]));
  return workout.exercises
    .filter((log) => {
      const prev = before.get(log.exerciseId);
      if (!prev || !log.sets.length) return false;
      const b = bestSet(log);
      return (b.weightKg ?? 0) > (prev.bestWeightKg ?? 0) || ((b.weightKg ?? 0) === (prev.bestWeightKg ?? 0) && b.value > prev.best);
    })
    .map((l) => l.exerciseId);
}

export function workoutsInRange(workouts: Workout[], from: ISODate, to: ISODate): Workout[] {
  return workouts.filter((w) => w.date >= from && w.date <= to);
}

export function weekRange(date: ISODate): [ISODate, ISODate] {
  const s = startOfWeek(date);
  return [s, addDays(s, 6)];
}
