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
import CenterMessage from "./CenterMessage";
import EndTurnButton from "./EndTurnButton";
import ActionPoints from "./ActionPoints";

// Connecting messages
const MESSAGE_TYPE_CONNECT_PLAYER = "connect_player";
const MESSAGE_TYPE_PLAYER_CONNECTED = "player_connected";
// const MESSAGE_TYPE_DISCONNECT_PLAYER = "disconnect_player";
// const ERROR_GAME_IS_FULL = "game_full";

// Game messages
const MESSAGE_CHAT = "chat";
const MESSAGE_CREATE_ENEMY_DECK = "create_enemy_deck";
const MESSAGE_MOVED_CARD = "moved_card";
const MESSAGE_ENEMY_CARD_MOVED = "enemy_card_moved";
const MESSAGE_ENEMY_ENDED_TURN = "enemy_ended_turn";
const MESSAGE_END_TURN = "end_turn";

class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
    this.cardScale = 0.5;  // This is a base value and will be increased for larger screens.
    this.numberOfCards = 30;
    this.maxCardsInHand = 4;
    this.zones = ["1", "2", "3", "4", "5", "6"]; // Player/Enemy card zones.
    this.playerCards = []; // Array containing all player cards.
    this.playerDeck = [];
    this.playerHand = [];
    this.enemyCards = []; // Array containing all enemy cards.
    this.enemyDeck = [];
    this.enemyHand = [];
    this.containers = {};
    this.tintColour = 0x44ff44;
    this.hasCardFocus = false;

    this.gameInitated = false;
    this.isPlayerTurn = false;
    this.player = null;  // Stores if player1 or player2.
    this.playerID = null;
    this.playerCardsActivated = false;
    this.gameState = null;
    this.isConnected = false;

    this.cardMovementSpeed = 300;
    this.maxCardMovementTime = 1;

    this.turn = 1;
    this.maxActionPoints = 10;

    // Buttons and other containers stored here
    // to be destroyed if not player turn.
    this.playerActiveButtons = [];
    this.endTurnButton = null;
    this.actionPointsDisplay = null;
  }

  preload() {
    loadAssets(this);
    this.canvas = this.sys.game.canvas;
  }

  create() {
    const { width, height } = this.canvas;
    this.width = width;
    this.height = height;

    // Scale card size for larger screens
    const scaleMultiplier = (this.width - 1000) / 300;
    this.cardScale += parseFloat(scaleMultiplier.toFixed(0)) / 10;

    this.socket = new WebSocket(
      `${BASE_BACKEND_GAME_WEB_SOCKET_URL}${this.getGameID()}/${this.getPlayerID()}/`
    );

    // This may be overridden by existing deck if player is reconnecting.
    const playerDeck = this.createPlayerCardDeckData();

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
          cards: playerDeck.map(card => {
            return {
             ...card,
             x: convertPixelsToPercent(this.width, card.x),
             y: convertPixelsToPercent(this.height, card.y),
            }
          }),
          hand: [],
          "drop_zones": {
            "playerZone1": null,
            "playerZone2": null,
            "playerZone3": null,
            "playerZone4": null,
            "playerZone5": null,
            "playerZone6": null,
          },
        },
        game: {
          gameID: this.getGameID(),
          turn: null,
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
      this.processMessage(message);


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
    this.createEnemyHandDropZone();

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
    });

    this.input.on('drop', (pointer, gameObject, dropZone) => {
      if (dropZone.name === "playerHand") {
        this.dropOnPlayerHand(gameObject, dropZone);
      } else if (dropZone.name.startsWith("playerZone")) {
        this.dropOnPlayerZone(gameObject, dropZone);
      } else if (dropZone.name.startsWith("enemyZone")) {
        this.dropOnEnemyZone(gameObject, dropZone);
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

  processMessage(message) {
    console.log("message received: ", this.player, message);

    switch (message.type) {
      case MESSAGE_TYPE_PLAYER_CONNECTED:
        this.gameState = message.game;

        // If this.player or this.enemyCards is not set then this client
        // has freshly connected so needs to repopulate game state.
        // Note this.player can be set without this.enemyCards as player 1
        // will often connect without player 2 ready.
        if (!this.player || !this.enemyCards.length) {
          this.initiateGame(message);
        }
        eventsCenter.emit("game", message);
        if (!message.game[this.getEnemyPlayer()]) {
          eventsCenter.emit("game", {
            origin: {
                "name": "Server",
                "player": null
            },
            text: "Waiting for enemy to join ...",
          });
        } else {
          if (this.isPlayerTurn) {
            this.displayCenterMessage("You start");
          } else {
            this.displayCenterMessage("Enemy starts");
          }
        }
        break;
      case MESSAGE_CHAT:
        eventsCenter.emit("game", message);
        break;
      case MESSAGE_CREATE_ENEMY_DECK:
        this.gameState = message.game;
        if (!message.game[this.getEnemyPlayer()]) {
          break;
        }
        this.createEnemyDeck(message);
        this.enemyCards = this.enemyDeck.map(card => card);
        break;
      case MESSAGE_ENEMY_CARD_MOVED:
        this.gameState = message.game;
        this.updateEnemyFromGameState();
        break
      case MESSAGE_ENEMY_ENDED_TURN:
        this.gameState = message.game;
        this.turn = this.gameState[this.player].turn;
        this.isPlayerTurn = this.determineIsPlayerTurn();
        if (this.isPlayerTurn) {
          this.displayCenterMessage("Your turn");
        } else {
          this.displayCenterMessage("Enemy turn");
        }
        break
      }
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

  getEnemyPlayer() {
    return this.player === "player2" ? "player1" : "player2"
  }

  initiateGame(message) {
    // Update if this is player1 or player 2
    this.player = this.gameState.player1.name === this.playerID ? "player1" : "player2";
    // Create game state
    this.createPlayerCardDeck(message);
    this.populatePlayerHand(message);
    this.populatePlayerZones(message);
    this.populateEnemyHand(message);
    this.populateEnemyZones(message);
    this.createEnemyDeck(message);
    this.enemyCards = [
      ...this.enemyDeck,
      ...this.enemyHand,
      ...this.getActiveCardsFromDropZones("enemy"),
    ];
    this.playerCards = [
      ...this.playerDeck,
      ...this.playerHand,
      ...this.getActiveCardsFromDropZones("player"),
    ];
    this.gameInitated = true;
    this.deactivatePlayerCards();
    this.isPlayerTurn = this.determineIsPlayerTurn();
  }

  determineIsPlayerTurn() {
    return Boolean(this.player === this.gameState.playerTurn);
  }

  setToDraggable(gameObject) {
    gameObject.setInteractive({ useHandCursor: true });
    this.input.setDraggable(gameObject);

    gameObject.on("pointerup", () => {
      if (this.playerDeck.map(card => card.id).includes(gameObject.id)) {
        if (this.playerHand.length === this.maxCardsInHand) {
          eventsCenter.emit("game", {
            origin: {
                "name": "Warning",
                "player": null
            },
            text: "Your hand is full.",
          });
          return null;
        }
        this.dropOnPlayerHand(gameObject, this.containers["playerHand"]);
      }
    });

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
        this.setHandDepths(this.playerHand);
      }
    });
  }

  setToNotDraggable(gameObject) {
    gameObject.spriteCard.clearTint();
    gameObject.disableInteractive();
  }

  displayCenterMessage(message) {
    const centerMessage = new CenterMessage(this, message)
    centerMessage.setSize(centerMessage.textName.width, centerMessage.textName.height);
    centerMessage.setScale(this.cardScale);
    function destroyCenterMessage() {
      centerMessage.fadeThenDestroy();
      clearTimeout(myTimeout);
    }
    const myTimeout = setTimeout(destroyCenterMessage, 2000);
  }

  createPlayerCardDeckData() {
    // Currently, this is randomly generated and would
    // eventually need to come from another place

    const x = this.width / 6 * 5;
    const y = this.height / 2 + convertPercentToPixels(this.height, 35);
    const cardData = [];

    for (let index = 0; index < this.numberOfCards; index++) {
      const cardType = cardTypes[Math.floor(Math.random() * cardTypes.length)];
      let card = {
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
      }
      cardData.push(card);
    }
    return cardData;
  }

  createPlayerCardDeck(message) {
    const x = this.width / 6 * 5;
    const y = this.height / 2 + convertPercentToPixels(this.height, 35);
    this.playerDeck = message.game[this.player].deck.map(cardData => {
      return this.createCard({
        scene: this,
        ...cardData,
        x: x + getRandomNumber(-3, 3, 1),
        y: y + getRandomNumber(-3, 3, 1),
      })
    })
  }

  movingObjectsQueue = [];
  movingObject = null;
  destinationX = null;
  destinationY = null;

  moveTo(movingObject, destinationX, destinationY, maxTime=600) {
    if (this.movingObject) {
      this.movingObjectsQueue.push([movingObject, destinationX, destinationY, maxTime])
      return null;
    }

    this.movingObject = movingObject;
    this.children.bringToTop(this.movingObject);
    this.destinationX = destinationX;
    this.destinationY = destinationY;

    if (!this.movingObject.hasPhysics) {
      this.physics.world.enableBody(this.movingObject);
      this.movingObject.hasPhysics = true;
    }
    this.physics.moveTo(
      this.movingObject,
      this.destinationX,
      this.destinationY,
      this.cardMovementSpeed,
      maxTime,
    );
  }

  createPlayerDropZones() {
    const sectionSize = this.width / this.zones.length;
    const centerOfSection = sectionSize / 2;

    this.zones.forEach(zone => {
      let dropzone = this.add.image(0, 0, "dropzone");
      dropzone.setScale(this.cardScale - 0.25);
      let dropZoneContainer = this.add.container(
        sectionSize * (parseInt(zone) - 1) + centerOfSection,
        this.height / 2 + convertPercentToPixels(this.height, 12),
        [ dropzone ]
      );
      dropZoneContainer.setDepth(-5);
      dropZoneContainer.setSize(dropzone.width, dropzone.height);
      dropZoneContainer.setInteractive();
      dropZoneContainer.input.dropZone = true;
      dropZoneContainer.name = "playerZone" + zone;
      this.containers[dropZoneContainer.name] = dropZoneContainer;
    })

  }
  createEnemyDropZones() {
    // When first created enemy drop zones are not active.
    const sectionSize = this.width / this.zones.length;
    const centerOfSection = sectionSize / 2;

    this.zones.reverse().forEach(zone => {
      let dropzone = this.add.image(0, 0, "dropzone");
      dropzone.setScale(this.cardScale - 0.25);
      let dropZoneContainer = this.add.container(
        sectionSize * (Math.abs(parseInt(zone) - 6)) + centerOfSection,
        this.height / 2 - convertPercentToPixels(this.height, 12),
        [ dropzone ]
      );
      dropZoneContainer.setDepth(-5);
      dropZoneContainer.setSize(dropzone.width, dropzone.height);
      dropZoneContainer.name = "enemyZone" + zone;
      this.containers[dropZoneContainer.name] = dropZoneContainer;
    })
  }

  getActiveCardsFromDropZones(player) {
    // player is "player" or "enemy"
    return this.zones.map(zone => {
      const card = this.containers[player + "Zone" + zone];
      if (card.type !== "Container") {
        return card;
      }
    }).filter(card => card);
  }

  createEnemyDeck(message) {
    if (this.enemyDeck.length === 0 && message.game[this.getEnemyPlayer()] !== null) {
      this.enemyDeck = (
        message.game[this.getEnemyPlayer()].deck.map(card => this.createHiddenCard({
          scene: this,
          ...card,
          x: this.width - convertPercentToPixels(this.width, card.x),
          y: this.height - convertPercentToPixels(this.height, card.y),
        }))
      );
    }
  }

  informEnemyOfCardMoved(card) {
    const data = {
      type: MESSAGE_MOVED_CARD,
      message: {
        origin: {
          name: this.playerID,
          player: this.player,
        },
        text: null,
        data: {
          ...card.initialData,
          x: convertPixelsToPercent(this.width, card.x),
          y: convertPixelsToPercent(this.height, card.y),
        },
        game: this.gameState,
      }
    };
    this.socket.send(JSON.stringify(data));
  }

  populatePlayerHand(message) {
    if (message.game[this.player].hand.length === 0) {
      return
    }

    this.playerHand = [];
    const dropZone = this.containers["playerHand"];
    message.game[this.player].hand.forEach(data => {
      const card = this.createCard({
        scene: this,
        ...data,
        x: dropZone.x,
        y: dropZone.y,
      });
      this.playerHand.push(card);
      this.setToDraggable(card);
      this.resetPlayerHandPositions();
      dropZone.list[0].clearTint();
    })
  }

  populateEnemyHand(message) {
    if (!message.game[this.getEnemyPlayer()]) {
      return
    }
    if (this.enemyHand.length > 0) {
      return
    }

    this.enemyHand = [];
    const dropZone = this.containers["enemyHand"];
    message.game[this.getEnemyPlayer()].hand.forEach(data => {
      const card = this.createHiddenCard({
        scene: this,
        ...data,
        x: dropZone.x,
        y: dropZone.y,
      });
      this.enemyHand.push(card);
      this.resetEnemyHandPositions();
      dropZone.list[0].clearTint();
    })
  }

  populatePlayerZones(message) {
    const zones = [
      "playerZone1",
      "playerZone2",
      "playerZone3",
      "playerZone4",
      "playerZone5",
      "playerZone6",
    ]

    zones.forEach(dropZoneName => {
      const cardData = message.game[this.player].drop_zones[dropZoneName];
      if (cardData) {
        const dropZone = this.containers[dropZoneName];
        this.containers[dropZoneName] = this.createCard({
          scene: this,
          ...cardData,
          x: dropZone.x,
          y: dropZone.y,
        });
      }
    });
  }

  populateEnemyZones(message) {
    const enemyPlayer = message.game[this.getEnemyPlayer()];
    if (!enemyPlayer) {
      return
    }

    this.zones.forEach(zone => {
      const cardData = enemyPlayer.drop_zones["playerZone" + zone];
      if (cardData) {
        const dropZone = this.containers["enemyZone" + zone];
        this.containers["enemyZone" + zone] = this.createCard({
          scene: this,
          ...cardData,
          x: dropZone.x,
          y: dropZone.y,
        });
      }
    });
  }

  createCard(data) {
    const card = new Card(data);
    card.setSize(card.spriteCard.width, card.spriteCard.height);
    card.setScale(this.cardScale);
    return card;
  }

  createHiddenCard(data) {
    const card = new HiddenCard(data);
    card.setSize(card.spriteCard.width, card.spriteCard.height);
    card.setScale(this.cardScale);
    return card;
  }

  createPlayerHandDropZone() {
    let playerHandDropZone = this.add.image(0, 0, "playerHandDropZone");
    playerHandDropZone.setScale(this.cardScale);
    let dropZoneContainer = this.add.container(
      this.width / 2,
      this.height / 2 + convertPercentToPixels(this.height, 37),
      [ playerHandDropZone ]
    );
    dropZoneContainer.setDepth(-5);
    dropZoneContainer.setSize(playerHandDropZone.width, playerHandDropZone.height);
    dropZoneContainer.setScale(this.cardScale);
    dropZoneContainer.setInteractive();
    dropZoneContainer.input.dropZone = true;
    dropZoneContainer.name = "playerHand";
    this.containers[dropZoneContainer.name] = dropZoneContainer;
  }

  createEnemyHandDropZone() {
    let enemyHandDropZone = this.add.image(0, 0, "playerHandDropZone");
    enemyHandDropZone.setScale(this.cardScale);
    let dropZoneContainer = this.add.container(
      this.width / 2,
      this.height / 2 - convertPercentToPixels(this.height, 37),
      [ enemyHandDropZone ]
    );
    dropZoneContainer.setDepth(-5);
    dropZoneContainer.setSize(enemyHandDropZone.width, enemyHandDropZone.height);
    dropZoneContainer.setScale(this.cardScale);
    dropZoneContainer.setInteractive();
    dropZoneContainer.input.dropZone = true;
    dropZoneContainer.name = "enemyHand";
    this.containers[dropZoneContainer.name] = dropZoneContainer;
  }

  resetPlayerHandPositions() {
    const dropZone = this.containers["playerHand"];
    if (this.playerHand.length > 0) {
      let lastPosition = dropZone.x + dropZone.width / 4;
      for (let index = 0; index < this.playerHand.length; index++) {
        this.playerHand[index].x = lastPosition - 80;
        this.playerHand[index].y = dropZone.y;
        lastPosition = this.playerHand[index].x;
      }
      this.setHandDepths(this.playerHand);
    }
  }

  resetEnemyHandPositions() {
    const dropZone = this.containers["enemyHand"];
    if (this.enemyHand.length > 0) {
      let lastPosition = dropZone.x + dropZone.width / 4;
      for (let index = 0; index < this.enemyHand.length; index++) {
        this.enemyHand[index].x = lastPosition - 80;
        this.enemyHand[index].y = dropZone.y;
        lastPosition = this.enemyHand[index].x;
      }
      this.setHandDepths(this.enemyHand);
    }
  }

  setHandDepths(hand) {
    hand.forEach((card, index) => card.setDepth(index - 2));
  }

  getEnemyHandCoordinates(position, enemyHandLength) {
    const dropZone = this.containers["enemyHand"];
    if (enemyHandLength > 0) {
      let lastPosition = dropZone.x + dropZone.width / 4;
      for (let index = 0; index < enemyHandLength; index++) {
        if (position === index) {
          return {x: lastPosition - 80, y: dropZone.y}
        } else {
          lastPosition = lastPosition - 80;
        }
      }
    }
  }

  updateGameStateDeck(deck) {
    this.gameState[this.player].deck = deck.map(card => {
      return {
        ...card.initialData,
        x: convertPixelsToPercent(this.width, card.x),
        y: convertPixelsToPercent(this.height, card.y),
      }
    })
  };

  updateGameStateHand(hand) {
    this.gameState[this.player].hand = hand.map(card => {
      return {
        ...card.initialData,
        x: convertPixelsToPercent(this.width, card.x),
        y: convertPixelsToPercent(this.height, card.y),
      }
    })
  };

  updateGameStateZone(zone, card) {
    this.gameState[this.player]["drop_zones"][zone] = {
      ...card.initialData,
      x: convertPixelsToPercent(this.width, card.x),
      y: convertPixelsToPercent(this.height, card.y),
    }
  };

  updateEnemyFromGameState() {
    this.updateEnemyDeckFromGameState();
    this.updateEnemyHandFromGameState();
    this.updateEnemyZonesFromGameState();
  }

  updateEnemyDeckFromGameState() {
    const deckIds = this.gameState[this.getEnemyPlayer()].deck.map(card => card.id);
    this.enemyDeck = this.enemyCards.filter(card => deckIds.includes(card.id));
  }

  updateEnemyHandFromGameState() {
    const enemyHandFromGameState = this.gameState[this.getEnemyPlayer()].hand;

    // Move cards not already in hand.
    enemyHandFromGameState.forEach((cardData, index) => {
      if (!this.enemyHand.map(card => card.id).includes(cardData.id)) {
        const card = this.enemyCards.filter(card => card.id === cardData.id)[0];
        const coordinates = this.getEnemyHandCoordinates(index, enemyHandFromGameState.length);
        this.moveTo(card, coordinates.x, coordinates.y);
      }
    })

    // Set enemy hand array.
    this.enemyHand = this.enemyCards.filter(card => enemyHandFromGameState.map(card => card.id).includes(card.id));
  }

  updateEnemyZonesFromGameState() {
    this.zones.forEach(zone => {
      const cardData = this.gameState[this.getEnemyPlayer()]["drop_zones"]["playerZone" + zone];
      if (cardData) {
        const container = this.containers["enemyZone" + zone];

        // Card is already in correct place.
        if (container.id === cardData.id && !container.isHidden) {
          return
        }

        // Get original coordinates of object
        const originalCoordinates = this.enemyCards.filter(card => card.id === cardData.id)[0];

        // Remove card from enemy cards as
        // hidden card will be recreated as card.
        this.enemyCards = this.enemyCards.filter((card) => {
          if (card.id === cardData.id) {
            card.destroy()
          } else {
            return card;
          }
        })
        const dropZoneX = container.x;
        const dropZoneY = container.y;

        // TODO - not destroying container yet.. looks weird to do so :/
        // Destroy zone container here.
        // Will be replaced with card.
        // container.destroy();

        console.log("@XandY: ", originalCoordinates);

        const card = this.createCard({
          scene: this,
          ...cardData,
          x: originalCoordinates.x,
          y: originalCoordinates.y,
        });
        this.moveTo(card, dropZoneX, dropZoneY);

        this.enemyCards.push(card);
        this.containers["enemyZone" + zone] = card;

        // TODO - maybe only do this if we know
        //  for sure card has moved from hand?
        this.resetEnemyHandPositions();
      }
    })
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
    this.updateGameStateDeck(this.playerDeck);
    this.updateGameStateHand(this.playerHand);
    this.informEnemyOfCardMoved(gameObject);
  }

  dropOnPlayerZone(gameObject, dropZone) {

    console.log("@dropOnPlayerZone: ", gameObject, dropZone);

    const remainingActionPoints = parseInt(this.actionPointsDisplay.pointsRemaining) - parseInt(gameObject.initialData.cost);
    if (remainingActionPoints < 0) {
      eventsCenter.emit("game", {
        origin: {
            "name": "Warning",
            "player": null
        },
        text: "You do not have enough action points!",
      });
      this.moveTo(gameObject, gameObject.input.dragStartX, gameObject.input.dragStartY);
      return null;
    }
    this.actionPointsDisplay.setRemainingActionPoints(remainingActionPoints);

    this.playerHand = removeFromList(this.playerHand, gameObject);
    this.resetPlayerHandPositions();
    gameObject.x = dropZone.x;
    gameObject.y = dropZone.y;
    this.playerDeck = removeFromList(this.playerDeck, gameObject);
    if (this.playerDeck.length > 0) {
      this.setToDraggable(this.playerDeck[this.playerDeck.length - 1])
    }
    this.setToNotDraggable(gameObject);
    this.containers[dropZone.name] = gameObject;
    this.updateGameStateDeck(this.playerDeck);
    this.updateGameStateHand(this.playerHand);
    this.updateGameStateZone(dropZone.name, gameObject);
    this.informEnemyOfCardMoved(gameObject);
  }

  dropOnEnemyZone(gameObject, dropZone) {
    if (gameObject.type === "minion" && dropZone.type === "minion") {
      // TODO - Logic here!
      console.log(
        "card attack "
        + gameObject.cardAttack
        + " vs card defence "
        + dropZone.cardDefence
      );
    }
  }

  update(time, delta) {
    if (!this.gameInitated) {
      return null;
    }
    this.stopMovingObject();
    this.processMovingObjectsQueue();

    if (!this.isPlayerTurn && this.playerCardsActivated) {
      this.deactivatePlayerCards();
    }
    if (this.isPlayerTurn && !this.playerCardsActivated) {
      this.activatePlayerCards();
    }
  }

  activatePlayerCards() {
    // Activates first card on playerDeck and
    // all cards in hand and in player zones.
    // Makes enemy cards drop zones if in play.

    this.playerDeck.map(card => card.spriteCard.clearTint());
    const topCardOnDeck = this.playerDeck[this.playerDeck.length - 1];
    this.setToDraggable(topCardOnDeck);
    topCardOnDeck.spriteCard.clearTint();
    this.playerHand.map(card => {
      this.setToDraggable(card);
      card.spriteCard.clearTint();
    });
    this.zones.forEach(zone => {
      const cardData = this.gameState[this.player].drop_zones["playerZone" + zone];
      if (cardData) {
        const card = this.containers["playerZone" + zone];
        this.setToDraggable(card);
        card.spriteCard.clearTint();
      }
    });
    this.zones.forEach(zone => {
      const cardData = this.gameState[this.getEnemyPlayer()].drop_zones["playerZone" + zone];
      if (cardData) {
        console.log("activating 1:", cardData);
        const card = this.containers["enemyZone" + zone];
        card.name = "enemyZone" + zone;
        card.setInteractive();
        card.input.dropZone = true;
      }
    });
    this.playerCardsActivated = true;
    this.endTurnButton = this.displayEndTurnButton();
    this.actionPointsDisplay = this.displayActionPoints();
    this.playerActiveButtons = [
      this.endTurnButton,
      this.actionPointsDisplay,
    ];
  }

  deactivatePlayerCards() {
    this.playerCards.forEach(card => {
      this.setToNotDraggable(card)
      card.spriteCard.setTint("0xccccc");
    });
    this.playerCardsActivated = false;
    this.playerActiveButtons.forEach(button => button.destroy())
    this.playerActiveButtons = [];
    this.endTurnButton = null;
    this.actionPointsDisplay = null;
  }

  displayEndTurnButton() {
    const button = new EndTurnButton(this)
    button.setSize(button.textName.width, button.textName.height);
    button.setScale(this.cardScale);
    return button;
  }

  displayActionPoints() {
    const actionPoints = (this.turn > this.maxActionPoints) ? 10 : this.turn;
    const button = new ActionPoints(this, actionPoints)
    button.setSize(button.textName.width, button.textName.height);
    button.setScale(this.cardScale);
    return button;
  }

  endTurn() {
    this.socket.send(JSON.stringify({
      type: MESSAGE_END_TURN,
      message: {
        origin: {
          name: this.playerID,
          player: this.player,
        },
        game: {
          ...this.gameState,
          [this.player]: {
            ...this.gameState[this.player],
            turn: this.turn + 1,
          }
        },
      }
    }));
  }

  stopMovingObject() {
    if (!this.movingObject) {
      return null;
    }
    const distance = Phaser.Math.Distance.Between(
      this.movingObject.x,
      this.movingObject.y,
      this.destinationX,
      this.destinationY,
    );
    if (distance < 5) {
      this.movingObject.body.reset(this.destinationX, this.destinationY);
      this.movingObject = null;
      this.destinationX = null;
      this.destinationY = null;
    }
  }

  processMovingObjectsQueue() {
    if (this.movingObjectsQueue.length > 0 && !this.movingObject) {
      this.moveTo(...this.movingObjectsQueue.pop());
    }
  }
}

export default MainScene;
