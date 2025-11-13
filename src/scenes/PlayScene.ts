import Phaser from 'phaser';
import { BasePlayScene } from '@erlandlindmark/pwa-game-2d-framework';

/**
 * Phase 0 placeholder Play scene.
 * Uses the framework's fixed-step loop but only shows a minimal label.
 */
export class PlayScene extends BasePlayScene {
  private t = 0;
  private label!: Phaser.GameObjects.Text;

  constructor() {
    // 60 Hz fixed-step with up to 5 catch-up steps per frame.
    super({ hz: 60, maxCatchUp: 5 }, 'Play');
  }

  /** Build a minimal placeholder world so we can verify the shell runs. */
  protected buildWorld(): void {
    const { width, height } = this.scale;

    // Simple solid background
    this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0, 0);

    // Centered label so we see that the scene is active
    this.label = this.add
      .text(
        width / 2,
        height / 2,
        'Hitori – Phase 0\nPlaceholder Play scene',
        {
          fontSize: '24px',
          color: '#ffffff',
          align: 'center',
        }
      )
      .setOrigin(0.5);

    // Optional hint text near the bottom
    this.add
      .text(
        width / 2,
        height * 0.8,
        'Use the menu to start puzzles in later phases',
        {
          fontSize: '14px',
          color: '#bbbbbb',
          align: 'center',
        }
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