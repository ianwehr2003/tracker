import { useState } from 'react';
import { addDays, formatDate } from '../lib/dates';
import { rollingAverage } from '../lib/nutrition';
import type { ISODate, WeightEntry } from '../lib/types';

/** Daily weigh-ins as dots, 7-day average as a line. Plain SVG, no chart library. */
export function WeightChart({ weights, date, days = 60 }: { weights: WeightEntry[]; date: ISODate; days?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const from = addDays(date, -(days - 1));
  const pts = rollingAverage(weights).filter((p) => p.date >= from && p.date <= date);
  if (pts.length < 2) return <p className="empty">Log at least 2 weigh-ins to see a chart.</p>;

  const W = 340;
  const H = 160;
  const pad = { l: 34, r: 8, t: 10, b: 20 };
  const all = pts.flatMap((p) => [p.kg, p.avg]);
  const lo = Math.floor(Math.min(...all) - 0.3);
  const hi = Math.ceil(Math.max(...all) + 0.3);
  const t0 = new Date(pts[0].date).getTime();
  const t1 = Math.max(new Date(pts[pts.length - 1].date).getTime(), t0 + 86_400_000);
  const x = (d: string) => pad.l + ((new Date(d).getTime() - t0) / (t1 - t0)) * (W - pad.l - pad.r);
  const y = (kg: number) => pad.t + (1 - (kg - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const ticks = hi - lo <= 4 ? Array.from({ length: hi - lo + 1 }, (_, i) => lo + i) : [lo, (lo + hi) / 2, hi];
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.avg).toFixed(1)}`).join(' ');
  const h = hover !== null ? pts[hover] : null;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Body weight chart" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" className="axis">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}
        <text x={pad.l} y={H - 4} className="axis">
          {formatDate(pts[0].date, { day: 'numeric', month: 'short' })}
        </text>
        <text x={W - pad.r} y={H - 4} textAnchor="end" className="axis">
          {formatDate(pts[pts.length - 1].date, { day: 'numeric', month: 'short' })}
        </text>
        <path d={line} className="avg-line" />
        {pts.map((p, i) => (
          <circle
            key={p.date}
            cx={x(p.date)}
            cy={y(p.kg)}
            r={hover === i ? 4.5 : 3}
            className="dot"
            onMouseEnter={() => setHover(i)}
            onClick={() => setHover(i)}
          />
        ))}
      </svg>
      <div className="chart-legend">
        {h ? (
          <span>
            <b>{formatDate(h.date)}</b>: {h.kg.toFixed(1)} kg · 7-day avg {h.avg.toFixed(1)} kg
          </span>
        ) : (
          <>
            <span className="legend-dot" /> daily weigh-in <span className="legend-line" /> 7-day average
          </>
        )}
      </div>
    </div>
  );
}
