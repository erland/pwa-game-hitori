/**
 * Core type definitions for Hitori puzzles.
 * These modules are pure and framework-agnostic.
 */

export enum CellState {
  Unmarked = 'unmarked',
  Shaded = 'shaded',
  Kept = 'kept',
}

export interface HitoriCell {
  row: number;
  col: number;
  value: number;
  state: CellState;
}

export interface HitoriGrid {
  /** Grid is always square: size x size. */
  size: number;
  cells: HitoriCell[][];
}

/**
 * Create a grid from an immutable numbers layout.
 * All cells start in the Unmarked state.
 */
export function createGridFromNumbers(numbers: number[][]): HitoriGrid {
  const size = numbers.length;
  if (size === 0) {
    throw new Error('Hitori grid must have at least one row');
  }

  for (const row of numbers) {
    if (row.length !== size) {
      throw new Error('Hitori grid must be square (all rows same length as size)');
    }
  }

  const cells: HitoriCell[][] = numbers.map((rowValues, r) =>
    rowValues.map((value, c) => ({
      row: r,
      col: c,
      value,
      state: CellState.Unmarked,
    })),
  );

  return { size, cells };
}

/** Shallow bounds check helper. */
export function inBounds(grid: HitoriGrid, row: number, col: number): boolean {
  return row >= 0 && row < grid.size && col >= 0 && col < grid.size;
}

/**
 * Functional-style clone of a grid; useful for defensive copying
 * in pure state update helpers.
 */
export function cloneGrid(grid: HitoriGrid): HitoriGrid {
  return {
    size: grid.size,
    cells: grid.cells.map((row) => row.map((cell) => ({ ...cell }))),
  };
}
