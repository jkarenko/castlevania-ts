import Phaser from "phaser";

// Following the rules: player = 1x2 tiles = 32x64 px
const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 64;

// Animation keys enum based on player.json tags
export enum AnimKeys {
  Idle = "idle",
  Walk = "walk",
  Jump = "jump",
  Duck = "duck",
  Attack = "attack",
  Hurt = "hurt",
  Die = "die",
  Talk = "talk",
}

// Depth constants as suggested by the rules
const enum Depth {
  BG = -10,
  Sprites = 0,
  HUD = 100,
}

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Assuming the texture key 'player' is loaded in a Preloader scene
    super(scene, x, y, "player");

    // Add the player to the scene and physics engine
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set physics body size
    this.body?.setSize(PLAYER_WIDTH, PLAYER_HEIGHT);

    // Set the depth based on the rules
    this.setDepth(Depth.Sprites);

    // Placeholder for initialization logic (e.g., setting up animations)
    this.initAnimations();
  }

  private initAnimations(): void {
    // DON'T create animations here, they're already created in Preloader
    console.log("Starting player animations");
    this.play(AnimKeys.Idle, true);
  }

  // Basic update loop placeholder
  update(time: number, delta: number): void {
    // TODO: Handle input, movement, state changes, etc.
  }
}
