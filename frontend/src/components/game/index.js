import React from "react";
import Phaser from "phaser";
import MainScene from "./MainScene";

export default class Game extends React.Component {
  componentDidMount() {
    // Stops right click menus
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    const config = {
      type: Phaser.AUTO,
      parent: "phaserGame",
      width: "80%",
      height: "100%",
      scene: [MainScene],
      backgroundColor: "#575757",
    }
    this.game = new Phaser.Game(config)
  }

  componentWillUnmount() {
    this.game.destroy();
    this.game = null;
  }

  shouldComponentUpdate() {
    // Important as this stop React re-rendering the game component
    return false
  }

  render() {
    return <div style={{height: "100%"}} id="phaserGame" />
  }
}
