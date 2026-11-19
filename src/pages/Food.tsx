import { useState } from 'react';
import { AddFoodSheet } from '../components/AddFoodSheet';
import { DateNav } from '../components/DateNav';
import { Card, NumberField, Progress, Sheet, fmt } from '../components/ui';
import { addDays } from '../lib/dates';
import { uid } from '../lib/id';
import { macrosFor, sumEntries } from '../lib/nutrition';
import { useStore } from '../lib/store';
import { MEAL_SLOTS, type FoodEntry, type MealSlot } from '../lib/types';
import type { Tab } from '../App';

export function FoodPage({ go }: { go: (t: Tab) => void }) {
  const { state, update, foods, targets, date: todayDate } = useStore();
  const [date, setDate] = useState(todayDate);
  const [adding, setAdding] = useState<MealSlot | null>(null);
  const [editing, setEditing] = useState<FoodEntry | null>(null);

  const dayEntries = state.entries.filter((e) => e.date === date);
  const totals = sumEntries(dayEntries, foods);
  const yesterday = state.entries.filter((e) => e.date === addDays(date, -1));

  const copyYesterday = (meal: MealSlot) => {
    const src = yesterday.filter((e) => e.meal === meal);
    update((s) => ({ ...s, entries: [...s.entries, ...src.map((e) => ({ ...e, id: uid(), date }))] }));
  };

  const saveAsMeal = (meal: MealSlot, items: FoodEntry[]) => {
    const name = prompt('Name this meal', meal === 'Breakfast' ? 'My breakfast' : `My ${meal.toLowerCase()}`);
    if (!name) return;
    update((s) => ({ ...s, savedMeals: [...s.savedMeals, { id: uid(), name, items: items.map(({ foodId, grams }) => ({ foodId, grams })) }] }));
  };

  return (
    <div className="stack">
      <div className="row gap-s">
        <div className="grow">
          <DateNav value={date} onChange={setDate} max={todayDate} />
        </div>
        <button className="meals-btn" onClick={() => go('meals')} aria-label="My meals">
          <span aria-hidden>🍱</span>
          Meals
        </button>
      </div>

      <Card>
        <Progress label="Calories" value={totals.kcal} target={targets?.kcal} unit=" kcal" />
        <Progress label="Protein" value={totals.protein} target={targets?.protein} unit=" g" />
        <div className="grid-2">
          <Progress label="Carbs" value={totals.carbs} target={targets?.carbs} unit=" g" />
          <Progress label="Fat" value={totals.fat} target={targets?.fat} unit=" g" />
        </div>
        {targets && totals.kcal > 0 && (
          <p className="hint">
            {totals.kcal < targets.kcal
              ? `${fmt(targets.kcal - totals.kcal)} kcal and ${fmt(Math.max(0, targets.protein - totals.protein))} g protein to go.`
              : 'Calorie target reached 🎉'}
          </p>
        )}
      </Card>

      {MEAL_SLOTS.map((meal) => {
        const items = dayEntries.filter((e) => e.meal === meal);
        const t = sumEntries(items, foods);
        const canCopy = !items.length && yesterday.some((e) => e.meal === meal);
        return (
          <Card
            key={meal}
            title={
              <>
                {meal} {items.length > 0 && <small className="muted num">{fmt(t.kcal)} kcal · {fmt(t.protein)} g P</small>}
              </>
            }
            action={
              <button className="btn small primary" onClick={() => setAdding(meal)}>
                + Add
              </button>
            }
          >
            {items.length > 0 && (
              <ul className="list">
                {items.map((e) => {
                  const f = foods.get(e.foodId);
                  const m = f ? macrosFor(f, e.grams) : undefined;
                  return (
                    <li key={e.id}>
                      <button className="list-btn" onClick={() => setEditing(e)}>
                        <span>
                          {f?.name ?? 'Deleted food'}
                          <small>{f?.unit && e.grams % f.unit.grams === 0 ? `${e.grams / f.unit.grams} ${f.unit.label} · ${e.grams} g` : `${e.grams} g`}</small>
                        </span>
                        <span className="muted num">
                          {m ? `${fmt(m.kcal)} kcal · ${fmt(m.protein, 1)} g P` : ''}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {canCopy && (
              <button className="link" onClick={() => copyYesterday(meal)}>
                Copy yesterday’s {meal.toLowerCase()}
              </button>
            )}
            {items.length > 1 && (
              <button className="link" onClick={() => saveAsMeal(meal, items)}>
                Save as meal
              </button>
            )}
          </Card>
        );
      })}

      {adding && <AddFoodSheet date={date} meal={adding} onClose={() => setAdding(null)} />}
      {editing && <EditEntrySheet entry={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditEntrySheet({ entry, onClose }: { entry: FoodEntry; onClose: () => void }) {
  const { update, foods } = useStore();
  const food = foods.get(entry.foodId);
  const [grams, setGrams] = useState<number | ''>(entry.grams);
  const [meal, setMeal] = useState(entry.meal);
  const m = food && grams ? macrosFor(food, grams) : undefined;

  return (
    <Sheet title={food?.name ?? 'Entry'} onClose={onClose}>
      <NumberField label="Grams" value={grams} onChange={setGrams} step={10} suffix="g" />
      {m && (
        <p className="muted num">
          {fmt(m.kcal)} kcal · {fmt(m.protein, 1)} g protein · {fmt(m.carbs, 1)} g carbs · {fmt(m.fat, 1)} g fat
        </p>
      )}
      <div className="segmented">
        {MEAL_SLOTS.map((s) => (
          <button key={s} className={meal === s ? 'active' : ''} onClick={() => setMeal(s)}>
            {s}
          </button>
        ))}
      </div>
      <div className="row gap-s">
        <button
          className="btn danger"
          onClick={() => {
            update((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== entry.id) }));
            onClose();
          }}
        >
          Delete
        </button>
        <button
          className="btn primary grow"
          disabled={!grams}
          onClick={() => {
            update((s) => ({ ...s, entries: s.entries.map((e) => (e.id === entry.id ? { ...e, grams: Number(grams), meal } : e)) }));
            onClose();
          }}
        >
          Save
        </button>
      </div>
    </Sheet>
  );
}
