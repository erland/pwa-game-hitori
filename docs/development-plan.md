# pwa-game-hitori – Step-by-Step Development Plan
_(Using @erlandlindmark/pwa-game-2d-framework + Jest)_

> This plan assumes a new repository named **`pwa-game-hitori`** and uses
> **@erlandlindmark/pwa-game-2d-framework** as the game skeleton and **Jest**
> for unit testing. The focus is to keep game rules and logic framework-agnostic
> (pure TypeScript) and let the framework handle scenes, layout, and input.

---

## Phase 0 – Project Skeleton & Tooling

**Goal:** Minimal playable shell that starts a blank Play scene using the framework.

### 0.1 Repository & Base Structure

- Create repo: `pwa-game-hitori`.
- Basic directory layout (can be adapted to your standard):
  - `src/`
    - `main.ts`
    - `scenes/`
      - `BootScene.ts`
      - `MenuScene.ts`
      - `PlayScene.ts`
      - `UIScene.ts` (optional, for HUD/overlays)
      - `PauseScene.ts`
      - `GameOverScene.ts`
    - `game/`
      - `core/` (pure game logic: grid, validation, puzzle model)
      - `puzzles/` (static puzzle definitions or generators)
      - `ui/` (view models & mapping from core logic to scene UI)
  - `public/` (icons, manifest, etc. depending on your setup)
  - `tests/` or `src/**/__tests__/` (for Jest)

### 0.2 Hook Up GameHost

- In `main.ts`, use the framework **GameHost** to bootstrap:
  - Import `GameHost` from the framework.
  - Import your scene classes:
    - `BootScene`, `MenuScene`, `PlayScene`, `UIScene`, `PauseScene`, `GameOverScene`.
  - Call `GameHost.launch('app', [...scenes], { ...config })` with:
    - Logical resolution (e.g. 800×600 or similar).
    - Resize mode to support desktop + mobile.
    - Background color.
    - Physics disabled (not needed for Hitori).

> At the end of Phase 0 you should be able to run the app and see a blank
> menu or placeholder play screen with the framework-controlled resize/fullscreen
> behavior working.

### 0.3 Jest Setup

- Configure Jest for TypeScript (using ts-jest or your preferred adapter).
- Add basic example tests for sanity:
  - A dummy test in `tests/smoke.test.ts` confirming Jest runs.
- Configure test scripts in `package.json`:
  - `test`
  - `test:watch` (optional)

---

## Phase 1 – Core Hitori Model (Pure Logic)

**Goal:** Implement the core puzzle model and rule validation in a pure, testable way.

### 1.1 Data Structures

Create `src/game/core` modules, for example:

- `HitoriTypes.ts`
  - `CellState` enum: `Unmarked`, `Shaded`, `Kept` (circled).
  - `HitoriCell`:
    - `row: number`
    - `col: number`
    - `value: number`
    - `state: CellState`
  - `HitoriGrid`:
    - `size: number`
    - `cells: HitoriCell[][]` or a flat array plus helper accessors.
- `HitoriPuzzle.ts`
  - `HitoriPuzzle`:
    - `id: string`
    - `size: number`
    - `numbers: number[][]` (immutable initial layout)
    - `difficulty: 'easy' | 'medium' | 'hard' | 'expert'`
    - Optional flags: `hasUniqueSolution: boolean`.

### 1.2 State Management API

Implement a core state module, e.g. `HitoriState.ts`:

- `HitoriGameState`:
  - `puzzle: HitoriPuzzle`
  - `grid: HitoriGrid`
  - `moves: number`
  - `startTime: number | null`
  - `elapsedMs: number`
  - Optional: history stack for undo/redo (or keep this isolated to its own module).
- Functions:
  - `createInitialState(puzzle: HitoriPuzzle): HitoriGameState`
  - `getCell(state, row, col): HitoriCell`
  - `setCellState(state, row, col, newState): HitoriGameState`
  - `cycleCellState(state, row, col): HitoriGameState`
    - Unmarked → Shaded → Kept → Unmarked.
  - `serializeState(state): SerializableGameState`
  - `deserializeState(puzzle, serialized): HitoriGameState`

> Keep all these functions **pure**, returning new state (or clearly documented mutations) to keep Jest tests simple and reliable.

### 1.3 Rule Validation Logic

Create `HitoriRules.ts` with pure validation functions:

- `checkRowColumnUniqueness(state): RuleResult`
  - For each row/column, verify that unshaded cells have unique values.
