# PickAStudent

A frictionless classroom name picker. Open it, pick a class, pick a mode, start calling names. No login, no backend, no ads. Works offline as an installable PWA.

## Quick start

```bash
npm install
npm run dev
```

Open the printed URL. The app loads with a "Sample Class" pre-populated so you can try every mode in seconds.

```bash
npm run build       # Production bundle to dist/
npm run preview     # Serve the built bundle locally
```

## Features at a glance

- **Four picker modes** — Standard, Wheel, Mystery Card, Team Generator (switch with `1`–`4`).
- **Pass / Come back / Answered** under every pick — `Enter`, `P`, `C`.
- **Optional response timer** with green→amber→red ring and pause/+15s/reset.
- **Heat map** showing how often each student has been called, plus a "Fair mode" toggle.
- **Class management** — type, paste, or upload `.csv`/`.txt`. Export as JSON or CSV. Import to merge.
- **Offline first** — service worker caches the whole shell. Sounds are synthesized via Web Audio (no binary assets).
- **Themes** — light / dark / high-contrast for projectors in bright rooms.

## Keyboard shortcuts

| Key      | Action                       |
| -------- | ---------------------------- |
| `Space`  | Pick / spin                  |
| `Enter`  | Answered                     |
| `P`      | Pass                         |
| `C`      | Come back                    |
| `1`–`4`  | Switch picker mode           |
| `F`      | Toggle fullscreen            |
| `R`      | Reset call counts            |
| `Esc`    | Close modal                  |

## Deploying for free

The output of `npm run build` is a fully static site in `dist/`. Drop it on:

- **Vercel** — `vercel deploy` from the project root, or import the GitHub repo. No config needed.
- **Netlify** — drag-and-drop the `dist/` folder into the Netlify dashboard, or connect the repo (build command `npm run build`, publish directory `dist`).
- **Cloudflare Pages** — connect the repo, build command `npm run build`, output directory `dist`.
- **GitHub Pages** — push `dist/` to the `gh-pages` branch (or use any GitHub Action). If you host under a subpath, set `base: '/your-repo/'` in `vite.config.ts`.

Once it's hosted, share a clean URL like `pickastudent.example.com` — teachers can bookmark it or install it to their home screen.

## Add to home screen

Once the page is loaded over HTTPS, the app prompts to install on the user's second visit (or any visit if they trigger the browser's own install UI).

**iOS (Safari)** — open the page → tap the Share button → "Add to Home Screen" → confirm. The app launches in standalone mode (no browser chrome). Sound and offline use both work after the first visit.

**Android (Chrome / Edge / Brave)** — a banner offers "Install" the second time you load the page. You can also tap the browser menu → "Install app" / "Add to Home Screen". The app launches as a standalone PWA.

**Desktop (Chrome / Edge)** — a small install icon appears in the address bar. Click it → "Install". The app gets its own window and shows up in the OS app launcher.

After install, everything works offline. Updates download in the background; you'll see a small "Update ready — refresh to apply" toast when one is waiting.

## How data is stored

All classes, students, settings, and call history are persisted in the browser's `localStorage` under a single key (`pickastudent:v1`). There is **no server**. Things to know:

- Clearing browser data wipes everything. Use the "Export all (JSON)" button in **Classes** before doing that.
- Each device/browser is separate. To move a class, export from one and import on the other.
- The storage layer (`src/lib/storage.ts`) is intentionally tiny — swap to IndexedDB later by changing only that file.

## Project layout

```
src/
  App.tsx                      Root layout + global shortcuts
  main.tsx                     React entrypoint
  types.ts                     Domain types (Klass, Student, ClassState…)
  hooks/
    useAppState.ts             Reducer + persistence + theme/font effects
    useTimer.ts                RAF-based countdown
    useKeyboard.ts             Global shortcut binder (skips inputs)
    useFullscreen.ts           Browser fullscreen toggle
  lib/
    pickerEngine.ts            Pure picking logic — fair mode, no-repeat, come-back queue
    teamSplitter.ts            Team generation + recent-pair avoidance
    storage.ts                 localStorage wrapper (single seam — easy to swap)
    sounds.ts                  Web Audio synthesis (ding/chime/drumroll)
    confetti.ts                Tiny canvas confetti (no dependency)
    parseStudents.ts           Paste / CSV / TXT auto-detect
    ids.ts                     Cheap unique IDs
  components/
    modes/
      StandardMode.tsx         Big name reveal
      WheelMode.tsx            SVG wheel of fortune
      MysteryCardMode.tsx      3D-flip card reveal
      TeamGeneratorMode.tsx    Animated dealing into team columns
    Header.tsx                 Top bar
    ClassSwitcher.tsx          Chip strip of classes
    ModeTabs.tsx               4 mode tabs with shortcut hints
    ClassManager.tsx           Roster CRUD, import/export
    SettingsPanel.tsx          Settings modal
    HeatMap.tsx                Per-student call-count grid
    RecentlyPicked.tsx         Last 5 picks + outcomes + undo
    TimerRing.tsx              SVG draining ring
    ResponseButtons.tsx        Answered / Pass / Come back
    EmptyState.tsx             First-run / no-class fallback
    Modal.tsx                  Reusable modal shell
    PWAToasts.tsx              "Update ready" + install prompt
  data/
    sampleClass.ts             Demo class shipped on first run
```

## Adding a new picker mode

The engine already exposes everything you need:

1. Add an id to `PickerMode` in `src/types.ts` (e.g. `'bingo'`).
2. Add a tab to `src/components/ModeTabs.tsx`.
3. Create `src/components/modes/MyMode.tsx`. Call `pickNext(students, classState, settings)` to choose a student, render whatever animation you like, then on outcome call the parent's `onOutcome([id], 'answered' | 'pass' | 'comeback')`. Reuse `ResponseButtons` and `TimerRing` to stay consistent.
4. Add a branch in `App.tsx`'s mode `switch`.

Ideas left as comments in `App.tsx`: bingo card, slot machine, tournament bracket.

## Tech

React 18 · Vite 5 · TypeScript · Tailwind CSS · Framer Motion · `vite-plugin-pwa` (Workbox under the hood). No telemetry, no analytics.

## Replacing placeholder icons

The icons in `public/` are SVG placeholders — a "P" on a blue→green gradient. Replace `favicon.svg`, `pwa-192x192.svg`, `pwa-512x512.svg`, and `apple-touch-icon.svg` with your own art. iOS prefers PNG for the home-screen icon, so for best results add a 180×180 PNG named `apple-touch-icon.png`, drop it in `public/`, and update the `<link rel="apple-touch-icon">` in `index.html` plus the `includeAssets` list in `vite.config.ts`.

## License

MIT. Share with any teacher who'd find it useful.
