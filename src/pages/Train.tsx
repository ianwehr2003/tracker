import { useMemo, useState } from 'react';
import { RestTimer } from '../components/RestTimer';
import { Card, Empty } from '../components/ui';
import { PROGRAMS } from '../data/programs';
import { relativeDay } from '../lib/dates';
import { uid } from '../lib/id';
import { parseQuickLog, type ParseResult } from '../lib/parse';
import { useStore } from '../lib/store';
import { MUSCLE_GROUPS, type ActiveSession, type Exercise, type MuscleGroup, type Workout } from '../lib/types';
import { generateSession, newRecords, recommendDay, recovery, sortWorkouts, stepFor, unitFor, type Recommendation } from '../lib/workouts';

export function TrainPage() {
  const { state } = useStore();
  return state.activeSession ? <SessionView session={state.activeSession} /> : <TrainHome />;
}

function useStartSession() {
  const { update, date } = useStore();
  return (title: string, items: Recommendation[], programId?: string, dayId?: string) =>
    update((s) => ({
      ...s,
      activeSession: {
        title,
        date,
        programId,
        dayId,
        startedAt: Date.now(),
        items: items.map((r) => ({
          exerciseId: r.exerciseId,
          target: r.target,
          note: r.note,
          sets: Array.from({ length: r.sets }, () => ({ value: r.target, done: false })),
        })),
      },
    }));
}

