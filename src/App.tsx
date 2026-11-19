import { useEffect, useState } from 'react';
import { AccountPanel, SyncBadge } from './components/AccountCard';
import { Card } from './components/ui';
import { useStore } from './lib/store';
import { useSync } from './lib/sync';
import { FoodPage } from './pages/Food';
import { DEFAULT_PROFILE, ProfileForm } from './pages/ProfileForm';
import { ProgressPage } from './pages/Progress';
import { Settings } from './pages/Settings';
import { ShopPage } from './pages/Shop';
import { TodayPage } from './pages/Today';
import { TrainPage } from './pages/Train';

export type Tab = 'today' | 'food' | 'train' | 'progress' | 'shop' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: '☀️' },
  { id: 'food', label: 'Food', icon: '🍝' },
  { id: 'train', label: 'Train', icon: '💪' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'shop', label: 'Shop', icon: '🛒' },
];

const readHash = (): Tab => {
  const h = window.location.hash.slice(1) as Tab;
  return [...TABS.map((t) => t.id), 'settings'].includes(h) ? h : 'today';
};

export function App() {
  const { state, update, date, saveError } = useStore();
  const { user, status, authLoading } = useSync();
  const [tab, setTab] = useState<Tab>(readHash);

  useEffect(() => {
    const onHash = () => setTab(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (t: Tab) => {
    window.location.hash = t;
    window.scrollTo(0, 0);
  };

  if (!state.profile) {
    if (authLoading || (user && status === 'loading')) {
      return (
        <main className="app">
          <p className="empty">Loading your data…</p>
        </main>
      );
    }
    return (
      <main className="app">
        <div className="stack">
          <h1>Welcome to Tracker 💪</h1>
          {!user && (
            <Card title="Already have an account?">
              <AccountPanel compact />
            </Card>
          )}
          <p className="muted">
            {user ? 'Signed in! ' : 'New here? '}A few details to set your daily calorie and protein targets.
          </p>
          <Card>
            <ProfileForm
              initial={DEFAULT_PROFILE}
              submitLabel="Start tracking"
              onSubmit={(profile, kg) => update((s) => ({ ...s, profile, weights: kg ? [...s.weights.filter((w) => w.date !== date), { date, kg }] : s.weights }))}
            />
          </Card>
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="topbar">
        <span className="brand">Tracker</span>
        <span className="row gap-s">
          <button className="icon-btn" onClick={() => go('settings')} aria-label="Account and sync">
            <SyncBadge />
          </button>
          <button className={`icon-btn ${tab === 'settings' ? 'active' : ''}`} onClick={() => go('settings')} aria-label="Settings">
            ⚙️
          </button>
        </span>
      </header>
      {saveError && <div className="banner">Couldn’t save to this device (storage full or private mode). Export a backup in Settings.</div>}
      <main className="app">
        {tab === 'today' && <TodayPage go={go} />}
        {tab === 'food' && <FoodPage />}
        {tab === 'train' && <TrainPage />}
        {tab === 'progress' && <ProgressPage />}
        {tab === 'shop' && <ShopPage />}
        {tab === 'settings' && <Settings />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => go(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
            <span aria-hidden>{t.icon}</span>
            {t.label}
            {t.id === 'train' && state.activeSession && <i className="dot-badge" aria-label="workout in progress" />}
          </button>
        ))}
      </nav>
    </>
  );
}
