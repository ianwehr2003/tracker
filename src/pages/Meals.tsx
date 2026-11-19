import { useState } from 'react';
import { AddFoodSheet } from '../components/AddFoodSheet';
import { MEAL_IDEAS, type MealIdea, type MealTag } from '../data/mealIdeas';
import { Card, Empty, Sheet, fmt } from '../components/ui';
import { uid } from '../lib/id';
import { macrosFor, sumEntries, type Macros } from '../lib/nutrition';
import { useStore } from '../lib/store';
import { MEAL_SLOTS, type Food, type MealSlot, type SavedMeal } from '../lib/types';
import type { Tab } from '../App';

type Item = SavedMeal['items'][number];

function totalsOf(items: Item[], foods: Map<string, Food>): Macros {
  return sumEntries(
    items.map((i) => ({ ...i, id: '', date: '', meal: 'Snacks' as MealSlot })),
    foods,
  );
}

/** Default meal slot for "log now", based on the time of day. */
function slotNow(): MealSlot {
  const h = new Date().getHours();
  if (h < 11) return 'Breakfast';
  if (h < 16) return 'Lunch';
  if (h < 21) return 'Dinner';
  return 'Snacks';
}

export function MealsPage({ go }: { go: (t: Tab) => void }) {
  const { state, update, foods } = useStore();
  const [editing, setEditing] = useState<SavedMeal | 'new' | null>(null);
  const [logging, setLogging] = useState<SavedMeal | null>(null);
  const [flash, setFlash] = useState('');
  const [view, setView] = useState<'mine' | 'ideas'>(state.savedMeals.length ? 'mine' : 'ideas');

  const meals = [...state.savedMeals].sort((a, b) => a.name.localeCompare(b.name));
  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(''), 3000);
  };

  return (
    <div className="stack">
      <div className="row between">
        <button className="link" onClick={() => go('food')}>
          ‹ Food diary
        </button>
        <button className="btn small primary" onClick={() => setEditing('new')}>
          + New meal
        </button>
      </div>
      <h1>🍱 Meals</h1>
      <div className="segmented">
        <button className={view === 'mine' ? 'active' : ''} onClick={() => setView('mine')}>
          My meals{meals.length ? ` (${meals.length})` : ''}
        </button>
        <button className={view === 'ideas' ? 'active' : ''} onClick={() => setView('ideas')}>
          ⚡ Quick ideas
        </button>
      </div>
      {flash && <p className="callout ok">{flash}</p>}

      {view === 'ideas' && (
        <IdeasList
          onLog={(idea) => setLogging({ id: idea.id, name: idea.name, items: idea.items })}
          onSave={(idea) => {
            update((s) => ({ ...s, savedMeals: [...s.savedMeals, { id: uid(), name: idea.name, items: idea.items.map((i) => ({ ...i })) }] }));
            showFlash(`✓ ${idea.name} saved to My meals. Edit it there to match your portions.`);
          }}
          savedNames={new Set(meals.map((m) => m.name))}
        />
      )}

      {view === 'mine' && (
        <p className="hint">Save the meals you eat often, like your usual breakfast or a post-workout shake, then log them with one tap.</p>
      )}

      {view === 'mine' && !meals.length && (
        <Card>
          <Empty>No meals yet.</Empty>
          <button className="btn primary" onClick={() => setEditing('new')}>
            Create your first meal
          </button>
          <button className="btn" onClick={() => setView('ideas')}>
            ⚡ Or pick from quick ideas
          </button>
        </Card>
      )}

      {view === 'mine' && meals.map((m) => {
        const t = totalsOf(m.items, foods);
        return (
          <Card
            key={m.id}
            title={m.name}
            action={
              <button className="btn small primary" onClick={() => setLogging(m)}>
                Log
              </button>
            }
          >
            <div className="macro-row">
              <div>
                <b className="num">{fmt(t.kcal)}</b>
                <small>kcal</small>
              </div>
              <div>
                <b className="num">{fmt(t.protein)}</b>
                <small>protein</small>
              </div>
              <div>
                <b className="num">{fmt(t.carbs)}</b>
                <small>carbs</small>
              </div>
              <div>
                <b className="num">{fmt(t.fat)}</b>
                <small>fat</small>
              </div>
            </div>
            <ul className="compact muted small">
              {m.items.map((i, k) => (
                <li key={k}>
                  {foods.get(i.foodId)?.name ?? 'Deleted food'} · {fmt(i.grams)} g
                </li>
              ))}
            </ul>
            <div className="row gap-s">
              <button className="link" onClick={() => setEditing(m)}>
                Edit
              </button>
              <button
                className="link"
                onClick={() =>
                  update((s) => ({ ...s, savedMeals: [...s.savedMeals, { ...m, id: uid(), name: `${m.name} (copy)`, items: m.items.map((i) => ({ ...i })) }] }))
                }
              >
                Duplicate
              </button>
            </div>
          </Card>
        );
      })}

      {editing && (
        <MealEditor
          meal={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={(meal) => {
            update((s) => ({
              ...s,
              savedMeals: s.savedMeals.some((x) => x.id === meal.id) ? s.savedMeals.map((x) => (x.id === meal.id ? meal : x)) : [...s.savedMeals, meal],
            }));
            setEditing(null);
          }}
          onDelete={(id) => {
            update((s) => ({ ...s, savedMeals: s.savedMeals.filter((x) => x.id !== id) }));
            setEditing(null);
          }}
        />
      )}

      {logging && (
        <LogMealSheet
          meal={logging}
          onClose={() => setLogging(null)}
          onLogged={(slot) => {
            setLogging(null);
            showFlash(`✓ ${logging.name} added to today’s ${slot.toLowerCase()}.`);
          }}
        />
      )}
    </div>
  );
}