function TrainHome() {
  const { state, update, exercises, program, date } = useStore();
  const start = useStartSession();
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [showNew, setShowNew] = useState(false);
  const plan = useMemo(() => recommendDay(program, state.workouts, exercises, date), [program, state.workouts, exercises, date]);
  const fresh = useMemo(() => (showNew ? generateSession(state.workouts, exercises, date, seed) : []), [showNew, state.workouts, exercises, date, seed]);
  const rec = useMemo(() => recovery(state.workouts, exercises, date), [state.workouts, exercises, date]);
  const history = useMemo(() => sortWorkouts(state.workouts).slice(0, 15), [state.workouts]);

  return (
    <div className="stack">
      <Card title={`Up next · ${plan.day.name}`} action={<span className="muted small">{program.name}</span>}>
        {plan.advice && <p className={`callout ${plan.doneToday ? 'ok' : ''}`}>{plan.advice}</p>}
        <RecList items={plan.items} exercises={exercises} />
        <button className="btn primary" onClick={() => start(plan.day.name, plan.items, program.id, plan.day.id)}>
          Start workout
        </button>
      </Card>

      <QuickLog />

      <Card
        title="Try something new"
        action={
          showNew && (
            <button className="btn small" onClick={() => setSeed((s) => s + 1)}>
              ↻ Shuffle
            </button>
          )
        }
      >
        {!showNew ? (
          <>
            <p className="hint">A fresh session from the exercise library, picking muscles that have recovered and moves you haven’t done lately.</p>
            <button className="btn" onClick={() => setShowNew(true)}>
              Suggest a workout
            </button>
          </>
        ) : fresh.length ? (
          <>
            <RecList items={fresh} exercises={exercises} />
            <button className="btn primary" onClick={() => start('Fresh session', fresh)}>
              Start this workout
            </button>
          </>
        ) : (
          <Empty>Everything is still recovering — take a rest day!</Empty>
        )}
      </Card>

      <Card title="Muscle recovery">
        <div className="muscles">
          {rec.map((r) => (
            <span key={r.muscle} className={`muscle ${r.days === undefined ? 'never' : r.recovered ? 'ready' : 'tired'}`} title={r.lastDate}>
              {r.muscle}
              <small>{r.days === undefined ? '—' : r.days === 0 ? 'today' : `${r.days}d`}</small>
            </span>
          ))}
        </div>
        <p className="hint">Green = ready (48 h+). Amber = trained in the last 2 days.</p>
      </Card>

      <Card title="Program">
        <select value={state.activeProgramId} onChange={(e) => update((s) => ({ ...s, activeProgramId: e.target.value }))}>
          {PROGRAMS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <p className="hint">{program.description}</p>
        <p className="hint">
          How progression works: when you hit the target on every set, the next target goes up by 1 rep (or 5 s). At the top of the range you move to a harder variation.
        </p>
      </Card>

      <Card title="History">
        {!history.length && <Empty>No workouts yet. Start one above or quick-log what you did.</Empty>}
        <ul className="list">
          {history.map((w) => (
            <HistoryItem key={w.id} w={w} exercises={exercises} onDelete={() => update((s) => ({ ...s, workouts: s.workouts.filter((x) => x.id !== w.id) }))} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

function RecList({ items, exercises }: { items: Recommendation[]; exercises: Map<string, Exercise> }) {
  return (
    <ol className="rec-list">
      {items.map((r, i) => {
        const ex = exercises.get(r.exerciseId);
        return (
          <li key={i}>
            <div className="row between">
              <b>{ex?.name ?? r.exerciseId}</b>
              <span className="num">
                {r.sets} × {r.target}
                {unitFor(ex)}
                {ex?.perSide ? ' /side' : ''}
              </span>
            </div>
            <small className="muted">
              {r.note}
              {r.last && ` Last: ${r.last.join(', ')}.`}
            </small>
          </li>
        );
      })}
    </ol>
  );
}

function HistoryItem({ w, exercises, onDelete }: { w: Workout; exercises: Map<string, Exercise>; onDelete: () => void }) {
  const program = PROGRAMS.find((p) => p.id === w.programId);
  const day = program?.days.find((d) => d.id === w.dayId);
  return (
    <li className="history">
      <div className="row between">
        <b>
          {relativeDay(w.date)} · {day?.name ?? w.note ?? 'Workout'}
        </b>
        <button className="icon-btn" aria-label="Delete workout" onClick={() => confirm('Delete this workout?') && onDelete()}>
          🗑
        </button>
      </div>
      {w.exercises.map((e, i) => {
        const ex = exercises.get(e.exerciseId);
        const values = e.sets.map((s) => `${s.value}${ex?.kind === 'time' ? 's' : ''}${s.weightKg ? `@${s.weightKg}kg` : ''}`);
        return (
          <div key={i} className="muted small">
            {ex?.name ?? e.exerciseId}: {values.join(', ')}
          </div>
        );
      })}
    </li>
  );
}

function QuickLog() {
  const { state, update, exercises, date } = useStore();
  const [text, setText] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [logged, setLogged] = useState('');
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>('chest');

  const log = (lines: ParseResult['lines']) => {
    if (!lines.length) return;
    update((s) => {
      // Append to today's quick-log workout, or create one.
      const existing = s.workouts.find((w) => w.date === date && !w.programId && w.note === 'Quick log');
      const add = lines.map((l) => ({ exerciseId: l.exerciseId, sets: l.sets }));
      const workouts = existing
        ? s.workouts.map((w) => (w === existing ? { ...w, exercises: [...w.exercises, ...add] } : w))
        : [...s.workouts, { id: uid(), date, note: 'Quick log', exercises: add }];
      return { ...s, workouts };
    });
    setLogged(lines.map((l) => `${l.sets.length}×${l.sets[0].value} ${exercises.get(l.exerciseId)?.name}`).join(', '));
  };

  const submit = () => {
    const r = parseQuickLog(text, [...exercises.values()]);
    log(r.lines);
    setResult(r);
    setText(r.errors.map((e) => e.raw).join('\n'));
  };

  const unknown = result?.errors.find((e) => e.reason === 'unknown_exercise');

  return (
    <Card title="Quick log">
      <p className="hint">Write what you did, like “5x10 push ups”, “3x30s plank” or “10, 8, 8 dips”. One per line.</p>
      <div className="row gap-s">
        <textarea
          rows={2}
          value={text}
          placeholder="5x10 push ups"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button className="btn primary" onClick={submit} disabled={!text.trim()}>
          Log
        </button>
      </div>
      {logged && <p className="hint ok">✓ Logged {logged}</p>}
      {result?.errors.some((e) => e.reason === 'format') && <p className="hint warn">Couldn’t read some lines. Try the format “sets x reps exercise”.</p>}
      {unknown && (
        <div className="callout">
          <p>
            “{unknown.name}” isn’t in the exercise list yet. Add it as a new exercise?
          </p>
          <div className="row gap-s">
            <select value={newMuscle} onChange={(e) => setNewMuscle(e.target.value as MuscleGroup)} aria-label="Main muscle">
              {MUSCLE_GROUPS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <button
              className="btn small primary"
              onClick={() => {
                const name = unknown.name!.replace(/\b\w/g, (c) => c.toUpperCase());
                const ex: Exercise = { id: `custom-${uid()}`, name, muscles: [newMuscle], kind: /plank|hold|sit/.test(name.toLowerCase()) ? 'time' : 'reps', equipment: 'none', custom: true };
                update((s) => ({ ...s, customExercises: [...s.customExercises, ex] }));
                log([{ raw: unknown.raw, exerciseId: ex.id, sets: unknown.sets! }]);
                const remaining = (result?.errors ?? []).filter((e) => e !== unknown);
                setResult({ lines: [], errors: remaining });
                setText(remaining.map((e) => e.raw).join('\n'));
                // Map lookup in `log` runs before state refresh; show a direct message instead.
                setLogged(`${unknown.sets!.length}×${unknown.sets![0].value} ${name}`);
              }}
            >
              Add & log
            </button>
          </div>
        </div>
      )}
      {state.customExercises.length > 0 && <p className="hint">Your custom exercises: {state.customExercises.map((e) => e.name).join(', ')}</p>}
    </Card>
  );
}

function SessionView({ session }: { session: ActiveSession }) {
  const { state, update, exercises } = useStore();
  const [restSignal, setRestSignal] = useState(0);
  const [prs, setPrs] = useState<string[] | null>(null);

  const setSession = (fn: (s: ActiveSession) => ActiveSession) => update((s) => (s.activeSession ? { ...s, activeSession: fn(s.activeSession) } : s));
  const editSet = (i: number, j: number, patch: Partial<ActiveSession['items'][0]['sets'][0]>) =>
    setSession((s) => ({
      ...s,
      items: s.items.map((it, a) => (a !== i ? it : { ...it, sets: it.sets.map((st, b) => (b !== j ? st : { ...st, ...patch })) })),
    }));

  const doneSets = session.items.reduce((n, it) => n + it.sets.filter((s) => s.done).length, 0);
  const totalSets = session.items.reduce((n, it) => n + it.sets.length, 0);

  const finish = () => {
    const workout: Workout = {
      id: uid(),
      date: session.date,
      programId: session.programId,
      dayId: session.dayId,
      note: session.programId ? undefined : session.title,
      exercises: session.items
        .map((it) => ({
          exerciseId: it.exerciseId,
          target: it.target,
          sets: it.sets.filter((s) => s.done && s.value > 0).map(({ value, weightKg }) => (weightKg ? { value, weightKg } : { value })),
        }))
        .filter((e) => e.sets.length),
    };
    const records = newRecords(workout, state.workouts);
    update((s) => ({ ...s, workouts: workout.exercises.length ? [...s.workouts, workout] : s.workouts, activeSession: undefined }));
    if (records.length) setPrs(records);
  };

  if (prs) {
    return (
      <Card title="New personal records! 🏆">
        <ul className="list">
          {prs.map((id) => (
            <li key={id}>{exercises.get(id)?.name}</li>
          ))}
        </ul>
        <button className="btn primary" onClick={() => setPrs(null)}>
          Nice
        </button>
      </Card>
    );
  }

  return (
    <div className="stack">
      <div className="sticky-top">
        <div className="row between">
          <h2>{session.title}</h2>
          <span className="muted num">
            {doneSets}/{totalSets} sets
          </span>
        </div>
        <RestTimer seconds={state.restSeconds} onChangeSeconds={(s) => update((x) => ({ ...x, restSeconds: s }))} startSignal={restSignal} />
      </div>

      {session.items.map((it, i) => {
        const ex = exercises.get(it.exerciseId);
        const step = stepFor(ex);
        return (
          <Card
            key={i}
            title={ex?.name ?? it.exerciseId}
            action={
              <span className="muted small num">
                target {it.target}
                {unitFor(ex)}
                {ex?.perSide ? ' /side' : ''}
              </span>
            }
          >
            {ex?.tip && <p className="hint">{ex.tip}</p>}
            <div className="sets">
              {it.sets.map((st, j) => (
                <div key={j} className={`set-row ${st.done ? 'done' : ''}`}>
                  <span className="set-n">{j + 1}</span>
                  <div className="stepper">
                    <button onClick={() => editSet(i, j, { value: Math.max(0, st.value - step) })} aria-label="Less">
                      −
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={st.value}
                      onChange={(e) => editSet(i, j, { value: Number(e.target.value) || 0 })}
                      aria-label={`Set ${j + 1} ${ex?.kind === 'time' ? 'seconds' : 'reps'}`}
                    />
                    <button onClick={() => editSet(i, j, { value: st.value + step })} aria-label="More">
                      +
                    </button>
                  </div>
                  <span className="muted small">{ex?.kind === 'time' ? 'sec' : 'reps'}</span>
                  <button
                    className={`check ${st.done ? 'on' : ''}`}
                    aria-label={st.done ? 'Mark set not done' : 'Mark set done'}
                    onClick={() => {
                      editSet(i, j, { done: !st.done });
                      if (!st.done) setRestSignal((n) => n + 1);
                    }}
                  >
                    ✓
                  </button>
                </div>
              ))}
            </div>
            <div className="row gap-s">
              <button
                className="link"
                onClick={() =>
                  setSession((s) => ({
                    ...s,
                    items: s.items.map((x, a) => (a === i ? { ...x, sets: [...x.sets, { value: x.sets[x.sets.length - 1]?.value ?? x.target, done: false }] } : x)),
                  }))
                }
              >
                + Add set
              </button>
              {it.sets.length > 1 && (
                <button className="link muted" onClick={() => setSession((s) => ({ ...s, items: s.items.map((x, a) => (a === i ? { ...x, sets: x.sets.slice(0, -1) } : x)) }))}>
                  − Remove set
                </button>
              )}
            </div>
          </Card>
        );
      })}

      <div className="row gap-s">
        <button className="btn danger" onClick={() => confirm('Discard this workout?') && update((s) => ({ ...s, activeSession: undefined }))}>
          Discard
        </button>
        <button className="btn primary grow" onClick={finish} disabled={doneSets === 0}>
          Finish workout
        </button>
      </div>
      <p className="hint center">Tick ✓ after each set: it saves the set and starts the rest timer.</p>
    </div>
  );
}
