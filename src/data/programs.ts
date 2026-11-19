import type { PlannedExercise, Program } from '../lib/types';

const ex = (exerciseId: string, sets: number, min: number, max: number): PlannedExercise => ({ exerciseId, sets, min, max });

/** Preset home programs. Rep ranges drive the "double progression" recommendations. */
export const PROGRAMS: Program[] = [
  {
    id: 'fullbody-3',
    name: 'Full Body (3×/week)',
    description: 'Best place to start. Alternate A and B with a rest day in between, e.g. Mon/Wed/Fri.',
    daysPerWeek: 3,
    days: [
      {
        id: 'A',
        name: 'Full Body A',
        exercises: [
          ex('pushup', 3, 6, 15),
          ex('squat', 3, 10, 20),
          ex('inverted-row', 3, 6, 12),
          ex('glute-bridge', 3, 10, 20),
          ex('plank', 3, 20, 60),
        ],
      },
      {
        id: 'B',
        name: 'Full Body B',
        exercises: [
          ex('pike-pushup', 3, 5, 12),
          ex('split-squat', 3, 8, 15),
          ex('towel-row', 3, 8, 15),
          ex('chair-dip', 3, 6, 15),
          ex('calf-raise', 3, 15, 25),
          ex('leg-raise', 3, 8, 15),
        ],
      },
    ],
  },
  {
    id: 'upper-lower-4',
    name: 'Upper / Lower (4×/week)',
    description: 'More volume once full body feels easy. E.g. Mon Upper, Tue Lower, Thu Upper, Fri Lower.',
    daysPerWeek: 4,
    days: [
      {
        id: 'U1',
        name: 'Upper 1',
        exercises: [
          ex('pushup', 4, 6, 15),
          ex('inverted-row', 4, 6, 12),
          ex('pike-pushup', 3, 5, 12),
          ex('reverse-snow-angel', 3, 10, 15),
          ex('diamond-pushup', 2, 5, 12),
        ],
      },
      {
        id: 'L1',
        name: 'Lower 1',
        exercises: [
          ex('squat', 4, 12, 25),
          ex('glute-bridge', 3, 10, 20),
          ex('lunge', 3, 8, 15),
          ex('calf-raise', 3, 15, 25),
          ex('plank', 3, 30, 60),
        ],
      },
      {
        id: 'U2',
        name: 'Upper 2',
        exercises: [
          ex('decline-pushup', 3, 5, 12),
          ex('towel-row', 4, 8, 15),
          ex('chair-dip', 3, 6, 15),
          ex('superman', 3, 10, 15),
          ex('pike-pushup', 3, 5, 12),
        ],
      },
      {
        id: 'L2',
        name: 'Lower 2',
        exercises: [
          ex('bulgarian-split-squat', 3, 6, 12),
          ex('single-leg-glute-bridge', 3, 8, 15),
          ex('wall-sit', 3, 30, 60),
          ex('single-leg-calf-raise', 3, 10, 20),
          ex('hollow-hold', 3, 15, 40),
        ],
      },
    ],
  },
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    description: 'Each day hits different muscles. Run it 3× a week, or twice through (6×) when advanced.',
    daysPerWeek: 3,
    days: [
      {
        id: 'push',
        name: 'Push',
        exercises: [
          ex('pushup', 4, 6, 15),
          ex('pike-pushup', 3, 5, 12),
          ex('chair-dip', 3, 6, 15),
          ex('diamond-pushup', 2, 5, 12),
        ],
      },
      {
        id: 'pull',
        name: 'Pull',
        exercises: [
          ex('inverted-row', 4, 6, 12),
          ex('towel-row', 3, 8, 15),
          ex('reverse-snow-angel', 3, 10, 15),
          ex('superman', 3, 10, 15),
        ],
      },
      {
        id: 'legs',
        name: 'Legs & Core',
        exercises: [
          ex('squat', 4, 12, 25),
          ex('split-squat', 3, 8, 15),
          ex('glute-bridge', 3, 10, 20),
          ex('calf-raise', 3, 15, 25),
          ex('plank', 3, 30, 60),
        ],
      },
    ],
  },
];