function MealEditor({ meal, onClose, onSave, onDelete }: { meal?: SavedMeal; onClose: () => void; onSave: (m: SavedMeal) => void; onDelete: (id: string) => void }) {
  const { foods } = useStore();
  const [name, setName] = useState(meal?.name ?? '');
  const [items, setItems] = useState<Item[]>(meal?.items.map((i) => ({ ...i })) ?? []);
  const [picking, setPicking] = useState(false);
  const t = totalsOf(items, foods);

  const setGrams = (k: number, grams: number) => setItems((xs) => xs.map((x, j) => (j === k ? { ...x, grams } : x)));

  return (
    <>
      <Sheet title={meal ? 'Edit meal' : 'New meal'} onClose={onClose}>
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Protein oats, Pasta bolognese" autoFocus={!meal} />
        </label>

        <div className="field">
          <span>Ingredients</span>
          {!items.length && <p className="hint">No ingredients yet.</p>}
          <ul className="list">
            {items.map((i, k) => {
              const f = foods.get(i.foodId);
              const m = f ? macrosFor(f, i.grams) : undefined;
              return (
                <li key={k} className="ingredient">
                  <span className="grow">
                    {f?.name ?? 'Deleted food'}
                    <small>{m ? `${fmt(m.kcal)} kcal · ${fmt(m.protein, 1)} g protein` : ''}</small>
                  </span>
                  <div className="input-suffix grams">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={i.grams || ''}
                      onChange={(e) => setGrams(k, Number(e.target.value) || 0)}
                      aria-label={`Grams of ${f?.name}`}
                    />
                    <em>g</em>
                  </div>
                  <button className="icon-btn" aria-label={`Remove ${f?.name}`} onClick={() => setItems((xs) => xs.filter((_, j) => j !== k))}>
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
          <button className="btn" onClick={() => setPicking(true)}>
            + Add ingredient
          </button>
        </div>

        {items.length > 0 && (
          <p className="muted num center">
            Total: <b>{fmt(t.kcal)} kcal</b> · {fmt(t.protein)} g protein · {fmt(t.carbs)} g carbs · {fmt(t.fat)} g fat
          </p>
        )}

        <div className="row gap-s">
          {meal && (
            <button className="btn danger" onClick={() => confirm(`Delete “${meal.name}”?`) && onDelete(meal.id)}>
              Delete
            </button>
          )}
          <button
            className="btn primary grow"
            disabled={!name.trim() || !items.some((i) => i.grams > 0)}
            onClick={() => onSave({ id: meal?.id ?? uid(), name: name.trim(), items: items.filter((i) => i.grams > 0) })}
          >
            Save meal
          </button>
        </div>
      </Sheet>
      {picking && <AddFoodSheet title="Add ingredient" onClose={() => setPicking(false)} onPick={(added) => setItems((xs) => [...xs, ...added])} />}
    </>
  );
}

function LogMealSheet({ meal, onClose, onLogged }: { meal: SavedMeal; onClose: () => void; onLogged: (slot: MealSlot) => void }) {
  const { update, date, foods } = useStore();
  const [slot, setSlot] = useState<MealSlot>(slotNow);
  const [portion, setPortion] = useState(1);
  const t = totalsOf(meal.items, foods);

  return (
    <Sheet title={`Log ${meal.name}`} onClose={onClose}>
      <div className="field">
        <span>Add to today’s</span>
        <div className="segmented">
          {MEAL_SLOTS.map((s) => (
            <button key={s} className={slot === s ? 'active' : ''} onClick={() => setSlot(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Portion</span>
        <div className="row gap-s wrap">
          {[0.5, 1, 1.5, 2].map((p) => (
            <button key={p} className={`chip ${portion === p ? 'active' : ''}`} onClick={() => setPortion(p)}>
              {p === 0.5 ? '½' : p === 1.5 ? '1½' : p}×
            </button>
          ))}
        </div>
      </div>
      <p className="muted num">
        {fmt(t.kcal * portion)} kcal · {fmt(t.protein * portion)} g protein
      </p>
      <button
        className="btn primary"
        onClick={() => {
          update((s) => ({
            ...s,
            entries: [...s.entries, ...meal.items.map((i) => ({ id: uid(), date, meal: slot, foodId: i.foodId, grams: Math.round(i.grams * portion * 10) / 10 }))],
          }));
          onLogged(slot);
        }}
      >
        Add to {slot}
      </button>
    </Sheet>
  );
}

type Filter = 'all' | MealTag | 'protein';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'main', label: 'Lunch & dinner' },
  { id: 'snack', label: 'Snacks' },
  { id: 'veggie', label: 'Vegetarian' },
  { id: 'protein', label: '35 g+ protein' },
];

function IdeasList({ onLog, onSave, savedNames }: { onLog: (i: MealIdea) => void; onSave: (i: MealIdea) => void; savedNames: Set<string> }) {
  const { foods } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const ideas = MEAL_IDEAS.map((idea) => ({ idea, t: totalsOf(idea.items, foods) })).filter(({ idea, t }) =>
    filter === 'all' ? true : filter === 'protein' ? t.protein >= 35 : idea.tags.includes(filter),
  );

  return (
    <>
      <p className="hint">Fast, cheap meals that help you hit your calories and protein. Log one straight away, or save it to My meals and adjust the amounts.</p>
      <div className="chips-scroll">
        {FILTERS.map((f) => (
          <button key={f.id} className={`chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      {ideas.map(({ idea, t }) => (
        <Card key={idea.id}>
          <div className="idea-head">
            <span className="idea-emoji" aria-hidden>
              {idea.emoji}
            </span>
            <div className="grow">
              <h2>{idea.name}</h2>
              <div className="muted small num">
                {idea.minutes ? `⏱ ${idea.minutes} min` : '⏱ no cooking'} · <b>{fmt(t.kcal)} kcal</b> · <b>{fmt(t.protein)} g protein</b>
              </div>
            </div>
          </div>
          <p className="hint">{idea.how}</p>
          <details>
            <summary className="muted small">Ingredients</summary>
            <ul className="compact muted small">
              {idea.items.map((i) => {
                const f = foods.get(i.foodId);
                const units = f?.unit && i.grams % f.unit.grams === 0 ? ` (${i.grams / f.unit.grams} ${f.unit.label})` : '';
                return (
                  <li key={i.foodId}>
                    {f?.name} · {i.grams} g{units}
                  </li>
                );
              })}
            </ul>
          </details>
          <div className="row gap-s">
            <button className="btn small primary" onClick={() => onLog(idea)}>
              Log
            </button>
            <button className="btn small" onClick={() => onSave(idea)} disabled={savedNames.has(idea.name)}>
              {savedNames.has(idea.name) ? 'Saved ✓' : '+ Save to my meals'}
            </button>
          </div>
        </Card>
      ))}
    </>
  );
}
