import CardPlayer from "./CardPlayer.js"
import Grid from "./Grid.js";
import {AddButtonRestart} from "./ButtonRestart.js";

export default class MainScene extends Phaser.Scene {
  constructor( ) {
    super('MainScene');
  }

  preload() {
    this.load.image(
      'card',
      '../../static/game/assets/card.png',
    );
    this.load.image(
      'armour',
      '../../static/game/assets/armour.png',
    );
    this.load.image(
      'card',
      '../../static/game/assets/card.png',
    );
    this.load.image(
      'dead',
      '../../static/game/assets/dead.png',
    );
    this.load.image(
      'deathknight',
      '../../static/game/assets/deathknight.png',
    );
    this.load.image(
      'firedrake',
      '../../static/game/assets/firedrake.png',
    );
    this.load.image(
      'goldendragon',
      '../../static/game/assets/goldendragon.png',
    );
    this.load.image(
      'healingpotion',
      '../../static/game/assets/healingpotion.png',
    );
    this.load.image(
      'kobold',
      '../../static/game/assets/kobold.png',
    );
    this.load.image(
      'ogre',
      '../../static/game/assets/ogre.png',
    );
    this.load.image(
      'paladin',
      '../../static/game/assets/paladin.png',
    );
    this.load.image(
      'playercard',
      '../../static/game/assets/playercard.png',
    );
    this.load.image(
      'restartbutton',
      '../../static/game/assets/restartbutton.png',
    );
    this.load.image(
      'shield',
      '../../static/game/assets/shield.png',
    );
    this.load.image(
      'troll',
      '../../static/game/assets/troll.png',
    );
    this.load.bitmapFont(
      'pressstart',
      '../../static/game/assets/pressstart.png',
      '../../static/game/assets/pressstart.fnt',
    )
  }

  create() {
    this.grid = new Grid({
      scene: this,
      columns: 3,
      rows: 3,
    })

    this.player = new CardPlayer({
      scene: this,
      name: 'Paladin',
      x: this.game.config.width / 2,
      y: this.game.config.height - 200,
      card: 'playercard',
      image: 'paladin',
      health: 16,
      depth: 1,
      ondragend: (pointer, gameObject) => {
        this.player.x = this.player.originalX;
        this.player.y = this.player.originalY;
        if (this.highlighted) {
          this.player.originalX = this.player.x = this.highlighted.x;
          this.highlighted.selected = true;
          switch (this.highlighted.cardtype) {
            case 'attack':
              this.player.attack(this.highlighted.value);
              // In this game the monster is always killed when attacked.
              // This could result in both the monster and player dying at
              // the same time.
              this.highlighted.dead = true;
              this.highlighted.deadAnimation();
              break;
            case 'heal':
              // Math.min accepts two values and returns the lowest.
              // Using this here ensures the player's health is never
              // higher than it's maxHealth value.
              this.player.health = Math.min(
                this.player.health + this.highlighted.value,
                this.player.maxHealth,
              )
              break;
            case 'armour':
              // Armour replaces the player armour value as it is a
              // shield. This means it is possible a player can pick
              // up a weaker shield.
              this.player.armour = this.player.armour + this.highlighted.value;
              break;
          }
          if (this.player.dead) {
            AddButtonRestart(this);
          } else {
            this.grid.fadeFrontRow();
          }
        }
      },
    })
  }

  update(time, delta) {
    // This seems like a hacky way of getting which card the player
    // card is hovering over. It does this by dividing the game board
    // into 3 columns then detects which column the player card is in.
    this.grid.cards[0].highlighted = false;
    this.grid.cards[1].highlighted = false;
    this.grid.cards[2].highlighted = false;
    this.highlighted = null;
    let columnWidth = this.game.config.width / this.grid.columns;
    let xDiff = Math.abs(this.player.x - this.player.originalX);
    // Do not let player select card this is 2 columns away.
    if (this.player.y < 700 && xDiff < columnWidth * 1.4) {
      if (this.player.x < columnWidth) {
        // Selects first card from the left.
        this.grid.cards[0].highlighted = true;
        this.highlighted = this.grid.cards[0];
      } else if (this.player.x > columnWidth * 2) {
        // Selects last card from the left.
        this.grid.cards[2].highlighted = true;
        this.highlighted = this.grid.cards[2];
      } else {
        // Selects center card.
        this.grid.cards[1].highlighted = true;
        this.highlighted = this.grid.cards[1];
      }
    }
  }
}
