# Tracker

A mobile-first web app for gaining muscle: log food, train at home with automatic progression, track weight, and keep a shopping list.

**Live app:** https://ianwehr2003.github.io/tracker/ (redeployed automatically on every push to `main`)

Works without an account (data stays on the device). Sign in with Google or email to back up to the cloud and sync between devices. Every user has their own private data.

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
- **Accounts & sync (Firebase):**
  - Sign in with Google or email.
  - Offline-first: the app works offline and changes sync when you're back online. Edits made on two devices are merged, not overwritten.
  - Signing out clears the device, so several people can share a phone.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN, so you can open it on your phone)
npm test           # unit tests for nutrition, parsing, recommendations, sync merging
npm run dev:emulator  # dev against local Firebase emulators (needs `npx firebase-tools emulators:start --only auth,firestore`)
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

## Cloud sync — how it works

- **Where the data lives.** Each user's data is stored in Firestore under `users/{uid}/data/{slice}`. The slices are:
  - `core`: profile, settings, custom foods, meals, shopping list
  - `weights`
  - `entries-YYYY`, `workouts-YYYY`, `habits-YYYY`: one document per year
- **Speed and offline.** The app always reads and writes `localStorage` first, so it's fast and works offline.
- **Sync logic** (`src/lib/sync.tsx`): every upload runs in a transaction. It re-reads the cloud copy and compares both sides with the hash recorded at the last sync, then picks one of:
  - keep the local version
  - take the cloud version
  - merge both (nothing logged on either device is lost)
- **Security.** `firestore.rules` limits each user to their own documents. Deploy the rules with `npx firebase-tools deploy --only firestore:rules`, or paste them into Firebase console → Firestore → Rules.
- **Config.** The Firebase web config in `src/lib/firebase.ts` is public by design; access is controlled by the rules.

## Ideas for v2

- Charts per exercise, plus body measurements.
- Barcode scanning (Open Food Facts API).
- AI workout suggestions (e.g. Claude API) based on history.
- Auto-generating the shopping list from planned meals.
- Offline service worker (installable app that loads with no connection).
