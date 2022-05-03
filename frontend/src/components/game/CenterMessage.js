import Phaser from "phaser";

class CenterMessage extends Phaser.GameObjects.Container {
  constructor(scene, message) {
    const background = new Phaser.GameObjects.Sprite(scene, 0, 0, "centerMessage");
    const textName = new Phaser.GameObjects.BitmapText(
      scene, 0, 0, 'pressstart', message, 30, Phaser.GameObjects.ALIGN_LEFT,
    );
    // Hack to center text inside background :/
    textName.x = -(textName.width / 2);
    textName.y = -(textName.height / 2 - 10);
    const containerChildren = [
      background,
      textName,
    ];
    super(scene, scene.canvas.width / 2, scene.canvas.height / 2, containerChildren);
    this.scene = scene;
    this.background = background;
    this.textName = textName;
    this.scene.add.existing(this);
  }

  fadeThenDestroy() {
    this.scene.tweens.add({
      targets: [this.textName, this.background],
      alpha: 0,
      duration: 100,
      onComplete: () => {
        this.destroy();
      },
    })
  }
}

export default CenterMessage;
