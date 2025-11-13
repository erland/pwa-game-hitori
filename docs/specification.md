# Hitori PWA – Functional & Game Mechanics Specification

> **Scope:** This document describes *what* the Hitori game must do – its rules, behaviors, and user-facing features – without specifying *how* it is implemented.

---

## 1. Game Overview

- The application presents logic puzzles based on the classic **Hitori** rules.
- The game is playable on:
  - Desktop (mouse / trackpad)
  - Tablets (e.g., iPad)
  - Smartphones (e.g., iPhone)
- The game runs in a **full-screen, distraction-free** mode once started.
- Players can:
  - Select a puzzle (by size and difficulty)
  - Solve it using Hitori rules
  - Use optional assist tools (notes, hints, checks)
  - Track progress over time

---

## 2. Core Hitori Rules & Mechanics

### 2.1 Grid & Numbers

- Each puzzle consists of a **square grid** (e.g., 5×5, 8×8, 10×10, 12×12, etc.).
- Each cell contains a **positive integer**.
- The initial puzzle state shows all cells as **unshaded** (normal background).

### 2.2 Player Actions on Cells

Each cell can be in one of three logical states:

1. **Unmarked (default)**  
   - No decision has been made yet.

2. **Shaded (removed)**  
   - The cell is “removed” from the grid by shading it.
   - Indicates the number in that cell should not be used in the final solution.

3. **Circled / Selected (kept)**  
   - The player explicitly marks the cell as “kept”.
   - Used as a strong indication that this cell will remain unshaded in the final solution.

**Required actions:**

- Tap/click to cycle between states (for example: Unmarked → Shaded → Circled → Unmarked).
- Long-press/right-click or other dedicated control MAY offer direct access to a specific state (optional quality-of-life feature).
- Visual distinctions:
  - **Shaded cells:** darker background, number still visible but de-emphasized.
  - **Circled/kept cells:** normal/light background with a clear circle or highlight.

### 2.3 Winning Conditions (Hitori Rules)

A puzzle is solved when **all** of the following conditions are met:

1. **Row/Column Uniqueness**  
   - In every row and every column, all **unshaded** cells must contain **unique numbers**.  
   - No number may appear more than once among unshaded cells in the same row or column.

2. **No Adjacent Shaded Cells (Orthogonal)**  
   - No two shaded cells can touch **horizontally or vertically**.  
   - Diagonal adjacency is allowed.

3. **Connected Unshaded Region**  
   - All unshaded cells must form a **single connected area** via horizontal/vertical adjacency.
   - There must not be separate “islands” of unshaded cells.

The game must maintain an **internal model** of the puzzle state and be able to check these conditions at any time.

---

## 3. Puzzle Selection & Difficulty

### 3.1 Puzzle List Screen

- The player can access a **Puzzle Selection screen** from the main menu.
- The list should show puzzles grouped or filtered by:
  - **Grid size** (e.g., 5×5, 8×8, 10×10, 12×12)
  - **Difficulty** (e.g., Easy, Medium, Hard, Expert)
- For each puzzle, display:
  - Size (e.g., “8×8”)
  - Difficulty label
  - Status:
    - Not started
    - In progress (with last played time)
    - Completed (with completion time/best time)

### 3.2 Puzzle Metadata

For each puzzle, store:

- Unique puzzle ID
- Grid size
- Difficulty level
- Initial grid numbers
- Whether the puzzle has a unique solution
- Player progress:
  - Saved cell states
  - Start time and total time spent
  - Completion state and best time

### 3.3 Random / Daily Puzzles (Optional)

- Optionally provide:
  - “Random puzzle” button.
  - “Daily puzzle” that changes every calendar day.
- Daily puzzles should be deterministic by date so all players get the same puzzle for a given day.

---

## 4. Game Screen & UI Layout

### 4.1 General Layout Requirements

- The game must use **full available screen space**, adapting to:
  - Portrait and landscape orientations.
  - Smaller smartphone screens and larger tablet/desktop screens.
- The grid must always be clearly visible and interactable; scrolling should only be used if absolutely necessary.

### 4.2 Main Components

The Game Screen must include:

1. **Puzzle Grid**
   - Centered or prominently positioned.
   - Each cell displays its number and visual state (unmarked/shaded/circled).
   - Grid lines or subtle separators for row/column clarity.

2. **Status & Info Bar**
   - Puzzle ID or name.
   - Difficulty.
   - Elapsed time (if timer is enabled).
   - Optional move counter.

3. **Control Panel / Toolbar**
   - Buttons/actions:
     - Undo
     - Redo
     - Clear puzzle / Reset to initial state (with confirmation)
     - Hint (if hints are enabled)
     - Check for errors
     - Toggle notes/annotations (if implemented)
   - Zoom controls for small devices (optional):
     - Zoom in/out
     - Fit-to-screen

4. **Navigation Controls**
   - Button to return to:
     - Main menu
     - Puzzle selection screen

### 4.3 Device-Specific Interaction Behavior

- **Desktop / Laptop:**
  - Primary interaction via mouse/trackpad click.
  - Optional keyboard shortcuts for cycling states, undo/redo, navigation.

- **Tablets / Smartphones:**
  - Primary interaction via tap.
  - Support gestures where appropriate (e.g., pinch to zoom, double-tap to cycle states).

---

## 5. Game Flow

### 5.1 Main Menu

From the main menu, the player can:

- Start a new puzzle:
  - Choose size and difficulty.
- Continue a puzzle in progress (quick access to last played puzzle).
- View puzzle list / library.
- Open settings.
- View help / tutorial.

### 5.2 Starting a Puzzle

When the player starts a puzzle:

1. The game loads the puzzle definition (numbers, size, difficulty).
2. Any previous progress for that puzzle is loaded if it exists.
3. Timer and move counter (if enabled) are initialized or resumed.
4. The game transitions into the Game Screen in full-screen style.

### 5.3 During Play

- The player interacts with cells, changing their states.
- Internal consistency checks may run:
  - Live feedback (optional), e.g. highlight conflicts when they appear.
  - On-demand checking when the player hits “Check”.
- The current state is **periodically saved** (e.g., after each move or at intervals).

### 5.4 Checking & Solving

- The player can press a **“Check”** button to validate:
  - Row/column uniqueness.
  - No adjacent shaded cells.
  - Connectivity of unshaded cells.
- If errors are found:
  - Provide **non-spoiling feedback** (e.g., highlight problematic rows/columns or show a generic “There are mistakes” message).
- When all conditions are satisfied:
  - The puzzle is marked as **completed**.
  - Timer stops and completion stats are recorded.
  - A completion dialog is shown with:
    - “Puzzle solved!” message.
    - Time taken.
    - Moves taken (if tracked).
    - Options: return to menu, choose next puzzle, replay puzzle.

### 5.5 Pausing & Resuming

- On mobile, switching away from the app should **auto-pause** the timer.
- On returning, the app resumes at the same puzzle state.
- A manual **Pause** option may be provided that hides the grid and stops the timer until resumed.

---

## 6. Assist Features & Options

### 6.1 Undo / Redo

- Always available during an active puzzle.
- Unlimited or high-capacity history (within reasonable bounds).
- Each cell state change is a discrete step in history.

### 6.2 Hints (Configurable)

- Optional feature; can be enabled/disabled in settings.
- Hint behaviors (one or more of the following):
  - Highlight a cell that is definitely shaded or kept based on logic (optional).
  - Highlight a row/column where a contradiction exists.
- Use a **limited hint counter** or track hints used for statistics.

### 6.3 Error Highlighting

- Configurable setting:

  1. **Off:** No automatic error highlighting.
  2. **On-demand only:** Errors are only indicated when “Check” is pressed.
  3. **Live feedback:** Conflicts are highlighted as soon as they occur, for example:
     - Duplicate unshaded numbers in a row/column.
     - Two shaded cells orthogonally adjacent.
     - Disconnected unshaded region (may be shown more abstractly to avoid heavy visual clutter).

### 6.4 Notes / Annotations (Optional)

- Players can attach lightweight notes to cells, such as:
  - “Possibly shaded” / “Possibly kept” icons.
  - Small secondary markers inside the cell.
- Notes do not affect solving logic; they are purely for player convenience.

