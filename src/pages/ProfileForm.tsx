import { useState } from 'react';
import { NumberField } from '../components/ui';
import { ACTIVITY_LEVELS, dailyTargets } from '../lib/nutrition';
import type { ActivityLevel, Profile, Sex } from '../lib/types';

export const DEFAULT_PROFILE: Profile = {
  sex: 'male',
  age: 25,
  heightCm: 175,
  activity: 'light',
  surplusKcal: 300,
  proteinPerKg: 1.8,
  waterGoalMl: 2500,
  sleepGoalH: 8,
};

/** Shared by first-run setup and Settings. */
export function ProfileForm({
  initial,
  initialWeight,
  submitLabel,
  onSubmit,
}: {
  initial: Profile;
  initialWeight?: number;
  submitLabel: string;
  onSubmit: (p: Profile, weightKg: number | undefined) => void;
}) {
  const [p, setP] = useState(initial);
  const [weight, setWeight] = useState<number | ''>(initialWeight ?? '');
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((s) => ({ ...s, [k]: v }));
  const num = (k: keyof Profile) => (v: number | '') => set(k, (v === '' ? 0 : v) as never);

  const valid = p.age > 10 && p.heightCm > 100 && typeof weight === 'number' && weight > 30;
  const preview = valid ? dailyTargets(p, weight as number) : undefined;

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(p, weight as number);
      }}
    >
      <div className="field">
        <span>Sex (for the calorie formula)</span>
        <div className="segmented">
          {(['male', 'female'] as Sex[]).map((s) => (
            <button type="button" key={s} className={p.sex === s ? 'active' : ''} onClick={() => set('sex', s)}>
              {s === 'male' ? 'Male' : 'Female'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid-3">
        <NumberField label="Age" value={p.age} onChange={num('age')} min={10} />
        <NumberField label="Height" value={p.heightCm} onChange={num('heightCm')} suffix="cm" />
        <NumberField label="Weight" value={weight} onChange={setWeight} step={0.1} suffix="kg" />
      </div>
      <label className="field">
        <span>Daily activity</span>
        <select value={p.activity} onChange={(e) => set('activity', e.target.value as ActivityLevel)}>
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid-2">
        <NumberField label="Calorie surplus" value={p.surplusKcal} onChange={num('surplusKcal')} step={50} suffix="kcal" />
        <NumberField label="Protein" value={p.proteinPerKg} onChange={num('proteinPerKg')} step={0.1} suffix="g/kg" />
        <NumberField label="Water goal" value={p.waterGoalMl} onChange={num('waterGoalMl')} step={250} suffix="ml" />
        <NumberField label="Sleep goal" value={p.sleepGoalH} onChange={num('sleepGoalH')} step={0.5} suffix="h" />
      </div>
      <p className="hint">Lean bulk: +250–500 kcal over maintenance and 1.6–2.2 g protein per kg. The app suggests adjustments once it sees your weight trend.</p>
      {preview && (
        <div className="target-preview">
          <div>
            <b className="num">{preview.kcal}</b> kcal
            <small>maintenance ≈ {preview.maintenance}</small>
          </div>
          <div>
            <b className="num">{preview.protein}</b> g protein
          </div>
          <div>
            <b className="num">{preview.carbs}</b> g carbs
          </div>
          <div>
            <b className="num">{preview.fat}</b> g fat
          </div>
        </div>
      )}
      <button className="btn primary" type="submit" disabled={!valid}>
        {submitLabel}
      </button>
    </form>
  );
}
