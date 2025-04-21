import Phaser from "phaser";

// Following the rules: player = 1x2 tiles = 32x64 px
const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 64;

// Physics constants
const GROUND_ACCELERATION = 1500; // Acceleration on ground
const AIR_CONTROL_FACTOR = 0.3; // Mid-air steering (30% of ground acceleration)
const JUMP_VELOCITY = -330;
const MAX_SPEED = 160;

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
  private canDoubleJump: boolean = true;
  private originalBodyHeight: number = PLAYER_HEIGHT;
  private moveDirection: "left" | "right" | "none" = "none";

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Assuming the texture key 'player' is loaded in a Preloader scene
    super(scene, x, y, "player");

    // Add the player to the scene and physics engine
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set origin to bottom center so feet touch the ground
    this.setOrigin(0.5, 1);

    // Set physics body size and alignment
    if (this.body) {
      this.body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT);
      // Offset the body to align with the visible sprite
      this.body.setOffset((this.width - PLAYER_WIDTH) / 2, this.height - PLAYER_HEIGHT);
    }

    this.originalBodyHeight = PLAYER_HEIGHT;

    // Set the depth based on the rules
    this.setDepth(Depth.Sprites);

    // Set up animation completion listeners
    this.setupAnimationListeners();

    // Store original body height
    if (this.body) {
      this.originalBodyHeight = this.body.height;
    }

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
        // Reset body size when going back to idle
        if (this.body) {
          this.body.setSize(PLAYER_WIDTH, this.originalBodyHeight);
          // Maintain proper body offset to align with sprite
          this.body.setOffset((this.width - PLAYER_WIDTH) / 2, this.height - this.originalBodyHeight);
        }
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
        // Halve collider height when ducking (as per rules)
        if (this.body) {
          const halfHeight = this.originalBodyHeight / 2;
          this.body.setSize(PLAYER_WIDTH, halfHeight);
          // Adjust offset to keep feet at same position
          this.body.setOffset((this.width - PLAYER_WIDTH) / 2, this.height - halfHeight);
        }
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
  walk(direction: "left" | "right", speed: number = MAX_SPEED): void {
    if (this.isAttacking || !this.isAlive || this.isDucking || !this.body) return;

    // Store the direction for use in update
    this.moveDirection = direction;

    // Set the velocity directly for immediate response
    const targetVelocity = direction === "left" ? -speed : speed;
    this.setVelocityX(targetVelocity);

    this.setFlipX(direction === "left");

    if (this.currentState !== PlayerState.JUMPING) {
      this.setPlayerState(PlayerState.WALKING);
    }
  }

  stopWalking(): void {
    if (this.isDucking || !this.isAlive) return;

    this.moveDirection = "none";
    this.setAccelerationX(0);
    this.setVelocityX(0);

    if (this.body?.touching.down && this.currentState !== PlayerState.ATTACKING) {
      this.setPlayerState(PlayerState.IDLE);
    }
  }

  jump(jumpVelocity: number = JUMP_VELOCITY): void {
    if (this.isAttacking || !this.isAlive || this.isDucking) return;

    // Check if player is on ground for first jump
    if (this.body?.touching.down) {
      this.setVelocityY(jumpVelocity);
      this.canDoubleJump = true;
      this.setPlayerState(PlayerState.JUMPING);
    }
    // Double jump if in air and still has double jump available
    else if (this.canDoubleJump && this.currentState === PlayerState.JUMPING) {
      this.setVelocityY(jumpVelocity * 0.8); // Slightly lower second jump
      this.canDoubleJump = false;
      // Play jump animation again
      this.play(AnimKeys.Jump, true);
    }
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
    if (!this.body) return;

    // Apply mid-air steering if the player is trying to move
    if (this.moveDirection !== "none" && !this.body.touching.down) {
      // Calculate acceleration based on whether player is on ground or in air
      const acceleration = GROUND_ACCELERATION * AIR_CONTROL_FACTOR;
      const targetVelocity = this.moveDirection === "left" ? -MAX_SPEED : MAX_SPEED;

      // Apply acceleration in the right direction
      this.setAccelerationX(this.moveDirection === "left" ? -acceleration : acceleration);

      // Cap velocity
      if (
        (this.moveDirection === "left" && this.body.velocity.x < targetVelocity) ||
        (this.moveDirection === "right" && this.body.velocity.x > targetVelocity)
      ) {
        this.setVelocityX(targetVelocity);
      }
    } else {
      // Reset acceleration each frame when not moving
      this.setAccelerationX(0);
    }

    // Reset double jump when landing
    if (this.body.touching.down && this.currentState === PlayerState.JUMPING) {
      this.canDoubleJump = true;
      this.setPlayerState(PlayerState.IDLE);
    }

    // Ensure player goes back to idle if they're on the ground and not moving
    if (this.body.touching.down && Math.abs(this.body.velocity.x) < 10 && this.currentState === PlayerState.WALKING) {
      this.setPlayerState(PlayerState.IDLE);
    }

    // If player is in the air but not in jumping state, force jumping animation
    if (
      !this.body.touching.down &&
      this.currentState !== PlayerState.JUMPING &&
      this.currentState !== PlayerState.HURT &&
      this.currentState !== PlayerState.DEAD
    ) {
      this.setPlayerState(PlayerState.JUMPING);
    }
  }
}
