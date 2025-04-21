import Phaser from "phaser";
import Player, {AnimKeys} from "../entities/player/Player";

export class PlayerTestScene extends Phaser.Scene {
  private player?: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super("PlayerTestScene");
  }

  preload() {}

  create() {
    this.player = new Player(this, this.cameras.main.width / 2, this.cameras.main.height - 50);

    this.cursors = this.input.keyboard?.createCursorKeys();

    const ground = this.add.rectangle(0, this.cameras.main.height - 10, this.cameras.main.width, 20).setOrigin(0);
    this.physics.add.existing(ground, true); // Make it a static physics body
    if (this.player && ground) {
      this.physics.add.collider(this.player, ground);
    }
  }

  update(time: number, delta: number) {
    if (!this.player || !this.cursors) {
      return;
    }

    const speed = 160;

    if (this.cursors.left?.isDown) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true);
      this.player.play(AnimKeys.Walk, true);
    } else if (this.cursors.right?.isDown) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false);
      this.player.play(AnimKeys.Walk, true);
    } else {
      this.player.setVelocityX(0);
      this.player.play(AnimKeys.Idle, true);
    }

    if (this.cursors.up?.isDown && this.player.body?.touching.down) {
      this.player.setVelocityY(-330);
      this.player.play(AnimKeys.Jump, true);
    }

    this.player.update(time, delta);
  }
}