- `checkNoAdjacentShaded(state): RuleResult`
  - Ensure no two shaded cells are orthogonally adjacent.
- `checkConnectivityOfUnshaded(state): RuleResult`
  - Graph search (BFS/DFS) over unshaded cells; they must form a single connected component.
- `checkAllRules(state): CompositeRuleResult`
  - Aggregate the three checks above.
  - Result should contain:
    - Boolean `isSolved`.
    - Optional details such as lists of offending cells/rows/columns.

### 1.4 Undo/Redo Logic

Optional but recommended as pure logic module `UndoRedo.ts`:

- `HistoryState<T>`:
  - `past: T[]`
  - `present: T`
  - `future: T[]`
- Functions:
  - `applyAction(history, newPresent): HistoryState<T>`
  - `undo(history): HistoryState<T>`
  - `redo(history): HistoryState<T>`

Use this generically with `HitoriGameState`.

### 1.5 Jest Tests for Core Logic

Add tests in `src/game/core/__tests__/`:

- `HitoriRules.test.ts`:
  - Small handcrafted grids to validate each rule:
    - Duplicates in rows/columns.
    - Adjacent shaded cells.
    - Disconnected unshaded regions.
    - Correct solved examples.
- `HitoriState.test.ts`:
  - Verify `cycleCellState` sequence.
  - Ensure moves increment correctly (if tracked here).
  - Ensure serialization/deserialization round-trips.
- `UndoRedo.test.ts` (if implemented):
  - Basic undo/redo behavior.

> End of Phase 1: You can run Jest and have good confidence that the Hitori
> rules and state transitions behave correctly independent of any rendering
> or framework integration.

---

## Phase 2 – Puzzle Repository & Selection Flow

**Goal:** Provide a source of puzzles and a minimal flow from menu to a selected puzzle.

### 2.1 Puzzle Repository

In `src/game/puzzles/`:

- `HitoriPuzzleRepository.ts`:
  - Hard-coded puzzle definitions to start (later can be externalized).
  - Functions:
    - `listPuzzles(filter?): HitoriPuzzleMeta[]`
      - Returns lightweight metadata: id, size, difficulty, completion status (if available).
    - `getPuzzleById(id: string): HitoriPuzzle`
    - Optional: `getRandomPuzzle(size?, difficulty?)`
    - Optional: `getDailyPuzzle(date: Date)`

State about completion is read from progress storage (to be added later).

### 2.2 Menu & Puzzle List Scenes

Using the framework base scenes:

- `BootScene` (extends `BaseBootScene`):
  - Preload assets (fonts, simple textures for cells, etc.)
  - Configure initial theme/services if needed.

- `MenuScene` (extends `BaseMenuScene`):
  - Initial main menu with options:
    - “Start Puzzle” / “Puzzles” → Puzzle list
    - “Continue” (last puzzle) – later tied to progress.
    - “Settings”
    - “Help / Tutorial”
  - Hook transitions to `PlayScene` with a selected puzzle.

- `PuzzleListScene` (optional, or integrated in `MenuScene`):
  - Show table/list of puzzles from `HitoriPuzzleRepository`.
  - Allow filtering by size, difficulty.
  - On selection, transition to `PlayScene` with chosen puzzle ID.

### 2.3 Scene Navigation Using Framework

- Use the default scene keys (`defaultSceneKeys` from the framework) or your own keys for consistency.
- Use the framework's **events** / `EVT` utilities if you want a central event bus for:
  - “PuzzleSelected” events.
  - “ContinueLastPuzzle” events.

> End of Phase 2: You should be able to start the app, pick a puzzle from a list, and transition into a (still visually basic) play scene that knows which puzzle is active.

---

## Phase 3 – Board Layout & Interaction (PlayScene)

**Goal:** Render the Hitori grid using framework helpers and support basic interaction with cell states.

### 3.1 Board Container & BoardFitter

In `PlayScene` (extending `BasePlayScene`):

- Create a root container for the board: `this.add.container(0, 0)`.
- Use the framework’s **BoardFitter**:
  - Instantiate `BoardFitter` with the scene and root container.
  - Implement a `getSize` callback that returns the pixel size of the grid:
    - `width = cellSize * size + padding`
    - `height = cellSize * size + padding`
  - Call `attach()` so it automatically centers/scales the grid on resize.

### 3.2 Cell Rendering

