// src/game/core/__tests__/HitoriHints.test.ts
import { CellState } from '../HitoriTypes';
import type { HitoriGameState } from '../HitoriState';
import { findHint } from '../HitoriHints';

function makeState(
  values: number[][],
  states: CellState[][],
): HitoriGameState {
  const size = values.length;

  const grid = {
    size,
    cells: values.map((row, r) =>
      row.map((value, c) => ({
        value,
        state: states[r][c],
      })),
    ),
  };

  // We only care about grid here; other fields are not used by findHint.
  const state: Partial<HitoriGameState> = {
    grid,
  };

  return state as unknown as HitoriGameState;
}

describe('HitoriHints - findHint', () => {
  it('returns a duplicate-resolution hint when exactly one duplicate is kept and another is unshaded (row case)', () => {
    // Row 0: three 5s, with one Kept, one Unmarked, one Shaded
    const values = [
      [5, 5, 5],
      [1, 2, 3],
      [4, 6, 7],
    ];

    const states: CellState[][] = [
      [CellState.Kept, CellState.Unmarked, CellState.Shaded],
      [CellState.Unmarked, CellState.Unmarked, CellState.Unmarked],
      [CellState.Unmarked, CellState.Unmarked, CellState.Unmarked],
    ];

    const state = makeState(values, states);

    const hint = findHint(state);
    expect(hint).not.toBeNull();
    expect(hint!.reason).toBe('duplicate-resolution');
    // We expect it to suggest shading the unmarked duplicate at (0, 1)
    expect(hint!.row).toBe(0);
    expect(hint!.col).toBe(1);
    expect(hint!.suggestedState).toBe(CellState.Shaded);
  });

  it('returns a duplicate-resolution hint when all but one duplicate are shaded (column case -> suggest Kept)', () => {
    // Column 1: three 7s, shaded / unmarked / shaded
    const values = [
      [1, 7, 2],
      [3, 7, 4],
      [5, 7, 6],
    ];

    const states: CellState[][] = [
      [CellState.Unmarked, CellState.Shaded, CellState.Unmarked],
      [CellState.Unmarked, CellState.Unmarked, CellState.Unmarked],
      [CellState.Unmarked, CellState.Shaded, CellState.Unmarked],
    ];

    const state = makeState(values, states);

    const hint = findHint(state);
    expect(hint).not.toBeNull();
    expect(hint!.reason).toBe('duplicate-resolution');
    // All but one of the 7s are shaded, so the remaining unmarked one at (1, 1) should become Kept
    expect(hint!.row).toBe(1);
    expect(hint!.col).toBe(1);
    expect(hint!.suggestedState).toBe(CellState.Kept);
  });

  it('returns an adjacent-shaded hint when two shaded cells are orthogonally adjacent', () => {
    const values = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];

    const states: CellState[][] = [
      [CellState.Unmarked, CellState.Unmarked, CellState.Unmarked],
      [CellState.Unmarked, CellState.Shaded, CellState.Shaded], // (1,1) and (1,2) shaded
      [CellState.Unmarked, CellState.Unmarked, CellState.Unmarked],
    ];

    const state = makeState(values, states);

    const hint = findHint(state);
    expect(hint).not.toBeNull();
    expect(hint!.reason).toBe('adjacent-shaded');
    // Our implementation returns the neighbor; here it should be (1, 2)
    expect(hint!.row).toBe(1);
    expect(hint!.col).toBe(2);
    expect(hint!.suggestedState).toBe(CellState.Unmarked);
  });

  it('returns null when there are no applicable simple hints', () => {
    const values = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];

    const states: CellState[][] = [
      [CellState.Unmarked, CellState.Unmarked, CellState.Unmarked],
      [CellState.Unmarked, CellState.Unmarked, CellState.Unmarked],
      [CellState.Unmarked, CellState.Unmarked, CellState.Unmarked],
    ];

    const state = makeState(values, states);

    const hint = findHint(state);
    expect(hint).toBeNull();
  });

  it('prefers duplicate-resolution hints over adjacent-shaded hints when both are present', () => {
    const values = [
      [5, 5, 0],
      [1, 2, 3],
      [4, 6, 7],
    ];

    const states: CellState[][] = [
      [CellState.Kept, CellState.Unmarked, CellState.Shaded], // triggers duplicate-resolution
      [CellState.Unmarked, CellState.Shaded, CellState.Shaded], // also has adjacent shaded
      [CellState.Unmarked, CellState.Unmarked, CellState.Unmarked],
    ];

    const state = makeState(values, states);

    const hint = findHint(state);
    expect(hint).not.toBeNull();
    // Because findHint checks duplicate-resolution first, we should get that reason.
    expect(hint!.reason).toBe('duplicate-resolution');
  });
});