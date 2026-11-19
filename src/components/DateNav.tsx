import { addDays, relativeDay } from '../lib/dates';
import type { ISODate } from '../lib/types';

export function DateNav({ value, onChange, max }: { value: ISODate; onChange: (d: ISODate) => void; max: ISODate }) {
  return (
    <div className="date-nav">
      <button className="icon-btn" onClick={() => onChange(addDays(value, -1))} aria-label="Previous day">
        ‹
      </button>
      <label className="date-label">
        {relativeDay(value, max)}
        <input type="date" value={value} max={max} onChange={(e) => e.target.value && onChange(e.target.value)} aria-label="Pick date" />
      </label>
      <button className="icon-btn" onClick={() => onChange(addDays(value, 1))} disabled={value >= max} aria-label="Next day">
        ›
      </button>
    </div>
  );
}
