import { CellState } from './HitoriTypes';
import type { HitoriGameState } from './HitoriState';

export interface CellPosition {
  row: number;
  col: number;
}

export type RuleViolationKind =
  | 'row-duplicate'
  | 'column-duplicate'
  | 'adjacent-shaded'
  | 'connectivity';

export interface RuleViolation {
  kind: RuleViolationKind;
  /** For row/column rules, the row or column index involved. */
  index?: number;
  /** Optional offending value (for uniqueness violations). */
  value?: number;
  /** The cells directly involved in the violation. */
  cells: CellPosition[];
}

export interface RuleResult {
  ok: boolean;
  violations: RuleViolation[];
}

export interface CompositeRuleResult {
  isSolved: boolean;
  rowColumnUniqueness: RuleResult;
  noAdjacentShaded: RuleResult;
  connectivity: RuleResult;
}

/**
 * For each row and column, verify that unshaded cells have unique values.
 * Unshaded means any cell whose state is not Shaded.
 */
export function checkRowColumnUniqueness(state: HitoriGameState): RuleResult {
  const { grid } = state;
  const violations: RuleViolation[] = [];

  // Rows
  for (let r = 0; r < grid.size; r += 1) {
    const bucket = new Map<number, CellPosition[]>();
    for (let c = 0; c < grid.size; c += 1) {
      const cell = grid.cells[r][c];
      if (cell.state === CellState.Shaded) continue;
      const list = bucket.get(cell.value) ?? [];
      list.push({ row: r, col: c });
      bucket.set(cell.value, list);
    }

    for (const [value, positions] of bucket.entries()) {
      if (positions.length > 1) {
        violations.push({
          kind: 'row-duplicate',
          index: r,
          value,
          cells: positions,
        });
      }
    }
  }

  // Columns
  for (let c = 0; c < grid.size; c += 1) {
    const bucket = new Map<number, CellPosition[]>();
    for (let r = 0; r < grid.size; r += 1) {
      const cell = grid.cells[r][c];
      if (cell.state === CellState.Shaded) continue;
      const list = bucket.get(cell.value) ?? [];
      list.push({ row: r, col: c });
      bucket.set(cell.value, list);
    }

    for (const [value, positions] of bucket.entries()) {
      if (positions.length > 1) {
        violations.push({
          kind: 'column-duplicate',
          index: c,
          value,
          cells: positions,
        });
      }
    }
  }

  return {
    ok: violations.length === 0,
    violations,
  };
}

/**
 * Ensure no two shaded cells are orthogonally adjacent.
 */
export function checkNoAdjacentShaded(state: HitoriGameState): RuleResult {
  const { grid } = state;
  const violations: RuleViolation[] = [];
  const seenPairs = new Set<string>();

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let r = 0; r < grid.size; r += 1) {
    for (let c = 0; c < grid.size; c += 1) {
      const cell = grid.cells[r][c];
      if (cell.state !== CellState.Shaded) continue;

      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= grid.size || nc < 0 || nc >= grid.size) continue;

        const neighbor = grid.cells[nr][nc];
        if (neighbor.state !== CellState.Shaded) continue;

        // To avoid duplicate violations for the same pair, sort the pair key.
        const key =
          r < nr || (r === nr && c <= nc)
            ? `${r},${c}|${nr},${nc}`
            : `${nr},${nc}|${r},${c}`;

        if (!seenPairs.has(key)) {
          seenPairs.add(key);
          violations.push({
            kind: 'adjacent-shaded',
            cells: [
              { row: r, col: c },
              { row: nr, col: nc },
            ],
          });
        }
      }
    }
  }

  return {
    ok: violations.length === 0,
    violations,
  };
}

/**
 * Graph search (BFS) over unshaded cells; they must form a single
 * connected component.
 */
export function checkConnectivityOfUnshaded(state: HitoriGameState): RuleResult {
  const { grid } = state;
  const unshaded: CellPosition[] = [];

  for (let r = 0; r < grid.size; r += 1) {
    for (let c = 0; c < grid.size; c += 1) {
      const cell = grid.cells[r][c];
      if (cell.state !== CellState.Shaded) {
        unshaded.push({ row: r, col: c });
      }
    }
  }

  if (unshaded.length <= 1) {
    // Trivially connected or empty.
    return { ok: true, violations: [] };
  }

  const start = unshaded[0];
  const visited = new Set<string>();
  const queue: CellPosition[] = [start];
  const keyOf = (p: CellPosition) => `${p.row},${p.col}`;

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  visited.add(keyOf(start));

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const [dr, dc] of dirs) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      if (nr < 0 || nr >= grid.size || nc < 0 || nc >= grid.size) continue;

      const neighbor = grid.cells[nr][nc];
      if (neighbor.state === CellState.Shaded) continue;

      const nk = `${nr},${nc}`;
      if (!visited.has(nk)) {
        visited.add(nk);
        queue.push({ row: nr, col: nc });
      }
    }
  }

  if (visited.size === unshaded.length) {
    return { ok: true, violations: [] };
  }

  const unreachable = unshaded.filter((p) => !visited.has(keyOf(p)));

  return {
    ok: false,
    violations: [
      {
        kind: 'connectivity',
        cells: unreachable,
      },
    ],
  };
}

/**
 * Aggregate all three rule checks and compute an overall solved flag.
 */
export function checkAllRules(state: HitoriGameState): CompositeRuleResult {
  const rowColumnUniqueness = checkRowColumnUniqueness(state);
  const noAdjacentShaded = checkNoAdjacentShaded(state);
  const connectivity = checkConnectivityOfUnshaded(state);

  const isSolved =
    rowColumnUniqueness.ok &&
    noAdjacentShaded.ok &&
    connectivity.ok;

  return {
    isSolved,
    rowColumnUniqueness,
    noAdjacentShaded,
    connectivity,
  };
}