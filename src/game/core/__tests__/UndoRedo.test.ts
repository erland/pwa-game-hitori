import {
  createHistory,
  applyAction,
  undo,
  redo,
  canUndo,
  canRedo,
  type HistoryState,
} from '../UndoRedo';

describe('UndoRedo history helpers', () => {
  it('creates initial history with empty past/future', () => {
    const h = createHistory(1);
    expect(h.past).toEqual([]);
    expect(h.present).toBe(1);
    expect(h.future).toEqual([]);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
  });

  it('applyAction pushes present to past and clears future', () => {
    let h: HistoryState<number> = createHistory(1);
    h = applyAction(h, 2);
    h = applyAction(h, 3);

    expect(h.past).toEqual([1, 2]);
    expect(h.present).toBe(3);
    expect(h.future).toEqual([]);
    expect(canUndo(h)).toBe(true);
  });

  it('undo steps backwards and populates future', () => {
    let h: HistoryState<number> = createHistory(1);
    h = applyAction(h, 2);
    h = applyAction(h, 3);

    h = undo(h);
    expect(h.present).toBe(2);
    expect(h.past).toEqual([1]);
    expect(h.future).toEqual([3]);
    expect(canRedo(h)).toBe(true);
  });

  it('redo steps forwards again', () => {
    let h: HistoryState<number> = createHistory(1);
    h = applyAction(h, 2);
    h = applyAction(h, 3);

    h = undo(h); // present: 2
    h = redo(h); // present: 3

    expect(h.present).toBe(3);
    expect(h.past).toEqual([1, 2]);
    expect(h.future).toEqual([]);
    expect(canRedo(h)).toBe(false);
  });

  it('undo/redo on empty stacks are no-ops', () => {
    let h: HistoryState<number> = createHistory(1);
    const undoOnce = undo(h);
    expect(undoOnce).toEqual(h);

    const redoOnce = redo(h);
    expect(redoOnce).toEqual(h);
  });
});