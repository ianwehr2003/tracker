import { useMemo, useState } from 'react';
import { Card, Empty, NumberField, Stat, fmt } from '../components/ui';
import { WeightChart } from '../components/WeightChart';
import { addDays, formatDate, relativeDay, startOfWeek } from '../lib/dates';
import { sortedWeights, sumEntries, weightTrend } from '../lib/nutrition';
import { useStore } from '../lib/store';
import { entriesByDate, streak, weekSummary } from '../lib/summary';
import { personalRecords } from '../lib/workouts';

export function ProgressPage() {
  return (
    <div className="stack">
      <WeightCard />
      <Streaks />
      <WeeklySummary />
      <Records />
    </div>
  );
}

function WeightCard() {
  const { state, update, date } = useStore();
  const todays = state.weights.find((w) => w.date === date);
  const [kg, setKg] = useState<number | ''>(todays?.kg ?? sortedWeights(state.weights).at(-1)?.kg ?? '');
  const trend = weightTrend(state.weights, date);
  const recent = sortedWeights(state.weights).slice(-5).reverse();

  return (
    <Card title="Body weight">
      <div className="row gap-s end">
        <NumberField label={todays ? 'Today (logged)' : 'Today’s weight'} value={kg} onChange={setKg} step={0.1} suffix="kg" />
        <button
          className="btn primary"
          disabled={!kg}
          onClick={() => update((s) => ({ ...s, weights: [...s.weights.filter((w) => w.date !== date), { date, kg: Number(kg) }] }))}
        >
          {todays ? 'Update' : 'Save'}
        </button>
      </div>
      <p className="hint">Weigh yourself in the morning, after the toilet and before eating, so days are comparable.</p>
      <WeightChart weights={state.weights} date={date} />
      <p className={`callout ${trend.status === 'on_track' ? 'ok' : trend.status === 'insufficient' ? '' : 'warn'}`}>{trend.message}</p>
      {trend.kcalAdjust !== 0 && state.profile && (
        <button
          className="btn small"
          onClick={() => update((s) => (s.profile ? { ...s, profile: { ...s.profile, surplusKcal: s.profile.surplusKcal + trend.kcalAdjust } } : s))}
        >
          Apply: {trend.kcalAdjust > 0 ? '+' : ''}
          {trend.kcalAdjust} kcal to my daily target
        </button>
      )}
      {recent.length > 0 && (
        <details>
          <summary className="muted small">Recent entries</summary>
          <ul className="list">
            {recent.map((w) => (
              <li key={w.date} className="row between">
                <span>{relativeDay(w.date, date)}</span>
                <span className="row gap-s">
                  <span className="num">{w.kg.toFixed(1)} kg</span>
                  <button className="icon-btn" aria-label="Delete entry" onClick={() => update((s) => ({ ...s, weights: s.weights.filter((x) => x.date !== w.date) }))}>
                    🗑
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

function Streaks() {
  const { state, foods, targets, date } = useStore();
  const byDate = useMemo(() => entriesByDate(state.entries), [state.entries]);
  const workoutDates = useMemo(() => new Set(state.workouts.map((w) => w.date)), [state.workouts]);

  const logging = streak((d) => byDate.has(d), date);
  const protein = targets ? streak((d) => sumEntries(byDate.get(d) ?? [], foods).protein >= targets.protein * 0.95, date) : 0;
  const weekStart = startOfWeek(date);
  const weeksActive = (() => {
    // Consecutive weeks (incl. this one if already active) with at least 2 workouts.
    let n = 0;
    let w = weekStart;
    const count = (from: string) => [...workoutDates].filter((d) => d >= from && d <= addDays(from, 6)).length;
    if (count(w) < 2) w = addDays(w, -7);
    while (count(w) >= 2) {
      n++;
      w = addDays(w, -7);
    }
    return n;
  })();

  return (
    <Card title="Streaks 🔥">
      <div className="stats">
        <Stat label="days logging food" value={logging} />
        <Stat label="days hitting protein" value={protein} />
        <Stat label="weeks with 2+ workouts" value={weeksActive} />
      </div>
    </Card>
  );
}

function WeeklySummary() {
  const { state, foods, targets, date, program } = useStore();
  const [from, setFrom] = useState(startOfWeek(date));
  const s = weekSummary({ from, entries: state.entries, foods, workouts: state.workouts, weights: state.weights, habits: state.habits, targets });
  const isCurrent = from === startOfWeek(date);

  return (
    <Card
      title="Weekly summary"
      action={
        <div className="row gap-s">
          <button className="icon-btn" onClick={() => setFrom(addDays(from, -7))} aria-label="Previous week">
            ‹
          </button>
          <span className="small muted">
            {formatDate(s.from, { day: 'numeric', month: 'short' })} – {formatDate(s.to, { day: 'numeric', month: 'short' })}
          </span>
          <button className="icon-btn" onClick={() => setFrom(addDays(from, 7))} disabled={isCurrent} aria-label="Next week">
            ›
          </button>
        </div>
      }
    >
      <div className="stats">
        <Stat label="avg kcal / day" value={s.daysLogged ? fmt(s.avg.kcal) : '—'} sub={targets && `target ${targets.kcal}`} />
        <Stat label="avg protein / day" value={s.daysLogged ? `${fmt(s.avg.protein)} g` : '—'} sub={targets && `target ${targets.protein} g`} />
        <Stat label="workouts" value={s.workouts} sub={`plan ${program.daysPerWeek} · ${s.totalSets} sets`} />
        <Stat
          label="weight vs last week"
          value={s.weightChange !== undefined ? `${s.weightChange >= 0 ? '+' : ''}${s.weightChange.toFixed(2)} kg` : '—'}
          sub={s.weightEnd !== undefined ? `latest ${s.weightEnd.toFixed(1)} kg` : undefined}
        />
        <Stat label="avg water" value={s.avgWaterMl ? `${(s.avgWaterMl / 1000).toFixed(1)} L` : '—'} />
        <Stat label="avg sleep" value={s.avgSleepH ? `${s.avgSleepH.toFixed(1)} h` : '—'} />
      </div>
      {s.daysLogged > 0 && targets && (
        <p className="hint">
          Food logged on {s.daysLogged}/7 days · protein target hit on {s.proteinDaysHit} · calorie target hit on {s.kcalDaysHit}.
        </p>
      )}
    </Card>
  );
}

function Records() {
  const { state, exercises } = useStore();
  const prs = useMemo(() => personalRecords(state.workouts), [state.workouts]);
  return (
    <Card title="Personal records 🏆">
      {!prs.length && <Empty>Log some workouts to see your records here.</Empty>}
      <ul className="list">
        {prs.map((p) => {
          const ex = exercises.get(p.exerciseId);
          const u = ex?.kind === 'time' ? 's' : ' reps';
          const gain = p.best - p.first;
          return (
            <li key={p.exerciseId} className="row between">
              <span>
                {ex?.name ?? p.exerciseId}
                <small>
                  {p.sessions} sessions · first {p.first}
                  {u} ({formatDate(p.firstDate, { day: 'numeric', month: 'short' })})
                </small>
              </span>
              <span className="num right">
                <b>
                  {p.best}
                  {u}
                  {p.bestWeightKg ? ` @ ${p.bestWeightKg} kg` : ''}
                </b>
                {gain > 0 && !p.bestWeightKg && (
                  <small className="ok">
                    +{gain}
                    {ex?.kind === 'time' ? 's' : gain === 1 ? ' rep' : ' reps'}
                  </small>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
