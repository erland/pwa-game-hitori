import Phaser from 'phaser';
import { BasePlayScene, BoardFitter } from '@erlandlindmark/pwa-game-2d-framework';
import {
  createInitialState,
  cycleCellState,
  type HitoriGameState,
} from '../game/core/HitoriState';
import { CellState } from '../game/core/HitoriTypes';
import {
  getPuzzleById,
  listPuzzles,
} from '../game/puzzles/HitoriPuzzleRepository';
import { loadSettings, type Settings } from '../game/services/settings';
import { markPuzzleCompleted } from '../game/services/ProgressStore';
import {
  createHistory,
  applyAction,
  undo,
  redo,
  canUndo,
  canRedo,
  type HistoryState,
} from '../game/core/UndoRedo';
import {
  checkAllRules,
  checkRowColumnUniqueness,
  checkNoAdjacentShaded,
  type RuleViolation,
} from '../game/core/HitoriRules';
import { findHint } from '../game/core/HitoriHints';

interface PlaySceneData {
  puzzleId?: string;
}

type HitoriCellView = {
  row: number;
  col: number;
  rect: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
};

export class PlayScene extends BasePlayScene {
  private history: HistoryState<HitoriGameState> | null = null;
  private settings: Settings | null = null;
  private boardRoot!: Phaser.GameObjects.Container;
  private boardFitter?: BoardFitter;
  private cellViews: HitoriCellView[][] = [];
  private readonly cellSize = 48;
  private readonly cellPadding = 4;

  private elapsedMs = 0;
  private t = 0;

  /** Number of hints used in this run (for HUD + completion stats). */
  private hintsUsed = 0;

  /** Has this puzzle been marked as completed during this run? */
  private isCompleted = false;
  /** Overlay container for the completion dialog, if visible. */
  private completionDialog?: Phaser.GameObjects.Container;
  
  // HUD elements
  private puzzleInfoText?: Phaser.GameObjects.Text;
  private movesText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;

  // Buttons
  private undoButton?: Phaser.GameObjects.Text;
  private redoButton?: Phaser.GameObjects.Text;
  private hintButton?: Phaser.GameObjects.Text;
  private checkButton?: Phaser.GameObjects.Text;
  private resetButton?: Phaser.GameObjects.Text;

  // Error highlighting (used by both Check and live feedback).
  private errorCells: Set<string> = new Set();
  
  /**
   * Live error highlighting mode, driven by persisted settings.
   * Defaults to 'live' if settings are unavailable.
   */
  private get liveErrorMode(): 'off' | 'on-demand' | 'live' {
    return this.settings?.errorHighlightMode ?? 'live';
  }

  constructor() {
    // 60 Hz fixed-step with up to 5 catch-up steps per frame.
    super({ hz: 60, maxCatchUp: 5 }, 'Play');
  }

  /** Convenience accessor for the current game state. */
  private get state(): HitoriGameState | null {
    return this.history?.present ?? null;
  }

  /** Scene init – determine active puzzle and create initial state/history. */
  init(data: PlaySceneData): void {
    this.settings = loadSettings();
    this.isCompleted = false;
    this.hintsUsed = 0;
    if (this.completionDialog) {
      this.completionDialog.destroy(true);
      this.completionDialog = undefined;
    }

    const fromMenuId = data?.puzzleId;
    let effectiveId = fromMenuId;

    if (!effectiveId) {
      const first = listPuzzles()[0];
      effectiveId = first?.id;
    }

    if (!effectiveId) {
      this.history = null;
      this.elapsedMs = 0;
      return;
    }

    const puzzle = getPuzzleById(effectiveId);
    const initial = createInitialState(puzzle);
    this.history = createHistory(initial);
    this.elapsedMs = 0;
    this.errorCells.clear();
  }

  /** Build the board + HUD. */
  protected buildWorld(): void {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0, 0);

    if (!this.state) {
      this.add
        .text(
          width * 0.5,
          height * 0.5,
          'Hitori – No active puzzle',
          {
            fontSize: '24px',
            color: '#ffffff',
            align: 'center',
          },
        )
        .setOrigin(0.5);
      return;
    }

    // --- Board container + BoardFitter (3.1) ---
    this.boardRoot = this.add.container(0, 0);

    const size = this.state.grid.size;
    const boardPixelSize = this.cellSize * size;