- For each cell:
  - Create a visual representation (e.g., rectangle + text) inside the board container.
  - Store a mapping from `(row, col)` to display objects for later updates.
- Define a small view model layer:
  - `HitoriCellView` structure with references to graphics/text objects.
  - Functions:
    - `updateCellView(cellView, cellState)`
      - Apply visual styles for `Unmarked`, `Shaded`, `Kept`.

### 3.3 Input Handling

- Enable pointer input on each cell:
  - On click/tap on a cell:
    - Call `cycleCellState` on the `HitoriGameState` (or push a new history state).
    - Update the view for that cell.
- Keep the PlayScene relatively thin:
  - Delegate state changes to `HitoriState` functions.
  - Only handle mapping between pointer events and state changes.

> At this point the player should be able to tap cells and see them cycle through Unmarked → Shaded → Kept, with visuals clearly reflecting the state.

### 3.4 Basic HUD / UI Controls (UIScene or In-Scene UI)

Add a UI layer (either inside `PlayScene` or in a parallel `UIScene`):

- Buttons:
  - `Undo`
  - `Redo`
  - `Check`
  - `Reset`
  - Optional: `Hint`
- Displays:
  - Puzzle ID & difficulty.
  - Timer label.
  - Moves counter.

Use the framework's UI patterns you already use in other games (e.g., a HUD scene running in parallel to PlayScene).

### 3.5 Fixed-Step Update Loop

- Let `BasePlayScene` drive a fixed-step loop:
  - Implement `updateFixed(dt: number)` if needed for:
    - Timer progression.
    - Subtle animations (e.g., blinking cells on error).
- The game itself is turn-based, so the fixed update can be relatively light.

---

## Phase 4 – Rule Checking, Hints & Completion Flow

**Goal:** Integrate core logic checks into the UI, provide hints, and finalize the “puzzle solved” flow.

### 4.1 Integrate `checkAllRules`

- On **Check** button:
  - Call `checkAllRules(currentState)`.
  - Use result to:
    - If `isSolved`:
      - Trigger “puzzle solved” flow.
    - Else:
      - Highlight errors or show a generic message depending on settings.

- Visual feedback options:
  - Temporarily highlight problematic rows/columns.
  - Show a non-spoiling banner: “There are mistakes.”

### 4.2 Live Error Highlighting (Optional)

- When setting a cell state, optionally run a **lightweight** subset of checks:
  - Duplicate values in row/column.
  - Adjacent shaded cells.
- Use subtle highlights (e.g., red outline) for conflicting cells.
- Make behavior configurable via settings:
  - Off / On-demand only / Live feedback.

### 4.3 Hints (Optional)

- Hook a **Hint** button to a pure logic helper, e.g., `HitoriHints.ts`:
  - Simple initial strategies:
    - Find an instance where a duplicate can only be resolved one way.
    - Find adjacent shaded cells and suggest changing one.
  - Result:
    - A recommended `(row, col, suggestedState)` or highlighted area.
- Apply the hint by either:
  - Auto-updating the cell.
  - Or just highlighting the cell and letting the user change it.

### 4.4 Puzzle Completion & Game Over Scene

- When `checkAllRules` returns solved:
  - Stop timer.
  - Mark puzzle as completed in progress storage.
  - Show a completion dialog:
    - Time taken.
    - Moves taken.
    - Hints used.
  - Offer buttons:
    - “Next puzzle” (e.g., same difficulty / next ID)
    - “Back to menu”
- Optionally transition to a dedicated `GameOverScene` (extending `BaseGameOverScene`) for consistent UX across games.

---

## Phase 5 – Persistence, Progress & Settings

**Goal:** Save progress locally, track statistics, and allow player customization.

### 5.1 Local Storage of Progress

Create a module, e.g. `ProgressStore.ts`:

- Functions:
  - `loadProgress(): ProgressSnapshot`
  - `saveProgress(snapshot: ProgressSnapshot)`
  - `getPuzzleProgress(id: string): PuzzleProgress`
  - `updatePuzzleProgress(id: string, partial: Partial<PuzzleProgress>)`
- Data stored per puzzle:
  - Latest serialized `HitoriGameState`.
  - Completion flag and best time.
  - Hints used count, attempts count.

Integrate with `PlayScene`:

- On puzzle start:
  - Try to load existing progress by puzzle ID.
  - If found, offer “Continue from last state” or “Start over”.
- On state changes/timer updates:
  - Periodically save progress (e.g., after each move or throttled).

