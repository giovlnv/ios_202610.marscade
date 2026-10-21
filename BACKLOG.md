# Marscade backlog

## How effort is measured

- **1 session** = one long working chat with Claude, like the one that built Catnap: build, test, fix, deliver.
- **Usage** compares how much of your plan's usage limit a game will likely eat, relative to Catnap (= Medium). Actual limits depend on your plan, so treat these as rough relative sizes.
- Effort covers a first playable version. Polish rounds (new themes, more levels, tweaks after playing) come on top.

## Summary

| # | Game | Effort | Sessions | Usage | Open questions |
|---|---|---|---|---|---|
| 1 | Catnap (Meowdoku) | Done | 1 | Medium | – |
| 2 | Sudoku | Easy | 0.5–1 | Light | – |
| 3 | Word Search | Easy | 0.5 | Light | Language, word themes |
| 4 | Magic Sort | Easy | 0.5–1 | Light | Balls or liquid in tubes? |
| 5 | Bead Sort (jewel color sort) | Medium | 1–1.5 | Medium | Exact tapping rules |
| 6 | Block Blast | Medium | 1 | Medium | – |
| 7 | Arrow Go | Medium | 1 | Medium | – |
| 8 | Rotate Ring | Medium (est.) | 1 | Medium | How the original works |
| 9 | Stamp Solitaire | Medium (est.) | 1–1.5 | Medium | How the original works |
| 10 | Picture Builder | Medium–Hard | 1.5–2 | Medium–Heavy | Scene themes |
| 11 | Magic Tiles | Hard | 2 | Heavy | It is timed by nature |
| 12 | Crosswords | Hard | 2–3 | Heavy | Language, clue source |
| 13 | Helix Jump | Hard | 2–3 | Heavy | – |

## Details

### 2. Sudoku · Easy
- Generator that removes numbers while a solver confirms there's still exactly one solution (same idea as Catnap).
- Difficulty from the solving techniques needed (singles, pairs, X-wing…), so progression can copy Catnap's every-5/every-10 pattern.
- Pencil marks, highlight same numbers, mistake checking, hints.
- Risk: low. Mostly UI work.

### 3. Word Search · Easy
- Places words from a themed list in all 8 directions, fills the rest with random letters.
- Drag to select a word.
- Needs word lists bundled in the app (a few KB per theme).
- Decide: English, Portuguese, or both.

### 4. Magic Sort · Easy
- Tubes of mixed colored balls; move the top ball onto the same color or an empty tube until each tube is one color.
- Levels made by scrambling a solved state, then a solver checks they're solvable.
- Difficulty from number of colors, tubes and empty spaces.

### 5. Bead Sort (jewel color sort, from your screenshot) · Medium
- A pixel picture made of colored beads; tap beads to send them to trays; a full tray of one color clears.
- Pictures generated from small pixel patterns (hearts, animals, fruit…), no artist needed.
- Hardest part: making sure every level can be finished with the tray slots given.
- Without the timer and the paid boosters the original has.

### 6. Block Blast · Medium
- 8×8 board, three random pieces at a time, drag to place, full rows and columns clear.
- Endless with best score; ends when no piece fits.
- Main work: drag-and-drop that feels good with a finger (piece lifted above the finger, snap preview).
- Piece picking needs a small "fairness" rule so runs don't end too early.

### 7. Arrow Go · Medium
- Grid of arrows; tap one and it slides out in its direction if the path is clear; clear the board.
- Levels built backwards (add arrows that could have left last) so every level is solvable.
- Difficulty from board size and how tangled the order is.

### 8. Rotate Ring · Medium (estimate)
- Likely concentric rings you rotate to line up colors or a picture. Effort depends on the exact rules.
- Needs a screenshot or description of the original.

### 9. Stamp Solitaire · Medium (estimate)
- If it's a solitaire card game (like Klondike), the work is card drawing, drag between piles and deal validation.
- Needs a screenshot or description of the original.

### 10. Picture Builder (from your screenshot) · Medium–Hard
- A scene with dark silhouettes; drag the matching piece from the bottom tray onto its silhouette.
- Agreed: simpler art, so scenes are built from flat shapes drawn in code (park, kitchen, beach…).
- Main cost is making enough scenes; each new scene is ongoing art work. A scene editor could speed this up later.
- Without energy or timers.

### 11. Magic Tiles · Hard
- Piano tiles falling to the beat of a song; tap them in time.
- Songs: public-domain melodies (classical, folk) written as notes and played with built-in synth sounds, fully offline.
- Hard parts: tight audio timing inside the iPhone web view, and writing out song charts.
- This one is timed by nature, unlike your other games.

### 12. Crosswords · Hard
- Fitting words into a grid is solvable; the hard part is clues.
- Clues need a bundled dictionary with definitions (English has free sources; Portuguese is harder to find under an open license).
- Option: smaller "arrow word" style puzzles from a curated list.

### 13. Helix Jump · Hard
- A ball bouncing down a spinning tower; drag to rotate the tower so the ball falls through gaps.
- Needs a small 3D library (bundled for offline use) and simple physics.
- Hard parts: smooth 60 fps on the phone and fair level generation.

## Hub features (anytime, small)
- Settings: haptics on/off, light/dark/system theme.
- Per-game stats: levels solved, best scores.
- Reorder or hide games on the hub.
