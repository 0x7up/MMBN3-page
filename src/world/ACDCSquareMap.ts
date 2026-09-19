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
    // Barrier 1: Shop counter and shopkeeper Navis (purple girl Navi & green merchant Navi)
    if (sx >= 135 && sx <= 245 && sy >= 150 && sy <= 235) {
      return false;
    }

    // Barrier 2: Floating warp beacon machine on lower platform
    if (sx >= 70 && sx <= 135 && sy >= 235 && sy <= 290) {
      return false;
    }

    // 1. Check Main Square (7x7 isometric grid)
    const { gx, gy } = screenToWorld(sx, sy);
    const inMainSquare = gx >= 0.0 && gx <= 6.0 && gy >= 0.0 && gy <= 6.0;

    if (inMainSquare) {
      // Barrier for shop area in grid coordinates
      if (gx <= 2.2 && gy >= 3.2) {
        return false;
      }
      return true;
    }

    // 2. Check Upper Bridge (between main platform and BBS platform)
    // Connects (480, 160) to (550, 125), slope -0.5
    if (sx >= 475 && sx <= 550 && sy >= 115 && sy <= 175) {
      const bridgeCenterY = 160 - (sx - 480) * 0.5;
      if (Math.abs(sy - bridgeCenterY) <= 12) {
        return true;
      }
    }

    // 3. Check Upper BBS Platform
    // 2x3 platform extending from sx=525 to sx=680, sy=84 to sy=155
    if (sx >= 525 && sx <= 680 && sy >= 84 && sy <= 155) {
      // Diamond boundary check around platform center (605, 120)
      const dx = Math.abs(sx - 605);
      const dy = Math.abs(sy - 120);
      if (dx / 75 + dy / 36 <= 1.05) {
        return true;
      }
    }

    // 4. Check Lower Bridge (between main platform and Warp platform)
    // Connects (240, 255) to (170, 290), slope -0.5
    if (sx >= 170 && sx <= 245 && sy >= 245 && sy <= 300) {
      const bridgeCenterY = 255 + (240 - sx) * 0.5;
      if (Math.abs(sy - bridgeCenterY) <= 12) {
        return true;
      }
    }

    // 5. Check Lower Warp Platform
    // Platform diamond centered at (95, 330)
    if (sx >= 25 && sx <= 170 && sy >= 290 && sy <= 375) {
      const dx = Math.abs(sx - 95);
      const dy = Math.abs(sy - 330);
      if (dx / 70 + dy / 36 <= 1.0) {
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
