import Phaser from 'phaser';
import { BasePlayScene } from '@erlandlindmark/pwa-game-2d-framework';
import {
  createInitialState,
  type HitoriGameState,
} from '../game/core/HitoriState';
import {
  getPuzzleById,
  listPuzzles,
} from '../game/puzzles/HitoriPuzzleRepository';

interface PlaySceneData {
  puzzleId?: string;
}

/**
 * Play scene – Phase 2 version.
 *
 * The board is not yet rendered, but the scene now knows which puzzle
 * is active and initializes a HitoriGameState for it.
 */
export class PlayScene extends BasePlayScene {
  private t = 0;
  private label!: Phaser.GameObjects.Text;
  private gameState: HitoriGameState | null = null;

  constructor() {
    // 60 Hz fixed-step with up to 5 catch-up steps per frame.
    super({ hz: 60, maxCatchUp: 5 }, 'Play');
  }

  /** Called before create(): initialize the active puzzle/game state. */
  init(data: PlaySceneData): void {
    const fromMenuId = data?.puzzleId;
    let effectiveId = fromMenuId;

    if (!effectiveId) {
      const first = listPuzzles()[0];
      effectiveId = first?.id;
    }

    if (!effectiveId) {
      // No puzzles available; leave gameState as null. buildWorld will show a message.
      this.gameState = null;
      return;
    }

    const puzzle = getPuzzleById(effectiveId);
    this.gameState = createInitialState(puzzle);
  }

  /**
   * Build a very simple placeholder world that just shows which puzzle
   * is active. Phase 3 will replace this with a real board renderer.
   */
  protected buildWorld(): void {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0, 0);

    const activePuzzle = this.gameState?.puzzle ?? null;
    const puzzleLabel = activePuzzle
      ? `${activePuzzle.size}×${activePuzzle.size} · ${activePuzzle.difficulty}`
      : 'No active puzzle';

    const mainText = activePuzzle
      ? `Hitori – Phase 2\nPuzzle: ${activePuzzle.id}\n${puzzleLabel}`
      : 'Hitori – Phase 2\nNo active puzzle';

    this.label = this.add
      .text(
        width * 0.5,
        height * 0.5,
        mainText,
        {
          fontSize: '24px',
          color: '#ffffff',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    this.add
      .text(
        width * 0.5,
        height * 0.8,
        'Next: render board and support cell interaction (Phase 3)',
        {
          fontSize: '14px',
          color: '#bbbbbb',
          align: 'center',
        },
      )
      .setOrigin(0.5);
  }

  /** Step your deterministic simulation here (called at fixed Hz). */
  protected tick(dtMs: number): void {
    this.t += dtMs;
  }

  /** Per-frame rendering / effects (called once per RAF frame). */
  protected frame(_deltaMs: number): void {
    if (this.label) {
      this.label.setAlpha(0.7 + 0.3 * Math.sin(this.t * 0.01));
    }
  }
}
