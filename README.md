# Marscade

One iPhone app for all my puzzle games. Fully offline, no ads, no timers.
Built with plain JavaScript, wrapped with Capacitor, compiled by GitHub Actions and installed with AltStore.

## Games

| Game | Status |
|---|---|
| Catnap (cat placement puzzle) | Playable |
| Sudoku | Playable |
| Magic Sort | Playable |
| Everything else | See [BACKLOG.md](BACKLOG.md) |

## Run it on your PC

```bash
npm install
npm run dev
```

Open http://localhost:8000. To try it on the iPhone before building, open `http://<your-PC-IP>:8000` in Safari while both are on the same Wi-Fi.

`npm test` checks that Catnap and Sudoku levels each have exactly one solution and that Magic Sort levels can be finished.

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
  js/core/                 storage, haptics, shared game screen (shell), seeded random
  js/games/index.js        list of games shown in the hub
  js/games/<game>/         engine (generator + solver), levels, screen
assets/icon-only.png       app icon (1024×1024)
.github/workflows/ios.yml  builds the unsigned IPA
```

## Adding a game

1. Create `src/js/games/<id>/index.js` that exports:
   ```js
   export default {
     id: 'wordsearch',
     name: 'Word Search',
     blurb: 'One line shown on the hub card.',
     art: '<svg>…</svg>',
     color: 'var(--r3)',
     progress: () => 'Level 3',
     mount(root, { exit }) { /* build the screen */ return { destroy() {} }; },
   };
   ```
2. Use `createShell` from `src/js/core/shell.js` for the top bar, rules sheet, restart and win dialog.
3. Import the game in `src/js/games/index.js` and add it to `games`.
4. Save progress with `store.get('<id>', defaults)` and `store.set('<id>', value)`.

## Difficulty

All games: every 5th level is hard, every 10th is super hard, and the levels in between are randomly easy or medium (medium gets more common over time). Each level number always produces the same puzzle.

### Catnap
- Grid size changes every level. Easy levels stay small (5–9), super hard ones go up to 15×15, and the ranges widen as you progress.
- Difficulty is measured by the techniques a solver needs: basic eliminations (easy), "this cell would block a whole color" (medium), groups of colors locked into the same rows or columns (hard), trying a cat and following the consequences (super hard).

### Sudoku
- Easy: only "this is the only number that fits" steps, 34+ clues.
- Medium: also "this number must be in this part of the box".
- Hard: pairs and triples of candidates.
- Super hard: X-wings or longer chains of reasoning.

### Magic Sort
- More colors as you progress (3 up to about 11).
- Hard levels have only one empty tube. Super hard levels also have taller tubes (5 layers).
- Every level is checked by a solver so it can always be finished.
