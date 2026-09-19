// A* Pathfinding for navigating the isometric platforms and bridges

import { Point2D } from './Isometric';

export interface WalkableMap {
  isWalkable(x: number, y: number): boolean;
}

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export class Pathfinder {
  private map: WalkableMap;
  private readonly stepSize = 12; // grid resolution for smooth pathfinding

  constructor(map: WalkableMap) {
    this.map = map;
  }

  public setMap(map: WalkableMap): void {
    this.map = map;
  }

  /**
   * Checks if line of sight between two points is completely unblocked
   */
  public hasLineOfSight(start: Point2D, end: Point2D): boolean {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return true;

    const steps = Math.ceil(dist / 6);
    for (let i = 1; i <= steps; i++) {
      const px = start.x + (dx * i) / steps;
      const py = start.y + (dy * i) / steps;
      if (!this.map.isWalkable(px, py)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Finds path from start to target using A* with line-of-sight smoothing
   */
  public findPath(start: Point2D, target: Point2D): Point2D[] {
    if (!this.map.isWalkable(target.x, target.y)) {
      // Find closest walkable point near target
      let found = false;
      let bestDist = Infinity;
      let bestTarget = { ...target };
      for (let r = 8; r <= 32; r += 8) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          const testX = target.x + Math.cos(a) * r;
          const testY = target.y + Math.sin(a) * r;
          if (this.map.isWalkable(testX, testY)) {
            const d = Math.hypot(testX - start.x, testY - start.y);
            if (d < bestDist) {
              bestDist = d;
              bestTarget = { x: testX, y: testY };
              found = true;
            }
          }
        }
        if (found) break;
      }
      if (!found) return [];
      target = bestTarget;
    }

    // If straight line is clear, direct path is optimal
    if (this.hasLineOfSight(start, target)) {
      return [target];
    }

    // A* Pathfinding
    const openSet: PathNode[] = [];
    const closedSet = new Set<string>();

    const startNode: PathNode = {
      x: start.x,
      y: start.y,
      g: 0,
      h: Math.hypot(target.x - start.x, target.y - start.y),
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    const key = (x: number, y: number) => `${Math.round(x / this.stepSize)}_${Math.round(y / this.stepSize)}`;

    // 8 movement directions: 4 cardinal + 4 2:1 isometric diagonals parallel to map edges
    const neighborDirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
      { dx: 2, dy: 1 },  // SE (parallel to map edge)
      { dx: -2, dy: 1 }, // SW (parallel to map edge)
      { dx: 2, dy: -1 }, // NE (parallel to map edge)
      { dx: -2, dy: -1 } // NW (parallel to map edge)
    ];

    let closestNode: PathNode = startNode;
    let iterations = 0;
    const maxIterations = 600;

    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;

      // Find node with lowest f
      let lowestIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[lowestIdx].f) {
          lowestIdx = i;
        }
      }

      const current = openSet.splice(lowestIdx, 1)[0];
      const currentKey = key(current.x, current.y);
      closedSet.add(currentKey);

      if (current.h < closestNode.h) {
        closestNode = current;
      }

      // Check if reached destination
      if (Math.hypot(target.x - current.x, target.y - current.y) <= this.stepSize) {
        closestNode = current;
        break;
      }

      for (const dir of neighborDirs) {
        const nx = current.x + dir.dx * this.stepSize;
        const ny = current.y + dir.dy * this.stepSize;
        const nKey = key(nx, ny);

        if (closedSet.has(nKey)) continue;
        if (!this.map.isWalkable(nx, ny)) continue;

        const moveCost = Math.hypot(dir.dx * this.stepSize, dir.dy * this.stepSize);
        const tentativeG = current.g + moveCost;

        let neighbor = openSet.find(n => key(n.x, n.y) === nKey);
        if (!neighbor) {
          neighbor = {
            x: nx,
            y: ny,
            g: tentativeG,
            h: Math.hypot(target.x - nx, target.y - ny),
            f: 0,
            parent: current
          };
          neighbor.f = neighbor.g + neighbor.h;
          openSet.push(neighbor);
        } else if (tentativeG < neighbor.g) {
          neighbor.g = tentativeG;
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
        }
      }
    }

    // Reconstruct raw path
    const rawPath: Point2D[] = [];
    let curr: PathNode | null = closestNode;
    while (curr) {
      rawPath.unshift({ x: curr.x, y: curr.y });
      curr = curr.parent;
    }
    rawPath.push(target);

    // Path smoothing (string-pulling / raycast skip)
    const smoothed: Point2D[] = [];
    if (rawPath.length <= 2) {
      return [target];
    }

    let anchorIdx = 0;
    smoothed.push(rawPath[0]);

    while (anchorIdx < rawPath.length - 1) {
      let furthest = anchorIdx + 1;
      for (let testIdx = rawPath.length - 1; testIdx > anchorIdx; testIdx--) {
        if (this.hasLineOfSight(rawPath[anchorIdx], rawPath[testIdx])) {
          furthest = testIdx;
          break;
        }
      }
      smoothed.push(rawPath[furthest]);
      anchorIdx = furthest;
    }

    // Remove starting position from waypoints
    if (smoothed.length > 0 && Math.hypot(smoothed[0].x - start.x, smoothed[0].y - start.y) < 5) {
      smoothed.shift();
    }

    return smoothed.length > 0 ? smoothed : [target];
  }
}
