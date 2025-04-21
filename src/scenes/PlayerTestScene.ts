import Phaser from "phaser";
import Player, {AnimKeys, PlayerState} from "../entities/player/Player";

export class PlayerTestScene extends Phaser.Scene {
  private player?: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackKey?: Phaser.Input.Keyboard.Key;
  private duckKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super("PlayerTestScene");
  }

  preload() {}

  create() {
    this.player = new Player(this, this.cameras.main.width / 2, this.cameras.main.height - 50);

    this.cursors = this.input.keyboard?.createCursorKeys();

    // Add attack and duck keys
    this.attackKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.duckKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);

    const ground = this.add.rectangle(0, this.cameras.main.height - 10, this.cameras.main.width, 20).setOrigin(0);
    this.physics.add.existing(ground, true); // Make it a static physics body
    if (this.player && ground) {
      this.physics.add.collider(this.player, ground);
    }

    // Create debugging UI
    this.createDebugUI();
  }

  private createDebugUI(): void {
    // Create UI to display current animation and state
    const animText = this.add.text(10, 10, "Animation: ", {
      font: "16px Arial",
      color: "#ffffff",
    });

    const stateText = this.add.text(10, 30, "State: ", {
      font: "16px Arial",
      color: "#ffffff",
    });

    // Update UI each frame
    this.events.on("update", () => {
      if (this.player) {
        const anim = this.player.anims.currentAnim;
        animText.setText(`Animation: ${anim ? anim.key : "none"}`);
        stateText.setText(
          `State: ${this.player.isJumping() ? "jumping" : this.player.isWalking() ? "walking" : "idle"}`
        );
      }
    });
  }

  update(time: number, delta: number) {
    if (!this.player || !this.cursors) {
      return;
    }

    const speed = 160;

    // Handle player movement
    if (this.cursors.left?.isDown) {
      this.player.walk("left", speed);
    } else if (this.cursors.right?.isDown) {
      this.player.walk("right", speed);
    } else {
      // Only stop horizontal movement if not attacking
      this.player.setVelocityX(0);
    }

    // Handle jumping
    if (this.cursors.up?.isDown && this.player.body?.touching.down) {
      this.player.jump();
    }

    // Handle attack
    if (Phaser.Input.Keyboard.JustDown(this.attackKey!)) {
      this.player.attack();
    }

    // Handle ducking
    if (this.duckKey?.isDown && this.player.body?.touching.down) {
      this.player.duck();
    } else if (this.duckKey?.isUp && !this.player.isJumping()) {
      this.player.standUp();
    }

    // Let the player update its own state
    this.player.update(time, delta);
  }
}
