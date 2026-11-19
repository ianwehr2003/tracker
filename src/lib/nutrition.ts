import { addDays, daysBetween } from './dates';
import type { ActivityLevel, Food, FoodEntry, ISODate, Profile, WeightEntry } from './types';

export const ACTIVITY_LEVELS: { id: ActivityLevel; label: string; factor: number }[] = [
  { id: 'sedentary', label: 'Sedentary (desk job, little walking)', factor: 1.2 },
  { id: 'light', label: 'Light (some walking, 1–3 workouts/wk)', factor: 1.375 },
  { id: 'moderate', label: 'Moderate (on your feet, 3–5 workouts/wk)', factor: 1.55 },
  { id: 'active', label: 'Active (physical job or 6–7 workouts/wk)', factor: 1.725 },
  { id: 'very_active', label: 'Very active (athlete / heavy labour)', factor: 1.9 },
];

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Targets extends Macros {
  maintenance: number;
}

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/** Mifflin–St Jeor basal metabolic rate (kcal/day). */
export function bmr(p: Pick<Profile, 'sex' | 'age' | 'heightCm'>, weightKg: number): number {
  return 10 * weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
}

export function maintenanceKcal(p: Profile, weightKg: number): number {
  const factor = ACTIVITY_LEVELS.find((a) => a.id === p.activity)?.factor ?? 1.55;
  return bmr(p, weightKg) * factor;
}

/**
 * Daily targets for a lean bulk: maintenance + surplus; protein by body weight;
 * fat at 25% of calories; carbs fill the rest.
 */
export function dailyTargets(p: Profile, weightKg: number): Targets {
  const maintenance = maintenanceKcal(p, weightKg);
  const kcal = maintenance + p.surplusKcal;
  const protein = weightKg * p.proteinPerKg;
  const fat = (kcal * 0.25) / 9;
  const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);
  return {
    maintenance: Math.round(maintenance),
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

export function macrosFor(food: Food, grams: number): Macros {
  const f = grams / 100;
  return { kcal: food.kcal * f, protein: food.protein * f, carbs: food.carbs * f, fat: food.fat * f };
}

export function addMacros(a: Macros, b: Macros): Macros {
  return { kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat };
}

export function sumEntries(entries: FoodEntry[], foods: Map<string, Food>): Macros {
  return entries.reduce((acc, e) => {
    const food = foods.get(e.foodId);
    return food ? addMacros(acc, macrosFor(food, e.grams)) : acc;
  }, ZERO_MACROS);
}

// ---------- Body weight ----------

export function sortedWeights(weights: WeightEntry[]): WeightEntry[] {
  return [...weights].sort((a, b) => a.date.localeCompare(b.date));
}

export function latestWeight(weights: WeightEntry[]): number | undefined {
  const s = sortedWeights(weights);
  return s.length ? s[s.length - 1].kg : undefined;
}

function avgInWindow(weights: WeightEntry[], from: ISODate, to: ISODate): { avg: number; n: number } | undefined {
  const inWin = weights.filter((w) => w.date >= from && w.date <= to);
  if (!inWin.length) return undefined;
  return { avg: inWin.reduce((s, w) => s + w.kg, 0) / inWin.length, n: inWin.length };
}

/** 7-day trailing average at each logged date — smooths out daily water swings. */
export function rollingAverage(weights: WeightEntry[]): { date: ISODate; kg: number; avg: number }[] {
  const s = sortedWeights(weights);
  return s.map((w) => ({ ...w, avg: avgInWindow(s, addDays(w.date, -6), w.date)!.avg }));
}

export type TrendStatus = 'insufficient' | 'too_slow' | 'on_track' | 'too_fast';

export interface WeightTrend {
  status: TrendStatus;
  /** kg per week, based on this week's average vs last week's. */
  ratePerWeek?: number;
  currentAvg?: number;
  message: string;
  /** Suggested change to the daily surplus, in kcal. */
  kcalAdjust: number;
}

/** Lean-bulk pace for a beginner: roughly +0.2 to +0.5 kg per week. */
export const TARGET_RATE = { min: 0.2, max: 0.5 };

export function weightTrend(weights: WeightEntry[], ref: ISODate): WeightTrend {
  const recent = avgInWindow(weights, addDays(ref, -6), ref);
  const prior = avgInWindow(weights, addDays(ref, -13), addDays(ref, -7));
  if (!recent || !prior || recent.n < 3 || prior.n < 3) {
    const s = sortedWeights(weights);
    const span = s.length ? daysBetween(s[0].date, ref) + 1 : 0;
    return {
      status: 'insufficient',
      currentAvg: recent?.avg,
      message: `Weigh in most mornings for 2 weeks to see your trend${span ? ` (${Math.min(span, 14)}/14 days so far)` : ''}.`,
      kcalAdjust: 0,
    };
  }
  const rate = recent.avg - prior.avg;
  const fmt = `${rate >= 0 ? '+' : ''}${rate.toFixed(2)} kg/week`;
  if (rate < TARGET_RATE.min) {
    return {
      status: 'too_slow',
      ratePerWeek: rate,
      currentAvg: recent.avg,
      message: `${fmt} — slower than the ${TARGET_RATE.min}–${TARGET_RATE.max} kg/week goal. Eat about 150–200 kcal more per day.`,
      kcalAdjust: 150,
    };
  }
  if (rate > TARGET_RATE.max) {
    return {
      status: 'too_fast',
      ratePerWeek: rate,
      currentAvg: recent.avg,
      message: `${fmt} — faster than needed, so some of it is likely fat. Try about 150 kcal less per day.`,
      kcalAdjust: -150,
    };
  }
  return {
    status: 'on_track',
    ratePerWeek: rate,
    currentAvg: recent.avg,
    message: `${fmt} — right on target for a lean bulk. Keep going!`,
    kcalAdjust: 0,
  };
}
