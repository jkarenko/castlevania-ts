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

// Player state
export enum PlayerState {
  IDLE = "idle",
  WALKING = "walking",
  JUMPING = "jumping",
  DUCKING = "ducking",
  ATTACKING = "attacking",
  HURT = "hurt",
  DEAD = "dead",
  TALKING = "talking",
}

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private currentState: PlayerState = PlayerState.IDLE;
  private isAlive: boolean = true;
  private isAttacking: boolean = false;
  private isDucking: boolean = false;
  private isTalking: boolean = false;

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

    // Set up animation completion listeners
    this.setupAnimationListeners();

    // Initialize with idle state
    this.setPlayerState(PlayerState.IDLE);
  }

  private setupAnimationListeners(): void {
    // Animation completion listeners
    this.on("animationcomplete", (animation: Phaser.Animations.Animation) => {
      this.handleAnimationComplete(animation);
    });
  }

  private handleAnimationComplete(animation: Phaser.Animations.Animation): void {
    // Handle animation completions
    const key = animation.key;

    switch (key) {
      case AnimKeys.Attack:
        this.isAttacking = false;
        if (this.currentState === PlayerState.ATTACKING) {
          this.setPlayerState(PlayerState.IDLE);
        }
        break;
      case AnimKeys.Jump:
        if (this.currentState === PlayerState.JUMPING && this.body?.touching.down) {
          this.setPlayerState(PlayerState.IDLE);
        }
        break;
      case AnimKeys.Hurt:
        if (this.currentState === PlayerState.HURT && this.isAlive) {
          this.setPlayerState(PlayerState.IDLE);
        }
        break;
      case AnimKeys.Die:
        this.isAlive = false;
        break;
    }
  }

  setPlayerState(state: PlayerState): void {
    if (!this.isAlive && state !== PlayerState.DEAD) {
      return; // Don't change state if player is dead
    }

    this.currentState = state;

    switch (state) {
      case PlayerState.IDLE:
        this.play(AnimKeys.Idle, true);
        this.isAttacking = false;
        this.isDucking = false;
        this.isTalking = false;
        break;
      case PlayerState.WALKING:
        this.play(AnimKeys.Walk, true);
        break;
      case PlayerState.JUMPING:
        this.play(AnimKeys.Jump, true);
        break;
      case PlayerState.DUCKING:
        this.play(AnimKeys.Duck, true);
        this.isDucking = true;
        break;
      case PlayerState.ATTACKING:
        this.play(AnimKeys.Attack, true);
        this.isAttacking = true;
        break;
      case PlayerState.HURT:
        this.play(AnimKeys.Hurt, true);
        break;
      case PlayerState.DEAD:
        this.play(AnimKeys.Die, true);
        this.isAlive = false;
        break;
      case PlayerState.TALKING:
        this.play(AnimKeys.Talk, true);
        this.isTalking = true;
        break;
    }
  }

  // Action methods
  walk(direction: "left" | "right", speed: number = 160): void {
    if (this.isAttacking || !this.isAlive || this.isDucking) return;

    this.setVelocityX(direction === "left" ? -speed : speed);
    this.setFlipX(direction === "left");

    if (this.currentState !== PlayerState.JUMPING) {
      this.setPlayerState(PlayerState.WALKING);
    }
  }

  jump(jumpVelocity: number = -330): void {
    if (this.isAttacking || !this.isAlive || this.isDucking || !this.body?.touching.down) return;

    this.setVelocityY(jumpVelocity);
    this.setPlayerState(PlayerState.JUMPING);
  }

  attack(): void {
    if (this.isAttacking || !this.isAlive) return;

    this.setPlayerState(PlayerState.ATTACKING);
  }

  duck(): void {
    if (this.isAttacking || !this.isAlive || !this.body?.touching.down) return;

    this.setVelocityX(0);
    this.setPlayerState(PlayerState.DUCKING);
  }

  standUp(): void {
    if (this.isDucking) {
      this.setPlayerState(PlayerState.IDLE);
    }
  }

  hurt(): void {
    if (!this.isAlive) return;

    this.setPlayerState(PlayerState.HURT);
  }

  die(): void {
    this.setPlayerState(PlayerState.DEAD);
  }

  talk(): void {
    if (!this.isAlive) return;

    this.setPlayerState(PlayerState.TALKING);
  }

  stopTalking(): void {
    if (this.isTalking) {
      this.setPlayerState(PlayerState.IDLE);
    }
  }

  // Check player states
  isJumping(): boolean {
    return this.currentState === PlayerState.JUMPING;
  }

  isWalking(): boolean {
    return this.currentState === PlayerState.WALKING;
  }

  isDead(): boolean {
    return !this.isAlive;
  }

  // Update method
  update(time: number, delta: number): void {
    // Ensure player goes back to idle if they're on the ground and not moving
    if (this.body?.touching.down && Math.abs(this.body.velocity.x) < 10 && this.currentState === PlayerState.WALKING) {
      this.setPlayerState(PlayerState.IDLE);
    }

    // If player is in the air but not in jumping state, force jumping animation
    if (
      !this.body?.touching.down &&
      this.currentState !== PlayerState.JUMPING &&
      this.currentState !== PlayerState.HURT &&
      this.currentState !== PlayerState.DEAD
    ) {
      this.setPlayerState(PlayerState.JUMPING);
    }
  }
}
