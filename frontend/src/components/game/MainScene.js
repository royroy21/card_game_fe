import Phaser from "phaser";
import CardBase from "./CardBase";
import cardTypes from "./cardTypes";
import getRandomNumber from "../utils/getRandomNumber";
import removeFromList from "../utils/removeFromList";
import {BASE_BACKEND_GAME_WEB_SOCKET_URL} from "../../settings";
import eventsCenter from "./EventsCenter";
import loadAssets from "./assetLoader";

const MESSAGE_TYPE_CONNECT_PLAYER = "connect_player";
const MESSAGE_TYPE_DISCONNECT_PLAYER = "disconnect_player";
const ERROR_GAME_IS_FULL = "game_full";

class MainScene extends Phaser.Scene {
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
    loadAssets(this);
    this.canvas = this.sys.game.canvas;
  }

  create() {
    let { width, height } = this.canvas;

    this.socket = new WebSocket(
      `${BASE_BACKEND_GAME_WEB_SOCKET_URL}${this.getGameID()}/`
    );

    // Sends message on connection
    const connectingMessage = {
      type: MESSAGE_TYPE_CONNECT_PLAYER,
      message: {
        origin: this.getPlayerID(),
        text: null,
        game: {
          gameID: this.getGameID(),
          player1: null,
          player2: null,
        }
      }
    };
    this.socket.addEventListener('open', (event) => {
      this.socket.send(JSON.stringify(connectingMessage));
    });

    eventsCenter.addListener("chat", (message) => {
      this.socket.send(JSON.stringify({
        type: "player_message",
        message: message,
      }));
    });

    this.events.on('destroy', () => {
      this.socket.close();
    });

    // Listen for messages
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      eventsCenter.emit("game", message);
      // TODO game full logic still not fully working ;/
      if (message.error === ERROR_GAME_IS_FULL) {
        localStorage.clear();
        this.sys.game.destroy(true);
      }
    });

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

  getGameID() {
    // If a player joins a game that game ID should be in local storage.
    // If no gameID exists a new one is created. This will create a game
    // for others to join.
    const gameID = localStorage.getItem("gameID");
    if (!gameID) {
      const newGameID = getRandomNumber(100000, 999999);
      localStorage.setItem("gameID", newGameID);
      return newGameID
    } else {
      return gameID
    }
  }

  getPlayerID() {
    const playerID = localStorage.getItem("playerID");
    if (!playerID) {
      const newPlayerID = `Anon${getRandomNumber(100000, 999999)}`
      localStorage.setItem("playerID", newPlayerID);
      return newPlayerID
    } else {
      return playerID
    }
  }

  createPlayerDropZones(width, height) {
    const sectionSize = width / this.numberOfZones;
    const centerOfSection = sectionSize / 2;

    for (let index = 0; index < this.numberOfZones; index++) {
      let dropzone = this.add.image(0, 0, "dropzone");
      dropzone.setScale(this.cardScale - 1);
      let dropZoneContainer = this.add.container(
        sectionSize * index + centerOfSection,
        height / 2 + dropzone.height / 5,
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
      let dropZoneContainer = this.add.container(
        sectionSize * index + centerOfSection,
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
        width / 2,
        height - playerHandDropZone.height / 2,
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

  dropOnPlayerHand(gameObject, dropZone) {
    // So to stop player dragging card onto
    // player hand that is already there.
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

export default MainScene;
