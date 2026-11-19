import { useMemo, useState } from 'react';
import { Card, NumberField, Progress, fmt } from '../components/ui';
import { formatDate } from '../lib/dates';
import { sumEntries } from '../lib/nutrition';
import { useStore } from '../lib/store';
import { entriesByDate, streak } from '../lib/summary';
import { recommendDay, unitFor } from '../lib/workouts';
import type { Tab } from '../App';

export function TodayPage({ go }: { go: (t: Tab) => void }) {
  const { state, update, foods, targets, exercises, program, date } = useStore();
  const totals = sumEntries(state.entries.filter((e) => e.date === date), foods);
  const plan = useMemo(() => recommendDay(program, state.workouts, exercises, date), [program, state.workouts, exercises, date]);
  const habits = state.habits[date] ?? { waterMl: 0 };
  const weighedToday = state.weights.some((w) => w.date === date);
  const [kg, setKg] = useState<number | ''>('');
  const byDate = useMemo(() => entriesByDate(state.entries), [state.entries]);
  const logStreak = streak((d) => byDate.has(d), date);
  const profile = state.profile!;

  const setHabits = (p: Partial<typeof habits>) => update((s) => ({ ...s, habits: { ...s.habits, [date]: { ...habits, ...p } } }));

  return (
    <div className="stack">
      <div className="row between">
        <h1>{formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</h1>
        {logStreak > 1 && <span className="pill">🔥 {logStreak}-day streak</span>}
      </div>

      <Card title="Nutrition" action={<button className="btn small primary" onClick={() => go('food')}>+ Log food</button>}>
        <Progress label="Calories" value={totals.kcal} target={targets?.kcal} unit=" kcal" />
        <Progress label="Protein" value={totals.protein} target={targets?.protein} unit=" g" />
        {targets && totals.protein < targets.protein && (
          <p className="hint">
            {fmt(targets.protein - totals.protein)} g protein to go. That’s about {Math.ceil((targets.protein - totals.protein) / 25)} servings of chicken, Greek yogurt, tuna or a whey shake.
          </p>
        )}
      </Card>

      <Card title={plan.doneToday ? 'Workout done ✓' : `Today’s workout: ${plan.day.name}`} action={<button className="btn small" onClick={() => go('train')}>Open</button>}>
        {plan.advice && <p className={`callout ${plan.doneToday ? 'ok' : ''}`}>{plan.advice}</p>}
        {!plan.doneToday && (
          <ul className="compact">
            {plan.items.map((r, i) => {
              const ex = exercises.get(r.exerciseId);
              return (
                <li key={i}>
                  {ex?.name} <span className="muted num">{r.sets}×{r.target}{unitFor(ex)}</span>
                </li>
              );
            })}
          </ul>
        )}
        {state.activeSession && (
          <button className="btn primary" onClick={() => go('train')}>
            Resume workout in progress
          </button>
        )}
      </Card>

      <Card title="Habits">
        <div className="habit">
          <div className="grow">
            <Progress label="💧 Water" value={habits.waterMl / 1000} target={profile.waterGoalMl / 1000} unit=" L" decimals={2} />
          </div>
          <div className="row gap-s">
            <button className="icon-btn" aria-label="Remove a glass" onClick={() => setHabits({ waterMl: Math.max(0, habits.waterMl - 250) })}>
              −
            </button>
            <button className="btn small primary" onClick={() => setHabits({ waterMl: habits.waterMl + 250 })}>
              +250 ml
            </button>
          </div>
        </div>
        <div className="habit">
          <span className="grow">😴 Sleep last night</span>
          <div className="row gap-s">
            {[6, 7, 8, 9].map((h) => (
              <button key={h} className={`chip ${habits.sleepH === h ? 'active' : ''}`} onClick={() => setHabits({ sleepH: h })}>
                {h}h
              </button>
            ))}
            <input
              className="tiny"
              type="number"
              inputMode="decimal"
              step={0.5}
              aria-label="Hours slept"
              value={habits.sleepH ?? ''}
              onChange={(e) => setHabits({ sleepH: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
          </div>
        </div>
        {habits.sleepH !== undefined && habits.sleepH < profile.sleepGoalH - 1 && (
          <p className="hint">Short sleep slows recovery. Aim for {profile.sleepGoalH} h tonight.</p>
        )}
        {!weighedToday && (
          <div className="habit">
            <span className="grow">⚖️ Morning weigh-in</span>
            <div className="row gap-s end">
              <NumberField label="" value={kg} onChange={setKg} step={0.1} suffix="kg" />
              <button
                className="btn small primary"
                disabled={!kg}
                onClick={() => update((s) => ({ ...s, weights: [...s.weights.filter((w) => w.date !== date), { date, kg: Number(kg) }] }))}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
