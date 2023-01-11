import Phaser from "phaser";

class Card extends Phaser.GameObjects.Container {
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
    const spriteCard = new Phaser.GameObjects.Sprite(scene, 0, 0, card);
    const spriteImage = new Phaser.GameObjects.Sprite(scene, 0, -10, image);
    const textName = new Phaser.GameObjects.BitmapText(
      scene, 0, 0, 'pressstart', name, 16, Phaser.GameObjects.ALIGN_CENTER,
    );
    const textAttack = new Phaser.GameObjects.BitmapText(
      scene, 0, 0, 'pressstart', attack, 26,
    );
    const textDefence = new Phaser.GameObjects.BitmapText(
      scene, 0, 0, 'pressstart', defence, 26,
    );
    const textCost = new Phaser.GameObjects.BitmapText(
      scene, 0, 0, 'pressstart', cost, 26,
    );
    const containerChildren = [
      spriteCard,
      spriteImage,
      textName,
      textAttack,
      textDefence,
      textCost,
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
    this.isHidden = false;
    this.spriteCard = spriteCard;
    this.textName = textName;
    this.cardName = name;
    this.textAttack = textAttack;
    this.cardAttack = attack;
    this.textDefence = textDefence;
    this.cardDefence = defence;
    this.textCost = textCost;
    this.cardCost = cost;
    this.spriteImage = spriteImage;
    this.type = type;
    this.depth = depth;
    this.scene = scene;
    this.scene.add.existing(this);
  }

  set cardName(newName) {
    this._cardName = newName;
    this.textName.text = this._cardName;
    this.textName.maxWidth = this.spriteCard.width;
    this.textName.tint = 0;
    this.textName.x = -this.textName.width / 2;
    this.textName.y = 80 - this.textName.height;
  };

  set cardAttack(newAttack) {
    this._cardAttack = newAttack;
    this.textAttack.text = this._cardAttack;
    this.textAttack.maxWidth = this.spriteCard.width;
    this.textAttack.tint = 0xFF0000;
    this.textAttack.x = -75;
    this.textAttack.y = 120 - this.textAttack.height;
  };

  get cardAttack() {
    return parseInt(this._cardAttack);
  }

  set cardDefence(newDefence) {
    this._cardDefence = newDefence;
    this.textDefence.text = this._cardDefence;
    this.textDefence.maxWidth = this.spriteCard.width;
    this.textDefence.tint = 0x006BFF;
    if (newDefence.length === 1) {
      this.textDefence.x = 55;
    } else {
      this.textDefence.x = 40;
    }
    this.textDefence.y = 120 - this.textDefence.height;
  }

  get cardDefence() {
    return parseInt(this._cardDefence);
  }

  set cardCost(newCost) {
    this._cardCost = newCost;
    this.textCost.text = this._cardCost;
    this.textCost.maxWidth = this.spriteCard.width;
    this.textCost.tint = 0;
    if (newCost.length === 1) {
      this.textCost.x = -55;
    } else {
      this.textCost.x = -65;
    }
    this.textCost.y = -100;
  };

  get cardCost() {
    return parseInt(this._cardCost);
  }

  // deadAnimation() {
  //   this.scene.tweens.add({
  //     targets: this.spriteImage,
  //     alpha: 0,
  //     duration: 100,
  //     repeat: 1,
  //     yoyo: true,
  //     onComplete: () => {
  //       this.spriteImage.setTexture('dead')
  //     },
  //   })
  // }
}

export default Card;
