import {
  listPuzzles,
  getPuzzleById,
  getRandomPuzzle,
  getDailyPuzzle,
} from '../HitoriPuzzleRepository';

describe('HitoriPuzzleRepository', () => {
  it('listPuzzles returns at least one puzzle with consistent metadata', () => {
    const list = listPuzzles();
    expect(list.length).toBeGreaterThan(0);

    for (const meta of list) {
      expect(typeof meta.id).toBe('string');
      expect(typeof meta.title).toBe('string');
      expect(meta.size).toBeGreaterThan(0);
      expect(['easy', 'medium', 'hard', 'expert']).toContain(meta.difficulty);
    }
  });

  it('getPuzzleById returns matching puzzle', () => {
    const [meta] = listPuzzles();
    const puzzle = getPuzzleById(meta.id);

    expect(puzzle.id).toBe(meta.id);
    expect(puzzle.size).toBe(meta.size);
    expect(puzzle.difficulty).toBe(meta.difficulty);
    expect(puzzle.numbers.length).toBe(meta.size);
    expect(puzzle.numbers[0].length).toBe(meta.size);
  });

  it('getRandomPuzzle respects filters when possible', () => {
    const all = listPuzzles();
    const size = all[0].size;

    const filtered = getRandomPuzzle({ size });
    expect(filtered.size).toBe(size);
  });

  it('getDailyPuzzle is deterministic for a given date', () => {
    const date = new Date(2024, 0, 1);
    const p1 = getDailyPuzzle(date);
    const p2 = getDailyPuzzle(date);
    expect(p1.id).toBe(p2.id);
  });
});
