import { generateHitoriPuzzleWithSolution } from '../HitoriPuzzleGenerator';

it('generated puzzle has a valid solution', () => {
  const { puzzle, solutionShaded } = generateHitoriPuzzleWithSolution(5, 'easy');
  expect(puzzle.numbers.length).toBe(puzzle.size);
  expect(solutionShaded.length).toBe(puzzle.size);
});