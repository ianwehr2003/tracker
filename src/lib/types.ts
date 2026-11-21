/** Local calendar date, formatted YYYY-MM-DD. */
export type ISODate = string;

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface Profile {
  sex: Sex;
  age: number;
  heightCm: number;
  activity: ActivityLevel;
  /** Extra kcal per day on top of maintenance (lean bulk: 250–500). */
  surplusKcal: number;
  /** Grams of protein per kg of body weight (1.6–2.2 for muscle gain). */
  proteinPerKg: number;
  waterGoalMl: number;
  sleepGoalH: number;
}

export type FoodCategory =
  | 'Cereals'
  | 'Grains & Bread'
  | 'Meat & Fish'
  | 'Dairy & Eggs'
  | 'Legumes & Tofu'
  | 'Fruit'
  | 'Vegetables'
  | 'Nuts, Seeds & Oils'
  | 'Meals & Fast food'
  | 'Supplements'
  | 'Snacks & Other';

/** Nutrition values are per 100 g. */
export interface Food {
  id: string;
  name: string;
  category: FoodCategory;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Optional household unit, e.g. 1 egg = 50 g. */
  unit?: { label: string; grams: number };
  /** Extra search words, e.g. other names for the food. */
  keywords?: string;
  custom?: boolean;
}

export type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
export const MEAL_SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export interface FoodEntry {
  id: string;
  date: ISODate;
  foodId: string;
  grams: number;
  meal: MealSlot;
}

export interface SavedMeal {
  id: string;
  name: string;
  items: { foodId: string; grams: number }[];
}

export interface WeightEntry {
  date: ISODate;
  kg: number;
}

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'core',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
];

export type Equipment = 'none' | 'chair' | 'table' | 'bar';

export interface Exercise {
  id: string;
  name: string;
  aliases?: string[];
  muscles: MuscleGroup[];
  /** 'reps' are counted, 'time' are held in seconds. */
  kind: 'reps' | 'time';
  equipment: Equipment;
  /** Next progression once the rep range is mastered. */
  harder?: string;
  perSide?: boolean;
  tip?: string;
  custom?: boolean;
}

export interface SetLog {
  /** Reps for 'reps' exercises, seconds for 'time' exercises. */
  value: number;
  /** Optional added load (backpack, dumbbell…). */
  weightKg?: number;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
  /** The target used for this session (if it came from a plan). */
  target?: number;
}

export interface Workout {
  id: string;
  date: ISODate;
  programId?: string;
  dayId?: string;
  exercises: ExerciseLog[];
  note?: string;
}

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  /** Rep (or seconds) range for double progression. */
  min: number;
  max: number;
}

export interface ProgramDay {
  id: string;
  name: string;
  exercises: PlannedExercise[];
}

export interface Program {
  id: string;
  name: string;
  description: string;
  daysPerWeek: number;
  days: ProgramDay[];
}

export type ShopCategory =
  | 'Produce'
  | 'Meat & Fish'
  | 'Dairy & Eggs'
  | 'Grains & Bread'
  | 'Pantry'
  | 'Frozen'
  | 'Other';

export const SHOP_CATEGORIES: ShopCategory[] = [
  'Produce',
  'Meat & Fish',
  'Dairy & Eggs',
  'Grains & Bread',
  'Pantry',
  'Frozen',
  'Other',
];

export interface ShoppingItem {
  id: string;
  name: string;
  qty?: string;
  category: ShopCategory;
  checked: boolean;
}

export interface Staple {
  name: string;
  category: ShopCategory;
}

export interface DayHabits {
  waterMl: number;
  sleepH?: number;
}

export interface ActiveSetDraft {
  value: number;
  weightKg?: number;
  done: boolean;
}

/** A workout in progress (persisted so a reload doesn't lose it). */
export interface ActiveSession {
  title: string;
  date: ISODate;
  programId?: string;
  dayId?: string;
  startedAt: number;
  items: { exerciseId: string; target: number; note?: string; sets: ActiveSetDraft[] }[];
}

export interface AppState {
  version: 1;
  profile: Profile | null;
  customFoods: Food[];
  entries: FoodEntry[];
  savedMeals: SavedMeal[];
  weights: WeightEntry[];
  customExercises: Exercise[];
  workouts: Workout[];
  activeProgramId: string;
  shopping: ShoppingItem[];
  staples: Staple[];
  habits: Record<ISODate, DayHabits>;
  restSeconds: number;
  activeSession?: ActiveSession;
}
