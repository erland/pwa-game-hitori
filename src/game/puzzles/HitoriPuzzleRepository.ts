import type { HitoriPuzzle, PuzzleDifficulty } from '../core/HitoriPuzzle';

export interface HitoriPuzzleMeta {
  id: string;
  title: string;
  size: number;
  difficulty: PuzzleDifficulty;
  /**
   * Optional completion information. Phase 2 does not yet persist this,
   * but the shape is ready for later phases.
   */
  completed?: boolean;
  bestTimeMs?: number;
}

/** Optional filter when listing puzzles. */
export interface PuzzleFilter {
  size?: number;
  difficulties?: PuzzleDifficulty[];
}

/**
 * Hard-coded puzzle set for early phases.
 * Later on these can be moved to JSON files or a backend.
 */
const PUZZLES: HitoriPuzzle[] = [
  {
    id: 'hitori-5x5-001',
    size: 5,
    difficulty: 'easy',
    numbers: [
      [1, 4, 5, 1, 1],
      [1, 2, 1, 4, 5],
      [4, 5, 4, 1, 1],
      [5, 3, 1, 2, 1],
      [1, 1, 4, 5, 3],
    ],
    hasUniqueSolution: false,
  },
  {
    id: 'hitori-6x6-001',
    size: 6,
    difficulty: 'medium',
    numbers: [
      [4, 4, 1, 3, 2, 5],
      [6, 3, 4, 4, 4, 2],
      [4, 5, 6, 2, 3, 1],
      [4, 1, 2, 3, 4, 6],
      [2, 6, 4, 1, 5, 1],
      [2, 1, 2, 5, 6, 4],
    ],
    hasUniqueSolution: false,
  },
  {
    id: 'hitori-8x8-001',
    size: 8,
    difficulty: 'hard',
    numbers: [
      [3, 8, 7, 6, 2, 6, 1, 5],
      [4, 3, 1, 7, 5, 7, 6, 2],
      [5, 1, 8, 8, 7, 4, 1, 2],
      [4, 8, 6, 5, 1, 1, 8, 3],
      [1, 6, 1, 8, 3, 3, 5, 7],
      [6, 7, 3, 6, 8, 5, 7, 4],
      [2, 4, 2, 3, 6, 3, 7, 8],
      [7, 7, 1, 2, 7, 8, 4, 3],
    ],
    hasUniqueSolution: false,
  },
];

/** Human-friendly title derived from id / size / difficulty. */
export function prettyTitleForPuzzle(p: HitoriPuzzle): string {
  const sizeLabel = `${p.size}×${p.size}`;
  const difficultyLabel = p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1);
  return `${sizeLabel} – ${difficultyLabel}`;
}

/** Internal helper to build metadata from a full puzzle. */
function toMeta(p: HitoriPuzzle): HitoriPuzzleMeta {
  return {
    id: p.id,
    title: prettyTitleForPuzzle(p),
    size: p.size,
    difficulty: p.difficulty,
    // completed / bestTimeMs will be filled from progress storage in later phases.
  };
}

/**
 * Return lightweight puzzle metadata, optionally filtered by size/difficulty.
 */
export function listPuzzles(filter?: PuzzleFilter): HitoriPuzzleMeta[] {
  let puzzles = PUZZLES.slice();

  if (filter?.size != null) {
    puzzles = puzzles.filter((p) => p.size === filter.size);
  }

  if (filter?.difficulties && filter.difficulties.length > 0) {
    const set = new Set(filter.difficulties);
    puzzles = puzzles.filter((p) => set.has(p.difficulty));
  }

  return puzzles.map(toMeta);
}

/** Retrieve a full puzzle definition by id (throws if not found). */
export function getPuzzleById(id: string): HitoriPuzzle {
  const found = PUZZLES.find((p) => p.id === id);
  if (!found) {
    throw new Error(`Unknown Hitori puzzle id: ${id}`);
  }
  return found;
}

/**
 * Optional helper: pick a random puzzle, optionally constrained by size
 * and/or difficulty.
 */
export function getRandomPuzzle(filter?: PuzzleFilter): HitoriPuzzle {
  const metas = listPuzzles(filter);
  if (metas.length === 0) {
    throw new Error('No puzzles available for the given filter');
  }
  const index = Math.floor(Math.random() * metas.length);
  const id = metas[index].id;
  return getPuzzleById(id);
}

/**
 * Optional helper: deterministic “daily puzzle” based on date.
 * Uses a simple hash of YYYY-MM-DD to pick a puzzle index.
 */
export function getDailyPuzzle(date: Date): HitoriPuzzle {
  const metas = listPuzzles();
  if (metas.length === 0) {
    throw new Error('No puzzles available');
  }

  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const key = `${y}-${m}-${d}`;

  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }

  const index = Math.abs(hash) % metas.length;
  const id = metas[index].id;
  return getPuzzleById(id);
}
