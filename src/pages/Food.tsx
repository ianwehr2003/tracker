import { useEffect, useState } from 'react';
import { AddFoodSheet } from '../components/AddFoodSheet';
import { DateNav } from '../components/DateNav';
import { Card, Progress, Sheet, fmt } from '../components/ui';
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
  const [undo, setUndo] = useState<FoodEntry | null>(null);

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(t);
  }, [undo]);

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
                      <button className="list-btn" onClick={() => setEditing(e)} aria-label={`Edit ${f?.name ?? 'entry'}, ${e.grams} g`}>
                        <span>
                          {f?.name ?? 'Deleted food'}
                          <small>{f?.unit && e.grams % f.unit.grams === 0 ? `${e.grams / f.unit.grams} ${f.unit.label} · ${e.grams} g` : `${e.grams} g`}</small>
                        </span>
                        <span className="muted num">
                          {m ? `${fmt(m.kcal)} kcal · ${fmt(m.protein, 1)} g P` : ''}
                        </span>
                        <span className="edit-pencil" aria-hidden>
                          ✎
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
      {editing && <EditEntrySheet entry={editing} onClose={() => setEditing(null)} onDeleted={setUndo} />}
      {undo && (
        <div className="undo-bar" role="status">
          <span>Deleted {foods.get(undo.foodId)?.name ?? 'entry'}</span>
          <button
            className="link"
            onClick={() => {
              update((s) => ({ ...s, entries: [...s.entries, undo] }));
              setUndo(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

function EditEntrySheet({ entry, onClose, onDeleted }: { entry: FoodEntry; onClose: () => void; onDeleted: (e: FoodEntry) => void }) {
  const { update, foods, date: todayDate } = useStore();
  const [foodId, setFoodId] = useState(entry.foodId);
  const food = foods.get(foodId);
  const unit = food?.unit;
  const [useUnit, setUseUnit] = useState(!!unit && entry.grams % unit.grams === 0);
  const [amount, setAmount] = useState<number | ''>(useUnit && unit ? entry.grams / unit.grams : entry.grams);
  const [meal, setMeal] = useState(entry.meal);
  const [day, setDay] = useState(entry.date);
  const [swapping, setSwapping] = useState(false);

  const grams = amount === '' ? 0 : useUnit && unit ? amount * unit.grams : amount;
  const m = food ? macrosFor(food, grams) : undefined;
  const orig = foods.get(entry.foodId) ? macrosFor(foods.get(entry.foodId)!, entry.grams) : undefined;
  const diff = m && orig ? Math.round(m.kcal - orig.kcal) : 0;
  const step = useUnit ? 1 : grams >= 100 ? 10 : 5;
  const bump = (d: number) => setAmount((a) => Math.max(0, Math.round(((a === '' ? 0 : a) + d) * 10) / 10));

  const switchUnit = (toUnit: boolean) => {
    if (!unit) return;
    setUseUnit(toUnit);
    setAmount(toUnit ? Math.max(0.5, Math.round((grams / unit.grams) * 2) / 2) : Math.round(grams));
  };

  if (swapping) {
    return (
      <AddFoodSheet
        title="Swap for another food"
        onClose={() => setSwapping(false)}
        onPick={(items) => {
          const it = items[0];
          if (!it) return;
          const f = foods.get(it.foodId);
          setFoodId(it.foodId);
          const asUnit = !!f?.unit && it.grams % f.unit.grams === 0;
          setUseUnit(asUnit);
          setAmount(asUnit && f?.unit ? it.grams / f.unit.grams : it.grams);
        }}
      />
    );
  }

  const save = () => {
    update((s) => ({
      ...s,
      entries: s.entries.map((e) => (e.id === entry.id ? { ...e, foodId, grams: Math.round(grams * 10) / 10, meal, date: day } : e)),
    }));
    onClose();
  };

  return (
    <Sheet title="Edit food" onClose={onClose}>
      <div className="row between">
        <div className="grow">
          <b>{food?.name ?? 'Deleted food'}</b>
          {foodId !== entry.foodId && <div className="hint">was: {foods.get(entry.foodId)?.name}</div>}
        </div>
        <button className="btn small" onClick={() => setSwapping(true)}>
          ⇄ Change food
        </button>
      </div>

      {unit && (
        <div className="segmented">
          <button className={!useUnit ? 'active' : ''} onClick={() => switchUnit(false)}>
            grams
          </button>
          <button className={useUnit ? 'active' : ''} onClick={() => switchUnit(true)}>
            {unit.label} ({unit.grams} g)
          </button>
        </div>
      )}

      <div className="amount-edit">
        <button className="round-btn" onClick={() => bump(-step)} aria-label="Less">
          −
        </button>
        <div className="input-suffix grow">
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
            aria-label={useUnit ? `Number of ${unit?.label}` : 'Grams'}
          />
          <em>{useUnit ? unit?.label : 'g'}</em>
        </div>
        <button className="round-btn" onClick={() => bump(step)} aria-label="More">
          +
        </button>
      </div>
      <div className="row gap-s wrap">
        {(useUnit ? [0.5, 1, 2, 3, 4] : [50, 100, 150, 200, 250]).map((v) => (
          <button key={v} className={`chip ${amount === v ? 'active' : ''}`} onClick={() => setAmount(v)}>
            {v === 0.5 ? '½' : v}
            {useUnit ? '' : ' g'}
          </button>
        ))}
      </div>

      {m && (
        <div className="macro-row">
          <div>
            <b className="num">{fmt(m.kcal)}</b>
            <small>kcal{diff ? ` (${diff > 0 ? '+' : ''}${diff})` : ''}</small>
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
      )}

      <div className="field">
        <span>Meal</span>
        <div className="segmented">
          {MEAL_SLOTS.map((sl) => (
            <button key={sl} className={meal === sl ? 'active' : ''} onClick={() => setMeal(sl)}>
              {sl}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>Day</span>
        <input type="date" value={day} max={todayDate} onChange={(e) => e.target.value && setDay(e.target.value)} />
      </label>

      <div className="row gap-s">
        <button
          className="btn danger"
          onClick={() => {
            update((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== entry.id) }));
            onDeleted(entry);
            onClose();
          }}
        >
          Delete
        </button>
        <button
          className="btn"
          onClick={() => {
            update((s) => ({ ...s, entries: [...s.entries, { ...entry, id: uid(), foodId, grams, meal, date: day }] }));
            onClose();
          }}
          disabled={grams <= 0}
          title="Add another of this"
        >
          Duplicate
        </button>
        <button className="btn primary grow" disabled={grams <= 0 || !food} onClick={save}>
          Save
        </button>
      </div>
    </Sheet>
  );
}
