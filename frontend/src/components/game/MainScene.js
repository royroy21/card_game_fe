import Phaser from "phaser";
import Card from "./Card";
import cardTypes from "./cardTypes";
import getRandomNumber from "../utils/getRandomNumber";
import removeFromList from "../utils/removeFromList";
import {BASE_BACKEND_GAME_WEB_SOCKET_URL} from "../../settings";
import eventsCenter from "./EventsCenter";
import loadAssets from "./assetLoader";
import HiddenCard from "./HiddenCard";
import {convertPercentToPixels, convertPixelsToPercent} from "../utils/percent";

// Connecting messages
const MESSAGE_TYPE_CONNECT_PLAYER = "connect_player";
const MESSAGE_TYPE_PLAYER_CONNECTED = "player_connected";
// const MESSAGE_TYPE_DISCONNECT_PLAYER = "disconnect_player";
// const ERROR_GAME_IS_FULL = "game_full";

// Game messages
const MESSAGE_CHAT = "chat";
const MESSAGE_OTHER_PLAYER_UPDATED_DECK = "other_player_updated_deck";
const MESSAGE_UPDATE_DECK = "update_deck";
const MESSAGE_UPDATE_HAND = "update_hand";
const MESSAGE_MOVE_CARD = "move_card";
const MESSAGE_OTHER_PLAYER_CARD_MOVED = "other_player_card_moved";

class MainScene extends Phaser.Scene {
  constructor( ) {
    super('MainScene');
    this.cardScale = 0.5;  // This is a base value and will be increased for larger screens.
    this.numberOfCards = 30;
    this.numberOfZones = 6;
    this.playerDeck = [];
    this.playerHand = [];
    this.otherPlayerCardYOffSet = 600;
    this.otherPlayerDeck = [];
    this.otherPlayerHand = [];
    this.containers = {};
    this.tintColour = 0x44ff44;
    this.hasCardFocus = false;

    this.player = null;  // stores if player1 or player2
    this.playerID = null;
    this.game = null;
    this.isConnected = false;

    this.frameCount = 0;
    this.informOtherPlayerOfCardMoveCount = null;
  }

  preload() {
    loadAssets(this);
    this.canvas = this.sys.game.canvas;
  }

  getOtherPlayer() {
    return this.player === "player2" ? "player1" : "player2"
  }

