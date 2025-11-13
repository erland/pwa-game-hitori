import { CellState, type HitoriGrid, createGridFromNumbers } from './HitoriTypes';
import type { HitoriPuzzle } from './HitoriPuzzle';

export interface HitoriGameState {
  puzzle: HitoriPuzzle;
  grid: HitoriGrid;
  moves: number;
  /** Epoch milliseconds when the game started, or null if not started. */
  startTime: number | null;
  /** Total elapsed play time in milliseconds (not actively updated here). */
  elapsedMs: number;
}

/**
 * Serializable representation of a game state.
 * Only stores data that cannot be recomputed from the puzzle definition.
 */
export interface SerializableGameState {
  puzzleId: string;
  size: number;
  cellStates: CellState[][];
  moves: number;
  elapsedMs: number;
  startTime: number | null;
}

/** Create an initial state from a puzzle. */
export function createInitialState(puzzle: HitoriPuzzle): HitoriGameState {
  const grid = createGridFromNumbers(puzzle.numbers);

  return {
    puzzle,
    grid,
    moves: 0,
    startTime: null,
    elapsedMs: 0,
  };
}

/** Safe accessor for a cell in the state grid. */
export function getCell(state: HitoriGameState, row: number, col: number) {
  const { grid } = state;
  if (
    row < 0 ||
    col < 0 ||
    row >= grid.size ||
    col >= grid.size
  ) {
    throw new Error(`Cell out of bounds: (${row}, ${col})`);
  }
  return grid.cells[row][col];
}

/**
 * Pure update helper: returns a new HitoriGameState with the specified
 * cell's state changed. The original state is not mutated.
 */
export function setCellState(
  state: HitoriGameState,
  row: number,
  col: number,
  newState: CellState,
): HitoriGameState {
  const current = getCell(state, row, col);
  if (current.state === newState) {
    // No-op; still return a new wrapper to keep semantics simple.
    return {
      ...state,
      grid: {
        ...state.grid,
        cells: state.grid.cells.map((r) => r.map((c) => ({ ...c }))),
      },
    };
  }

  const newRow = [...state.grid.cells[row]];
  const newCell = { ...current, state: newState };
  newRow[col] = newCell;

  const newCells = [...state.grid.cells];
  newCells[row] = newRow;

  const newGrid: HitoriGrid = {
    size: state.grid.size,
    cells: newCells,
  };

  return {
    ...state,
    grid: newGrid,
    moves: state.moves + 1,
  };
}

/**
 * Cycle a cell through Unmarked → Shaded → Kept → Unmarked.
 */
export function cycleCellState(
  state: HitoriGameState,
  row: number,
  col: number,
): HitoriGameState {
  const cell = getCell(state, row, col);
  let next: CellState;

  switch (cell.state) {
    case CellState.Unmarked:
      next = CellState.Shaded;
      break;
    case CellState.Shaded:
      next = CellState.Kept;
      break;
    case CellState.Kept:
    default:
      next = CellState.Unmarked;
      break;
  }

  return setCellState(state, row, col, next);
}

/** Convert a full game state into a serializable snapshot. */
export function serializeState(state: HitoriGameState): SerializableGameState {
  const cellStates = state.grid.cells.map((row) =>
    row.map((cell) => cell.state),
  );

  return {
    puzzleId: state.puzzle.id,
    size: state.grid.size,
    cellStates,
    moves: state.moves,
    elapsedMs: state.elapsedMs,
    startTime: state.startTime,
  };
}

/**
 * Reconstruct a game state from a serialized snapshot plus the base puzzle.
 * The puzzle's numbers layout is treated as source of truth for values.
 */
export function deserializeState(
  puzzle: HitoriPuzzle,
  serialized: SerializableGameState,
): HitoriGameState {
  if (puzzle.id !== serialized.puzzleId) {
    // Strict to surface errors early.
    throw new Error(
      `Puzzle ID mismatch: puzzle=${puzzle.id}, snapshot=${serialized.puzzleId}`,
    );
  }

  if (puzzle.size !== serialized.size) {
    throw new Error(
      `Size mismatch when deserializing puzzle ${puzzle.id}: ` +
        `puzzle.size=${puzzle.size}, snapshot.size=${serialized.size}`,
    );
  }

  const base = createInitialState(puzzle);

  if (
    serialized.cellStates.length !== puzzle.size ||
    serialized.cellStates.some((row) => row.length !== puzzle.size)
  ) {
    throw new Error(
      `Serialized cellStates for puzzle ${puzzle.id} does not match expected dimensions`,
    );
  }

  const cells = base.grid.cells.map((row, r) =>
    row.map((cell, c) => ({
      ...cell,
      state: serialized.cellStates[r][c],
    })),
  );

  return {
    puzzle,
    grid: {
      size: puzzle.size,
      cells,
    },
    moves: serialized.moves,
    elapsedMs: serialized.elapsedMs,
    startTime: serialized.startTime,
  };
}