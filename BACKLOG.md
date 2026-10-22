# Marscade backlog

## How effort is measured

- **1 session** = one long working chat with Claude, like the one that built Catnap: build, test, fix, deliver.
- **Usage** compares how much of your plan's usage limit a game will likely eat, relative to Catnap (= Medium). Actual limits depend on your plan, so treat these as rough relative sizes.
- Effort covers a first playable version. Polish rounds (new themes, more levels, tweaks after playing) come on top.
- Word games will ship in **English and Portuguese**, with a language switch.

## Done

Catnap, Sudoku, Magic Sort, Word Search (EN + PT), Bead Sort, Arrow Go, Block Blast, Block Endless.

## Roadmap

Effort per game: Easy ≈ 0.5 session, Medium ≈ 1–1.5, Hard ≈ 2–3. "Original look" means the rules can be copied but the name and characters are trademarks, so Marscade's version gets its own name and art.

### Easy
| Game | What it is | Notes |
|---|---|---|
| 2048 | Slide tiles to merge numbers | Original game is open source (MIT); swipe controls |
| Minesweeper | Reveal safe cells using number clues | No-guess boards made with a solver, like Catnap |
| Snake | Classic growing snake | Real-time; swipe or on-screen arrows |
| Word Guess (Wordle style) | Guess a 5-letter word in 6 tries | Reuses the EN/PT word lists |
| Reversi | Flip discs against the computer | Difficulty = how far the AI looks ahead |
| Connect Four | Drop discs to make 4 in a row vs the computer | Same AI approach as Reversi |
| Tents | Place a tent next to every tree | Generator + solver like Catnap |
| Bridges (Hashi) | Connect islands with the right number of bridges | Generator + solver |
| Nurikabe | Shade cells to form islands of given sizes | Generator + solver |
| Kakuro | Number crossword with sums | Generator + solver |

### Medium
| Game | What it is | Notes |
|---|---|---|
| Nonograms (Picross) | Fill cells from row/column clues to reveal a picture | Reuses the CC0 pixel art and the 52 paintings |
| Falling Blocks (Tetris style) | Rotate falling pieces to clear lines | Original look required |
| Mahjong Solitaire | Match free pairs in a stacked tile layout | Tiles drawn in code; layouts generated solvable |
| Card Solitaires | Klondike, FreeCell and Spider | Card art in code |
| Flow | Connect same-colored dots, filling the board | Generator + uniqueness check |
| Sokoban | Push boxes onto targets | Generated levels or a freely licensed level pack |
| Jigsaw | Rebuild a painting from pieces | Reuses the painting archive |
| Bubble Shooter | Aim and pop groups of 3+ colors | Aiming and wall bounces |
| Breakout | Bounce a ball to break bricks | Real-time; brick layouts can be pixel art |
| Stamp Solitaire | Sort stamp cards into themed albums | Category names in EN/PT |

### Hard
| Game | What it is | Notes |
|---|---|---|
| Maze Chase (Pac-Man style) | Eat dots in a maze while dodging 4 ghosts | Ghost AI and swipe controls; original look required |
| Rotate Rings | Rotate interlocked rings to line up gaps and free them | Ring geometry and a solvable-level generator |
| Picture Builder | Drag pieces onto silhouettes in pixel-art scenes | Scenes from the CC0 tiles; paintings on hard levels |
| Magic Tiles | Tap piano tiles to the beat | Audio timing; public-domain melodies |
| Crosswords | Classic crosswords in EN and PT | Clue databases are the hard part |
| Helix Jump | Bounce a ball down a spinning tower | Needs a small 3D library |

## Details

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
- Hard and super hard levels: the public-domain paintings, cut into pixel pieces you drag back into place.
- Art: the same free CC0 Dungeon Crawl pixel tile set used by Bead Sort (objects, furniture, trees, animals), so scenes are real pixel art. Other CC0 packs (e.g. Kenney) can be added if needed.
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
- One-tap Restart button with a label (keeps remaining lives)
- Bead Sort pictures from free pixel art (CC0) and an archive of 52 public-domain paintings on hard levels
- Over-the-air updates: pushes to `main` reach the app without reinstalling (installed with Marsign)
- Magic Sort pour animation, and caps on tubes filled with one color
- Bead Sort lifts and places touching beads of one color together; the finished picture shows under the board

## Paused

- Batch 1 of the Easy games (Word Guess, 2048, Minesweeper), paused for a bug hunt

## Proposals waiting for your approval

Nothing pending right now.
