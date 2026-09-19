// ACDC Square world map definition, bounds, obstacles, and collision detection

import { screenToWorld, Point2D } from '../engine/Isometric';

export interface BBSInteractionZone {
  x: number;
  y: number;
  radius: number;
  prompt: string;
}

export class ACDCSquareMap {
  // BBS Object position on the upper right platform against the wall
  public readonly bbsPosition: Point2D = { x: 575, y: 75 };
  public readonly bbsInteractionRadius: number = 42;

  // Warp portal position on lower left platform
  public readonly warpPortalPosition: Point2D = { x: 95, y: 330 };

  // Starting spawn position for MegaMan (center of main square plaza)
  public readonly spawnPosition: Point2D = { x: 368, y: 192 };

  /**
   * Checks if a screen pixel position (sx, sy) is on a valid walkable platform
   */
  public isWalkable(sx: number, sy: number): boolean {
    // 1. Check Main Square (7x7 isometric grid)
    const { gx, gy } = screenToWorld(sx, sy);
    const inMainSquare = gx >= -0.2 && gx <= 6.2 && gy >= -0.2 && gy <= 6.2;

    if (inMainSquare) {
      // Check shop counter obstacle on left side: gx in [0, 1.8], gy in [3.4, 5.2]
      if (gx >= -0.2 && gx <= 1.8 && gy >= 3.4 && gy <= 5.2) {
        return false;
      }
      return true;
    }

    // 2. Check Upper Bridge (between main platform and BBS platform)
    // Connects (sx=480, sy=160) to (sx=550, sy=130)
    // dx/dy approx 2:1 slope, width ~20px
    if (sx >= 470 && sx <= 555 && sy >= 120 && sy <= 180) {
      const bridgeCenterY = 155 - (sx - 480) * 0.45;
      if (Math.abs(sy - bridgeCenterY) <= 18) {
        return true;
      }
    }

    // 3. Check Upper BBS Platform
    // 2x3 platform extending from sx=530 to sx=680, sy=40 to sy=145
    if (sx >= 525 && sx <= 680 && sy >= 40 && sy <= 145) {
      // BBS wall back boundary: sy >= 55 (MegaMan cannot walk through the BBS wall monitors)
      if (sy < 65) {
        return false;
      }
      return true;
    }

    // 4. Check Lower Bridge (between main platform and Warp platform)
    // Connects (sx=240, sy=255) to (sx=170, sy=290)
    if (sx >= 165 && sx <= 250 && sy >= 240 && sy <= 305) {
      const bridgeCenterY = 255 + (240 - sx) * 0.45;
      if (Math.abs(sy - bridgeCenterY) <= 18) {
        return true;
      }
    }

    // 5. Check Lower Warp Platform
    // Platform from sx=20 to sx=180, sy=270 to sy=390
    if (sx >= 20 && sx <= 180 && sy >= 270 && sy <= 390) {
      // Diamond check centered at (95, 330) with half-width 75, half-height 40
      const dx = Math.abs(sx - 95);
      const dy = Math.abs(sy - 330);
      if (dx / 75 + dy / 40 <= 1.1) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if MegaMan is within range to interact with the BBS terminal
   */
  public isNearBBS(sx: number, sy: number): boolean {
    const dx = sx - this.bbsPosition.x;
    const dy = sy - (this.bbsPosition.y + 15);
    return Math.sqrt(dx * dx + dy * dy) <= this.bbsInteractionRadius;
  }

  /**
   * Gets the recommended walk destination when the user clicks directly on the BBS
   */
  public getBBSStandPosition(): Point2D {
    return { x: this.bbsPosition.x - 4, y: this.bbsPosition.y + 24 };
  }
}
