// 2:1 Isometric Projection math and direction helpers for MMBN3

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

// Main platform center (gx=3, gy=3) maps to (368, 192) on the 688x400 map
export const ORIGIN_X = 368;
export const ORIGIN_Y = 96; // 96 + (3 + 3) * 16 = 192

export type Direction = 'S' | 'SW' | 'W' | 'NW' | 'N' | 'NE' | 'E' | 'SE';

export const DIRECTIONS: Direction[] = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];

export interface Point2D {
  x: number;
  y: number;
}

export interface GridCoord {
  gx: number;
  gy: number;
}

/**
 * Converts continuous grid/world coordinates to screen pixel coordinates
 */
export function worldToScreen(gx: number, gy: number): Point2D {
  return {
    x: ORIGIN_X + (gx - gy) * (TILE_WIDTH / 2),
    y: ORIGIN_Y + (gx + gy) * (TILE_HEIGHT / 2)
  };
}

/**
 * Converts screen pixel coordinates to continuous grid/world coordinates
 */
export function screenToWorld(sx: number, sy: number): GridCoord {
  const relX = sx - ORIGIN_X;
  const relY = sy - ORIGIN_Y;

  const halfW = TILE_WIDTH / 2; // 32
  const halfH = TILE_HEIGHT / 2; // 16

  const gx = (relX / halfW + relY / halfH) / 2;
  const gy = (relY / halfH - relX / halfW) / 2;

  return { gx, gy };
}

/**
 * Determines the closest 8-way isometric direction from movement vector (dx, dy)
 * in screen coordinates.
 *
 * Screen mapping:
 * - Down (+Y): 'S'
 * - Down-Left (-X, +Y): 'SW'
 * - Left (-X): 'W'
 * - Up-Left (-X, -Y): 'NW'
 * - Up (-Y): 'N'
 * - Up-Right (+X, -Y): 'NE'
 * - Right (+X): 'E'
 * - Down-Right (+X, +Y): 'SE'
 */
export function vectorToDirection(dx: number, dy: number): Direction {
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return 'S';
  }

  // Calculate angle in radians from -PI to +PI, with 0 pointing Right (+X), PI/2 pointing Down (+Y)
  const angle = Math.atan2(dy, dx);
  // Convert to degrees [0, 360)
  let deg = (angle * 180) / Math.PI;
  if (deg < 0) deg += 360;

  // 8 sectors of 45 degrees each, centered around cardinal/diagonal directions:
  // E:   0 deg    (337.5 - 22.5)
  // SE:  45 deg   (22.5 - 67.5)
  // S:   90 deg   (67.5 - 112.5)
  // SW: 135 deg   (112.5 - 157.5)
  // W:  180 deg   (157.5 - 202.5)
  // NW: 225 deg   (202.5 - 247.5)
  // N:  270 deg   (247.5 - 292.5)
  // NE: 315 deg   (292.5 - 337.5)

  if (deg >= 337.5 || deg < 22.5) return 'E';
  if (deg >= 22.5 && deg < 67.5) return 'SE';
  if (deg >= 67.5 && deg < 112.5) return 'S';
  if (deg >= 112.5 && deg < 157.5) return 'SW';
  if (deg >= 157.5 && deg < 202.5) return 'W';
  if (deg >= 202.5 && deg < 247.5) return 'NW';
  if (deg >= 247.5 && deg < 292.5) return 'N';
  return 'NE';
}

/**
 * Returns direction vector in screen coordinates for keyboard input
 */
export function inputToVector(up: boolean, down: boolean, left: boolean, right: boolean): Point2D {
  let dx = 0;
  let dy = 0;

  if (up) dy -= 1;
  if (down) dy += 1;
  if (left) dx -= 1;
  if (right) dx += 1;

  if (dx !== 0 && dy !== 0) {
    const len = Math.SQRT2;
    dx /= len;
    dy /= len;
  }

  return { x: dx, y: dy };
}
