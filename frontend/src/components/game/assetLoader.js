// Loads assets for a scene

const loadAssets = (scene) => {
    // Images
    scene.load.image(
      'card',
      'assets/card2.png',
    );
    scene.load.image(
      'armour',
      'assets/armour.png',
    );
    scene.load.image(
      'card',
      'assets/card.png',
    );
    scene.load.image(
      'dead',
      'assets/dead.png',
    );
    scene.load.image(
      'deathknight',
      'assets/deathknight.png',
    );
    scene.load.image(
      'firedrake',
      'assets/firedrake.png',
    );
    scene.load.image(
      'goldendragon',
      'assets/goldendragon.png',
    );
    scene.load.image(
      'healingpotion',
      'assets/healingpotion.png',
    );
    scene.load.image(
      'kobold',
      'assets/kobold.png',
    );
    scene.load.image(
      'ogre',
      'assets/ogre.png',
    );
    scene.load.image(
      'paladin',
      'assets/paladin.png',
    );
    scene.load.image(
      'playercard',
      'assets/playercard.png',
    );
    scene.load.image(
      'restartbutton',
      'assets/restartbutton.png',
    );
    scene.load.image(
      'shield',
      'assets/shield.png',
    );
    scene.load.image(
      'troll',
      'assets/troll.png',
    );
    scene.load.image(
      'dropzone',
      'assets/dropzone2.png',
    );
    scene.load.image(
      'playerHandDropZone',
      'assets/playerHandDropZone.png',
    );

    // Fonts
    scene.load.bitmapFont(
      'pressstart',
      'assets/pressstart.png',
      'assets/pressstart.fnt',
    )
}

export default loadAssets;
