import { useRef, useState } from 'react';
import { Card } from '../components/ui';
import { exportJSON, importJSON, defaultState } from '../lib/storage';
import { useStore } from '../lib/store';
import { DEFAULT_PROFILE, ProfileForm } from './ProfileForm';

export function Settings() {
  const { state, update, replace, weightKg, date } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  const download = () => {
    const blob = new Blob([exportJSON(state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fittrack-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="stack">
      <Card title="Your profile & targets">
        <ProfileForm
          initial={state.profile ?? DEFAULT_PROFILE}
          initialWeight={weightKg}
          submitLabel="Save"
          onSubmit={(profile, kg) => {
            update((s) => ({
              ...s,
              profile,
              weights: kg && kg !== weightKg ? [...s.weights.filter((w) => w.date !== date), { date, kg }] : s.weights,
            }));
            setMsg('Saved.');
          }}
        />
        {msg && <p className="hint ok">{msg}</p>}
      </Card>

      <Card title="Your data">
        <p className="hint">
          Everything is stored on this device only. Export a backup regularly, or to move to another phone/browser.
        </p>
        <div className="row gap-s wrap">
          <button className="btn" onClick={download}>
            Export backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              try {
                const next = importJSON(await file.text());
                if (confirm('Replace all current data with this backup?')) {
                  replace(next);
                  setMsg('Backup restored.');
                }
              } catch (err) {
                alert((err as Error).message);
              }
            }}
          />
          <button
            className="btn danger"
            onClick={() => {
              if (confirm('Delete ALL data on this device? Export a backup first if you want to keep it.')) replace(defaultState());
            }}
          >
            Reset everything
          </button>
        </div>
      </Card>
      <p className="hint center">FitTrack v0.1 · nutrition values are approximate</p>
    </div>
  );
}
