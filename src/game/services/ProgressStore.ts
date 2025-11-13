// src/game/services/ProgressStore.ts

export interface PuzzleProgress {
  completed: boolean;
  attempts: number;
  bestTimeSeconds?: number;
  bestMoves?: number;
  bestHintsUsed?: number;

  lastTimeSeconds?: number;
  lastMoves?: number;
  lastHintsUsed?: number;
}

export interface ProgressSnapshot {
  puzzles: Record<string, PuzzleProgress>;
}

export interface CompletionStats {
  timeSeconds: number;
  moves: number;
  hintsUsed: number;
}

const STORAGE_KEY = 'hitori-progress-v1';

const EMPTY_SNAPSHOT: ProgressSnapshot = {
  puzzles: {},
};

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

export function loadProgress(): ProgressSnapshot {
  if (!hasWindow()) {
    return { ...EMPTY_SNAPSHOT, puzzles: { ...EMPTY_SNAPSHOT.puzzles } };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...EMPTY_SNAPSHOT, puzzles: { ...EMPTY_SNAPSHOT.puzzles } };
    }

    const parsed = JSON.parse(raw) as Partial<ProgressSnapshot>;
    if (!parsed || typeof parsed !== 'object') {
      return { ...EMPTY_SNAPSHOT, puzzles: { ...EMPTY_SNAPSHOT.puzzles } };
    }

    return {
      puzzles: parsed.puzzles ?? {},
    };
  } catch {
    return { ...EMPTY_SNAPSHOT, puzzles: { ...EMPTY_SNAPSHOT.puzzles } };
  }
}

export function saveProgress(snapshot: ProgressSnapshot): void {
  if (!hasWindow()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage errors (private mode, quota, etc.)
  }
}

export function getPuzzleProgress(id: string): PuzzleProgress {
  const snapshot = loadProgress();
  const existing = snapshot.puzzles[id];
  if (existing) return existing;

  return {
    completed: false,
    attempts: 0,
  };
}

export function updatePuzzleProgress(
  id: string,
  partial: Partial<PuzzleProgress>,
): void {
  const snapshot = loadProgress();
  const prev = snapshot.puzzles[id] ?? {
    completed: false,
    attempts: 0,
  };

  const next: PuzzleProgress = {
    ...prev,
    ...partial,
  };

  snapshot.puzzles[id] = next;
  saveProgress(snapshot);
}

/**
 * Convenience for “puzzle solved” – updates completion flag, attempts,
 * best time/moves/hints, and last attempt stats.
 */
export function markPuzzleCompleted(
  id: string,
  stats: CompletionStats,
): void {
  const snapshot = loadProgress();
  const prev: PuzzleProgress =
    snapshot.puzzles[id] ?? { completed: false, attempts: 0 };

  const attempts = (prev.attempts ?? 0) + 1;

  const bestTime =
    prev.bestTimeSeconds == null || stats.timeSeconds < prev.bestTimeSeconds
      ? stats.timeSeconds
      : prev.bestTimeSeconds;

  const bestMoves =
    prev.bestMoves == null || stats.moves < prev.bestMoves
      ? stats.moves
      : prev.bestMoves;

  const bestHints =
    prev.bestHintsUsed == null || stats.hintsUsed < prev.bestHintsUsed
      ? stats.hintsUsed
      : prev.bestHintsUsed;

  const next: PuzzleProgress = {
    ...prev,
    completed: true,
    attempts,
    bestTimeSeconds: bestTime,
    bestMoves,
    bestHintsUsed: bestHints,
    lastTimeSeconds: stats.timeSeconds,
    lastMoves: stats.moves,
    lastHintsUsed: stats.hintsUsed,
  };

  snapshot.puzzles[id] = next;
  saveProgress(snapshot);
}
