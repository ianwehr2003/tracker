/**
 * Quick, cheap student meals built from the built-in foods. Amounts are one
 * hungry portion for someone bulking. Add more ideas here; every foodId must
 * exist in foods.ts (a unit test checks this).
 */
export type MealTag = 'breakfast' | 'main' | 'snack' | 'veggie';

export interface MealIdea {
  id: string;
  name: string;
  emoji: string;
  minutes: number;
  tags: MealTag[];
  how: string;
  items: { foodId: string; grams: number }[];
}

export const MEAL_IDEAS: MealIdea[] = [
  // Breakfast
  {
    id: 'protein-oats',
    name: 'Protein oats',
    emoji: '🥣',
    minutes: 5,
    tags: ['breakfast'],
    how: 'Microwave oats with milk for 2 min, stir in whey, top with sliced banana.',
    items: [
      { foodId: 'oats', grams: 80 },
      { foodId: 'milk-semi', grams: 250 },
      { foodId: 'whey', grams: 30 },
      { foodId: 'banana', grams: 120 },
    ],
  },
  {
    id: 'eggs-toast',
    name: 'Scrambled eggs on toast',
    emoji: '🍳',
    minutes: 10,
    tags: ['breakfast', 'veggie'],
    how: 'Scramble 3 eggs in butter on low heat, serve on 2 slices of toast.',
    items: [
      { foodId: 'egg', grams: 150 },
      { foodId: 'bread-wholewheat', grams: 60 },
      { foodId: 'butter', grams: 7 },
    ],
  },
  {
    id: 'yogurt-bowl',
    name: 'Greek yogurt bowl',
    emoji: '🫐',
    minutes: 2,
    tags: ['breakfast', 'snack', 'veggie'],
    how: 'Yogurt, granola, berries, drizzle of honey. No cooking.',
    items: [
      { foodId: 'greek-yogurt-0', grams: 250 },
      { foodId: 'granola', grams: 40 },
      { foodId: 'blueberries', grams: 80 },
      { foodId: 'honey', grams: 10 },
    ],
  },
  {
    id: 'pb-banana-toast',
    name: 'PB & banana toast',
    emoji: '🍌',
    minutes: 3,
    tags: ['breakfast', 'snack', 'veggie'],
    how: 'Toast, spread peanut butter, add banana slices.',
    items: [
      { foodId: 'bread-wholewheat', grams: 60 },
      { foodId: 'peanut-butter', grams: 30 },
      { foodId: 'banana', grams: 120 },
    ],
  },

  // Mains
  {
    id: 'tuna-pasta',
    name: 'Tuna tomato pasta',
    emoji: '🍝',
    minutes: 15,
    tags: ['main'],
    how: 'Boil pasta. Warm passata with drained tuna, mix in, top with cheese.',
    items: [
      { foodId: 'pasta-dry', grams: 120 },
      { foodId: 'tuna-can', grams: 120 },
      { foodId: 'passata', grams: 150 },
      { foodId: 'cheddar', grams: 20 },
    ],
  },
  {
    id: 'pesto-chicken-pasta',
    name: 'Pesto chicken pasta',
    emoji: '🌿',
    minutes: 20,
    tags: ['main'],
    how: 'Pan-fry diced chicken while pasta boils. Toss together with pesto and parmesan.',
    items: [
      { foodId: 'pasta-dry', grams: 120 },
      { foodId: 'chicken-breast-raw', grams: 150 },
      { foodId: 'pesto', grams: 30 },
      { foodId: 'parmesan', grams: 10 },
    ],
  },
  {
    id: 'bolognese',
    name: 'Spaghetti bolognese',
    emoji: '🍅',
    minutes: 25,
    tags: ['main'],
    how: 'Fry onion and mince, add passata, simmer 10 min. Cook double and keep half for tomorrow.',
    items: [
      { foodId: 'pasta-dry', grams: 120 },
      { foodId: 'beef-mince-lean', grams: 150 },
      { foodId: 'passata', grams: 200 },
      { foodId: 'onion', grams: 50 },
      { foodId: 'olive-oil', grams: 5 },
    ],
  },
  {
    id: 'chicken-rice-veg',
    name: 'Chicken, rice & veg',
    emoji: '🍗',
    minutes: 20,
    tags: ['main'],
    how: 'The classic gym meal. Cook rice, pan-fry chicken in oil, microwave frozen veg. Season well!',
    items: [
      { foodId: 'rice-dry', grams: 100 },
      { foodId: 'chicken-breast-raw', grams: 180 },
      { foodId: 'mixed-veg-frozen', grams: 150 },
      { foodId: 'olive-oil', grams: 10 },
    ],
  },
  {
    id: 'chicken-wraps',
    name: 'Chicken wraps',
    emoji: '🌯',
    minutes: 10,
    tags: ['main'],
    how: '2 wraps with cooked chicken, cheese, pepper and Greek yogurt as sauce.',
    items: [
      { foodId: 'tortilla', grams: 120 },
      { foodId: 'chicken-breast-cooked', grams: 120 },
      { foodId: 'cheddar', grams: 20 },
      { foodId: 'bell-pepper', grams: 75 },
      { foodId: 'greek-yogurt-0', grams: 50 },
    ],
  },
  {
    id: 'beans-toast-egg',
    name: 'Beans on toast + egg',
    emoji: '🫘',
    minutes: 5,
    tags: ['main', 'breakfast', 'veggie'],
    how: 'Heat half a can of beans, fry an egg, pile on toast.',
    items: [
      { foodId: 'baked-beans', grams: 200 },
      { foodId: 'bread-wholewheat', grams: 60 },
      { foodId: 'egg', grams: 50 },
    ],
  },
  {
    id: 'upgraded-noodles',
    name: 'Upgraded instant noodles',
    emoji: '🍜',
    minutes: 5,
    tags: ['main', 'veggie'],
    how: 'Cook noodles with frozen veg, crack 2 eggs in for the last minute.',
    items: [
      { foodId: 'instant-noodles', grams: 85 },
      { foodId: 'egg', grams: 100 },
      { foodId: 'mixed-veg-frozen', grams: 100 },
    ],
  },
  {
    id: 'chickpea-stew',
    name: 'Chickpea tomato stew & rice',
    emoji: '🥘',
    minutes: 20,
    tags: ['main', 'veggie'],
    how: 'Simmer a can of chickpeas in passata, stir in spinach. Serve with rice.',
    items: [
      { foodId: 'chickpeas-cooked', grams: 240 },
      { foodId: 'passata', grams: 200 },
      { foodId: 'spinach', grams: 60 },
      { foodId: 'rice-dry', grams: 80 },
      { foodId: 'olive-oil', grams: 10 },
    ],
  },
  {
    id: 'tofu-stir-fry',
    name: 'Tofu stir-fry',
    emoji: '🥢',
    minutes: 15,
    tags: ['main', 'veggie'],
    how: 'Fry cubed tofu until golden, add frozen veg, serve over rice.',
    items: [
      { foodId: 'tofu', grams: 200 },
      { foodId: 'rice-dry', grams: 80 },
      { foodId: 'mixed-veg-frozen', grams: 150 },
      { foodId: 'olive-oil', grams: 10 },
    ],
  },

  // Snacks
  {
    id: 'gainer-shake',
    name: 'Homemade gainer shake',
    emoji: '🥤',
    minutes: 2,
    tags: ['snack', 'breakfast'],
    how: 'Blend (or shake hard) milk, whey, banana, peanut butter. Easy 600 kcal.',
    items: [
      { foodId: 'milk-whole', grams: 300 },
      { foodId: 'whey', grams: 30 },
      { foodId: 'banana', grams: 120 },
      { foodId: 'peanut-butter', grams: 15 },
      { foodId: 'oats', grams: 30 },
    ],
  },
  {
    id: 'cottage-apple',
    name: 'Cottage cheese & apple',
    emoji: '🍎',
    minutes: 1,
    tags: ['snack', 'veggie'],
    how: 'High-protein snack before bed.',
    items: [
      { foodId: 'cottage-cheese', grams: 200 },
      { foodId: 'apple', grams: 180 },
    ],
  },
  {
    id: 'trail-mix',
    name: 'Nuts & dates',
    emoji: '🥜',
    minutes: 0,
    tags: ['snack', 'veggie'],
    how: 'Keep a bag in your backpack for lectures. Dense calories.',
    items: [
      { foodId: 'almonds', grams: 30 },
      { foodId: 'dates', grams: 40 },
    ],
  },
];
