import { addDays } from './dates';
import { sumEntries, type Macros } from './nutrition';
import type { DayHabits, Food, FoodEntry, ISODate, WeightEntry, Workout } from './types';

export function entriesByDate(entries: FoodEntry[]): Map<ISODate, FoodEntry[]> {
  const map = new Map<ISODate, FoodEntry[]>();
  for (const e of entries) {
    const list = map.get(e.date);
    if (list) list.push(e);
    else map.set(e.date, [e]);
  }
  return map;
}

/**
 * Consecutive days (ending today) where `ok(date)` holds.
 * Today not done yet doesn't break the streak — it counts from yesterday.
 */
export function streak(ok: (d: ISODate) => boolean, ref: ISODate, maxDays = 3650): number {
  let d = ok(ref) ? ref : addDays(ref, -1);
  let n = 0;
  while (n < maxDays && ok(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export interface WeekSummary {
  from: ISODate;
  to: ISODate;
  daysLogged: number;
  avg: Macros;
  proteinDaysHit: number;
  kcalDaysHit: number;
  workouts: number;
  totalSets: number;
  weightStart?: number;
  weightEnd?: number;
  weightChange?: number;
  avgWaterMl?: number;
  avgSleepH?: number;
}

function avg(nums: number[]): number | undefined {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : undefined;
}

export function weekSummary(args: {
  from: ISODate;
  entries: FoodEntry[];
  foods: Map<string, Food>;
  workouts: Workout[];
  weights: WeightEntry[];
  habits: Record<ISODate, DayHabits>;
  targets?: Macros;
}): WeekSummary {
  const { from, foods, targets } = args;
  const to = addDays(from, 6);
  const inWeek = (d: ISODate) => d >= from && d <= to;
  const byDate = entriesByDate(args.entries.filter((e) => inWeek(e.date)));

  const dayTotals = [...byDate.values()].map((list) => sumEntries(list, foods));
  const n = dayTotals.length || 1;
  const total = dayTotals.reduce(
    (a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const weekWorkouts = args.workouts.filter((w) => inWeek(w.date));
  const weekWeights = args.weights.filter((w) => inWeek(w.date)).sort((a, b) => a.date.localeCompare(b.date));
  const prevAvg = avg(args.weights.filter((w) => w.date >= addDays(from, -7) && w.date < from).map((w) => w.kg));
  const thisAvg = avg(weekWeights.map((w) => w.kg));

  const habitDays = Object.entries(args.habits).filter(([d]) => inWeek(d)).map(([, h]) => h);

  return {
    from,
    to,
    daysLogged: dayTotals.length,
    avg: { kcal: total.kcal / n, protein: total.protein / n, carbs: total.carbs / n, fat: total.fat / n },
    proteinDaysHit: targets ? dayTotals.filter((m) => m.protein >= targets.protein * 0.95).length : 0,
    kcalDaysHit: targets ? dayTotals.filter((m) => m.kcal >= targets.kcal * 0.95).length : 0,
    workouts: weekWorkouts.length,
    totalSets: weekWorkouts.reduce((s, w) => s + w.exercises.reduce((x, e) => x + e.sets.length, 0), 0),
    weightStart: weekWeights[0]?.kg,
    weightEnd: weekWeights[weekWeights.length - 1]?.kg,
    weightChange: thisAvg !== undefined && prevAvg !== undefined ? thisAvg - prevAvg : undefined,
    avgWaterMl: avg(habitDays.map((h) => h.waterMl).filter((v) => v > 0)),
    avgSleepH: avg(habitDays.map((h) => h.sleepH).filter((v): v is number => v !== undefined && v > 0)),
  };
}
