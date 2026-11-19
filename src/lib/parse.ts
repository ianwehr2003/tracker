import type { Exercise, SetLog } from './types';

export interface ParsedLine {
  raw: string;
  exerciseId: string;
  sets: SetLog[];
}

export interface ParseResult {
  lines: ParsedLine[];
  /** Lines that couldn't be understood, or whose exercise is unknown. */
  errors: { raw: string; reason: 'format' | 'unknown_exercise'; name?: string; sets?: SetLog[] }[];
}

/** "Push ups" → "pushup", "Squats" → "squat". */
export function nameKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/(es|s)$/, '');
}

export function findExercise(name: string, exercises: Exercise[]): Exercise | undefined {
  const key = nameKey(name);
  if (!key) return undefined;
  const keyed = exercises.flatMap((ex) => [ex.name, ex.id, ...(ex.aliases ?? [])].map((n) => ({ ex, k: nameKey(n) })));
  const exact = keyed.find((x) => x.k === key);
  if (exact) return exact.ex;
  // Fuzzy: the longest name that contains, or is contained in, the query.
  const partial = keyed
    .filter((x) => x.k.length >= 3 && (key.includes(x.k) || x.k.includes(key)))
    .sort((a, b) => b.k.length - a.k.length);
  return partial[0]?.ex;
}

const UNIT = '(s|sec|secs|seconds?|min|mins|minutes?)?';

function toValue(n: string, unit: string | undefined): number {
  const v = Number(n);
  return unit && unit.startsWith('m') ? v * 60 : v;
}

/**
 * Understands things like:
 *   "5x10 push ups"   "push ups 5x10"   "5 sets of 10 pushups"
 *   "3x30s plank"     "10, 8, 8 dips"   "20 squats"   "3x8 squats @ 10kg"
 * Separate multiple exercises with new lines, ";" or " and ".
 */
export function parseQuickLog(text: string, exercises: Exercise[]): ParseResult {
  const result: ParseResult = { lines: [], errors: [] };
  const parts = text
    .split(/\n|;| and |\+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const raw of parts) {
    let s = raw.toLowerCase().replace(/×|\*/g, 'x');
    let weightKg: number | undefined;
    s = s.replace(/@?\s*(\d+(?:[.,]\d+)?)\s*kg\b/, (_, w: string) => {
      weightKg = Number(w.replace(',', '.'));
      return ' ';
    });
    s = s
      .replace(/\bsets?\s+(of|x)\s*/g, 'x')
      .replace(/\breps?\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    let sets: SetLog[] | undefined;
    let name = '';
    let m: RegExpMatchArray | null;

    if ((m = s.match(new RegExp(`^(\\d+)\\s*x\\s*(\\d+)\\s*${UNIT}\\b\\s*(.*)$`)))) {
      sets = Array.from({ length: Number(m[1]) }, () => ({ value: toValue(m![2], m![3]) }));
      name = m[4];
    } else if ((m = s.match(new RegExp(`^(.*?)\\s*(\\d+)\\s*x\\s*(\\d+)\\s*${UNIT}$`)))) {
      sets = Array.from({ length: Number(m[2]) }, () => ({ value: toValue(m![3], m![4]) }));
      name = m[1];
    } else if ((m = s.match(new RegExp(`^(\\d+(?:\\s*[,/]\\s*\\d+)+)\\s*${UNIT}\\b\\s*(.+)$`)))) {
      sets = m[1].split(/[,/]/).map((v) => ({ value: toValue(v.trim(), m![2]) }));
      name = m[3];
    } else if ((m = s.match(new RegExp(`^(.+?)\\s+(\\d+(?:\\s*[,/]\\s*\\d+)+)\\s*${UNIT}$`)))) {
      sets = m[2].split(/[,/]/).map((v) => ({ value: toValue(v.trim(), m![3]) }));
      name = m[1];
    } else if ((m = s.match(new RegExp(`^(\\d+)\\s*${UNIT}\\b\\s*(.+)$`)))) {
      sets = [{ value: toValue(m[1], m[2]) }];
      name = m[3];
    } else if ((m = s.match(new RegExp(`^(.+?)\\s+(\\d+)\\s*${UNIT}$`)))) {
      sets = [{ value: toValue(m[2], m[3]) }];
      name = m[1];
    }

    name = name.replace(/^(of|x)\s+/, '').trim();
    if (!sets || !sets.length || !name || sets.some((x) => !Number.isFinite(x.value) || x.value <= 0)) {
      result.errors.push({ raw, reason: 'format' });
      continue;
    }
    if (weightKg) sets = sets.map((x) => ({ ...x, weightKg }));

    const ex = findExercise(name, exercises);
    if (!ex) {
      result.errors.push({ raw, reason: 'unknown_exercise', name, sets });
      continue;
    }
    result.lines.push({ raw, exerciseId: ex.id, sets });
  }
  return result;
}
