import { CellState } from '../HitoriTypes';
import type { HitoriPuzzle } from '../HitoriPuzzle';
import {
  createInitialState,
  getCell,
  setCellState,
  cycleCellState,
  serializeState,
  deserializeState,
  type HitoriGameState,
} from '../HitoriState';

function createTestPuzzle(size = 3): HitoriPuzzle {
  const numbers: number[][] = [];
  let v = 1;
  for (let r = 0; r < size; r += 1) {
    const row: number[] = [];
    for (let c = 0; c < size; c += 1) {
      row.push(v);
      v += 1;
    }
    numbers.push(row);
  }

  return {
    id: 'test-puzzle',
    size,
    numbers,
    difficulty: 'easy',
  };
}

describe('HitoriState core API', () => {
  it('creates initial state from puzzle', () => {
    const puzzle = createTestPuzzle(2);
    const state = createInitialState(puzzle);

    expect(state.puzzle).toBe(puzzle);
    expect(state.grid.size).toBe(2);
    expect(state.grid.cells.length).toBe(2);
    expect(state.grid.cells[0].length).toBe(2);
    expect(state.moves).toBe(0);
    expect(state.elapsedMs).toBe(0);
    expect(state.startTime).toBeNull();

    // All cells should be unmarked with correct values
    expect(state.grid.cells[0][0].value).toBe(puzzle.numbers[0][0]);
    expect(state.grid.cells[0][0].state).toBe(CellState.Unmarked);
  });

  it('getCell returns correct cell and enforces bounds', () => {
    const puzzle = createTestPuzzle(3);
    const state = createInitialState(puzzle);

    const cell = getCell(state, 1, 2);
    expect(cell.row).toBe(1);
    expect(cell.col).toBe(2);
    expect(cell.value).toBe(puzzle.numbers[1][2]);

    expect(() => getCell(state, -1, 0)).toThrow();
    expect(() => getCell(state, 3, 0)).toThrow();
    expect(() => getCell(state, 0, 3)).toThrow();
  });

  it('setCellState returns new state and does not mutate original', () => {
    const puzzle = createTestPuzzle(2);
    const state = createInitialState(puzzle);

    const next: HitoriGameState = setCellState(
      state,
      0,
      0,
      CellState.Shaded,
    );

    // original unchanged
    expect(state.grid.cells[0][0].state).toBe(CellState.Unmarked);
    expect(state.moves).toBe(0);

    // new state updated
    expect(next.grid.cells[0][0].state).toBe(CellState.Shaded);
    expect(next.moves).toBe(1);

    // grid instances differ
    expect(next.grid).not.toBe(state.grid);
    expect(next.grid.cells[0][0]).not.toBe(state.grid.cells[0][0]);
  });

  it('cycleCellState cycles through Unmarked → Shaded → Kept → Unmarked', () => {
    const puzzle = createTestPuzzle(1);
    const state = createInitialState(puzzle);

    const s1 = cycleCellState(state, 0, 0);
    expect(s1.grid.cells[0][0].state).toBe(CellState.Shaded);

    const s2 = cycleCellState(s1, 0, 0);
    expect(s2.grid.cells[0][0].state).toBe(CellState.Kept);

    const s3 = cycleCellState(s2, 0, 0);
    expect(s3.grid.cells[0][0].state).toBe(CellState.Unmarked);
  });

  it('serialize and deserialize preserve game state', () => {
    const puzzle = createTestPuzzle(3);
    const state = createInitialState(puzzle);

    let s = state;
    s = cycleCellState(s, 0, 0); // shaded
    s = cycleCellState(s, 1, 1); // shaded
    s = cycleCellState(s, 1, 1); // kept
    s = {
      ...s,
      moves: 42,
      elapsedMs: 12345,
    };

    const snapshot = serializeState(s);
    expect(snapshot.puzzleId).toBe(puzzle.id);
    expect(snapshot.size).toBe(puzzle.size);

    const restored = deserializeState(puzzle, snapshot);

    expect(restored.puzzle).toBe(puzzle);
    expect(restored.grid.size).toBe(s.grid.size);
    expect(restored.moves).toBe(42);
    expect(restored.elapsedMs).toBe(12345);

    for (let r = 0; r < s.grid.size; r += 1) {
      for (let c = 0; c < s.grid.size; c += 1) {
        expect(restored.grid.cells[r][c].state).toBe(
          s.grid.cells[r][c].state,
        );
        expect(restored.grid.cells[r][c].value).toBe(
          s.grid.cells[r][c].value,
        );
      }
    }
  });

  it('deserializeState throws on mismatched puzzle id or size', () => {
    const puzzle = createTestPuzzle(2);
    const state = createInitialState(puzzle);
    const snapshot = serializeState(state);

    const wrongPuzzle: HitoriPuzzle = {
      ...puzzle,
      id: 'different-id',
    };

    expect(() => deserializeState(wrongPuzzle, snapshot)).toThrow();
  });
});