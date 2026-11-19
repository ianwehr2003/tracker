import { useEffect, useRef, useState } from 'react';

function beep() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.2, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch {
    /* audio not available */
  }
  navigator.vibrate?.([200, 100, 200]);
}

const PRESETS = [60, 90, 120, 180];

/**
 * Rest timer. Bump `startSignal` (e.g. when a set is ticked off) to restart it.
 * Uses wall-clock end time so it stays correct if the phone throttles timers.
 */
export function RestTimer({ seconds, onChangeSeconds, startSignal }: { seconds: number; onChangeSeconds: (s: number) => void; startSignal: number }) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const fired = useRef(false);

  useEffect(() => {
    if (startSignal > 0) {
      setEndAt(Date.now() + seconds * 1000);
      fired.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSignal]);

  useEffect(() => {
    if (endAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endAt]);

  const left = endAt === null ? 0 : Math.max(0, Math.ceil((endAt - now) / 1000));
  useEffect(() => {
    if (endAt !== null && left === 0 && !fired.current) {
      fired.current = true;
      beep();
    }
  }, [left, endAt]);

  const running = endAt !== null && left > 0;
  const pct = running ? (left / seconds) * 100 : 0;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div className={`rest-timer ${running ? 'running' : ''} ${endAt !== null && left === 0 ? 'finished' : ''}`}>
      <div className="rest-fill" style={{ width: `${pct}%` }} />
      <div className="rest-content">
        <span className="rest-time num">{running ? `${mm}:${ss}` : endAt !== null ? 'Go! 💪' : 'Rest timer'}</span>
        {running ? (
          <span className="row gap-s">
            <button className="chip" onClick={() => setEndAt((e) => (e ?? Date.now()) + 15000)}>
              +15s
            </button>
            <button className="chip" onClick={() => setEndAt(null)}>
              Skip
            </button>
          </span>
        ) : (
          <span className="row gap-s">
            {PRESETS.map((p) => (
              <button
                key={p}
                className={`chip ${p === seconds ? 'active' : ''}`}
                onClick={() => {
                  onChangeSeconds(p);
                  setEndAt(Date.now() + p * 1000);
                  fired.current = false;
                }}
              >
                {p < 120 ? `${p}s` : `${p / 60}m`}
              </button>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
