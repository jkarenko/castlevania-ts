import Phaser from "phaser";

// Following the rules: player = 1x2 tiles = 32x64 px
const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 64;

// Physics constants
const GROUND_ACCELERATION = 1500; // Acceleration on ground
const AIR_CONTROL_FACTOR = 0.3; // Mid-air steering (30% of ground acceleration)
const GROUND_FRICTION = 2000; // Deceleration when not moving on ground
const AIR_FRICTION = 300; // Minimal air friction (air resistance)
const JUMP_VELOCITY = -330;
const MAX_SPEED = 160;

// Jump physics constants - Super Mario World style
const GRAVITY_NORMAL = 1200; // Normal gravity when falling or after releasing jump
const GRAVITY_HOLDING = 400; // Reduced gravity when holding jump button
const JUMP_CUT_THRESHOLD = 100; // Velocity threshold where jump cut has no more effect
const JUMP_HOLD_MAX_TIME = 250; // Max time in ms that holding jump affects height
const JUMP_RELEASE_BOOST = 1.2; // Initial velocity boost when button released early

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
  private originalBodyHeight: number = PLAYER_HEIGHT;
  private moveDirection: "left" | "right" | "none" = "none";
  private targetVelocity: number = 0;
  private acceleration: number = 0;
  private wasInAir: boolean = false;
  private previousMoveDirection: "left" | "right" | "none" = "none";

  // Jump control variables
  private isJumpButtonHeld: boolean = false;
  private jumpStartTime: number = 0;
  private isJumpCut: boolean = false;
  private currentGravity: number = GRAVITY_NORMAL;
  private lastGroundedTime: number = 0; // Track when we were last grounded
  private coyoteJumpDuration: number = 150; // Allow jump within 150ms of leaving ground
  private canDoubleJump: boolean = false; // Track if double jump is available

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

      // Set max velocity and drag for dynamic bodies
      if (this.body instanceof Phaser.Physics.Arcade.Body) {
        this.body.setMaxVelocityX(MAX_SPEED);
        this.body.setDragX(10);
      }
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

    // Store the previous direction before changing
    this.previousMoveDirection = this.moveDirection;

    // Store the direction for use in update
    this.moveDirection = direction;

    // Set the target velocity based on direction
    this.targetVelocity = direction === "left" ? -speed : speed;

    // Calculate acceleration based on whether player is on ground or in air
    this.acceleration = this.body.touching.down ? GROUND_ACCELERATION : GROUND_ACCELERATION * AIR_CONTROL_FACTOR;

    // Flip the sprite based on movement direction
    this.setFlipX(direction === "left");

    if (this.currentState !== PlayerState.JUMPING) {
      this.setPlayerState(PlayerState.WALKING);
    }
  }

  stopWalking(): void {
    if (this.isDucking || !this.isAlive) return;

    // Store the previous direction before stopping
    this.previousMoveDirection = this.moveDirection;

    this.moveDirection = "none";

    // When in air, preserve momentum by not zeroing target velocity
    if (this.body?.touching.down) {
      this.targetVelocity = 0;
    }

    this.acceleration = 0;

    if (this.body?.touching.down && this.currentState !== PlayerState.ATTACKING) {
      this.setPlayerState(PlayerState.IDLE);
    }
  }

  jump(jumpVelocity: number = JUMP_VELOCITY): void {
    if (this.isAttacking || !this.isAlive || this.isDucking) return;

    const now = this.scene.time.now;
    const canJump =
      this.body?.touching.down || // Currently on ground
      now - this.lastGroundedTime < this.coyoteJumpDuration; // Or within coyote time

    // Allow jumping if on ground or within coyote time
    if (canJump) {
      this.isJumpButtonHeld = true;
      this.isJumpCut = false;
      this.jumpStartTime = now;
      this.canDoubleJump = true; // Always enable double jump on initial jump

      // Apply initial velocity
      this.setVelocityY(jumpVelocity);

      // Apply reduced gravity for ascent
      this.currentGravity = GRAVITY_HOLDING;

      // Change state
      this.setPlayerState(PlayerState.JUMPING);
    }
    // Handle double jump
    else if (this.canDoubleJump && !this.body?.touching.down) {
      this.isJumpButtonHeld = true;
      this.isJumpCut = false;
      this.jumpStartTime = now;
      this.canDoubleJump = false; // Consume double jump

      // Apply double jump velocity (same as normal jump)
      this.setVelocityY(jumpVelocity);

      // Apply reduced gravity for ascent
      this.currentGravity = GRAVITY_HOLDING;

      // Ensure we're in jumping state
      this.setPlayerState(PlayerState.JUMPING);
    }
  }

  // Called when jump button is released
  jumpRelease(): void {
    // Only affect jump if button was being held and we're in a jumping state
    if (this.isJumpButtonHeld && this.currentState === PlayerState.JUMPING) {
      this.isJumpButtonHeld = false;

      // Only cut the jump if we're still in initial ascent
      // (velocity is negative in Phaser when going up)
      if (this.body && this.body.velocity.y < -JUMP_CUT_THRESHOLD) {
        this.isJumpCut = true;

        // Apply additional gravity to cut the jump
        this.currentGravity = GRAVITY_NORMAL * JUMP_RELEASE_BOOST;
      }
    }
  }

  attack(): void {
    if (this.isAttacking || !this.isAlive) return;

    this.setPlayerState(PlayerState.ATTACKING);
  }

  duck(): void {
    if (this.isAttacking || !this.isAlive || !this.body?.touching.down) return;

    this.setVelocityX(0);
    this.targetVelocity = 0;
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

    const deltaSeconds = delta / 1000; // Convert delta to seconds for physics calculations
    const isInAir = !this.body.touching.down;

    // Update last grounded time when touching ground
    if (this.body.touching.down) {
      this.lastGroundedTime = time;
    }

    // Always apply gravity when in the air
    if (isInAir) {
      // If in jump state, handle variable jump height
      if (this.currentState === PlayerState.JUMPING) {
        const jumpHoldTime = time - this.jumpStartTime;

        // Only use reduced gravity if:
        // 1. Still holding jump button
        // 2. Within max hold time
        // 3. Moving upward (velocity.y < 0)
        // 4. Jump wasn't cut early
        if (
          this.isJumpButtonHeld &&
          jumpHoldTime <= JUMP_HOLD_MAX_TIME &&
          this.body.velocity.y < 0 &&
          !this.isJumpCut
        ) {
          this.currentGravity = GRAVITY_HOLDING;
        } else {
          // Use normal gravity in all other cases
          this.currentGravity = GRAVITY_NORMAL;
        }
      } else {
        // Not in jump state, use normal gravity
        this.currentGravity = GRAVITY_NORMAL;
      }

      // Apply the current gravity
      this.body.velocity.y += this.currentGravity * deltaSeconds;
    } else {
      // On ground, reset gravity
      this.currentGravity = GRAVITY_NORMAL;
    }

    // Track when player transitions from ground to air
    if (!this.wasInAir && isInAir) {
      // Just became airborne - preserve momentum
      if (this.moveDirection === "none" && this.previousMoveDirection !== "none") {
        // If player just released keys as they jumped, preserve their direction
        this.targetVelocity = this.body.velocity.x;
      }
    }

    // Apply acceleration and friction for smoother movement
    if (this.moveDirection !== "none") {
      // Apply acceleration toward target velocity
      const velocityDiff = this.targetVelocity - this.body.velocity.x;

      if (Math.abs(velocityDiff) > 10) {
        // Apply proportional force based on how far we are from target velocity
        const force = Math.sign(velocityDiff) * this.acceleration * deltaSeconds;
        this.body.velocity.x += force;

        // Cap velocity
        if (
          (this.targetVelocity > 0 && this.body.velocity.x > this.targetVelocity) ||
          (this.targetVelocity < 0 && this.body.velocity.x < this.targetVelocity)
        ) {
          this.body.velocity.x = this.targetVelocity;
        }
      } else {
        // Close enough to target velocity, just set it
        this.body.velocity.x = this.targetVelocity;
      }
    } else {
      // Apply friction to slow down when not actively moving - different for air vs ground
      if (Math.abs(this.body.velocity.x) > 10) {
        // Use much less friction in air
        const frictionToUse = isInAir ? AIR_FRICTION : GROUND_FRICTION;
        const friction = Math.sign(this.body.velocity.x) * -frictionToUse * deltaSeconds;

        // Make sure friction doesn't overshoot zero
        if (Math.abs(friction) > Math.abs(this.body.velocity.x)) {
          this.body.velocity.x = 0;
        } else {
          this.body.velocity.x += friction;
        }

        // Stop completely if velocity is very low
        if (Math.abs(this.body.velocity.x) < 10) {
          this.body.velocity.x = 0;
        }
      } else {
        this.body.velocity.x = 0;
      }
    }

    // Return to idle only once when landing after being in air and vertical velocity is near zero
    if (
      this.body.touching.down && // currently on ground
      this.wasInAir && // was in air previous frame
      this.currentState === PlayerState.JUMPING && // currently in jump state
      Math.abs(this.body.velocity.y) < 30 // increased threshold to prevent bouncing
    ) {
      this.isJumpButtonHeld = false;
      this.isJumpCut = false;
      this.canDoubleJump = false; // Reset double jump only when properly landing
      this.setPlayerState(PlayerState.IDLE);
    }

    // Ensure player goes back to idle if they're on the ground and not moving
    if (this.body.touching.down && Math.abs(this.body.velocity.x) < 10 && this.currentState === PlayerState.WALKING) {
      this.setPlayerState(PlayerState.IDLE);
    }

    // If player is falling or rising off the ground, switch to jump state (only when significant vertical movement)
    if (
      !this.body.touching.down && // in air
      Math.abs(this.body.velocity.y) > 50 && // increased threshold for more stable state changes
      this.currentState !== PlayerState.JUMPING && // not already in jump state
      this.currentState !== PlayerState.HURT && // not hurt
      this.currentState !== PlayerState.DEAD // not dead
    ) {
      this.setPlayerState(PlayerState.JUMPING);
      // Don't enable double jump when entering jump state from falling
      if (!this.wasInAir) {
        this.canDoubleJump = false;
      }
    }

    // Update wasInAir state for next frame
    this.wasInAir = isInAir;
  }
}
