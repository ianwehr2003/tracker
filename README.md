# FitTrack

A mobile-first web app for gaining muscle: log food, train at home with automatic progression, track weight, and keep a shopping list.
**Live app:** https://ianwehr2003.github.io/tracker/ (redeployed automatically on every push to `main`)

All data stays on your device (localStorage). Back it up with **Settings → Export backup**.

## Features (v0.1)

- **Today:** calorie and protein progress, today's recommended workout, water, sleep and weigh-in.
- **Food:** ~70 built-in foods (per 100 g, raw and cooked versions), custom foods from package labels, household units (1 egg, 1 scoop…), saved meals, and copying yesterday's meals.
- **Targets:** Mifflin–St Jeor maintenance + surplus; protein per kg of body weight; fat 25 %; carbs fill the rest.
- **Train:**
  - Preset home programs (Full Body 3×, Upper/Lower 4×, Push/Pull/Legs).
  - Double-progression recommendations: hit every set → +1 rep (or +5 s); at the top of the range → a harder variation.
  - Quick log in plain text (`5x10 push ups`, `3x30s plank`, `10, 8, 8 dips`, `3x8 squats @ 10kg`).
  - A "Try something new" generator, a muscle-recovery view, a rest timer (sound and vibration), and history.
- **Progress:**
  - Weight chart with a 7-day average.
  - A trend check against a lean-bulk pace of +0.2–0.5 kg/week, with a one-tap calorie adjustment.
  - Streaks, a weekly summary, and personal records.
- **Shop:** list grouped by store section, staples you re-add with one tap, and suggestions from the food database.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN, so you can open it on your phone)
npm test           # unit tests for nutrition, parsing, recommendations
npm run build      # static site in dist/ — host anywhere (GitHub Pages, Netlify, …)
```

## Project layout

```
src/
  data/          foods.ts, exercises.ts, programs.ts  ← seed data, easy to extend
  lib/           pure logic (no React): nutrition, workouts (recommendations, PRs, recovery),
                 parse (quick log), summary (weekly/streaks), storage, store (React context)
  components/    shared UI (cards, sheets, rest timer, weight chart)
  pages/         one file per tab
```

- To add an exercise, add an entry in `src/data/exercises.ts`. Link `harder` to create a progression chain.
- To add a program, add an entry in `src/data/programs.ts`.
- If you add fields to the saved state, give them defaults in `defaultState()` (`src/lib/storage.ts`). `migrate()` fills them in for existing users.

## Ideas for v2

- Charts per exercise, plus body measurements.
- Barcode scanning (Open Food Facts API).
- AI workout suggestions (e.g. Claude API) based on history.
- Auto-generating the shopping list from planned meals.
- Offline service worker, and sync across devices (e.g. Supabase).
