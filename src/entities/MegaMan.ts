// MegaMan.EXE actor entity with 8-directional sprite animations and movement controller

import { Direction, DIRECTIONS, Point2D, vectorToDirection } from '../engine/Isometric';
import { ACDCSquareMap } from '../world/ACDCSquareMap';
import { AudioManager } from '../audio/AudioManager';

export type MegaManState = 'idle' | 'running' | 'interacting';

export class MegaMan {
  public x: number;
  public y: number;
  public direction: Direction = 'S';
  public state: MegaManState = 'idle';

  // Movement speed in pixels per second
  public readonly speed: number = 135;

  // Sprite animation pacing
  private frameTimer: number = 0;
  private currentRunFrame: number = 0;
  private readonly frameDuration: number = 0.085; // 85ms per frame (6 frames cycle in ~500ms)

  // Waypoints for click-to-move
  private waypoints: Point2D[] = [];

  // Atlas frame dimensions (from prepare_assets.py)
  public readonly frameWidth: number = 36;
  public readonly frameHeight: number = 44;
  public readonly anchorX: number = 18;
  public readonly anchorY: number = 40;

  private map: ACDCSquareMap;
  private audio: AudioManager;

  constructor(spawn: Point2D, map: ACDCSquareMap, audio: AudioManager) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.map = map;
    this.audio = audio;
  }

  public setWaypoints(points: Point2D[]): void {
    this.waypoints = points;
  }

  public clearWaypoints(): void {
    this.waypoints = [];
  }

  public hasWaypoints(): boolean {
    return this.waypoints.length > 0;
  }

  public getTargetPoint(): Point2D | null {
    return this.waypoints.length > 0 ? this.waypoints[this.waypoints.length - 1] : null;
  }

  public update(dt: number, keyVector: Point2D): void {
    if (this.state === 'interacting') {
      return;
    }

    let moveX = 0;
    let moveY = 0;
    const hasKeyInput = Math.abs(keyVector.x) > 0.01 || Math.abs(keyVector.y) > 0.01;

    if (hasKeyInput) {
      // Keyboard input overrides any click-to-move waypoints immediately
      this.waypoints = [];
      moveX = keyVector.x * this.speed * dt;
      moveY = keyVector.y * this.speed * dt;
      this.direction = vectorToDirection(keyVector.x, keyVector.y);
    } else if (this.waypoints.length > 0) {
      // Follow next waypoint
      const nextWp = this.waypoints[0];
      const dx = nextWp.x - this.x;
      const dy = nextWp.y - this.y;
      const dist = Math.hypot(dx, dy);

      const step = this.speed * dt;
      if (dist <= step) {
        this.x = nextWp.x;
        this.y = nextWp.y;
        this.waypoints.shift();
      } else {
        moveX = (dx / dist) * step;
        moveY = (dy / dist) * step;
        this.direction = vectorToDirection(dx, dy);
      }
    }

    // Attempt movement with wall-sliding collision
    const isMoving = Math.abs(moveX) > 0.001 || Math.abs(moveY) > 0.001;

    if (isMoving) {
      this.state = 'running';

      // Try full movement first
      const newX = this.x + moveX;
      const newY = this.y + moveY;

      if (this.map.isWalkable(newX, newY)) {
        this.x = newX;
        this.y = newY;
      } else {
        // Slide along X or Y if possible
        let slid = false;
        if (this.map.isWalkable(newX, this.y)) {
          this.x = newX;
          slid = true;
        } else if (this.map.isWalkable(this.x, newY)) {
          this.y = newY;
          slid = true;
        }

        if (!slid && this.waypoints.length > 0) {
          // Blocked on waypoint, drop it to recalculate
          this.waypoints.shift();
        }
      }

      // Advance running animation
      this.frameTimer += dt;
      if (this.frameTimer >= this.frameDuration) {
        this.frameTimer -= this.frameDuration;
        this.currentRunFrame = (this.currentRunFrame + 1) % 6;

        // Play subtle step sound on contacts (frames 0 and 3)
        if (this.currentRunFrame === 0 || this.currentRunFrame === 3) {
          this.audio.playStep();
        }
      }
    } else {
      this.state = 'idle';
      this.frameTimer = 0;
      this.currentRunFrame = 0;
    }
  }

  public render(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement): void {
    // 1. Draw subtle retro drop shadow under feet
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 1, 9, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 20, 40, 0.45)';
    ctx.fill();
    ctx.restore();

    // 2. Determine frame from direction and state
    const dirIndex = DIRECTIONS.indexOf(this.direction);
    const row = dirIndex >= 0 ? dirIndex : 0;
    const col = this.state === 'running' ? this.currentRunFrame + 1 : 0;

    const sx = col * this.frameWidth;
    const sy = row * this.frameHeight;

    const dx = Math.round(this.x - this.anchorX);
    const dy = Math.round(this.y - this.anchorY);

    ctx.drawImage(
      atlas,
      sx, sy, this.frameWidth, this.frameHeight,
      dx, dy, this.frameWidth, this.frameHeight
    );
  }
}
