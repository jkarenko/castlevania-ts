# Castlevania‑Style Metroidvania – Project Rules & Specs  

---

## 1. Core Concept  

| Item | Spec |
|------|------|
| **Genre** | 2‑D side‑scrolling *Metroidvania* (exploration, back‑tracking, statically‑scrolling rooms). |
| **Visual Style** | Pixel‑art, baseline cell **32 × 32 px**; sprite‑sheets exported from Aseprite with *rows = tags* layout (JSON‑array). |
| **Core Hook** | **Free‑aim combat** – player uses mouse/right‑stick/touch‑stick to set attack direction (0–360°). |

---

## 2. Player Abilities & Control Map  

| Action | Keyboard | Game‑pad | Touch |
|--------|----------|----------|-------|
| **Move left / right** | A / D | Left‑stick X | Virtual D‑Pad L/R |
| **Jump / double‑jump** | Space | South (A/✕) | Button A |
| **Aim** | Mouse pos | Right‑stick | Virtual stick |
| **Fire / swing** | Left‑click | Right‑trigger (R2/RT) | Button B |
| **Duck / Hide** | S / ↓ | D‑Pad ↓ | Swipe‑down |
| **Door / Stairs** | W / ↑ | D‑Pad ↑ | Tap door icon |
| **Pause / Inventory** | Esc | Start | HUD button |

Movement quirks  

* Jump has **modest mid‑air steering** (30 % of ground acceleration).  
* Ducking halves collider height; if standing in front of a “hidable” object, player *becomes untargetable* while ducked.  
* Attacks inherit aim angle **at the moment of firing**; player can move while charging.  

---

## 3. Combat Rules  

* **Weapons**  
  * **Projectiles** (arrows, bolts) – pooled via `rexBullet`; speed 400 px/s; recycle on collision or after 2 s.  
  * **Melee** (whip / sword) – rectangular hit‑box spawned for 0.15 s, rotated to aim angle.  
  * **Hit‑scan Spells** – raycast every 16 px; first solid enemy takes damage, particles spawned along path.  
* **Damage & Invulnerability**: Player/enemies flash for 0.6 s; during flash ignore further hits.  
* **Knock‑back**: Fixed 120 px opposite to hit direction, eased (quadratic out).  

---

## 4. Enemy Archetypes  

| Type | Behaviour | Pathfinding | Sample Plugin |
|------|-----------|-------------|---------------|
| **Patroller** | Walk L↔R, shoot in current direction every 2 s. | None | `rexFSM` |
| **Chaser** | Seek player when in aggro radius; idle otherwise. | **A\*** on `rexBoard` grid OR `phaser‑navmesh`. |
| **Turret** | Static, rotates to aim at player, fires burst of 3. | None | — |

All enemies use Arcade Physics AABB bodies.

---

## 5. Level & World Structure  

* **Room‑based scrolling** (camera clamps to room bounds; transition with `rexTransition` curtain).  
* **Non‑linear castle**: keys, abilities or items open shortcuts; back‑tracking encouraged.  
* **Towns / Shops**: safe rooms; open NLP dialogue boxes (`rexTextTyping`), buy items via `rexUI` list.  
* Normalised world scale: **1 tile = 32 px**, **player = 1 × 2 tiles**.

---

## 6. Technical Stack  

| Layer | Choice | Notes |
|-------|--------|-------|
| **Engine** | Phaser 3 ≥ 3.88 | Arcade Physics primary; Matter enabled per‑scene if needed. |
| **Language** | **TypeScript** strict mode. |
| **Bundler** | Vite with HMR (template‑vite‑ts). |
| **Live asset pipeline** | `watch-sheets.mjs` (Chokidar) → Aseprite CLI → Vite HMR → Texture.replace. |
| **Plugins** | `phaser3-rex-plugins` (Bullet, FSM, UI, VirtualJoystick, Board, PathFinder, Transition), `phaser‑navmesh`, `phaser3-weapon`. |
| **Save / Load** | LocalStorage JSON `{scene,x,y,hp,inventory}`. |
| **Target FPS** | 60 on mid‑range mobile ‑> limit draw‑calls, batch sprites. |

---

## 7. Code Architecture Conventions  

```ts
// folder layout
src/
  scenes/Boot.ts
  scenes/<RoomName>.ts
  entities/player/Player.ts
  entities/enemies/<Type>.ts
  systems/bullets.ts
  data/levels/<room>.json      // Tiled export

// naming
enum AnimKeys { Idle='idle', Walk='walk', Attack='attack' }
const enum Depth { BG=-10, Sprites=0, HUD=100 }
```

* **One class per entity type**; no inheritance tree—use composition + helper functions.  
* All Phaser GameObjects are wrapped in thin model classes exposing `update(dt)`.

---

## 8. Asset Rules  

* **Sprite‑sheet** per entity; exported **PNG + JSON‑array**.  
* Tags map to animations (`idle`, `walk`, `attack`, `duck`, etc.).  
* Padding 2 px, trimmed, rows = tags.  
* Filenames: `player.png`, `player.json`; watcher auto‑syncs.  

---

## 9. Performance & QA Targets  

* < 4 ms JS update on desktop, < 10 ms on iPhone 11.  
* No single texture > 2048 × 2048.  
* Memory budget ≤ 200 MB heap after 30 min play‑time.  
* All rooms reachable with only keyboard + mouse OR full game‑pad OR touch controls.  

---

## 10. Stretch Goals (do NOT implement unless scope expanded)  

* Parallax backgrounds using multi‑cam.  
* Equipment system (gear stats).  
* Procedural sub‑dungeons.  
* Online leaderboards.

---
