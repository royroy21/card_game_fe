import CardBase from "./CardBase.js";
import cardTypes from "./cardTypes.js";
import {getRandomNumber, removeFromList} from "./utils.js";


export default class MainScene extends Phaser.Scene {
  constructor( ) {
    super('MainScene');
    this.cardScale = 0.7;
    this.numberOfCards = 30;
    this.numberOfZones = 6;
    this.playerDeck = [];
    this.playerHand = [];
    this.containers = {};
    this.tintColour = 0x44ff44;
    this.hasCardFocus = false;
  }

  preload() {
    this.load.image(
      'card',
      '../../static/tutorial/assets/card2.png',
    );
    this.load.image(
      'armour',
      '../../static/tutorial/assets/armour.png',
    );
    this.load.image(
      'card',
      '../../static/tutorial/assets/card.png',
    );
    this.load.image(
      'dead',
      '../../static/tutorial/assets/dead.png',
    );
    this.load.image(
      'deathknight',
      '../../static/tutorial/assets/deathknight.png',
    );
    this.load.image(
      'firedrake',
      '../../static/tutorial/assets/firedrake.png',
    );
    this.load.image(
      'goldendragon',
      '../../static/tutorial/assets/goldendragon.png',
    );
    this.load.image(
      'healingpotion',
      '../../static/tutorial/assets/healingpotion.png',
    );
    this.load.image(
      'kobold',
      '../../static/tutorial/assets/kobold.png',
    );
    this.load.image(
      'ogre',
      '../../static/tutorial/assets/ogre.png',
    );
    this.load.image(
      'paladin',
      '../../static/tutorial/assets/paladin.png',
    );
    this.load.image(
      'playercard',
      '../../static/tutorial/assets/playercard.png',
    );
    this.load.image(
      'restartbutton',
      '../../static/tutorial/assets/restartbutton.png',
    );
    this.load.image(
      'shield',
      '../../static/tutorial/assets/shield.png',
    );
    this.load.image(
      'troll',
      '../../static/tutorial/assets/troll.png',
    );
    this.load.bitmapFont(
      'pressstart',
      '../../static/tutorial/assets/pressstart.png',
      '../../static/tutorial/assets/pressstart.fnt',
    )
    this.load.image(
      'dropzone',
      '../../static/tutorial/assets/dropzone2.png',
    );
    this.load.image(
      'playerHandDropZone',
      '../../static/tutorial/assets/playerHandDropZone.png',
    );
    this.canvas = this.sys.game.canvas;
  }

  createPlayerDropZones(width, height) {
    const sectionSize = width / this.numberOfZones;
    const centerOfSection = sectionSize / 2;

    for (let index = 0; index < this.numberOfZones; index++) {
      let dropzone = this.add.image(0, 0, "dropzone");
      dropzone.setScale(this.cardScale - 1);
      console.log("dropzone.height: ", dropzone.height);
      let dropZoneContainer = this.add.container(
        sectionSize * index + centerOfSection,  // X
        height / 2 + dropzone.height / 5,  // Y
        [ dropzone ]
      );
      dropZoneContainer.setSize(dropzone.width, dropzone.height);
      dropZoneContainer.setInteractive();
      dropZoneContainer.input.dropZone = true;
      dropZoneContainer.name = "playerCard" + index;
      this.containers[dropZoneContainer.name] = dropZoneContainer;
    }
  }

  createEnemyDropZones(width, height) {
    // When first created enemy drop zones are not active.
    const sectionSize = width / this.numberOfZones;
    const centerOfSection = sectionSize / 2;

    for (let index = 0; index < this.numberOfZones; index++) {
      let dropzone = this.add.image(0, 0, "dropzone");
      dropzone.setScale(this.cardScale - 1);
      console.log("dropzone.height: ", dropzone.height);
      let dropZoneContainer = this.add.container(
        sectionSize * index + centerOfSection,  // X
        height / 2 - 150,
        [ dropzone ]
      );
      dropZoneContainer.setSize(dropzone.width, dropzone.height);
      dropZoneContainer.name = "enemyCard" + index;
      this.containers[dropZoneContainer.name] = dropZoneContainer;
    }
  }

  setToDraggable(gameObject) {
    gameObject.setInteractive({ useHandCursor: true });
    this.input.setDraggable(gameObject);

    gameObject.on('pointerover', () => {
      if (this.hasCardFocus) {
        return
      }
      gameObject.spriteCard.setTint(this.tintColour);
    });

    gameObject.on('pointerout', () => {
      if (this.hasCardFocus) {
        return
      }
      gameObject.spriteCard.clearTint();
      if (this.playerHand.includes(gameObject)) {
        this.setPlayerHandDepths();
      }
    });
  }

  setToNotDraggable(gameObject) {
    gameObject.spriteCard.clearTint();
    gameObject.disableInteractive();
  }

