import Phaser from "phaser";

class EndTurnButton extends Phaser.GameObjects.Container {
  constructor(scene, message="End Turn") {
    const background = new Phaser.GameObjects.Sprite(scene, 0, 0, "button");
    const textName = new Phaser.GameObjects.BitmapText(
      scene, 0, 0, 'pressstart', message, 30, Phaser.GameObjects.ALIGN_LEFT,
    );
    // Hack to center text inside background :/
    textName.x = -(textName.width / 2);
    textName.y = -(textName.height / 2 - 3);
    const containerChildren = [
      background,
      textName,
    ];
    super(
      scene,
      scene.canvas.width / 10,
      scene.canvas.height - scene.canvas.height / 20,
      containerChildren,
    );
    this.scene = scene;
    this.background = background;
    this.textName = textName;
    this.scene.add.existing(this);

    background.depth = 2;
    background.setInteractive({ useHandCursor: true });
    background.on('pointerover', () => background.tint = 0xccccc);
    background.on('pointerout', () => background.clearTint());
    background.on('pointerdown', () => {
      background.tint = 0xccccc;
      this.scene.endTurn();
    });
  }
}

export default EndTurnButton;