### 5.2 Global Settings

Create `SettingsStore.ts`:

- Settings:
  - Error highlighting mode: `off | onDemand | live`.
  - Hints enabled/disabled.
  - Timer visibility.
  - Theme / contrast mode.
  - Language (if you support multiple).

Integrate with scenes:

- `MenuScene` → open Settings UI.
- `PlayScene` / `UIScene` → read settings to decide how to render and behave.

### 5.3 Statistics Screen

Create a statistics view in a menu or separate scene:

- Aggregate from `ProgressStore`:
  - Puzzles solved by difficulty.
  - Average time per difficulty.
  - Best times for each puzzle.
  - Optional daily streak if you implement daily puzzle logic.

> End of Phase 5: Player progress persists across sessions, and the game feels
> like a complete Hitori app with settings and basic statistics.

---

## Phase 6 – PWA Behavior & Cross-Device Polish

**Goal:** Ensure the game behaves well as a PWA on desktop, iPad, and iPhone, and polish the UX/visuals.

### 6.1 PWA Basics

- Configure manifest & icons (reusing your standard pattern):
  - App name, short name, theme color, background color.
  - Icons in recommended sizes for iOS and desktop.
- Ensure the app:
  - Starts full-screen when installed.
  - Handles safe areas / notches correctly.

### 6.2 Offline Behavior

- Ensure all required assets are cached:
  - Framework bundle.
  - Game scenes.
  - Puzzle definitions.
  - Fonts and basic graphics.
- Verify the app can:
  - Load offline.
  - Load puzzles and saved progress offline.
- Any online-only features (e.g., future sync) must fail gracefully with clear messaging.

### 6.3 Responsive Layout Tweaks

- Verify:

  - **Phone portrait**:
    - Grid fits comfortably on screen.
    - Buttons are large enough to tap.
  - **Tablet & desktop**:
    - Grid not too small.
    - Use extra space for sidebars or bigger UI.

- Adjust BoardFitter behavior or cell size dynamically based on device/orientation.

### 6.4 Animations & Visual Polish

- Add small but clear animations:
  - Fading/scale effect when toggling cell state.
  - Subtle pulse when a rule violation is highlighted.
- Make sure all color choices work with your high-contrast / color-blind-friendly modes.

### 6.5 Accessibility & Help

- Ensure help/tutorial is accessible from menu and in-game.
- Consider:
  - Larger font options.
  - Minimized reliance on color alone to indicate state (e.g., shaded vs kept).

---

## Phase 7 – Extended Features & Refactoring

**Goal:** Clean up architecture and optionally add advanced features.

### 7.1 Codebase Organization & Refactor

- Revisit module boundaries:
  - `core` logic vs `scene` integration vs `puzzles` vs `services` (storage, settings).
- Ensure each scene is thin:
  - Mostly translating events to core logic calls and view updates.
- Consider creating a small “game controller” class:
  - Owns `HitoriGameState` + history.
  - Exposes methods like `tapCell(row, col)`, `undo()`, `redo()`, `check()`, `hint()`.
  - PlayScene uses this controller rather than manipulating core logic directly.

### 7.2 Advanced Features (Optional)

- Daily puzzle system:
  - Deterministic puzzle by date.
  - Track daily streaks.
- Puzzle packs:
  - Group puzzles by theme.
  - Optional in-game achievements.
- Improved hint engine:
  - Implement a richer set of Hitori solving strategies.

### 7.3 Test Coverage & Regression Protection

- Add regression tests for bugs found during development.
- Add simple integration tests for the “game controller” level:
  - Simulate sequences of taps → assert resulting rule status and cell states.
- Keep Jest test suite fast and focused primarily on pure logic.

---

## Summary of Phase Deliverables

- **Phase 0** – Repo + GameHost wiring + Jest.
- **Phase 1** – Core Hitori model and rule checks (fully tested with Jest).
- **Phase 2** – Puzzle repository and navigation from menu to selected puzzle.
- **Phase 3** – PlayScene rendering, board interaction, HUD controls.
- **Phase 4** – Rule checking, hints, and completion flow.
- **Phase 5** – Persistence, settings, statistics.
- **Phase 6** – PWA behavior, responsiveness, visuals.
- **Phase 7** – Refactoring, advanced features, deeper testing.

This plan keeps the **Hitori logic** highly testable and reusable while
leveraging **@erlandlindmark/pwa-game-2d-framework** for scenes, layout, and
input handling.
