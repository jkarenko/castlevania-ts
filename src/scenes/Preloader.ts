import {Scene} from "phaser";
import {AnimKeys} from "../entities/player/Player";

export class Preloader extends Scene {
  constructor() {
    super("Preloader");
  }

  init() {}

  preload() {
    this.load.aseprite("player", "assets/sprites/player/player.png", "assets/sprites/player/player.json");
  }

  create() {
    console.log("Creating animations from Aseprite data...");

    // Get the Aseprite data
    const asepriteData = this.cache.json.get("player");
    const frameTags = asepriteData?.meta?.frameTags;
    const allFramesData = asepriteData?.frames;

    if (frameTags && allFramesData) {
      // Create animations manually with explicit frame objects
      frameTags.forEach((tag: {name: string; from: number; to: number; direction: string}) => {
        // Build frame sequence
        const frames = [];

        for (let i = tag.from; i <= tag.to; i++) {
          // Use the correct frame name format from the JSON
          const frameKey = `player ${i}.aseprite`;

          // Find the frame data - it could be an array or object structure
          let frameData;
          if (Array.isArray(allFramesData)) {
            frameData = allFramesData[i];
          } else {
            // Find the frame with matching filename in object structure
            frameData = Object.values(allFramesData).find((f: any) => f.filename === frameKey);
          }

          if (frameData) {
            frames.push({
              key: "player",
              frame: frameKey,
              duration: frameData.duration,
            });
          } else {
            console.error(`Could not find frame data for ${frameKey}`);
          }
        }

        if (frames.length > 0) {
          // For the idle animation with different frame durations (500, 500, 2000),
          // we need special handling
          if (tag.name === AnimKeys.Idle) {
            // For idle, we need to expand frames to match durations
            // Create an expanded array that repeats frames based on their duration ratios
            const expandedFrames = [];

            // Base unit is 100ms
            for (let i = 0; i < frames.length; i++) {
              const frame = frames[i];
              const repeats = frame.duration / 100; // 500ms = 5 repeats, 2000ms = 20 repeats

              for (let j = 0; j < repeats; j++) {
                expandedFrames.push({
                  key: frame.key,
                  frame: frame.frame,
                });
              }
            }

            // Create the animation with the expanded frames
            this.anims.create({
              key: tag.name,
              frames: expandedFrames,
              frameRate: 10, // 10fps = 100ms per frame
              repeat: -1, // Idle should loop indefinitely
            });

            console.log(`Created ${tag.name} animation with ${frames.length} unique frames (expanded)`);
          } else {
            // Animation-specific configurations
            let repeat = 0; // Default to no repeat
            let yoyo = false;

            // Configure specific animations
            switch (tag.name) {
              case AnimKeys.Walk:
                repeat = -1; // Infinite loop for walking
                break;
              case AnimKeys.Jump:
                // Jump should play once and hold on last frame
                repeat = 0;
                break;
              case AnimKeys.Attack:
                // Attack should play once
                repeat = 0;
                break;
              case AnimKeys.Hurt:
                // Hurt should play once
                repeat = 0;
                break;
              case AnimKeys.Die:
                // Die should play once and stay on last frame
                repeat = 0;
                break;
              case AnimKeys.Talk:
                // Talk can repeat while talking
                repeat = -1;
                break;
              case AnimKeys.Duck:
                // Duck should play once and hold
                repeat = 0;
                break;
            }

            // For other animations with consistent frame durations, use standard approach
            this.anims.create({
              key: tag.name,
              frames: frames,
              // Calculate frameRate from frame duration: framerate = 1000 / duration (for 500ms = 2fps)
              frameRate: 1000 / frames[0].duration,
              repeat: repeat,
              yoyo: yoyo,
            });

            console.log(`Created ${tag.name} animation with ${frames.length} frames (repeat: ${repeat})`);
          }
        }
      });

      // Animation events are now handled in the Player class
      console.log("Animation setup complete. Animation events are handled in the Player class.");
    } else {
      console.error("Failed to load Aseprite animation data");
    }

    // Move to the PlayerTestScene.
    this.scene.start("PlayerTestScene");
  }
}
