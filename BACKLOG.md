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
| 5 | Bead Sort (jewel color sort) | Done (reworked from your video) | – | 1 | Medium |
| 6 | Block Blast + Block Endless | Done | – | 0.5 | Medium |
| 7 | Arrow Go | Done | – | 0.5 | Medium |
| 8 | Stamp Solitaire | Planned | Medium | 1.5 | Medium |
| 9 | Rotate Rings | Planned | Medium–Hard | 1.5–2 | Medium–Heavy |
| 10 | Picture Builder | Planned | Medium–Hard | 1.5–2 | Medium–Heavy |
| 11 | Magic Tiles | Planned | Hard | 2 | Heavy |
| 12 | Crosswords | Planned | Hard | 2–3 | Heavy |
| 13 | Helix Jump | Planned | Hard | 2–3 | Heavy |

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

## Proposals waiting for your approval

Nothing pending right now.

## Game ideas to consider (research, not approved)

Effort uses the same scale as above. "Original look" means the rules are free to copy but the name and characters are trademarks, so Marscade's version gets its own name and art.

| Idea | What it is | Effort | Notes |
|---|---|---|---|
| Maze Chase (Pac-Man style) | Eat dots in a maze while dodging 4 ghosts with different chase styles | Medium–Hard (1.5–2) | Real-time with swipe controls; ghost AI is the main work. Original look required. |
| Nonograms (Picross) | Fill grid cells using row/column number clues to reveal a picture | Easy–Medium (1) | Pairs perfectly with the CC0 pixel art and the 52 paintings already in the app. |
| 2048 | Slide tiles to merge numbers | Easy (0.5) | Original game is open source (MIT); swipe controls. |
| Minesweeper | Reveal safe cells using number clues | Easy (0.5) | Can generate no-guess boards with a solver, like Catnap. |
| Snake | Classic growing snake | Easy (0.5) | Real-time; swipe or on-screen arrows. |
| Falling Blocks (Tetris style) | Rotate falling pieces to clear lines | Medium (1) | Original look required (Tetris is trademarked). |
| Mahjong Solitaire | Match free pairs of tiles in a stacked layout | Medium (1–1.5) | Tile art drawn in code; layouts must be generated solvable. |
| Klondike / FreeCell / Spider | Classic card solitaires | Medium (1–1.5) | Card art in code; FreeCell deals are almost always solvable. |
| Flow (connect the dots) | Connect same-colored dots with paths that fill the board | Medium (1) | Generator + uniqueness check, similar to Catnap. |
| Word guess (Wordle style) | Guess a 5-letter word in 6 tries | Easy (0.5) | Uses the same EN/PT word lists as Word Search. |
| Chess puzzles | "Mate in 2"-style tactics | Medium (1) | Lichess publishes its puzzle database under CC0; needs a small chess move checker. |
| Sokoban | Push boxes onto targets | Medium (1) | Generated levels, or a free level pack (check each pack's license). |
| Jigsaw | Rebuild a painting from pieces | Medium (1) | Reuses the painting archive; overlaps with Picture Builder. |
| Bubble Shooter | Aim and pop groups of 3+ colors | Medium (1–1.5) | Aiming physics and bounces. |
| Reversi / Connect Four vs computer | Board games against a simple AI | Easy–Medium (0.5–1) | Difficulty levels = how far the AI looks ahead. |
| Breakout | Bounce a ball to break bricks | Medium (1) | Real-time; levels could be shaped like pixel art. |
| Logic grids (Tents, Hashi, Nurikabe, Kakuro) | More pen-and-paper logic puzzles | Easy–Medium each (0.5–1) | Same generator-plus-solver approach as Catnap and Sudoku. |
