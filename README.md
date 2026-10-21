# Marscade

One iPhone app for all my puzzle games. Fully offline, no ads, no timers.
Built with plain JavaScript, wrapped with Capacitor, compiled by GitHub Actions and installed with AltStore.

## Games

| Game | Status |
|---|---|
| Catnap (cat placement puzzle) | Playable |
| Sudoku | Playable |
| Magic Sort | Playable |
| Word Search (English and Portuguese) | Playable |
| Bead Sort | Playable |
| Arrow Go | Playable |
| Block Blast | Playable |
| Everything else | See [BACKLOG.md](BACKLOG.md) |

## Run it on your PC

```bash
npm install
npm run dev
```

Open http://localhost:8000. To try it on the iPhone before building, open `http://<your-PC-IP>:8000` in Safari while both are on the same Wi-Fi.

`npm test` checks that Catnap and Sudoku levels each have exactly one solution, that Magic Sort levels can be finished, that Word Search levels build in both languages, that Bead Sort levels can be cleared, and that Arrow Go levels can be emptied.

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

## Shared rules

- Every level gives you **3 lives** (except Bead Sort, which uses a timer). A mistake costs one; at zero you start the level over.
  - Catnap: placing a cat in the wrong square (placed cats are final).
  - Sudoku: entering a wrong number (right numbers are final; notes are free).
  - Magic Sort: a pour that leaves no way to finish (it is taken back).
  - Word Search: selecting 3 or more letters that aren't a word.
  - Arrow Go: tapping an arrow whose way out is blocked.
  - Block Blast: running out of room (you then get three new pieces that fit).
- Restart (top right) clears the board in one tap but keeps your remaining lives.
- Hints are unlimited and never cost lives, but they reset your "streak without hints" in Stats.
- Settings on the home screen: vibration, light/dark/auto appearance, and word-game language.

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
- Hard levels hide the lower layers of some tubes (shown as ?) until they reach the top; super hard levels hide them in every tube.
- Undo is free; one extra empty tube can be added per level.

### Word Search
- 12 themes per language, words placed with overlaps.
- Easy: across and down only. Medium: adds diagonals. Hard: any direction, including backwards. Super hard: also scatters partial "decoy" words.
- Grids grow from 7×7 to about 14×14.

### Bead Sort
- The picture starts scrambled; a small preview shows the finished picture. Tap a wrong bead to lift it into the trays (any colors), then tap a color in the trays and the empty spots that need it. Empty spots show a ring in the color they need.
- No lives here: you only lose if the timer runs out. The time limit depends on how scrambled the picture is and the difficulty.
- If the trays fill with beads that fit nowhere, they go back into the picture.
- Hints: Show a bead, Auto-place (drops every fitting tray bead into place) and Freeze time (stops the timer for 20 seconds).
- Easy and medium levels: pixel art from the free CC0 Dungeon Crawl tile set. Hard and super hard: an archive of 52 public-domain paintings (van Gogh, Leonardo, Klimt, Hokusai, Vermeer, Monet, Bruegel, Botticelli…) with only one tray.
- Sources and licenses are in [CREDITS.md](CREDITS.md). To rebuild the pictures: `python3 tools/build_bead_art.py <CC0-Dungeon-Pack folder>` and `python3 tools/build_painting_art.py <paintings folder>`.

### Arrow Go
- Arrows are built in reverse removal order, so every level can always be cleared.
- Harder levels have bigger boards (up to 12×12), longer and more bent arrows, and arrows deliberately placed in each other's way.
- Difficulty is measured by how many "rounds" of freeing arrows the board needs.

### Block Blast
- 8×8 board, three pieces at a time, drag to place; full rows and columns clear. Reach the level's target score to win.
- Multi-line clears and clears on consecutive turns score extra.
- Harder levels start with grey stones on the board, deal bigger and awkward pieces, and no longer guarantee that a dealt piece fits.
- Hint: Show a spot highlights a good placement.
