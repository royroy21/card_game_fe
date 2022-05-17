import Phaser from "phaser";


class ActionPoints extends Phaser.GameObjects.Container {
  constructor(scene, pointsRemaining) {
    // const background = new Phaser.GameObjects.Sprite(scene, 0, 0, "button");
    const textName = new Phaser.GameObjects.BitmapText(
      scene,
      0,
      0,
      'pressstart',
      "AP " + pointsRemaining,
      30,
      Phaser.GameObjects.ALIGN_LEFT,
    );
    // Hack to center text inside background :/
    textName.x = -(textName.width / 2);
    textName.y = -(textName.height / 2 - 3);
    const containerChildren = [
      // background,
      textName,
    ];
    super(
      scene,
      scene.canvas.width / 10,
      (scene.canvas.height - scene.canvas.height / 20) - 40,
      containerChildren,
    );
    this.scene = scene;
    // this.background = background;
    this.textName = textName;
    this.pointsRemaining = pointsRemaining;
    this.scene.add.existing(this);
  }

  setRemainingActionPoints(pointsRemaining) {
    this.pointsRemaining = pointsRemaining;
    this.textName.setText("AP " + pointsRemaining);
  }
}

export default ActionPoints;
