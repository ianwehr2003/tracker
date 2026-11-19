import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BUILTIN_FOODS } from '../data/foods';
import { PROGRAMS } from '../data/programs';
import { today } from './dates';
import { dailyTargets, latestWeight, type Targets } from './nutrition';
import { loadState, saveState } from './storage';
import type { AppState, Food, Program } from './types';
import { buildExerciseMap, type ExerciseMap } from './workouts';

interface Store {
  state: AppState;
  /** Apply an immutable update. State is saved to the device automatically. */
  update: (fn: (s: AppState) => AppState) => void;
  replace: (s: AppState) => void;
  foods: Map<string, Food>;
  allFoods: Food[];
  exercises: ExerciseMap;
  program: Program;
  weightKg?: number;
  targets?: Targets;
  date: string;
  saveError: boolean;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const [saveError, setSaveError] = useState(false);
  const [date, setDate] = useState(today);

  useEffect(() => {
    setSaveError(!saveState(state));
  }, [state]);

  // Roll over to the new day if the app stays open past midnight.
  useEffect(() => {
    const t = setInterval(() => setDate(today()), 60_000);
    const onFocus = () => setDate(today());
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);

  const value = useMemo<Store>(() => {
    const allFoods = [...BUILTIN_FOODS, ...state.customFoods];
    const weightKg = latestWeight(state.weights);
    return {
      state,
      update,
      replace: setState,
      foods: new Map(allFoods.map((f) => [f.id, f])),
      allFoods,
      exercises: buildExerciseMap(state.customExercises),
      program: PROGRAMS.find((p) => p.id === state.activeProgramId) ?? PROGRAMS[0],
      weightKg,
      targets: state.profile && weightKg ? dailyTargets(state.profile, weightKg) : undefined,
      date,
      saveError,
    };
  }, [state, update, date, saveError]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>');
  return s;
}
