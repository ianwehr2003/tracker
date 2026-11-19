import { useMemo, useState } from 'react';
import { Card, Empty } from '../components/ui';
import { uid } from '../lib/id';
import { useStore } from '../lib/store';
import { SHOP_CATEGORIES, type FoodCategory, type ShopCategory, type ShoppingItem } from '../lib/types';

/** Map food-database categories to store sections. */
const FROM_FOOD: Record<FoodCategory, ShopCategory> = {
  'Grains & Bread': 'Grains & Bread',
  'Meat & Fish': 'Meat & Fish',
  'Dairy & Eggs': 'Dairy & Eggs',
  'Legumes & Tofu': 'Pantry',
  Fruit: 'Produce',
  Vegetables: 'Produce',
  'Nuts, Seeds & Oils': 'Pantry',
  Supplements: 'Other',
  'Snacks & Other': 'Pantry',
};

/** Food names like "Pasta (dry)" → "Pasta". */
const shopName = (n: string) => n.replace(/\s*\(.*?\)\s*/g, ' ').replace(/,.*$/, '').trim();

export function ShopPage() {
  const { state, update, allFoods } = useStore();
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [category, setCategory] = useState<ShopCategory>('Other');

  const norm = (s: string) => s.trim().toLowerCase();
  const onList = new Set(state.shopping.map((i) => norm(i.name)));
  const isStaple = (n: string) => state.staples.some((s) => norm(s.name) === norm(n));

  const suggestions = useMemo(() => {
    const q = norm(name);
    if (q.length < 2) return [];
    const names = new Map<string, ShopCategory>();
    state.staples.forEach((s) => names.set(s.name, s.category));
    allFoods.forEach((f) => names.set(shopName(f.name), FROM_FOOD[f.category]));
    return [...names.entries()].filter(([n]) => norm(n).includes(q) && !onList.has(norm(n))).slice(0, 5);
  }, [name, allFoods, state.staples, onList]);

  const add = (n: string, cat: ShopCategory, q = '') => {
    if (!n.trim() || onList.has(norm(n))) return;
    update((s) => ({ ...s, shopping: [...s.shopping, { id: uid(), name: n.trim(), qty: q.trim() || undefined, category: cat, checked: false }] }));
    setName('');
    setQty('');
  };

  const patch = (id: string, p: Partial<ShoppingItem>) => update((s) => ({ ...s, shopping: s.shopping.map((i) => (i.id === id ? { ...i, ...p } : i)) }));

  const toggleStaple = (item: ShoppingItem) =>
    update((s) => ({
      ...s,
      staples: isStaple(item.name) ? s.staples.filter((x) => norm(x.name) !== norm(item.name)) : [...s.staples, { name: item.name, category: item.category }],
    }));

  const missingStaples = state.staples.filter((s) => !onList.has(norm(s.name)));
  const checked = state.shopping.filter((i) => i.checked).length;

  return (
    <div className="stack">
      <Card title="Add item">
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            add(name, category, qty);
          }}
        >
          <div className="row gap-s">
            <input className="grow" placeholder="e.g. Pasta" value={name} onChange={(e) => setName(e.target.value)} aria-label="Item name" />
            <input className="qty" placeholder="qty" value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Quantity" />
          </div>
          {suggestions.length > 0 && (
            <div className="row gap-s wrap">
              {suggestions.map(([n, c]) => (
                <button type="button" key={n} className="chip" onClick={() => add(n, c, qty)}>
                  + {n}
                </button>
              ))}
            </div>
          )}
          <div className="row gap-s">
            <select className="grow" value={category} onChange={(e) => setCategory(e.target.value as ShopCategory)} aria-label="Section">
              {SHOP_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button className="btn primary" disabled={!name.trim()}>
              Add
            </button>
          </div>
        </form>
        {missingStaples.length > 0 && (
          <button className="btn small" onClick={() => missingStaples.forEach((s) => add(s.name, s.category))}>
            + Add my staples ({missingStaples.map((s) => s.name).join(', ')})
          </button>
        )}
      </Card>

      {!state.shopping.length && <Empty>Your list is empty. Tap ☆ on an item to make it a staple you can re-add with one tap.</Empty>}

      {SHOP_CATEGORIES.map((cat) => {
        const items = state.shopping.filter((i) => i.category === cat).sort((a, b) => Number(a.checked) - Number(b.checked));
        if (!items.length) return null;
        return (
          <Card key={cat} title={cat}>
            <ul className="list">
              {items.map((i) => (
                <li key={i.id} className={`shop-item ${i.checked ? 'checked' : ''}`}>
                  <label className="row gap-s grow">
                    <input type="checkbox" checked={i.checked} onChange={() => patch(i.id, { checked: !i.checked })} />
                    <span className="grow">
                      {i.name} {i.qty && <small className="muted">· {i.qty}</small>}
                    </span>
                  </label>
                  <button className="icon-btn" aria-label={isStaple(i.name) ? 'Remove from staples' : 'Make staple'} title="Staple" onClick={() => toggleStaple(i)}>
                    {isStaple(i.name) ? '★' : '☆'}
                  </button>
                  <button className="icon-btn" aria-label={`Remove ${i.name}`} onClick={() => update((s) => ({ ...s, shopping: s.shopping.filter((x) => x.id !== i.id) }))}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}

      {checked > 0 && (
        <button className="btn" onClick={() => update((s) => ({ ...s, shopping: s.shopping.filter((i) => !i.checked) }))}>
          Clear {checked} bought item{checked > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}
