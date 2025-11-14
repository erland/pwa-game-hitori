// src/game/puzzles/HitoriPuzzleGenerator.ts

export type HitoriDifficulty = 'easy' | 'medium' | 'hard';

export interface HitoriPuzzle {
  id: string;
  size: number;
  difficulty: HitoriDifficulty;
  numbers: number[][];
}

/** Optional: include solution shading for internal use (not needed by UI). */
export interface HitoriGeneratedPuzzle {
  puzzle: HitoriPuzzle;
  /** true = shaded/black, false = unshaded/white */
  solutionShaded: boolean[][];
}

/**
 * Public API: generate a Hitori puzzle that fits your existing repository format.
 * If you don’t care about the solution, just call this.
 */
export function generateHitoriPuzzle(
  size: number,
  difficulty: HitoriDifficulty = 'easy'
): HitoriPuzzle {
  const { puzzle } = generateHitoriPuzzleWithSolution(size, difficulty);
  return puzzle;
}

/**
 * Public API: generate puzzle + full solution shading.
 * Uses a constructive approach:
 *  1. Build a Latin square (no row/col duplicates).
 *  2. Pick a valid shading pattern (no adjacent blacks, white connected).
 *  3. For each black cell, copy a value from a white cell in same row/col
 *     so that the puzzle has row/col conflicts that are resolved by shading.
 */
