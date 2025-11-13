import Phaser from 'phaser';

/**
 * Optional UI / HUD scene.
 * For Phase 0 this is just a placeholder and does not contain real HUD logic yet.
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create(): void {
    // For now we keep this scene lightweight; later phases can add HUD elements here.
    const { width } = this.scale;
    const margin = 8;

    this.add
      .text(
        width - margin,
        margin,
        'Hitori',
        {
          fontSize: '16px',
          color: '#ffffff',
        }
      )
      .setOrigin(1, 0)
      .setAlpha(0.4);
  }
}