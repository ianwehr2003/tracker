import type { Food, FoodCategory } from '../lib/types';

/**
 * Built-in foods. Values are per 100 g and approximate (mostly USDA FoodData Central).
 * Brands vary — add a custom food with your package's label values for best accuracy.
 * Note raw/dry vs cooked: 100 g dry pasta ≈ 250 g cooked.
 */
type Row = [id: string, name: string, kcal: number, protein: number, carbs: number, fat: number, unit?: [string, number]];

const table: Record<FoodCategory, Row[]> = {
  'Grains & Bread': [
    ['pasta-dry', 'Pasta (dry)', 371, 13, 75, 1.5],
    ['pasta-cooked', 'Pasta (cooked)', 158, 5.8, 31, 0.9],
    ['rice-dry', 'White rice (dry)', 365, 7.1, 80, 0.7],
    ['rice-cooked', 'White rice (cooked)', 130, 2.7, 28, 0.3],
    ['brown-rice-cooked', 'Brown rice (cooked)', 123, 2.7, 26, 1],
    ['oats', 'Oats, rolled (dry)', 379, 13.2, 68, 6.5],
    ['bread-white', 'Bread, white', 265, 9, 49, 3.2, ['slice', 30]],
    ['bread-wholewheat', 'Bread, whole wheat', 247, 13, 41, 3.4, ['slice', 30]],
    ['tortilla', 'Tortilla wrap (wheat)', 310, 8.3, 51, 7.8, ['wrap', 60]],
    ['quinoa-cooked', 'Quinoa (cooked)', 120, 4.4, 21, 1.9],
    ['potato', 'Potato (raw)', 77, 2, 17, 0.1],
    ['sweet-potato', 'Sweet potato (raw)', 86, 1.6, 20, 0.1],
    ['rice-cakes', 'Rice cakes', 387, 8.2, 81.5, 2.8, ['cake', 9]],
    ['granola', 'Granola', 471, 10, 64, 20],
  ],
  'Meat & Fish': [
    ['chicken-breast-raw', 'Chicken breast (raw)', 120, 22.5, 0, 2.6],
    ['chicken-breast-cooked', 'Chicken breast (cooked)', 165, 31, 0, 3.6],
    ['beef-mince-lean', 'Beef mince 10% fat (raw)', 176, 20, 0, 10],
    ['beef-mince-20', 'Beef mince 20% fat (raw)', 254, 17, 0, 20],
    ['turkey-breast', 'Turkey breast (raw)', 114, 23.7, 0, 1.5],
    ['pork-loin', 'Pork loin (raw)', 143, 21, 0, 5.9],
    ['ham', 'Ham, sliced', 145, 21, 1.5, 6, ['slice', 20]],
    ['salmon', 'Salmon (raw)', 208, 20, 0, 13],
    ['tuna-can', 'Tuna, canned in water (drained)', 116, 25.5, 0, 0.8, ['can', 120]],
    ['shrimp', 'Shrimp/prawns (raw)', 85, 20, 0, 0.5],
  ],
  'Dairy & Eggs': [
    ['egg', 'Egg, whole', 143, 12.6, 0.7, 9.5, ['egg', 50]],
    ['egg-white', 'Egg whites', 52, 10.9, 0.7, 0.2],
    ['milk-whole', 'Milk, whole', 61, 3.2, 4.8, 3.3, ['glass', 250]],
    ['milk-semi', 'Milk, semi-skimmed', 50, 3.3, 4.8, 2, ['glass', 250]],
    ['greek-yogurt-0', 'Greek yogurt 0%', 59, 10.2, 3.6, 0.4],
    ['greek-yogurt-full', 'Greek yogurt, full fat', 97, 9, 4, 5],
    ['cottage-cheese', 'Cottage cheese (low fat)', 81, 10.5, 4.8, 2.3],
    ['cheddar', 'Cheddar cheese', 403, 25, 1.3, 33],
    ['mozzarella', 'Mozzarella', 280, 22, 2.2, 20],
    ['butter', 'Butter', 717, 0.9, 0.1, 81, ['tbsp', 14]],
  ],
  'Legumes & Tofu': [
    ['lentils-dry', 'Lentils (dry)', 352, 24.6, 63, 1.1],
    ['lentils-cooked', 'Lentils (cooked)', 116, 9, 20, 0.4],
    ['chickpeas-cooked', 'Chickpeas (cooked/canned)', 164, 8.9, 27.4, 2.6],
    ['black-beans-cooked', 'Black beans (cooked)', 132, 8.9, 23.7, 0.5],
    ['tofu', 'Tofu, firm', 144, 17.3, 2.8, 8.7],
    ['hummus', 'Hummus', 166, 7.9, 14.3, 9.6],
  ],
  Fruit: [
    ['banana', 'Banana', 89, 1.1, 23, 0.3, ['banana', 120]],
    ['apple', 'Apple', 52, 0.3, 14, 0.2, ['apple', 180]],
    ['orange', 'Orange', 47, 0.9, 12, 0.1, ['orange', 140]],
    ['blueberries', 'Blueberries', 57, 0.7, 14.5, 0.3],
    ['avocado', 'Avocado', 160, 2, 8.5, 14.7, ['avocado', 150]],
    ['dates', 'Dates, dried', 282, 2.5, 75, 0.4, ['date', 8]],
    ['raisins', 'Raisins', 299, 3.1, 79, 0.5],
    ['orange-juice', 'Orange juice', 45, 0.7, 10.4, 0.2, ['glass', 250]],
  ],
  Vegetables: [
    ['broccoli', 'Broccoli', 34, 2.8, 7, 0.4],
    ['spinach', 'Spinach', 23, 2.9, 3.6, 0.4],
    ['tomato', 'Tomato', 18, 0.9, 3.9, 0.2, ['tomato', 120]],
    ['carrot', 'Carrot', 41, 0.9, 9.6, 0.2, ['carrot', 60]],
    ['bell-pepper', 'Bell pepper', 31, 1, 6, 0.3, ['pepper', 150]],
    ['onion', 'Onion', 40, 1.1, 9.3, 0.1],
    ['mixed-veg-frozen', 'Mixed vegetables (frozen)', 65, 2.9, 13, 0.2],
  ],
  'Nuts, Seeds & Oils': [
    ['peanut-butter', 'Peanut butter', 588, 25, 20, 50, ['tbsp', 15]],
    ['almonds', 'Almonds', 579, 21, 22, 50],
    ['walnuts', 'Walnuts', 654, 15, 14, 65],
    ['olive-oil', 'Olive oil', 884, 0, 0, 100, ['tbsp', 14]],
    ['chia', 'Chia seeds', 486, 17, 42, 31, ['tbsp', 12]],
  ],
  Supplements: [
    ['whey', 'Whey protein powder', 400, 80, 8, 6, ['scoop', 30]],
  ],
  'Snacks & Other': [
    ['dark-chocolate', 'Dark chocolate 70%', 598, 7.8, 46, 43],
    ['honey', 'Honey', 304, 0.3, 82, 0, ['tbsp', 21]],
  ],
};

export const BUILTIN_FOODS: Food[] = Object.entries(table).flatMap(([category, rows]) =>
  rows.map(([id, name, kcal, protein, carbs, fat, unit]) => ({
    id,
    name,
    category: category as FoodCategory,
    kcal,
    protein,
    carbs,
    fat,
    unit: unit ? { label: unit[0], grams: unit[1] } : undefined,
  })),
);
