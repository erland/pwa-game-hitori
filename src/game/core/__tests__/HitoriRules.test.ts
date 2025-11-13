import { CellState } from '../HitoriTypes';
import type { HitoriPuzzle } from '../HitoriPuzzle';
import {
  createInitialState,
  setCellState,
  type HitoriGameState,
} from '../HitoriState';
import {
  checkRowColumnUniqueness,
  checkNoAdjacentShaded,
  checkConnectivityOfUnshaded,
  checkAllRules,
} from '../HitoriRules';

function puzzleFromLayout(numbers: number[][]): HitoriPuzzle {
  return {
    id: 'rules-test',
    size: numbers.length,
    numbers,
    difficulty: 'easy',
  };
}

describe('HitoriRules', () => {
  it('checkRowColumnUniqueness detects duplicates in rows and columns', () => {
    // Layout with duplicates:
    // 1 1
    // 2 2
    const puzzle = puzzleFromLayout([
      [1, 1],
      [2, 2],
    ]);
    const state = createInitialState(puzzle);

    const result = checkRowColumnUniqueness(state);
    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);

    // Shade one of each duplicate pair to fix uniqueness
    let s: HitoriGameState = state;
    s = setCellState(s, 0, 1, CellState.Shaded);
    s = setCellState(s, 1, 0, CellState.Shaded);

    const fixed = checkRowColumnUniqueness(s);
    expect(fixed.ok).toBe(true);
  });

  it('checkNoAdjacentShaded rejects orthogonally adjacent shaded cells', () => {
    const puzzle = puzzleFromLayout([
      [1, 2],
      [3, 4],
    ]);
    let state = createInitialState(puzzle);

    // Shade two adjacent cells (0,0) and (0,1)
    state = setCellState(state, 0, 0, CellState.Shaded);
    state = setCellState(state, 0, 1, CellState.Shaded);

    const result = checkNoAdjacentShaded(state);
    expect(result.ok).toBe(false);
    expect(result.violations.length).toBe(1);

    // Unshade one of them
    state = setCellState(state, 0, 1, CellState.Unmarked);
    const fixed = checkNoAdjacentShaded(state);
    expect(fixed.ok).toBe(true);
  });

  it('checkConnectivityOfUnshaded ensures a single connected component', () => {
    const puzzle = puzzleFromLayout([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);
    let state = createInitialState(puzzle);

    // Shade a column to split into two islands:
    // U X U
    // U X U
    // U X U
    state = setCellState(state, 0, 1, CellState.Shaded);
    state = setCellState(state, 1, 1, CellState.Shaded);
    state = setCellState(state, 2, 1, CellState.Shaded);

    const result = checkConnectivityOfUnshaded(state);
    expect(result.ok).toBe(false);
    expect(result.violations.length).toBe(1);

    // Unshade the middle cell to reconnect everything
    state = setCellState(state, 1, 1, CellState.Unmarked);
    const fixed = checkConnectivityOfUnshaded(state);
    expect(fixed.ok).toBe(true);
  });

  it('checkAllRules aggregates results and computes isSolved', () => {
    const puzzle = puzzleFromLayout([
      [1, 1],
      [2, 3],
    ]);
    let state = createInitialState(puzzle);

    // Start with duplicates in row 0: not solved.
    let composite = checkAllRules(state);
    expect(composite.isSolved).toBe(false);

    // Shade cell (0,1) to remove the duplicate.
    state = setCellState(state, 0, 1, CellState.Shaded);
    composite = checkAllRules(state);
    // Now: uniqueness ok, adjacency ok, connectivity ok → solved.
    expect(composite.rowColumnUniqueness.ok).toBe(true);
    expect(composite.noAdjacentShaded.ok).toBe(true);
    expect(composite.connectivity.ok).toBe(true);
    expect(composite.isSolved).toBe(true);
  });
});