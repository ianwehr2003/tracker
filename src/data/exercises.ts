import type { Exercise } from '../lib/types';

/**
 * Home / bodyweight exercise library. `harder` links form progression chains:
 * once you hit the top of the rep range, the app suggests the harder variation.
 */
export const BUILTIN_EXERCISES: Exercise[] = [
  // Push
  { id: 'incline-pushup', name: 'Incline push-up', aliases: ['incline push up', 'table push up'], muscles: ['chest', 'triceps', 'shoulders'], kind: 'reps', equipment: 'table', harder: 'pushup', tip: 'Hands on a table or couch edge. Body in a straight line.' },
  { id: 'knee-pushup', name: 'Knee push-up', aliases: ['knee push up', 'kneeling push up'], muscles: ['chest', 'triceps', 'shoulders'], kind: 'reps', equipment: 'none', harder: 'pushup' },
  { id: 'pushup', name: 'Push-up', aliases: ['push up', 'pushup', 'press up', 'pushups'], muscles: ['chest', 'triceps', 'shoulders'], kind: 'reps', equipment: 'none', harder: 'decline-pushup', tip: 'Elbows ~45° from your body, chest to a fist above the floor.' },
  { id: 'decline-pushup', name: 'Decline push-up', aliases: ['decline push up', 'feet elevated push up'], muscles: ['chest', 'shoulders', 'triceps'], kind: 'reps', equipment: 'chair', harder: 'archer-pushup', tip: 'Feet on a chair or bed.' },
  { id: 'archer-pushup', name: 'Archer push-up', aliases: ['archer push up'], muscles: ['chest', 'triceps', 'shoulders'], kind: 'reps', equipment: 'none', perSide: true },
  { id: 'diamond-pushup', name: 'Diamond push-up', aliases: ['diamond push up', 'close grip push up', 'triangle push up'], muscles: ['triceps', 'chest'], kind: 'reps', equipment: 'none' },
  { id: 'pike-pushup', name: 'Pike push-up', aliases: ['pike push up', 'pike press'], muscles: ['shoulders', 'triceps'], kind: 'reps', equipment: 'none', harder: 'elevated-pike-pushup', tip: 'Hips high, lower the top of your head toward the floor.' },
  { id: 'elevated-pike-pushup', name: 'Elevated pike push-up', aliases: ['elevated pike push up', 'feet elevated pike'], muscles: ['shoulders', 'triceps'], kind: 'reps', equipment: 'chair' },
  { id: 'chair-dip', name: 'Chair dip', aliases: ['dip', 'dips', 'bench dip', 'chair dips', 'tricep dip'], muscles: ['triceps', 'chest', 'shoulders'], kind: 'reps', equipment: 'chair' },

  // Pull
  { id: 'inverted-row', name: 'Table row', aliases: ['inverted row', 'australian pull up', 'table rows', 'row', 'rows'], muscles: ['back', 'biceps'], kind: 'reps', equipment: 'table', tip: 'Lie under a sturdy table, grip the edge, pull chest to it. Bend knees to make it easier.' },
  { id: 'towel-row', name: 'Door towel row', aliases: ['towel row', 'door row'], muscles: ['back', 'biceps'], kind: 'reps', equipment: 'none', tip: 'Loop a towel around a door handle (door closed!), lean back and row.' },
  { id: 'superman', name: 'Superman', aliases: ['supermans', 'back extension'], muscles: ['back', 'glutes'], kind: 'reps', equipment: 'none' },
  { id: 'reverse-snow-angel', name: 'Reverse snow angel', aliases: ['snow angel', 'snow angels'], muscles: ['back', 'shoulders'], kind: 'reps', equipment: 'none' },
  { id: 'pullup', name: 'Pull-up', aliases: ['pull up', 'pullup', 'pull ups', 'pullups'], muscles: ['back', 'biceps'], kind: 'reps', equipment: 'bar' },
  { id: 'chinup', name: 'Chin-up', aliases: ['chin up', 'chinup', 'chin ups'], muscles: ['back', 'biceps'], kind: 'reps', equipment: 'bar' },

  // Legs
  { id: 'squat', name: 'Squat', aliases: ['squats', 'bodyweight squat', 'air squat'], muscles: ['quads', 'glutes'], kind: 'reps', equipment: 'none', harder: 'bulgarian-split-squat' },
  { id: 'split-squat', name: 'Split squat', aliases: ['split squats'], muscles: ['quads', 'glutes'], kind: 'reps', equipment: 'none', perSide: true, harder: 'bulgarian-split-squat' },
  { id: 'bulgarian-split-squat', name: 'Bulgarian split squat', aliases: ['bulgarian', 'bulgarian split squats', 'rear foot elevated split squat'], muscles: ['quads', 'glutes'], kind: 'reps', equipment: 'chair', perSide: true, harder: 'shrimp-squat', tip: 'Back foot on a chair. Add a loaded backpack when it gets easy.' },
  { id: 'shrimp-squat', name: 'Shrimp squat', aliases: ['shrimp squats'], muscles: ['quads', 'glutes'], kind: 'reps', equipment: 'none', perSide: true },
  { id: 'lunge', name: 'Reverse lunge', aliases: ['lunge', 'lunges', 'reverse lunges'], muscles: ['quads', 'glutes', 'hamstrings'], kind: 'reps', equipment: 'none', perSide: true },
  { id: 'step-up', name: 'Step-up', aliases: ['step up', 'step ups'], muscles: ['quads', 'glutes'], kind: 'reps', equipment: 'chair', perSide: true },
  { id: 'glute-bridge', name: 'Glute bridge', aliases: ['bridge', 'glute bridges', 'hip bridge'], muscles: ['glutes', 'hamstrings'], kind: 'reps', equipment: 'none', harder: 'single-leg-glute-bridge' },
  { id: 'single-leg-glute-bridge', name: 'Single-leg glute bridge', aliases: ['single leg bridge', 'single leg glute bridge'], muscles: ['glutes', 'hamstrings'], kind: 'reps', equipment: 'none', perSide: true },
  { id: 'calf-raise', name: 'Calf raise', aliases: ['calf raises', 'calves'], muscles: ['calves'], kind: 'reps', equipment: 'none', harder: 'single-leg-calf-raise' },
  { id: 'single-leg-calf-raise', name: 'Single-leg calf raise', aliases: ['single leg calf raise'], muscles: ['calves'], kind: 'reps', equipment: 'none', perSide: true },
  { id: 'wall-sit', name: 'Wall sit', aliases: ['wall sits', 'wallsit'], muscles: ['quads'], kind: 'time', equipment: 'none' },

  // Core
  { id: 'plank', name: 'Plank', aliases: ['planks', 'front plank'], muscles: ['core'], kind: 'time', equipment: 'none' },
  { id: 'side-plank', name: 'Side plank', aliases: ['side planks'], muscles: ['core'], kind: 'time', equipment: 'none', perSide: true },
  { id: 'hollow-hold', name: 'Hollow hold', aliases: ['hollow body', 'hollow'], muscles: ['core'], kind: 'time', equipment: 'none' },
  { id: 'leg-raise', name: 'Lying leg raise', aliases: ['leg raise', 'leg raises'], muscles: ['core'], kind: 'reps', equipment: 'none' },
  { id: 'crunch', name: 'Crunch', aliases: ['crunches', 'sit up', 'sit ups', 'situps'], muscles: ['core'], kind: 'reps', equipment: 'none' },
  { id: 'mountain-climber', name: 'Mountain climber', aliases: ['mountain climbers'], muscles: ['core', 'shoulders'], kind: 'reps', equipment: 'none' },
  { id: 'burpee', name: 'Burpee', aliases: ['burpees'], muscles: ['chest', 'quads', 'core'], kind: 'reps', equipment: 'none' },
];