    this.boardFitter = new BoardFitter(
      this,
      this.boardRoot,
      () => ({
        w: boardPixelSize,
        h: boardPixelSize,
      }),
      {
        fitMode: 'fit',
        integerZoom: true,
      },
    );
    this.boardFitter.attach();

    // --- Cell rendering (3.2) ---
    this.createCellViews();

    // --- HUD / buttons (3.4) ---
    this.createHud();
    this.updateHud();
    // Initial live error highlighting (if enabled).
    this.updateLiveErrorHighlights();
    this.refreshAllCells();
  }

  /** Create visual representations for each cell in the grid. */
  private createCellViews(): void {
    const state = this.state;
    if (!state) return;

    const size = state.grid.size;
    const half = this.cellSize / 2;
    const padding = this.cellPadding;
    const innerSize = this.cellSize - padding * 2;

    this.cellViews = [];

    for (let r = 0; r < size; r += 1) {
      const rowViews: HitoriCellView[] = [];
      for (let c = 0; c < size; c += 1) {
        const x = c * this.cellSize + half;
        const y = r * this.cellSize + half;
        const cell = state.grid.cells[r][c];

        const rect = this.add
          .rectangle(x, y, innerSize, innerSize, 0x202030)
          .setOrigin(0.5)
          .setStrokeStyle(1, 0x444455)
          .setInteractive({ useHandCursor: true });

        const text = this.add
          .text(x, y, String(cell.value), {
            fontSize: `${Math.floor(this.cellSize * 0.45)}px`,
            color: '#ffffff',
          })
          .setOrigin(0.5);

        rect.on('pointerup', () => this.handleCellClick(r, c));
        // Optional: also react to clicking the number itself.
        text.setInteractive({ useHandCursor: true });
        text.on('pointerup', () => this.handleCellClick(r, c));

        this.boardRoot.add(rect);
        this.boardRoot.add(text);

        rowViews.push({ row: r, col: c, rect, text });
      }
      this.cellViews.push(rowViews);
    }
  }

  /** Map from (row,col) to a stable key for error highlighting. */
  private cellKey(row: number, col: number): string {
    return `${row},${col}`;
  }

  /** Apply state-based styling to a single cell view. */
  private updateCellView(view: HitoriCellView): void {
    const state = this.state;
    if (!state) return;

    const cell = state.grid.cells[view.row][view.col];
    const isError = this.errorCells.has(this.cellKey(view.row, view.col));

    let fill = 0x202030;
    let textColor = '#ffffff';
    let alpha = 1;
    let strokeColor = 0x444455;
    let strokeWidth = 1;

    switch (cell.state) {
      case CellState.Unmarked:
        fill = 0x202030;
        textColor = '#ffffff';
        break;
      case CellState.Shaded:
        fill = 0x101018;
        textColor = '#666666';
        alpha = 0.9;
        break;
      case CellState.Kept:
        fill = 0x304060;
        textColor = '#ffffff';
        strokeColor = 0x88ccff;
        strokeWidth = 2;
        break;
      default:
        break;
    }

    if (isError) {
      strokeColor = 0xff6666;
      strokeWidth = 3;
    }

    view.rect.setFillStyle(fill, alpha);
    view.rect.setStrokeStyle(strokeWidth, strokeColor);
    view.text.setText(String(cell.value));
    view.text.setColor(textColor);
  }

  /** Refresh all cells from the current logical state. */
  private refreshAllCells(): void {
    for (const row of this.cellViews) {
      for (const view of row) {
        this.updateCellView(view);
      }
    }
  }

  /**
   * Recompute lightweight error highlights for live feedback.
   * Only checks row/column duplicates and adjacent shaded cells.
   */
  private updateLiveErrorHighlights(): void {
    const state = this.state;
    // Always clear previous highlights before recomputing.
    this.errorCells.clear();
    if (!state) return;

    if (this.liveErrorMode !== 'live') {
      return;
    }

    const rowCol = checkRowColumnUniqueness(state);
    const adj = checkNoAdjacentShaded(state);

    const violations: RuleViolation[] = [
      ...rowCol.violations,
      ...adj.violations,
    ];

    for (const v of violations) {
      for (const cell of v.cells) {
        this.errorCells.add(this.cellKey(cell.row, cell.col));
      }
    }
  }

  /**
   * Auto-check if the puzzle is solved after any state change.
   * Does *not* show error messages; only triggers completion when solved.
   */
  private autoCheckSolved(): void {
    if (this.isCompleted) return;
    const state = this.state;
    if (!state) return;

    const composite = checkAllRules(state);
    if (composite.isSolved) {
      this.onPuzzleSolved();
    }
  }

  /** Handle a click/tap on a cell – cycle its state and push into history. */
  private handleCellClick(row: number, col: number): void {
    if (this.isCompleted) return;
    if (!this.history || !this.state) return;

    // Any change resets the status message; error highlights
    // will be recomputed based on the selected mode.
    this.setStatus('');

    const next = cycleCellState(this.state, row, col);
    this.history = applyAction(this.history, next);

    this.updateLiveErrorHighlights();
    this.refreshAllCells();
    this.updateHud();
    this.autoCheckSolved();
  }

  // --- HUD & buttons -------------------------------------------------------

  private createHud(): void {
    const { width, height } = this.scale;
    const state = this.state;
    if (!state) return;

    const puzzle = state.puzzle;
    const topMargin = 8;
    const leftMargin = 12;

    this.puzzleInfoText = this.add
      .text(
        leftMargin,
        topMargin,
        `Puzzle ${puzzle.id} · ${puzzle.size}×${puzzle.size} · ${puzzle.difficulty}`,
        {
          fontSize: '16px',
          color: '#ffffff',
        },
      )
      .setOrigin(0, 0);

    this.movesText = this.add
      .text(
        width - leftMargin,
        topMargin,
        'Moves: 0',
        {
          fontSize: '16px',
          color: '#ffffff',
        },
      )
      .setOrigin(1, 0);

    this.timerText = this.add
      .text(
        width - leftMargin,
        topMargin + 22,
        'Time: 0s',
        {
          fontSize: '14px',
          color: '#cccccc',
        },
      )
      .setOrigin(1, 0);

    this.statusText = this.add
      .text(
        width * 0.5,
        height * 0.9,
        '',
        {
          fontSize: '16px',
          color: '#ffff88',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    const buttonY = height - 40;
    const spacing = 80;
    const centerX = width * 0.5;

    this.undoButton = this.createButton(
      'Undo',
      centerX - spacing * 2,
      buttonY,
      () => this.handleUndo(),
    );
    this.redoButton = this.createButton(
      'Redo',
      centerX - spacing,
      buttonY,
      () => this.handleRedo(),
    );
    this.hintButton = this.createButton(
      'Hint',
      centerX,
      buttonY,
      () => this.handleHint(),
    );
    this.checkButton = this.createButton(
      'Check',
      centerX + spacing,
      buttonY,
      () => this.handleCheck(),
    );
    this.resetButton = this.createButton(
      'Reset',
      centerX + spacing * 2,
      buttonY,
      () => this.handleReset(),
    );

    this.updateButtonStates();
  }

  private createButton(
    label: string,
    x: number,
    y: number,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const text = this.add
      .text(x, y, label, {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { left: 8, right: 8, top: 4, bottom: 4 } as any,
      })
      .setOrigin(0.5);

    text.setAlpha(0.85);
    text.setInteractive({ useHandCursor: true });
    text.on('pointerup', () => onClick());
    text.on('pointerover', () => text.setAlpha(1));
    text.on('pointerout', () => text.setAlpha(0.85));

    return text;
  }

  private setButtonEnabled(
    btn: Phaser.GameObjects.Text | undefined,
    enabled: boolean,
  ): void {
    if (!btn) return;

    if (enabled) {
      btn.setAlpha(0.9);
      if (!btn.input?.enabled) {
        btn.setInteractive({ useHandCursor: true });
      }
    } else {
      btn.setAlpha(0.4);
      btn.disableInteractive();
    }
  }

  private updateButtonStates(): void {
    if (!this.history) return;
    this.setButtonEnabled(this.undoButton, canUndo(this.history));
    this.setButtonEnabled(this.redoButton, canRedo(this.history));
    // Hint / Check / Reset are always enabled for now.
  }

  private updateHud(): void {
    const state = this.state;
    if (!state) return;

    if (this.movesText) {
      this.movesText.setText(
        `Moves: ${state.moves} · Hints: ${this.hintsUsed}`,
      );
    }

    if (this.timerText) {
      const seconds = Math.floor(this.elapsedMs / 1000);
      this.timerText.setText(`Time: ${seconds}s`);
    }

    this.updateButtonStates();
  }

  private setStatus(message: string, color: number | string = '#ffff88'): void {
    if (!this.statusText) return;
    this.statusText.setText(message);
    if (typeof color === 'number') {
      this.statusText.setColor('#ffff88');
      this.statusText.setTint(color);
    } else {
      this.statusText.setColor(color);
      this.statusText.clearTint();
    }
  }

  // --- Button handlers -----------------------------------------------------

  private handleUndo(): void {
    if (!this.history) return;
    const next = undo(this.history);
    if (next === this.history) return;
    this.history = next;
    this.updateLiveErrorHighlights();
    this.refreshAllCells();
    this.updateHud();
    this.autoCheckSolved();
  }

  private handleRedo(): void {
    if (!this.history) return;
    const next = redo(this.history);
    if (next === this.history) return;
    this.history = next;
    this.updateLiveErrorHighlights();
    this.refreshAllCells();
    this.updateHud();
    this.autoCheckSolved();
  }

  private handleReset(): void {
    const current = this.state;
    if (!current) return;
    const fresh = createInitialState(current.puzzle);
    this.history = createHistory(fresh);
    this.elapsedMs = 0;
    this.isCompleted = false;
    this.hintsUsed = 0;

    if (this.completionDialog) {
      this.completionDialog.destroy(true);
      this.completionDialog = undefined;
    }
    this.updateLiveErrorHighlights();
    this.refreshAllCells();
    this.updateHud();
    this.setStatus('');
  }

  /** Apply a simple logical hint, if available. */
  private handleHint(): void {
    if (this.isCompleted) return;
    if (!this.history || !this.state) return;

    const state = this.state;
    const hint = findHint(state);
    if (!hint) {
      this.setStatus('No simple hint available right now.', '#ffff88');
      return;
    }

    // Start from the current state and cycle the target cell until it reaches
    // the suggested state (or we tried enough times).
    let next = state;
    let attempts = 0;

    const getCellState = () =>
      next.grid.cells[hint.row][hint.col].state;

    while (
      getCellState() !== hint.suggestedState &&
      attempts < 3
    ) {
      next = cycleCellState(next, hint.row, hint.col);
      attempts += 1;
    }

    // If after cycling we still didn't reach the desired state, bail out.
    if (getCellState() !== hint.suggestedState) {
      this.setStatus('Could not apply hint safely.', '#ff8888');
      return;
    }

    this.history = applyAction(this.history, next);
    this.hintsUsed += 1;

    // Hints clear old error highlights; live errors will be recomputed.
    this.errorCells.clear();
    this.updateLiveErrorHighlights();
    this.refreshAllCells();
    this.updateHud();

    const humanRow = hint.row + 1;
    const humanCol = hint.col + 1;
    const msg =
      hint.reason === 'adjacent-shaded'
        ? `Hint: adjusted cell (${humanRow}, ${humanCol}) to avoid adjacent shaded cells.`
        : `Hint: adjusted cell (${humanRow}, ${humanCol}) to help resolve duplicates.`;
    this.setStatus(msg, '#88ffff');

    this.autoCheckSolved();
  }

  /** Called when checkAllRules reports the puzzle as solved. */
  private onPuzzleSolved(): void {
    const state = this.state;
    if (!state) return;
    if (this.isCompleted) return;

    this.isCompleted = true;

    // Clear any error highlights, then refresh visuals.
    this.errorCells.clear();
    this.updateLiveErrorHighlights();
    this.refreshAllCells();

    const timeSeconds = Math.floor(this.elapsedMs / 1000);
    const moves = state.moves;
    const hintsUsed = this.hintsUsed;

    // Persist completion in progress storage.
    markPuzzleCompleted(state.puzzle.id, {
      timeSeconds,
      moves,
      hintsUsed,
    });

    // Keep the nice status banner as additional feedback.
    this.setStatus('✔ Puzzle solved – all rules satisfied!', '#88ff88');

    // Show completion dialog overlay with stats + options.
    this.showCompletionDialog({ timeSeconds, moves, hintsUsed });
  }

  private showCompletionDialog(stats: {
    timeSeconds: number;
    moves: number;
    hintsUsed: number;
  }): void {
    const { width, height } = this.scale;

    if (this.completionDialog) {
      this.completionDialog.destroy(true);
      this.completionDialog = undefined;
    }

    const backdrop = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.6)
      .setOrigin(0, 0);
    backdrop.setInteractive({ useHandCursor: false });

    const dialogWidth = Math.min(420, width * 0.9);
    const dialogHeight = 230;

    const dialogBg = this.add
      .rectangle(width * 0.5, height * 0.5, dialogWidth, dialogHeight, 0x202030)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xffff88);

    const title = this.add
      .text(
        width * 0.5,
        height * 0.5 - dialogHeight / 2 + 32,
        'Puzzle complete!',
        {
          fontSize: '24px',
          color: '#ffff88',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    const statsLines = [
      `Time: ${stats.timeSeconds}s`,
      `Moves: ${stats.moves}`,
      `Hints used: ${stats.hintsUsed}`,
    ];

    const statsText = this.add
      .text(
        width * 0.5,
        title.y + 20,
        statsLines.join('\n'),
        {
          fontSize: '16px',
          color: '#ffffff',
          align: 'center',
        },
      )
      .setOrigin(0.5, 0);

    // ⬇️ Updated layout: vertical buttons
    const buttonYBase = height * 0.5 + dialogHeight / 2 - 70;
    const buttonGap = 36;

    const menuButton = this.createButton(
      'Back to menu',
      width * 0.5,
      buttonYBase,
      () => this.handleBackToMenu(),
    );

    const nextButton = this.createButton(
      'Next puzzle',
      width * 0.5,
      buttonYBase + buttonGap,
      () => this.handleNextPuzzle(),
    );

    this.completionDialog = this.add.container(0, 0, [
      backdrop,
      dialogBg,
      title,
      statsText,
      menuButton,
      nextButton,
    ]);
  }

  private handleBackToMenu(): void {
    this.scene.start('MainMenu');
  }

  private handleNextPuzzle(): void {
    const nextId = this.findNextPuzzleId();
    if (!nextId) {
      this.scene.start('MainMenu');
      return;
    }
    this.scene.start('Play', { puzzleId: nextId });
  }

  /** Find the next puzzle, preferring same difficulty if possible. */
  private findNextPuzzleId(): string | null {
    const state = this.state;
    if (!state) return null;

    const all = listPuzzles();
    if (!all.length) return null;

    const currentId = state.puzzle.id;
    const currentDifficulty = state.puzzle.difficulty;
    const currentIndex = all.findIndex((p) => p.id === currentId);

    if (currentIndex === -1) {
      // Fallback: just return the first puzzle.
      return all[0]?.id ?? null;
    }

    // First pass: find next with the same difficulty.
    for (let offset = 1; offset < all.length; offset += 1) {
      const idx = (currentIndex + offset) % all.length;
      if (all[idx].difficulty === currentDifficulty) {
        return all[idx].id;
      }
    }

    // Fallback: any next puzzle.
    const fallbackIdx = (currentIndex + 1) % all.length;
    return all[fallbackIdx]?.id ?? null;
  }

  private handleCheck(): void {
    const state = this.state;
    if (!state) return;

    const composite = checkAllRules(state);

    if (composite.isSolved) {
      this.onPuzzleSolved();
      return;
    }

    const violations: RuleViolation[] = [
      ...composite.rowColumnUniqueness.violations,
      ...composite.noAdjacentShaded.violations,
      ...composite.connectivity.violations,
    ];

    this.errorCells.clear();

    if (violations.length === 0) {
      this.refreshAllCells();
      this.setStatus(
        'Something is off, but no specific violation was found.',
        '#ff8888',
      );
      return;
    }

    const first = violations[0];
    for (const cell of first.cells) {
      this.errorCells.add(this.cellKey(cell.row, cell.col));
    }

    let msg = 'Check failed.';
    switch (first.kind) {
      case 'row-duplicate':
        msg = `Duplicates in row ${String((first.index ?? 0) + 1)}.`;
        break;
      case 'column-duplicate':
        msg = `Duplicates in column ${String((first.index ?? 0) + 1)}.`;
        break;
      case 'adjacent-shaded':
        msg = 'Shaded cells may not be orthogonally adjacent.';
        break;
      case 'connectivity':
        msg = 'Unshaded cells must form a single connected group.';
        break;
      default:
        break;
    }

    this.refreshAllCells();
    this.setStatus(msg, '#ff8888');
  }

  // --- Fixed-step + per-frame hooks ---------------------------------------

  /** Step your deterministic simulation here (called at fixed Hz). */
  protected tick(dtMs: number): void {
    this.t += dtMs;
    if (!this.isCompleted) {
      this.elapsedMs += dtMs;
    }
    this.updateHud();
  }

  /** Per-frame rendering / effects (called once per RAF frame). */
  protected frame(_deltaMs: number): void {
    // We could add subtle animations here later.
  }
}