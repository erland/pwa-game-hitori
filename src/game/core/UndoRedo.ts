/**
 * Generic undo/redo history state.
 */
export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

/** Create an initial history container with a given present value. */
export function createHistory<T>(initial: T): HistoryState<T> {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

/**
 * Apply a new present value, pushing the previous present onto `past`
 * and clearing the `future` stack.
 */
export function applyAction<T>(
  history: HistoryState<T>,
  newPresent: T,
): HistoryState<T> {
  return {
    past: [...history.past, history.present],
    present: newPresent,
    future: [],
  };
}

/** Undo: step one state back in time, if possible. */
export function undo<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.past.length === 0) {
    return history;
  }

  const previous = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, history.past.length - 1);

  return {
    past: newPast,
    present: previous,
    future: [history.present, ...history.future],
  };
}

/** Redo: step one state forward in time, if possible. */
export function redo<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.future.length === 0) {
    return history;
  }

  const next = history.future[0];
  const newFuture = history.future.slice(1);

  return {
    past: [...history.past, history.present],
    present: next,
    future: newFuture,
  };
}

/** Convenience helpers to check if undo/redo is possible. */
export function canUndo<T>(history: HistoryState<T>): boolean {
  return history.past.length > 0;
}

export function canRedo<T>(history: HistoryState<T>): boolean {
  return history.future.length > 0;
}