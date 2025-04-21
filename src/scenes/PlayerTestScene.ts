import Phaser from "phaser";
import Player, {AnimKeys, PlayerState} from "../entities/player/Player";

export class PlayerTestScene extends Phaser.Scene {
  private player?: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackKey?: Phaser.Input.Keyboard.Key;
  private duckKey?: Phaser.Input.Keyboard.Key;
  private jumpKey?: Phaser.Input.Keyboard.Key;
  private leftKey?: Phaser.Input.Keyboard.Key;
  private rightKey?: Phaser.Input.Keyboard.Key;
  private debugText?: Phaser.GameObjects.Text;

  constructor() {
    super("PlayerTestScene");
  }

  preload() {}

  create() {
    // Create a background
    this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x87ceeb).setOrigin(0);

    // Create platforms first so player can be positioned on them
    const platforms = this.createPlatforms();

    // Create player - position exactly on ground
    const groundY = this.cameras.main.height - 20; // The top of the ground platform
    this.player = new Player(this, this.cameras.main.width / 2, groundY);

    // Add collider between player and platforms
    if (this.player) {
      this.physics.add.collider(this.player, platforms);
    }

    // Set up input
    this.cursors = this.input.keyboard?.createCursorKeys();

    // Set up control keys (following control map from rules)
    this.jumpKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.attackKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.duckKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S);

    // Movement keys (A/D as per rule set)
    this.leftKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.rightKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    // Create debugging UI
    this.createDebugUI();
  }

  private createPlatforms(): Phaser.Physics.Arcade.StaticGroup {
    // Create a static physics group for platforms
    const platforms = this.physics.add.staticGroup();

    // Main ground
    const ground = this.add
      .rectangle(0, this.cameras.main.height - 20, this.cameras.main.width, 40, 0x00ff00)
      .setOrigin(0);
    platforms.add(ground);

    // Add some platforms
    const platform1 = this.add
      .rectangle(this.cameras.main.width * 0.2, this.cameras.main.height - 150, 200, 20, 0x00ff00)
      .setOrigin(0);

    const platform2 = this.add
      .rectangle(this.cameras.main.width * 0.6, this.cameras.main.height - 250, 200, 20, 0x00ff00)
      .setOrigin(0);

    platforms.add(platform1);
    platforms.add(platform2);

    return platforms;
  }

  private createDebugUI(): void {
    // Create UI to display current animation and state
    const animText = this.add.text(10, 10, "Animation: ", {
      font: "16px Arial",
      color: "#000000",
    });

    const stateText = this.add.text(10, 30, "State: ", {
      font: "16px Arial",
      color: "#000000",
    });

    const jumpText = this.add.text(10, 50, "Can Double Jump: ", {
      font: "16px Arial",
      color: "#000000",
    });

    this.debugText = this.add.text(10, 70, "Velocity: ", {
      font: "16px Arial",
      color: "#000000",
    });

    // Add position debug info
    const posText = this.add.text(10, 90, "Position: ", {
      font: "16px Arial",
      color: "#000000",
    });

    // Add physics body debug info
    const bodyText = this.add.text(10, 110, "Body: ", {
      font: "16px Arial",
      color: "#000000",
    });

    // Helper text
    const controlsText = this.add.text(
      10,
      this.cameras.main.height - 120,
      "Controls:\nA/D: Move left/right\nSPACE: Jump (double-tap for double jump)\nS: Duck\nMouse: Move to aim (not implemented yet)\nClick: Attack",
      {
        font: "14px Arial",
        color: "#000000",
      }
    );

    // Update UI each frame
    this.events.on("update", () => {
      if (this.player) {
        const anim = this.player.anims.currentAnim;
        animText.setText(`Animation: ${anim ? anim.key : "none"}`);
        stateText.setText(
          `State: ${this.player.isJumping() ? "jumping" : this.player.isWalking() ? "walking" : "idle"}`
        );
        jumpText.setText(
          `Can Double Jump: ${
            this.player.body?.touching.down ? "N/A" : (this.player as any).canDoubleJump ? "Yes" : "No"
          }`
        );

        if (this.debugText && this.player.body) {
          this.debugText.setText(
            `Velocity: X=${Math.round(this.player.body.velocity.x)}, Y=${Math.round(this.player.body.velocity.y)}`
          );
          posText.setText(`Position: X=${Math.round(this.player.x)}, Y=${Math.round(this.player.y)}`);
          bodyText.setText(
            `Body: X=${Math.round(this.player.body.x)}, Y=${Math.round(this.player.body.y)}, W=${
              this.player.body.width
            }, H=${this.player.body.height}`
          );
        }
      }
    });

    // Draw physics debug
    this.physics.world.createDebugGraphic();
  }

  update(time: number, delta: number) {
    if (!this.player) {
      return;
    }

    // Handle horizontal movement (A/D keys as per rule set)
    if (this.leftKey?.isDown) {
      this.player.walk("left");
    } else if (this.rightKey?.isDown) {
      this.player.walk("right");
    } else {
      this.player.stopWalking();
    }

    // Handle jumping with SPACE (as per rule set)
    if (Phaser.Input.Keyboard.JustDown(this.jumpKey!)) {
      this.player.jump();
    }

    // Handle attack with mouse button (as per rule set)
    if (this.input.activePointer.leftButtonDown() && !this.input.activePointer.leftButtonReleased()) {
      this.player.attack();
    }

    // Handle ducking with S key (as per rule set)
    if (this.duckKey?.isDown) {
      this.player.duck();
    } else if (this.duckKey?.isUp && !this.player.isJumping()) {
      this.player.standUp();
    }

    // Let the player update its own state
    this.player.update(time, delta);
  }
}
