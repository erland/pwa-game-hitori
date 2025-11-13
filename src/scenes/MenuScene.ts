import Phaser from 'phaser';
import { BaseMenuScene } from '@erlandlindmark/pwa-game-2d-framework';
import {
  listPuzzles,
  type HitoriPuzzleMeta,
} from '../game/puzzles/HitoriPuzzleRepository';

/**
 * Main menu scene with a minimal puzzle selection list.
 *
 * Phase 2 goal: let the player pick a puzzle and start PlayScene
 * with the chosen puzzle id.
 */
export class MenuScene extends BaseMenuScene {
  private puzzleMetas: HitoriPuzzleMeta[] = [];
  private puzzleTexts: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;

  /** Optional background (e.g., color fill, parallax, logo). */
  protected buildBackground(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x101018).setOrigin(0, 0);
  }

  /**
   * Called by BaseMenuScene after it has created title + hint.
   * We extend it to build a simple puzzle list.
   */
  protected afterCreate(): void {
    const { width, height } = this.scale;
    const theme = this.getTheme();

    this.puzzleMetas = listPuzzles();

    if (this.puzzleMetas.length === 0) {
      this.add
        .text(
          width * 0.5,
          height * 0.5,
          'No puzzles available',
          theme.typography.small,
        )
        .setOrigin(0.5);
      return;
    }

    const startY = height * 0.4;
    const spacing = 32;

    this.puzzleTexts = this.puzzleMetas.map((meta, index) => {
      const label = this.formatPuzzleLabel(meta, index);
      const text = this.add
        .text(
          width * 0.5,
          startY + index * spacing,
          label,
          theme.typography.small,
        )
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      text.on('pointerup', () => {
        this.selectedIndex = index;
        this.updateSelectionHighlight();
        this.startPuzzle(meta.id);
      });

      return text;
    });

    this.updateSelectionHighlight();

    // Small instruction hint at the bottom.
    this.add
      .text(
        width * 0.5,
        height * 0.85,
        'Tap a puzzle to start · Use ↑/↓ + Enter on desktop',
        theme.typography.small,
      )
      .setOrigin(0.5)
      .setAlpha(0.8);

    // Keyboard navigation for desktop users.
    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown-UP', () => this.moveSelection(-1));
      keyboard.on('keydown-DOWN', () => this.moveSelection(1));
    }
  }

  /** BaseMenuScene hook: called when user presses Space/Enter or main pointer action. */
  protected startGame(): void {
    if (!this.puzzleMetas.length) return;
    const meta = this.puzzleMetas[this.selectedIndex] ?? this.puzzleMetas[0];
    this.startPuzzle(meta.id);
  }

  /** Format a single puzzle list entry. */
  private formatPuzzleLabel(meta: HitoriPuzzleMeta, index: number): string {
    const idx = index + 1;
    const difficulty =
      meta.difficulty.charAt(0).toUpperCase() + meta.difficulty.slice(1);
    return `${idx}. ${meta.size}×${meta.size} · ${difficulty}`;
  }

  /** Update visual highlighting of the currently selected puzzle. */
  private updateSelectionHighlight(): void {
    this.puzzleTexts.forEach((text, index) => {
      const isSelected = index === this.selectedIndex;
      text.setAlpha(isSelected ? 1 : 0.7);
      text.setStyle({ color: isSelected ? '#ffff88' : '#ffffff' });
    });
  }

  /** Change selection by +/-1 and wrap within the available range. */
  private moveSelection(delta: number): void {
    if (!this.puzzleMetas.length) return;
    const count = this.puzzleMetas.length;
    this.selectedIndex = (this.selectedIndex + delta + count) % count;
    this.updateSelectionHighlight();
  }

  /** Transition to PlayScene with the chosen puzzle id. */
  private startPuzzle(puzzleId: string): void {
    // BasePlayScene default key is "Play" in this project.
    this.scene.start('Play', { puzzleId });
  }
}
