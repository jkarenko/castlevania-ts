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
  private jumpWasDown: boolean = false;
  private spikeGroup?: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super("PlayerTestScene");
  }

  preload() {
    // Load tileset assets as spritesheet and json
    this.load.spritesheet("tiles_spritesheet", "assets/sprites/tiles/tiles.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.json("tiles_json", "assets/sprites/tiles/tiles.json"); // Load the json hash data
  }

  create() {
    // Create a background
    this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x87ceeb).setOrigin(0);

    // Turn off Phaser's default gravity - we'll handle it manually
    this.physics.world.gravity.y = 0;

    // Create platforms first so player can be positioned on them
    const platforms = this.createPlatforms();

    // --- Create Spikes using Spritesheet and Static Group ---
    this.spikeGroup = this.physics.add.staticGroup();
    const groundLevelY = this.cameras.main.height - 20; // Top of the ground platform
    const spikeY = groundLevelY - 8; // Position spikes slightly above ground (center of 16px tile)

    // Place some spikes (using frame 0 from the spritesheet)
    const spikePositions = [
      {x: 10 * 16 + 8, y: spikeY},
      {x: 11 * 16 + 8, y: spikeY},
      {x: 25 * 16 + 8, y: spikeY},
      {x: 26 * 16 + 8, y: spikeY},
    ];

    spikePositions.forEach((pos) => {
      // Using frame 0, assuming it's the first (and maybe only) tile in the sheet
      this.spikeGroup?.create(pos.x, pos.y, "tiles_spritesheet", 0);
    });
    // --- End Spike Creation ---

    // Create player - position exactly on ground
    const groundY = this.cameras.main.height - 20; // The top of the ground platform
    this.player = new Player(this, this.cameras.main.width / 2, groundY);

    // Add collider between player and platforms
    if (this.player) {
      this.physics.add.collider(this.player, platforms);
      // Add collider between player and spikes
      if (this.spikeGroup) {
        this.physics.add.collider(this.player, this.spikeGroup, this.handleSpikeCollision, undefined, this);
      }
    }

    // Set up input
    this.cursors = this.input.keyboard?.createCursorKeys();

    // Set up control keys (following control map from rules)
    this.jumpKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.attackKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.K);
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

    // Add a higher platform to test double jump
    const platform3 = this.add
      .rectangle(this.cameras.main.width * 0.4, this.cameras.main.height - 350, 200, 20, 0x00ff00)
      .setOrigin(0);

    platforms.add(platform1);
    platforms.add(platform2);
    platforms.add(platform3);

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

    // Add jump state debug info
    const jumpStateText = this.add.text(10, 130, "Jump State: ", {
      font: "16px Arial",
      color: "#000000",
    });

    // Add gravity debug info
    const gravityText = this.add.text(10, 150, "Gravity: ", {
      font: "16px Arial",
      color: "#000000",
    });

    // Helper text
    const controlsText = this.add.text(
      10,
      this.cameras.main.height - 160,
      "Controls:\nA/D: Move left/right\nJ: Jump (hold for higher, release for shorter jump)\nDouble-tap J for double jump\nS: Duck\nK: Attack",
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

          // Add jump state info
          const jumpButtonHeld = (this.player as any).isJumpButtonHeld ? "Yes" : "No";
          const jumpCut = (this.player as any).isJumpCut ? "Yes" : "No";
          jumpStateText.setText(`Jump State: Button Held=${jumpButtonHeld}, Jump Cut=${jumpCut}`);

          // Add gravity info
          gravityText.setText(`Gravity: ${Math.round((this.player as any).currentGravity)}`);
        }
      }
    });

    // Draw physics debug
    this.physics.world.createDebugGraphic();
  }

  update(time: number, delta: number) {
    if (!this.player || !this.jumpKey) {
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

    // Handle variable jump mechanics
    const jumpIsDown = this.jumpKey.isDown;

    // Jump button was just pressed
    if (jumpIsDown && !this.jumpWasDown) {
      this.player.jump();
    }
    // Jump button was just released
    else if (!jumpIsDown && this.jumpWasDown) {
      this.player.jumpRelease();
    }

    // Remember jump button state for next frame
    this.jumpWasDown = jumpIsDown;

    // Handle attack with K key
    if (this.attackKey?.isDown) {
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

  // Updated method to handle spike collision with a StaticGroup sprite
  private handleSpikeCollision(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    spike: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    // No need to check tile.index here, collision is with the specific group
    console.log("Player hit a spike!");
    // TODO: Implement player damage or scene restart here
    if (this.player && this.player.body) {
      // Make player bounce back slightly
      this.player.setVelocityY(-200); // Bounce up
      this.player.setVelocityX(this.player.body.velocity.x > 0 ? -100 : 100); // Bounce away horizontally
    }
  }
}
