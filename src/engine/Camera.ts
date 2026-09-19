// Camera controller with smooth tracking, integer pixel scaling, and coordinate conversion

import { Point2D } from './Isometric';

export class Camera {
  public x: number = 368;
  public y: number = 192;

  public viewportWidth: number = window.innerWidth;
  public viewportHeight: number = window.innerHeight;

  public scale: number = 2.0;

  // Smoothing lerp factor (0.12 = smooth responsive tracking)
  private readonly lerpFactor: number = 0.12;

  constructor() {
    this.updateScale();
  }

  public resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.updateScale();
  }

  private updateScale(): void {
    // Dynamic integer-preferred scale based on screen size
    if (this.viewportHeight >= 900 && this.viewportWidth >= 1400) {
      this.scale = 3.0;
    } else if (this.viewportHeight >= 550 && this.viewportWidth >= 750) {
      this.scale = 2.0;
    } else {
      this.scale = 1.5;
    }
  }

  public follow(target: Point2D, immediate: boolean = false): void {
    if (immediate) {
      this.x = target.x;
      this.y = target.y;
      return;
    }

    this.x += (target.x - this.x) * this.lerpFactor;
    this.y += (target.y - this.y) * this.lerpFactor;
  }

  /**
   * Translates world pixel coordinates (on the 688x400 map) to screen canvas pixel coordinates
   */
  public worldToCanvas(wx: number, wy: number): Point2D {
    // Integer pixel snapping to avoid subpixel blur in pixel art
    const snappedCamX = Math.round(this.x);
    const snappedCamY = Math.round(this.y);

    const cx = Math.floor(this.viewportWidth / 2);
    const cy = Math.floor(this.viewportHeight / 2);

    return {
      x: Math.round((wx - snappedCamX) * this.scale + cx),
      y: Math.round((wy - snappedCamY) * this.scale + cy)
    };
  }

  /**
   * Translates screen canvas pixel coordinates to world pixel coordinates
   */
  public canvasToWorld(cx: number, cy: number): Point2D {
    const snappedCamX = Math.round(this.x);
    const snappedCamY = Math.round(this.y);

    const halfW = this.viewportWidth / 2;
    const halfH = this.viewportHeight / 2;

    return {
      x: (cx - halfW) / this.scale + snappedCamX,
      y: (cy - halfH) / this.scale + snappedCamY
    };
  }
}