---

## 7. Settings & Customization

### 7.1 Gameplay Settings

- Enable/disable hints.
- Configure error highlighting mode:
  - Off
  - On-demand
  - Live feedback
- Timer options:
  - Show/hide timer.
  - Auto-start timer on puzzle load or start manually.

### 7.2 Visual & Accessibility Settings

- Adjustable contrast and color themes, including:
  - Default theme.
  - High-contrast theme.
  - Color-blind friendly theme(s).
- Text size / cell size options to improve readability.
- Option to show or hide grid lines.
- Option to emphasize/mute certain states (e.g., shaded cells darker, kept cells brighter).

### 7.3 Language & Localization

- All labels, menus, and help content should be designed to be **localizable**.
- The game must support multiple languages by design (exact languages are out of scope for this spec).

---

## 8. Help & Tutorial

### 8.1 Help Section

- Accessible from the main menu and from within a puzzle.
- Includes:
  - Explanation of Hitori rules.
  - Description of the three cell states (unmarked, shaded, circled/kept).
  - Description of win condition.
  - Explanation of assist features (hints, checks, error highlighting).

### 8.2 Interactive Tutorial (Recommended)

- Optional guided tutorial puzzle that:
  - Walks the player through the basic rules step-by-step.
  - Demonstrates how to shade and keep cells.
  - Shows examples of invalid vs valid configurations.
- Tutorial progress can be reset and replayed.

---

## 9. Progress Tracking & Statistics

### 9.1 Per-Puzzle Progress

- For each puzzle, store:
  - Current state (cell states, timer).
  - Completion status.
  - Best completion time.
  - Number of attempts.
  - Hints used (if any).

### 9.2 Global Statistics

- Aggregate statistics screen showing:
  - Total puzzles started.
  - Total puzzles completed.
  - Completion rate by difficulty.
  - Average time per difficulty.
  - Streak count for daily puzzles (if implemented).

---

## 10. PWA Behavior & Cross-Device Constraints (Functional)

> Note: This section describes behavior, not implementation details.

### 10.1 Installation & Full-Screen

- The app can be **installed to the home screen** on supported devices.
- When launched from the home screen or as an installed app, it should:
  - Open without browser UI (address bar, tabs, etc.), behaving like a full-screen app.
- The app must adjust to safe areas (e.g., not overlapping system bars or notches).

### 10.2 Offline Use

- Once the app and puzzle data are initially loaded, the user must be able to:
  - Open the app offline.
  - Access previously loaded puzzles and their saved progress offline.
- Any features that require a network connection (e.g., syncing, fetching new puzzles) must:
  - Fail gracefully.
  - Indicate “offline” status without breaking core gameplay.

### 10.3 Data Persistence

- Game state (settings, progress, statistics) must be stored locally on the device.
- On subsequent launches (online or offline), the app resumes with all prior data intact.
- Optional: design to support future cross-device sync (but not required in this spec).

### 10.4 Performance & Responsiveness

- The app must remain responsive when:
  - Interacting rapidly with cells.
  - Using undo/redo.
  - Performing checks/validations on medium-to-large grids.
- Animations and transitions should be smooth and not interfere with puzzle clarity.

---

## 11. Error Handling & Edge Cases

- If puzzle data fails to load:
  - Show a user-friendly error message.
  - Provide option to retry or go back to puzzle list/main menu.
- If saved progress is corrupted or unreadable:
  - Offer to reset the puzzle while preserving other unaffected data.
- Ensure that:
  - No valid puzzle state is incorrectly marked as invalid.
  - No invalid puzzle state is ever treated as solved.

---

## 12. Non-Functional Notes (Functional Framing Only)

- **Usability:**  
  - All interactive elements must be large enough for comfortable tapping on phones.
  - Visual feedback must be immediate after interactions.

- **Consistency:**  
  - Interactions and controls must behave the same way across desktop, tablet, and phone, with only layout and size adapted.

- **Extensibility:**  
  - The puzzle engine and UI behavior should be designed so future features can be added, such as:
    - Additional difficulty levels.
    - Themed puzzle packs.
    - Advanced statistics or achievements.

---

_End of specification._
