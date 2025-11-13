import type { HitoriGrid } from './HitoriTypes';
import { createGridFromNumbers } from './HitoriTypes';

export type PuzzleDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface HitoriPuzzle {
  id: string;
  size: number;
  /** Immutable 2D numbers layout (size x size). */
  numbers: number[][];
  difficulty: PuzzleDifficulty;
  hasUniqueSolution?: boolean;
}

/**
 * Convenience helper: validate that the puzzle's numbers layout
 * is consistent with its declared size and return a grid created
 * from the numbers.
 */
export function createGridForPuzzle(puzzle: HitoriPuzzle): HitoriGrid {
  if (puzzle.numbers.length !== puzzle.size) {
    throw new Error(`Puzzle ${puzzle.id} has mismatched size vs numbers length`);
  }
  return createGridFromNumbers(puzzle.numbers);
}