# Marscade

One iPhone app for all my puzzle games. Fully offline, no ads, no timers.
Built with plain JavaScript, wrapped with Capacitor, compiled by GitHub Actions and installed with AltStore.

## Games

| Game | Status |
|---|---|
| Catnap (cat placement puzzle) | Playable |
| Everything else | See [BACKLOG.md](BACKLOG.md) |

## Run it on your PC

```bash
npm install
npm run dev
```

Open http://localhost:8000. To try it on the iPhone before building, open `http://<your-PC-IP>:8000` in Safari while both are on the same Wi-Fi.

`npm test` checks that 120 Catnap levels each have exactly one solution.

## Put it on the iPhone

1. Push to GitHub.
2. Either run **Actions → Build iOS → Run workflow**, or tag a version:
   ```bash
   git tag v0.1.0
   git push --tags
   ```
3. Download `Marscade.ipa` (from the workflow run's artifacts, or from the GitHub release when you used a tag).
4. Open the file with AltStore on the iPhone.

Bump `version` in `package.json` before each tagged release. Your progress is kept when you install a new version over the old one.

## Project layout

```
src/
  index.html, css/, fonts/
  js/main.js               hub screen
  js/core/                 storage, haptics, small UI helpers, seeded random
  js/games/index.js        list of games shown in the hub
  js/games/catnap/         engine (generator + solver), levels, screen
assets/icon-only.png       app icon (1024×1024)
.github/workflows/ios.yml  builds the unsigned IPA
```

## Adding a game

1. Create `src/js/games/<id>/index.js` that exports:
   ```js
   export default {
     id: 'sudoku',
     name: 'Sudoku',
     blurb: 'One line shown on the hub card.',
     status: 'ready',
     art: '<svg>…</svg>',
     progress: () => 'Level 3',
     mount(root, { exit }) { /* build the screen */ return { destroy() {} }; },
   };
   ```
2. Import it in `src/js/games/index.js` and add it to `games`.
3. Save progress with `store.get('<id>', defaults)` and `store.set('<id>', value)`.

## Catnap difficulty

- Level 1–2: easy 5×5.
- Grid grows one size every 12 levels, up to 10×10.
- Every 5th level is hard, every 10th is super hard, with a bigger grid.
- Other levels are randomly easy or medium, with medium getting more common over time.
- Difficulty is measured by the techniques a solver needs: basic eliminations (easy), "this cell would block a whole color" (medium), groups of colors locked into the same rows or columns (hard), trying a cat and following the consequences (super hard).
- Each level number always produces the same puzzle.
