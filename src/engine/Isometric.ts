// 2:1 Isometric Projection math and direction helpers for MMBN3

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

// Main platform center (gx=3, gy=3) maps to (368, 192) on the 688x400 map
export const ORIGIN_X = 368;
export const ORIGIN_Y = 96; // 96 + (3 + 3) * 16 = 192

export type Direction = 'S' | 'SW' | 'W' | 'NW' | 'N' | 'NE' | 'E' | 'SE';

export const DIRECTIONS: Direction[] = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];

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
 * Snaps screen coordinates to the nearest integer isometric grid coordinate
 */
export function snapToGrid(sx: number, sy: number): { gx: number; gy: number } {
  const { gx, gy } = screenToWorld(sx, sy);
  return {
    gx: Math.round(gx),
    gy: Math.round(gy)
  };
}

/**
 * Checks if a screen point lies inside the diamond bounding box of tile (gx, gy)
 */
export function isPointInTile(sx: number, sy: number, gx: number, gy: number): boolean {
  const center = worldToScreen(gx, gy);
  const dx = Math.abs(sx - center.x);
  const dy = Math.abs(sy - center.y);
  return (dx / 32 + dy / 16) <= 1.0;
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
/**
 * Determines the closest 8-way direction from movement vector (dx, dy),
 * calibrated to 2:1 isometric geometry where diagonal platform edges have slope ±0.5 (26.565°).
 */
export function vectorToDirection(dx: number, dy: number): Direction {
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return 'S';
  }

  const angle = Math.atan2(dy, dx);
  let deg = (angle * 180) / Math.PI;
  if (deg < 0) deg += 360;

  // Midpoint sectors calibrated to 2:1 isometric diagonals (26.57°, 153.43°, 206.57°, 333.43°)
  // and cardinal directions (0°, 90°, 180°, 270°):
  if (deg >= 346.72 || deg < 13.28) return 'E';
  if (deg >= 13.28 && deg < 58.28) return 'SE';
  if (deg >= 58.28 && deg < 121.72) return 'S';
  if (deg >= 121.72 && deg < 166.72) return 'SW';
  if (deg >= 166.72 && deg < 193.28) return 'W';
  if (deg >= 193.28 && deg < 238.28) return 'NW';
  if (deg >= 238.28 && deg < 301.72) return 'N';
  return 'NE';
}

/**
 * Returns direction vector in screen coordinates for keyboard input.
 * Diagonals are strictly parallel with the 2:1 isometric map orientation (ratio 2:1).
 */
export function inputToVector(up: boolean, down: boolean, left: boolean, right: boolean): Point2D {
  let dx = 0;
  let dy = 0;

  const isUp = up && !down;
  const isDown = down && !up;
  const isLeft = left && !right;
  const isRight = right && !left;

  if (isUp && isRight) {
    // North-East (parallel to NE platform edges): dx = +2, dy = -1
    const invLen = 1 / Math.hypot(2, -1);
    dx = 2 * invLen;
    dy = -1 * invLen;
  } else if (isDown && isRight) {
    // South-East (parallel to SE platform edges): dx = +2, dy = +1
    const invLen = 1 / Math.hypot(2, 1);
    dx = 2 * invLen;
    dy = 1 * invLen;
  } else if (isDown && isLeft) {
    // South-West (parallel to SW platform edges): dx = -2, dy = +1
    const invLen = 1 / Math.hypot(-2, 1);
    dx = -2 * invLen;
    dy = 1 * invLen;
  } else if (isUp && isLeft) {
    // North-West (parallel to NW platform edges): dx = -2, dy = -1
    const invLen = 1 / Math.hypot(-2, -1);
    dx = -2 * invLen;
    dy = -1 * invLen;
  } else {
    // Cardinal movement
    if (isUp) dy = -1;
    if (isDown) dy = 1;
    if (isLeft) dx = -1;
    if (isRight) dx = 1;
  }

  return { x: dx, y: dy };
}