export function generateHitoriPuzzleWithSolution(
  size: number,
  difficulty: HitoriDifficulty = 'easy'
): HitoriGeneratedPuzzle {
  if (size < 2) {
    throw new Error('Hitori size must be at least 2');
  }

  const latin = buildLatinSquare(size);
  const solutionShaded = buildShadingPattern(size, difficulty);

  const numbers = buildNumbersFromSolution(latin, solutionShaded);

  // Safety check: verify that our constructed solution really satisfies
  // Hitori rules for this numbers grid.
  if (!isValidSolution(numbers, solutionShaded)) {
    throw new Error('Internal error: constructed Hitori solution is invalid');
  }

  const puzzle: HitoriPuzzle = {
    id: buildRandomPuzzleId(size, difficulty),
    size,
    difficulty,
    numbers,
  };

  return { puzzle, solutionShaded };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: ID generation
// ─────────────────────────────────────────────────────────────────────────────

function buildRandomPuzzleId(
  size: number,
  difficulty: HitoriDifficulty
): string {
  const ts = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `hitori-${size}x${size}-${difficulty}-${ts}-${rand}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Latin square generator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple cyclic Latin square of order n:
 * L[y][x] = ((x + y) mod n) + 1
 * Each row/column contains 1..n exactly once.
 */
function buildLatinSquare(n: number): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < n; y++) {
    const row: number[] = [];
    for (let x = 0; x < n; x++) {
      row.push(((x + y) % n) + 1);
    }
    grid.push(row);
  }
  return grid;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Shading pattern (solution) generator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Picks a ratio of black cells depending on difficulty.
 */
function targetBlackRatio(difficulty: HitoriDifficulty): number {
  switch (difficulty) {
    case 'easy':
      return 0.20;
    case 'medium':
      return 0.30;
    case 'hard':
    default:
      return 0.40;
  }
}

/**
 * Build a shading pattern that obeys:
 *  - No orthogonally adjacent black cells.
 *  - All white cells form one connected component.
 */
function buildShadingPattern(
  size: number,
  difficulty: HitoriDifficulty
): boolean[][] {
  const shaded: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false)
  );

  const ratio = targetBlackRatio(difficulty);
  const targetBlacks = Math.round(size * size * ratio);

  // Random order of cells
  const allCells: [number, number][] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      allCells.push([x, y]);
    }
  }
  shuffleInPlace(allCells);

  let blacks = 0;
  for (const [x, y] of allCells) {
    if (blacks >= targetBlacks) break;

    // Try shading this cell
    shaded[y][x] = true;
    if (violatesBlackAdjacency(shaded)) {
      shaded[y][x] = false;
      continue;
    }
    if (!isWhiteConnected(shaded)) {
      shaded[y][x] = false;
      continue;
    }
    blacks++;
  }

  // Ensure at least one black cell
  if (blacks === 0) {
    const cellsCopy = [...allCells];
    for (const [x, y] of cellsCopy) {
      shaded[y][x] = true;
      if (!violatesBlackAdjacency(shaded) && isWhiteConnected(shaded)) {
        blacks = 1;
        break;
      }
      shaded[y][x] = false;
    }
  }

  return shaded;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

/** Returns true if any pair of orthogonally adjacent cells are both black. */
function violatesBlackAdjacency(shaded: boolean[][]): boolean {
  const n = shaded.length;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!shaded[y][x]) continue;
      if (x + 1 < n && shaded[y][x + 1]) return true;
      if (y + 1 < n && shaded[y + 1][x]) return true;
    }
  }
  return false;
}

/**
 * Check that all white cells form a single connected component (orthogonally).
 * `true` = black, `false` = white.
 */
function isWhiteConnected(shaded: boolean[][]): boolean {
  const n = shaded.length;
  const visited: boolean[][] = Array.from({ length: n }, () =>
    Array<boolean>(n).fill(false)
  );

  let start: [number, number] | null = null;
  let totalWhite = 0;

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!shaded[y][x]) {
        totalWhite++;
        if (!start) start = [x, y];
      }
    }
  }

  if (totalWhite === 0) return false;

  const stack: [number, number][] = [];
  if (start) stack.push(start);
  let visitedWhite = 0;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (visited[y][x]) continue;
    visited[y][x] = true;
    visitedWhite++;

    const neighbors: [number, number][] = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= n || ny < 0 || ny >= n) continue;
      if (!shaded[ny][nx] && !visited[ny][nx]) {
        stack.push([nx, ny]);
      }
    }
  }

  return visitedWhite === totalWhite;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Derive numbers grid from Latin square + shading
// ─────────────────────────────────────────────────────────────────────────────

/**
 * We start from a Latin square (no row/col duplicates if everything is white).
 * Then for each black cell we copy the number from a white cell in the same
 * row or column so that:
 *  - If you turned that black cell white, you would create a row/column conflict.
 *  - With the “correct” shading, all white cells still have unique values
 *    in their row/column.
 */
function buildNumbersFromSolution(
  latin: number[][],
  shaded: boolean[][]
): number[][] {
  const n = latin.length;
  const numbers: number[][] = latin.map(row => [...row]); // clone

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!shaded[y][x]) continue; // only modify black cells

      // Collect white cells in same row/column
      const candidates: [number, number][] = [];

      for (let cx = 0; cx < n; cx++) {
        if (!shaded[y][cx]) {
          candidates.push([cx, y]);
        }
      }

      for (let cy = 0; cy < n; cy++) {
        if (!shaded[cy][x]) {
          candidates.push([x, cy]);
        }
      }

      if (candidates.length === 0) {
        // Rare, but if all neighbours are black, just keep the Latin value.
        continue;
      }

      const [wx, wy] = candidates[Math.floor(Math.random() * candidates.length)];
      const v = numbers[wy][wx];
      numbers[y][x] = v;
    }
  }

  return numbers;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers (for tests / internal sanity checks)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate that `solutionShaded` is a valid Hitori solution for `numbers`.
 *  1. No duplicate numbers among white cells in any row/column.
 *  2. No orthogonally adjacent black cells.
 *  3. All white cells form a single connected component.
 */
export function isValidSolution(
  numbers: number[][],
  solutionShaded: boolean[][]
): boolean {
  const n = numbers.length;

  // 1. Row uniqueness among whites
  for (let y = 0; y < n; y++) {
    const seen = new Set<number>();
    for (let x = 0; x < n; x++) {
      if (solutionShaded[y][x]) continue; // black ignored
      const v = numbers[y][x];
      if (seen.has(v)) return false;
      seen.add(v);
    }
  }

  // 1b. Column uniqueness among whites
  for (let x = 0; x < n; x++) {
    const seen = new Set<number>();
    for (let y = 0; y < n; y++) {
      if (solutionShaded[y][x]) continue;
      const v = numbers[y][x];
      if (seen.has(v)) return false;
      seen.add(v);
    }
  }

  // 2. No adjacent black cells
  if (violatesBlackAdjacency(solutionShaded)) {
    return false;
  }

  // 3. White connectivity
  if (!isWhiteConnected(solutionShaded)) {
    return false;
  }

  return true;
}