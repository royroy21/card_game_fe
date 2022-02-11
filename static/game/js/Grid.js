
export default class Grid {
  constructor(data) {
    let {scene, columns, rows} = data;
    this.xOffset = 120;
    this.yOffset = 280;
    this.yStart = scene.game.config.height / 2;
    this.columns = columns;
    this.rows = rows;
    this.scene = scene;
    this.cards = [];
  }
}