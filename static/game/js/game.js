import MainScene from './MainScene.js';

const config = {
  type: Phaser.AUTO,
  parent: "phaserGame",
  // width: "100%",
  height: "100%",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MainScene],
  backgroundColor: "#575757",
};

new Phaser.Game(config);
