import type { AppState } from './types';

// Storage keys keep the original 'fittrack' prefix so existing data still loads.
const KEY = 'fittrack:v1';

export function defaultState(): AppState {
  return {
    version: 1,
    profile: null,
    customFoods: [],
    entries: [],
    savedMeals: [],
    weights: [],
    customExercises: [],
    workouts: [],
    activeProgramId: 'fullbody-3',
    shopping: [],
    staples: [
      { name: 'Eggs', category: 'Dairy & Eggs' },
      { name: 'Milk', category: 'Dairy & Eggs' },
      { name: 'Greek yogurt', category: 'Dairy & Eggs' },
      { name: 'Oats', category: 'Grains & Bread' },
      { name: 'Rice', category: 'Grains & Bread' },
      { name: 'Pasta', category: 'Grains & Bread' },
      { name: 'Chicken breast', category: 'Meat & Fish' },
      { name: 'Bananas', category: 'Produce' },
      { name: 'Peanut butter', category: 'Pantry' },
    ],
    habits: {},
    restSeconds: 90,
  };
}

/** Fill in fields added in later versions so old saves keep working. */
export function migrate(raw: unknown): AppState {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Partial<AppState>;
  return { ...base, ...s, version: 1 };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw)) : defaultState();
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function exportJSON(state: AppState): string {
  return JSON.stringify({ app: 'fittrack', exportedAt: new Date().toISOString(), state }, null, 2);
}

export function importJSON(text: string): AppState {
  const parsed = JSON.parse(text);
  const state = parsed?.app === 'fittrack' ? parsed.state : parsed;
  if (!state || typeof state !== 'object' || !Array.isArray(state.entries)) {
    throw new Error('This file is not a Tracker backup.');
  }
  return migrate(state);
}
