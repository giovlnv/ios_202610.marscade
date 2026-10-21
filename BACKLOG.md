# Marscade backlog

## How effort is measured

- **1 session** = one long working chat with Claude, like the one that built Catnap: build, test, fix, deliver.
- **Usage** compares how much of your plan's usage limit a game will likely eat, relative to Catnap (= Medium). Actual limits depend on your plan, so treat these as rough relative sizes.
- Effort covers a first playable version. Polish rounds (new themes, more levels, tweaks after playing) come on top.
- Word games will ship in **English and Portuguese**, with a language switch.

## Summary

| # | Game | Status | Effort | Sessions | Usage |
|---|---|---|---|---|---|
| 1 | Catnap (Meowdoku) | Done | – | 1 | Medium |
| 2 | Sudoku | Done | – | 0.5 | Light |
| 3 | Magic Sort | Done | – | 0.5 | Light |
| 4 | Word Search | Done | – | 0.5 | Light |
| 5 | Bead Sort (jewel color sort) | Planned | Medium | 1–1.5 | Medium |
| 6 | Block Blast | Planned | Medium | 1 | Medium |
| 7 | Arrow Go | Planned | Medium | 1 | Medium |
| 8 | Stamp Solitaire | Planned | Medium | 1.5 | Medium |
| 9 | Rotate Rings | Planned | Medium–Hard | 1.5–2 | Medium–Heavy |
| 10 | Picture Builder | Planned | Medium–Hard | 1.5–2 | Medium–Heavy |
| 11 | Magic Tiles | Planned | Hard | 2 | Heavy |
| 12 | Crosswords | Planned | Hard | 2–3 | Heavy |
| 13 | Helix Jump | Planned | Hard | 2–3 | Heavy |

## Details

### 5. Bead Sort (jewel color sort) · Medium
- A pixel picture made of colored beads; tap beads to send them to trays; a full tray of one color clears.
- Pictures generated from small pixel patterns, no artist needed.
- Hardest part: making sure every level can be finished with the tray slots given.
- No timer, no paid boosters.

### 6. Block Blast · Medium
- 8×8 board, three random pieces at a time, drag to place, full rows and columns clear.
- Endless with best score; ends when no piece fits.
- Main work: drag-and-drop that feels good with a finger (piece lifted above the finger, snap preview).

### 7. Arrow Go · Medium
- Grid of arrows; tap one and it slides out in its direction if the path is clear; clear the board.
- Levels built backwards so every level is solvable.

### 8. Stamp Solitaire · Medium
From the App Store screenshots: a solitaire layout of stamp cards, where the goal is sorting stamps into themed category albums.
- Top row: category albums (e.g. Bouquet 2/6, Dress 1/6), each filling up as you add matching stamps.
- Columns of face-down stamps with the top one revealed, plus a draw pile.
- Move stamps into their category; completing a category clears it; clear the board to win.
- Work: card layout and drag/tap moves, a level generator that guarantees a win, and stamp artwork drawn in code (simple icons per category).
- Categories need names in English and Portuguese.

### 9. Rotate Rings · Medium–Hard
From the App Store screenshots: interlocked C-shaped rings, each with a gap. Rotate rings so the gaps line up, letting rings slip free one by one until the puzzle is untangled.
- Work: 2D geometry for interlocking rings and gaps, drag-to-rotate, collision rules for when a ring can be removed.
- Levels need a generator that guarantees a solution (build untangled, then lock it up backwards).
- Riskier than the grid games because of the geometry; a first version could use only circular C-rings.

### 10. Picture Builder · Medium–Hard
- A scene with dark silhouettes; drag the matching piece from the tray onto its silhouette.
- Simple art built from flat shapes drawn in code.
- Main cost is making enough scenes; each new scene is ongoing art work.
- No energy or timers.

### 11. Magic Tiles · Hard
- Piano tiles falling to the beat; tap them in time.
- Public-domain melodies played with built-in synth sounds, fully offline.
- Hard parts: tight audio timing in the iPhone web view, writing song charts.
- Timed by nature, unlike the other games.

### 12. Crosswords · Hard
- Fitting words into a grid is solvable; the hard part is clues.
- Needs bundled dictionaries with definitions in English and Portuguese; Portuguese sources under an open license are harder to find.
- Fallback option: smaller "arrow word" style puzzles from a curated list.

### 13. Helix Jump · Hard
- Ball bouncing down a spinning tower; drag to rotate.
- Needs a small 3D library bundled for offline use, simple physics, smooth 60 fps.

## Approved and built

- Sudoku "Auto notes"
- Magic Sort hidden layers, Undo, one extra tube per level
- Hub settings: vibration, appearance, word-game language
- Per-game stats: solved per difficulty, best streak without hints
- 3 lives per level in every game; Catnap cats are final

## Proposals waiting for your approval

Nothing pending right now.