  create() {
    const { width, height } = this.canvas;
    this.width = width;
    this.height = height;

    // Scale card size for larger screens
    const scaleMultiplier = (this.width - 1000) / 300;
    this.cardScale += parseFloat(scaleMultiplier.toFixed(0)) / 10;

    this.socket = new WebSocket(
      `${BASE_BACKEND_GAME_WEB_SOCKET_URL}${this.getGameID()}/`
    );

    this.playerDeck = this.createPlayerCardDeck();
    this.playerID = this.getPlayerID();

    // Sends message on connection.
    const connectingMessage = {
      type: MESSAGE_TYPE_CONNECT_PLAYER,
      message: {
        origin: {
          name: this.playerID,
          player: this.player,
        },
        text: null,
        data: {
          cards: this.playerDeck.map(card => {
            return {
             ...card.initialData,
             x: convertPixelsToPercent(this.width, card.x),
             y: convertPixelsToPercent(this.height, card.y),
            }
          })
        },
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
        type: MESSAGE_CHAT,
        message: message,
      }));
    });

    this.events.on('destroy', () => {
      this.socket.close();
    });

    // Listen for messages
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      switch (message.type) {
        case MESSAGE_TYPE_PLAYER_CONNECTED:
          // Add updated game object
          this.game = message.game;
          // Update if this is player1 or player 2
          this.player = this.game.player1.name === this.playerID ? "player1" : "player2";
          this.createEnemyPlayerDeck(message);
          eventsCenter.emit("game", message);
          break;
        case MESSAGE_CHAT:
          eventsCenter.emit("game", message);
          break;
        case MESSAGE_OTHER_PLAYER_UPDATED_DECK:
          if (!message.game[this.getOtherPlayer()]) {
            break;
          }
          const created = this.createEnemyPlayerDeck(message);
          if (created) {
            break;
          }
          break;
          // const otherPlayerUpdatedCardIds = (
          //   message.game[this.getOtherPlayer()].deck.map(card => card.id)
          // )
          // this.otherPlayerDeck = this.otherPlayerDeck.filter(
          //   card => otherPlayerUpdatedCardIds.includes(card.id)
          // )
        case MESSAGE_OTHER_PLAYER_CARD_MOVED:
          const updateDatedCardData = message["data"]["card"]
          this.otherPlayerDeck = this.otherPlayerDeck.map(card => {
            if (card.id === updateDatedCardData.id) {
              card.x = this.width - convertPercentToPixels(this.width, updateDatedCardData.x);
              card.y = this.height - convertPercentToPixels(this.height, updateDatedCardData.y);
              this.children.bringToTop(card);
            }
            return card;
          })
          break;
      }

      // TODO game full logic still not fully working ;/
      // TODO this should go into this.socket.addEventListener('error',
      // if (message.error === ERROR_GAME_IS_FULL) {
      //   localStorage.clear();
      //   this.sys.game.destroy(true);
      // }
    });

    this.createEnemyDropZones();
    this.createPlayerDropZones();
    this.createPlayerHandDropZone();

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
      // gameObject.setScale(this.cardScale);
      this.informOtherPlayerOfCardMove(gameObject);
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
        this.informOtherPlayerOfCardMove(gameObject, true);
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

  createPlayerDropZones() {
    const sectionSize = this.width / this.numberOfZones;
    const centerOfSection = sectionSize / 2;

    for (let index = 0; index < this.numberOfZones; index++) {
      let dropzone = this.add.image(0, 0, "dropzone");
      dropzone.setScale(this.cardScale - 0.25);
      let dropZoneContainer = this.add.container(
        sectionSize * index + centerOfSection,
        this.height / 2 + convertPercentToPixels(this.height, 12),
        [ dropzone ]
      );
      dropZoneContainer.setSize(dropzone.width, dropzone.height);
      dropZoneContainer.setInteractive();
      dropZoneContainer.input.dropZone = true;
      dropZoneContainer.name = "playerCard" + index;
      this.containers[dropZoneContainer.name] = dropZoneContainer;
    }
  }

  createEnemyDropZones() {
    // When first created enemy drop zones are not active.
    const sectionSize = this.width / this.numberOfZones;
    const centerOfSection = sectionSize / 2;

    for (let index = 0; index < this.numberOfZones; index++) {
      let dropzone = this.add.image(0, 0, "dropzone");
      dropzone.setScale(this.cardScale - 0.25);
      let dropZoneContainer = this.add.container(
        sectionSize * index + centerOfSection,
        this.height / 2 - convertPercentToPixels(this.height, 12),
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

  createEnemyPlayerDeck(message) {
    if (this.otherPlayerDeck.length === 0 && message.game[this.getOtherPlayer()] !== null) {
      this.otherPlayerDeck = (
        message.game[this.getOtherPlayer()].deck.map(card => this.createEnemyCard({
          scene: this, ...card,
        }))
      );
      return true;
    } else {
      return false;
    }
  }

  updatePlayerCards(cards, type) {
    // type is MESSAGE_UPDATE_DECK or MESSAGE_UPDATE_HAND
    const data = {
      type,
      message: {
        origin: {
          name: this.playerID,
          player: this.player,
        },
        text: null,
        data: {
          cards: cards.map(card => card.initialData)
        },
        game: this.game,
      }
    };
    this.socket.send(JSON.stringify(data));
  }

  cardMoveUpdateRate = 60;

  informOtherPlayerOfCardMove(card, forceUpdate=false) {
    // Only perform this action every x frames
    if (!forceUpdate) {
      if (!this.informOtherPlayerOfCardMoveCount) {
        this.informOtherPlayerOfCardMoveCount = this.frameCount;
      }
      if (
        this.frameCount
        - this.informOtherPlayerOfCardMoveCount
        > this.cardMoveUpdateRate
      ) {
        return
      }
    }

    const data = {
      type: MESSAGE_MOVE_CARD,
      message: {
        origin: {
          name: this.playerID,
          player: this.player,
        },
        text: null,
        data: {
          card: {
            ...card.initialData,
            x: convertPixelsToPercent(this.width, card.x),
            y: convertPixelsToPercent(this.height, card.y),
          },
        },
        game: this.game,
      }
    };
    this.socket.send(JSON.stringify(data));
    this.informOtherPlayerOfCardMoveCount = null;
  }

  setToNotDraggable(gameObject) {
    gameObject.spriteCard.clearTint();
    gameObject.disableInteractive();
  }

  createPlayerCardDeck() {
    const x = this.width / 6 * 5
    const y = this.height / 6 * 5
    const cards = [];

    for (let index = 0; index < this.numberOfCards; index++) {
      const cardType = cardTypes[Math.floor(Math.random() * cardTypes.length)];
      let card = this.createCard({
        scene: this,
        id: getRandomNumber(100000, 9999999),
        name: cardType.name,
        x: x + getRandomNumber(-3, 3, 1),
        y: y + getRandomNumber(-3, 3, 1),
        card: "card",
        image: cardType.image,
        type: cardType.type,
        attack: cardType.attack,
        defence: cardType.defence,
        cost: cardType.cost,
        depth: 0,
      })

      if (index === this.numberOfCards - 1) {
        this.setToDraggable(card);
      }
      cards.push(card);
    }
    return cards;
  }

  createCard(data) {
    const card = new Card(data);
    card.setSize(card.spriteCard.width, card.spriteCard.height);
    card.setScale(this.cardScale);
    return card;
  }

  createEnemyCard(data) {
    const card = new HiddenCard({
      ...data,
      x: this.width - convertPercentToPixels(this.width, data.x),
      y: this.height - convertPercentToPixels(this.height, data.y),
    });
    card.setSize(card.spriteCard.width, card.spriteCard.height);
    card.setScale(this.cardScale);
    return card;
  }

  createPlayerHandDropZone() {
      let playerHandDropZone = this.add.image(0, 0, "playerHandDropZone");
      playerHandDropZone.setScale(this.cardScale);
      let dropZoneContainer = this.add.container(
        this.width / 2,
        this.height - playerHandDropZone.height / 2,
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
    this.updatePlayerCards(this.playerDeck, MESSAGE_UPDATE_DECK);
    this.informOtherPlayerOfCardMove(gameObject, true);
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
    this.updatePlayerCards(this.playerDeck, MESSAGE_UPDATE_HAND);
    this.informOtherPlayerOfCardMove(gameObject, true);
  }

  update(time, delta) {
    this.frameCount += 1;
  }
}

export default MainScene;
