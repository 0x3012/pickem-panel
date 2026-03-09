import Phaser from 'phaser';
import PickOneScene from './pick-one.scene';

export function createPickOneGame(container: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,

    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },

    backgroundColor: '#000000',
    scene: PickOneScene
  });
}
 