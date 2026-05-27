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
- **Pick auto-counts as a call**; the only explicit action under a reveal is **Remove student** (`X`), which excludes them for the rest of the session.
- **Reset names** (`R`) — brings everyone removed back into the rotation.
- **Heat map** showing how often each student has been called, plus a "Fair mode" toggle.
- **Class management** — type, paste, or upload `.csv`/`.txt`. Backup-to-file and load-from-file under "Backup & sync" in the modal.
- **Offline first** — service worker caches the whole shell. Sounds are synthesized via Web Audio (no binary assets).
- **Themes** — light / dark / high-contrast for projectors in bright rooms.

## Keyboard shortcuts

| Key      | Action                            |
| -------- | --------------------------------- |
| `Space`  | Pick / spin                       |
| `X`      | Remove current student            |
| `R`      | Reset names (un-remove everyone)  |
| `1`–`4`  | Switch picker mode                |
| `F`      | Toggle fullscreen                 |
| `Esc`    | Close modal                       |

## Deploying for free

The output of `npm run build` is a fully static site in `dist/`. Any static host works; pick whichever you like.

- **Render** (recommended — the included `render.yaml` blueprint configures everything).
  1. Push to GitHub, then go to https://render.com and click **New + → Blueprint**.
  2. Connect the repo. Render reads `render.yaml`, sets the build command, publish directory, cache headers, and SPA fallback automatically.
  3. First build takes ~2–3 minutes. Your URL becomes `<service-name>.onrender.com` (free tier, HTTPS, auto-deploys on every push).
  - Alternative: skip the blueprint and create a **Static Site** manually — build command `npm install && npm run build`, publish directory `dist`.
- **Vercel** — `vercel deploy` from the project root, or import the GitHub repo. No config needed.
- **Netlify** — drag-and-drop the `dist/` folder into the Netlify dashboard, or connect the repo (build command `npm run build`, publish directory `dist`).
- **Cloudflare Pages** — connect the repo, build command `npm run build`, output directory `dist`.
- **GitHub Pages** — push `dist/` to the `gh-pages` branch (or use any GitHub Action). If you host under a subpath, set `base: '/your-repo/'` in `vite.config.ts`.

Once it's hosted, share a clean URL like `pickastudent.example.com` — teachers can bookmark it or install it to their home screen.

### Node version

The build is pinned to **Node 20+** via both `.node-version` (read by Render, fnm, nvm, and most hosts) and the `engines` field in `package.json`. If your host needs another mechanism, either should be enough.

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
    ResponseButtons.tsx        Remove-student button under the reveal
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
3. Create `src/components/modes/MyMode.tsx`. Call `pickNext(students, classState, settings)` to choose a student, render whatever animation you like, then call the parent's `onOutcome([id], 'answered')` to record the call. Reuse `ResponseButtons` for the Remove action to stay consistent.
4. Add a branch in `App.tsx`'s mode `switch`.

Ideas left as comments in `App.tsx`: bingo card, slot machine, tournament bracket.

## Tech

React 18 · Vite 5 · TypeScript · Tailwind CSS · Framer Motion · `vite-plugin-pwa` (Workbox under the hood). No telemetry, no analytics.

## Replacing placeholder icons

The icons in `public/` are SVG placeholders — a "P" on a blue→green gradient. Replace `favicon.svg`, `pwa-192x192.svg`, `pwa-512x512.svg`, and `apple-touch-icon.svg` with your own art. iOS prefers PNG for the home-screen icon, so for best results add a 180×180 PNG named `apple-touch-icon.png`, drop it in `public/`, and update the `<link rel="apple-touch-icon">` in `index.html` plus the `includeAssets` list in `vite.config.ts`.

## License

MIT. Share with any teacher who'd find it useful.
