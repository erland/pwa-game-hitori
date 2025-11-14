import { generateHitoriPuzzleWithSolution } from '../HitoriPuzzleGenerator';
import { isValidSolution } from '../HitoriPuzzleGenerator';

it('generated puzzle has a valid solution', () => {
  const { puzzle, solutionShaded } = generateHitoriPuzzleWithSolution(5, 'easy');
  expect(isValidSolution(puzzle.numbers, solutionShaded)).toBe(true);
});