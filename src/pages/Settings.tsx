import { useRef, useState } from 'react';
import { AccountPanel } from '../components/AccountCard';
import { Card } from '../components/ui';
import { exportJSON, importJSON, defaultState } from '../lib/storage';
import { useStore } from '../lib/store';
import { useSync } from '../lib/sync';
import { DEFAULT_PROFILE, ProfileForm } from './ProfileForm';

export function Settings() {
  const { state, update, replace, weightKg, date } = useStore();
  const { user } = useSync();
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
      <Card title="Account & sync">
        <AccountPanel />
      </Card>

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
          {user
            ? 'Your data is saved on this device and in the cloud. You can also download a backup file.'
            : 'Everything is stored on this device only. Sign in above, or export a backup regularly.'}
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
              const msg = user
                ? 'Delete ALL your data, on this device AND in the cloud? This cannot be undone.'
                : 'Delete ALL data on this device? Export a backup first if you want to keep it.';
              if (confirm(msg)) replace(defaultState());
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
