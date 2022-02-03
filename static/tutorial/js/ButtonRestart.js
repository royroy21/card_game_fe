export function AddButtonRestart(scene) {
  const restartbutton = scene.add.image(
    scene.game.config.width / 2,
    scene.game.config.height / 2,
    'restartbutton',
  );
  restartbutton.depth = 2;
  restartbutton.setInteractive();
  restartbutton.on('pointerover', () => restartbutton.tint = 0xccccc);
  restartbutton.on('pointerout', () => restartbutton.tint = 0xfffff);
  restartbutton.on('pointerdown', () => {
    restartbutton.tint = 0xccccc;
    scene.scene.restart();
  });
}
