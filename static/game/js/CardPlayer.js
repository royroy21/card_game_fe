import CardDraggable from "./CardDraggable.js";


export default class CardPlayer extends CardDraggable {
  constructor(data) {
    let {health} = data;
    super(data);
    this.textHealth = new Phaser.GameObjects.BitmapText(this.scene, 0, -102, 'pressstart', health);
    this.textMaxHealth = new Phaser.GameObjects.BitmapText(this.scene, -20, -90, 'pressstart', health, 12);
    this.textArmour = new Phaser.GameObjects.BitmapText(this.scene, 0, -102, 'pressstart', 0);
    this.spriteArmour = new Phaser.GameObjects.Sprite(this.scene, 50, -80, 'armour')
    this.textHealth.tint = 0;
    this.textMaxHealth.tint = 0;

    this.add([
      this.textHealth,
      this.textMaxHealth,
      this.spriteArmour,
      this.textArmour,
    ])

    this.health = health;
    this.maxHealth = health;
    this.armour = 0;
  }

  set health(newHealth) {
    this._health = newHealth;
    this.textHealth.text = this._health;
    this.textHealth.x = -44 - this.textHealth.width / 2;
  }

  get health() {
    return this._health;
  }

  set maxHealth(newMaxHealth) {
    this._maxHealth = newMaxHealth;
  }

  get maxHealth() {
    return this._maxHealth;
  }

  set armour(newArmour) {
    this._armour = newArmour;
    this.textArmour.text = this._armour;
    this.textArmour.x = 46 - this.textArmour.width / 2;
    this.textArmour.x = 46 - this.textArmour.width / 2;

    // This make armour text and sprite invisible if 0
    this.textArmour.alpha = this._armour === 0 ? 0 : 1;
    this.spriteArmour.alpha = this._armour === 0 ? 0 : 1;
  }

  get armour() {
    return this._armour;
  }

  attack(attackValue) {
    if (attackValue <= this.armour ) {
      this.armour = this.armour - attackValue;
    } else {
      this.health = this.health - (attackValue - this.armour);
      this.armour = 0;
    }
    if (this.health <= 0) this.dead = true;
  }

  set dead(dead) {
    this.health = '0';
    this.cardName = 'DEAD';
    this.draggable = false;
    this.deadAnimation();
  }

  get dead() {
    return this._cardName === 'DEAD';
  }
}