  createCardDeck(width, height) {
    let x = width / 6 * 5;
    let y = height / 6 * 5;

    for (let index = 0; index < this.numberOfCards; index++) {
      const cardType = cardTypes[Math.floor(Math.random() * cardTypes.length)];
      let card = new CardBase({
        scene: this,
        name: cardType.name,
        x: x,
        y: y,
        card: "card",
        image: cardType.image,
        type: cardType.type,
        attack: cardType.attack,
        defence: cardType.defence,
        cost: cardType.cost,
        depth: 0
      });
      card.setSize(card.spriteCard.width, card.spriteCard.height);
      card.setScale(this.cardScale);

      if (index === this.numberOfCards - 1) {
        this.setToDraggable(card);
      }
      x += getRandomNumber(-3, 3, 1);
      y += getRandomNumber(-3, 3, 1);

      this.playerDeck.push(card);
    }
  }

  createPlayerHandDropZone(width, height) {
      let playerHandDropZone = this.add.image(0, 0, "playerHandDropZone");
      playerHandDropZone.setScale(this.cardScale);
      let dropZoneContainer = this.add.container(
        width / 2,  // X
        height - playerHandDropZone.height / 2,  // Y
        [ playerHandDropZone ]
      );
      dropZoneContainer.setSize(playerHandDropZone.width, playerHandDropZone.height);
      dropZoneContainer.setScale(this.cardScale);
      dropZoneContainer.setInteractive();
      dropZoneContainer.input.dropZone = true;
      dropZoneContainer.name = "playerHand";
      this.containers[dropZoneContainer.name] = dropZoneContainer;
  }

  resetPlayerHandPositions() {
    const dropZone = this.containers["playerHand"];
    if (this.playerHand.length > 0) {
      let lastPosition = dropZone.x + dropZone.width / 4;
      for (let index = 0; index < this.playerHand.length; index++) {
        this.playerHand[index].x = lastPosition - 80;
        lastPosition = this.playerHand[index].x;
      }
      this.setPlayerHandDepths();
    }
  }

  setPlayerHandDepths() {
    this.playerHand.forEach((card, index) => card.setDepth(index));
  }

  create() {
    let { width, height } = this.canvas;
    this.createEnemyDropZones(width, height);
    this.createPlayerDropZones(width, height);
    this.createCardDeck(width, height);
    this.createPlayerHandDropZone(width, height);

    this.input.on('dragstart', (pointer, gameObject) => {
      if (this.hasCardFocus) {
        return
      }
      this.hasCardFocus = true;
      this.children.bringToTop(gameObject);
    }, this);

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      gameObject.x = dragX;
      gameObject.y = dragY;
      gameObject.rotation = 0;
      gameObject.setScale(this.cardScale);
    });

    this.input.on('dragenter', (pointer, gameObject, dropZone) => {
      if (this.hasCardFocus) {
        return
      }
      dropZone.list[0].setTint(this.tintColour);
    });

    this.input.on('dragleave', (pointer, gameObject, dropZone) => {
      if (this.hasCardFocus) {
        return
      }
      dropZone.list[0].clearTint();
    });

    this.input.on('drop', (pointer, gameObject, dropZone) => {
      if (dropZone.name === "playerHand") {
        this.dropOnPlayerHand(gameObject, dropZone);
      } else if (dropZone.name.startsWith("playerCard")) {
        this.dropOnPlayerCard(gameObject, dropZone);
      }
    });

    this.input.on('dragend', (pointer, gameObject, dropped) => {
      if (!dropped) {
        gameObject.x = gameObject.input.dragStartX;
        gameObject.y = gameObject.input.dragStartY;
      }
      this.hasCardFocus = false;
    });
  }

  dropOnPlayerHand(gameObject, dropZone) {
    // So to stop player dragging card onto player hand that is already there.
    if (this.playerHand.includes(gameObject)) {
      gameObject.x = gameObject.input.dragStartX;
      gameObject.y = gameObject.input.dragStartY;
      dropZone.list[0].clearTint();
      return;
    }
    gameObject.x = dropZone.x;
    gameObject.y = dropZone.y;
    this.playerDeck = removeFromList(this.playerDeck, gameObject);
    this.playerHand.push(gameObject);
    if (this.playerDeck.length > 0) {
      this.setToDraggable(this.playerDeck[this.playerDeck.length - 1])
    }
    this.resetPlayerHandPositions();
    dropZone.list[0].clearTint();
  }

  dropOnPlayerCard(gameObject, dropZone) {
    this.playerHand = removeFromList(this.playerHand, gameObject);
    this.resetPlayerHandPositions();
    gameObject.x = dropZone.x;
    gameObject.y = dropZone.y;
    this.playerDeck = removeFromList(this.playerDeck, gameObject);
    if (this.playerDeck.length > 0) {
      this.setToDraggable(this.playerDeck[this.playerDeck.length - 1])
    }
    this.setToNotDraggable(gameObject);
    this.containers[dropZone.name].disableInteractive()
  }

  update(time, delta) {
  }
}
