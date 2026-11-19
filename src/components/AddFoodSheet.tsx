import { useMemo, useState } from 'react';
import { uid } from '../lib/id';
import { macrosFor } from '../lib/nutrition';
import { useStore } from '../lib/store';
import type { Food, FoodCategory, ISODate, MealSlot } from '../lib/types';
import { Empty, NumberField, Sheet, fmt } from './ui';

const CATEGORIES: FoodCategory[] = [
  'Grains & Bread',
  'Meat & Fish',
  'Dairy & Eggs',
  'Legumes & Tofu',
  'Fruit',
  'Vegetables',
  'Nuts, Seeds & Oils',
  'Supplements',
  'Snacks & Other',
];

type Tab = 'search' | 'meals' | 'custom';

/**
 * Food search + amount picker. By default it logs to the diary; pass `onPick`
 * to use it as a picker instead (e.g. adding ingredients to a saved meal).
 */
export function AddFoodSheet({
  date,
  meal,
  onClose,
  onPick,
  title,
}: {
  date?: ISODate;
  meal?: MealSlot;
  onClose: () => void;
  onPick?: (items: { foodId: string; grams: number }[]) => void;
  title?: string;
}) {
  const { state, update, allFoods, foods } = useStore();
  const [tab, setTab] = useState<Tab>('search');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Food | null>(null);

  // Most recently used foods first when nothing is typed.
  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out: Food[] = [];
    for (let i = state.entries.length - 1; i >= 0 && out.length < 12; i--) {
      const f = foods.get(state.entries[i].foodId);
      if (f && !seen.has(f.id)) {
        seen.add(f.id);
        out.push(f);
      }
    }
    return out;
  }, [state.entries, foods]);

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return recent.length ? recent : allFoods.slice(0, 20);
    return allFoods.filter((f) => words.every((w) => `${f.name} ${f.category}`.toLowerCase().includes(w))).slice(0, 40);
  }, [q, allFoods, recent]);

  const add = (items: { foodId: string; grams: number }[]) => {
    if (onPick) onPick(items);
    else if (date && meal) update((s) => ({ ...s, entries: [...s.entries, ...items.map((i) => ({ id: uid(), date, meal, ...i }))] }));
    onClose();
  };
  const actionLabel = onPick ? 'Add' : `Add to ${meal}`;

  if (picked) return <AmountSheet food={picked} actionLabel={actionLabel} onBack={() => setPicked(null)} onClose={onClose} onAdd={(g) => add([{ foodId: picked.id, grams: g }])} />;

  return (
    <Sheet title={title ?? actionLabel} onClose={onClose}>
      <div className="segmented">
        <button className={tab === 'search' ? 'active' : ''} onClick={() => setTab('search')}>
          Foods
        </button>
        <button className={tab === 'meals' ? 'active' : ''} onClick={() => setTab('meals')}>
          Saved meals
        </button>
        <button className={tab === 'custom' ? 'active' : ''} onClick={() => setTab('custom')}>
          New food
        </button>
      </div>

      {tab === 'search' && (
        <>
          <input className="search" autoFocus placeholder="Search e.g. pasta, egg, chicken…" value={q} onChange={(e) => setQ(e.target.value)} />
          {!q && recent.length > 0 && <p className="hint">Recent</p>}
          <ul className="list">
            {results.map((f) => (
              <li key={f.id}>
                <button className="list-btn" onClick={() => setPicked(f)}>
                  <span>
                    {f.name}
                    {f.custom && <span className="tag">custom</span>}
                    <small>{f.category}</small>
                  </span>
                  <span className="muted num">
                    {f.kcal} kcal · {f.protein}g P<small>per 100 g</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {q && !results.length && (
            <Empty>
              No match.{' '}
              <button className="link" onClick={() => setTab('custom')}>
                Create “{q}”
              </button>
            </Empty>
          )}
        </>
      )}

      {tab === 'meals' && (
        <ul className="list">
          {!state.savedMeals.length && <Empty>No saved meals yet. Create them on the 🍱 Meals page, or tap “Save as meal” under a meal in your diary.</Empty>}
          {state.savedMeals.map((m) => {
            const kcal = m.items.reduce((s, i) => s + (foods.get(i.foodId) ? macrosFor(foods.get(i.foodId)!, i.grams).kcal : 0), 0);
            const protein = m.items.reduce((s, i) => s + (foods.get(i.foodId) ? macrosFor(foods.get(i.foodId)!, i.grams).protein : 0), 0);
            return (
              <li key={m.id} className="row">
                <button className="list-btn grow" onClick={() => add(m.items)}>
                  <span>
                    {m.name}
                    <small>{m.items.map((i) => foods.get(i.foodId)?.name).filter(Boolean).join(', ')}</small>
                  </span>
                  <span className="muted num">
                    {fmt(kcal)} kcal · {fmt(protein)}g P
                  </span>
                </button>
                <button
                  className="icon-btn"
                  aria-label={`Delete ${m.name}`}
                  onClick={() => confirm(`Delete saved meal “${m.name}”?`) && update((s) => ({ ...s, savedMeals: s.savedMeals.filter((x) => x.id !== m.id) }))}
                >
                  🗑
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'custom' && (
        <CustomFoodForm
          initialName={q}
          onSave={(f) => {
            update((s) => ({ ...s, customFoods: [...s.customFoods, f] }));
            setPicked(f);
          }}
        />
      )}
    </Sheet>
  );
}

function AmountSheet({ food, actionLabel, onBack, onClose, onAdd }: { food: Food; actionLabel: string; onBack: () => void; onClose: () => void; onAdd: (grams: number) => void }) {
  const [useUnit, setUseUnit] = useState(!!food.unit);
  const [amount, setAmount] = useState<number | ''>(food.unit ? 1 : 100);
  const grams = amount === '' ? 0 : useUnit && food.unit ? amount * food.unit.grams : amount;
  const m = macrosFor(food, grams);

  return (
    <Sheet title={food.name} onClose={onClose}>
      <button className="link" onClick={onBack}>
        ‹ Back to search
      </button>
      {food.unit && (
        <div className="segmented">
          <button
            className={!useUnit ? 'active' : ''}
            onClick={() => {
              setUseUnit(false);
              setAmount(Math.round(grams) || 100);
            }}
          >
            grams
          </button>
          <button
            className={useUnit ? 'active' : ''}
            onClick={() => {
              setUseUnit(true);
              setAmount(Math.max(1, Math.round(grams / food.unit!.grams)));
            }}
          >
            {food.unit.label} ({food.unit.grams} g)
          </button>
        </div>
      )}
      <NumberField label="Amount" value={amount} onChange={setAmount} step={useUnit ? 0.5 : 10} suffix={useUnit ? food.unit!.label : 'g'} />
      <div className="row gap-s wrap">
        {(useUnit ? [1, 2, 3, 4] : [50, 100, 150, 200, 250]).map((v) => (
          <button key={v} className={`chip ${amount === v ? 'active' : ''}`} onClick={() => setAmount(v)}>
            {v}
            {useUnit ? '' : ' g'}
          </button>
        ))}
      </div>
      <div className="macro-row">
        <div>
          <b className="num">{fmt(m.kcal)}</b>
          <small>kcal</small>
        </div>
        <div>
          <b className="num">{fmt(m.protein, 1)}</b>
          <small>protein</small>
        </div>
        <div>
          <b className="num">{fmt(m.carbs, 1)}</b>
          <small>carbs</small>
        </div>
        <div>
          <b className="num">{fmt(m.fat, 1)}</b>
          <small>fat</small>
        </div>
      </div>
      <button className="btn primary" disabled={grams <= 0} onClick={() => onAdd(Math.round(grams * 10) / 10)}>
        {actionLabel.replace('Add', `Add ${fmt(grams)} g`)}
      </button>
    </Sheet>
  );
}

function CustomFoodForm({ initialName, onSave }: { initialName: string; onSave: (f: Food) => void }) {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<FoodCategory>('Snacks & Other');
  const [v, setV] = useState<Record<'kcal' | 'protein' | 'carbs' | 'fat' | 'unitGrams', number | ''>>({ kcal: '', protein: '', carbs: '', fat: '', unitGrams: '' });
  const [unitLabel, setUnitLabel] = useState('');
  const n = (x: number | '') => (x === '' ? 0 : x);
  const ok = name.trim() && v.kcal !== '';

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ok) return;
        onSave({
          id: `custom-${uid()}`,
          name: name.trim(),
          category,
          kcal: n(v.kcal),
          protein: n(v.protein),
          carbs: n(v.carbs),
          fat: n(v.fat),
          unit: unitLabel.trim() && n(v.unitGrams) > 0 ? { label: unitLabel.trim(), grams: n(v.unitGrams) } : undefined,
          custom: true,
        });
      }}
    >
      <p className="hint">Copy the “per 100 g” column from the package label.</p>
      <label className="field">
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Barilla Fusilli (dry)" />
      </label>
      <label className="field">
        <span>Category</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as FoodCategory)}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <div className="grid-2">
        <NumberField label="Calories /100g" value={v.kcal} onChange={(x) => setV({ ...v, kcal: x })} suffix="kcal" />
        <NumberField label="Protein /100g" value={v.protein} onChange={(x) => setV({ ...v, protein: x })} step={0.1} suffix="g" />
        <NumberField label="Carbs /100g" value={v.carbs} onChange={(x) => setV({ ...v, carbs: x })} step={0.1} suffix="g" />
        <NumberField label="Fat /100g" value={v.fat} onChange={(x) => setV({ ...v, fat: x })} step={0.1} suffix="g" />
      </div>
      <div className="grid-2">
        <label className="field">
          <span>Unit name (optional)</span>
          <input value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} placeholder="e.g. bar, scoop" />
        </label>
        <NumberField label="Grams per unit" value={v.unitGrams} onChange={(x) => setV({ ...v, unitGrams: x })} suffix="g" />
      </div>
      <button className="btn primary" disabled={!ok}>
        Save food
      </button>
    </form>
  );
}
