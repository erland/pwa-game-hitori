import { CellState } from './HitoriTypes';
import type { HitoriGameState } from './HitoriState';

export type HitoriHintReason =
  | 'duplicate-resolution'
  | 'adjacent-shaded';

export interface HitoriHint {
  row: number;
  col: number;
  suggestedState: CellState;
  reason: HitoriHintReason;
}

/**
 * Entry point: try simple strategies in order.
 *
 * 1. Duplicate resolution (row/column).
 * 2. Adjacent shaded cells.
 */
export function findHint(state: HitoriGameState): HitoriHint | null {
  const dup = findDuplicateResolutionHint(state);
  if (dup) return dup;

  const adj = findAdjacentShadedHint(state);
  if (adj) return adj;

  return null;
}

type GroupCell = {
  row: number;
  col: number;
  state: CellState;
};

function findDuplicateResolutionHint(state: HitoriGameState): HitoriHint | null {
  const { grid } = state;
  const size = grid.size;

  const analyzeGroup = (cells: GroupCell[]): HitoriHint | null => {
    // Only interesting if there are duplicates
    if (cells.length <= 1) return null;

    let numKept = 0;
    let numShaded = 0;
    let numUnmarked = 0;

    for (const c of cells) {
      if (c.state === CellState.Kept) numKept += 1;
      else if (c.state === CellState.Shaded) numShaded += 1;
      else if (c.state === CellState.Unmarked) numUnmarked += 1;
    }

    // Case A: exactly one Kept -> all other duplicates must be shaded.
    if (numKept === 1) {
      const keptCell = cells.find((c) => c.state === CellState.Kept)!;

      for (const c of cells) {
        if (c.row === keptCell.row && c.col === keptCell.col) continue;
        if (c.state === CellState.Shaded) continue;
        // Suggest shading a non-kept, non-shaded duplicate.
        return {
          row: c.row,
          col: c.col,
          suggestedState: CellState.Shaded,
          reason: 'duplicate-resolution',
        };
      }
    }

    // Case B: all but one are shaded, none kept -> the last one must be Kept.
    // Example: [Shaded, Shaded, Unmarked] for the same value in a row/col.
    if (numKept === 0 && numShaded === cells.length - 1 && numUnmarked === 1) {
      const target = cells.find((c) => c.state === CellState.Unmarked)!;
      return {
        row: target.row,
        col: target.col,
        suggestedState: CellState.Kept,
        reason: 'duplicate-resolution',
      };
    }

    return null;
  };

  // Rows
  for (let r = 0; r < size; r += 1) {
    const bucket = new Map<number, GroupCell[]>();
    for (let c = 0; c < size; c += 1) {
      const cell = grid.cells[r][c];
      const list = bucket.get(cell.value) ?? [];
      list.push({ row: r, col: c, state: cell.state });
      bucket.set(cell.value, list);
    }

    for (const group of bucket.values()) {
      const hint = analyzeGroup(group);
      if (hint) return hint;
    }
  }

  // Columns
  for (let c = 0; c < size; c += 1) {
    const bucket = new Map<number, GroupCell[]>();
    for (let r = 0; r < size; r += 1) {
      const cell = grid.cells[r][c];
      const list = bucket.get(cell.value) ?? [];
      list.push({ row: r, col: c, state: cell.state });
      bucket.set(cell.value, list);
    }

    for (const group of bucket.values()) {
      const hint = analyzeGroup(group);
      if (hint) return hint;
    }
  }

  return null;
}

/**
 * Find a pair of orthogonally adjacent shaded cells and suggest
 * unshading one of them.
 */
function findAdjacentShadedHint(state: HitoriGameState): HitoriHint | null {
  const { grid } = state;
  const size = grid.size;

  const isInBounds = (row: number, col: number) =>
    row >= 0 && col >= 0 && row < size && col < size;

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const cell = grid.cells[r][c];
      if (cell.state !== CellState.Shaded) continue;

      const neighbors = [
        { row: r - 1, col: c },
        { row: r + 1, col: c },
        { row: r, col: c - 1 },
        { row: r, col: c + 1 },
      ];

      for (const n of neighbors) {
        if (!isInBounds(n.row, n.col)) continue;
        const neighbor = grid.cells[n.row][n.col];
        if (neighbor.state === CellState.Shaded) {
          // Suggest unshading the neighbor (back to Unmarked).
          return {
            row: n.row,
            col: n.col,
            suggestedState: CellState.Unmarked,
            reason: 'adjacent-shaded',
          };
        }
      }
    }
  }

  return null;
}