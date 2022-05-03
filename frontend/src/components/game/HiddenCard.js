import Phaser from "phaser";

class HiddenCard extends Phaser.GameObjects.Container {
  constructor(data) {
    const {
      scene,
      id,
      name,
      x,
      y,
      card,
      image,
      type,
      attack,
      defence,
      cost,
      depth,
    } = data;
    const spriteCard = new Phaser.GameObjects.Sprite(scene, 0, 0, "cardback");
    const containerChildren = [
      spriteCard,
    ];
    super(scene, x, y, containerChildren);
    this.initialData = {
      id,
      name,
      x,
      y,
      card,
      image,
      type,
      attack,
      defence,
      cost,
      depth,
    };
    this.id = id;
    this.isHidden = true;
    this.spriteCard = spriteCard;
    this.scene = scene;
    this.scene.add.existing(this);
  }

}

export default HiddenCard;
