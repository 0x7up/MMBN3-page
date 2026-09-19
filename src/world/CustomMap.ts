// Dynamic MMBN3 Custom Map runtime manager, collision matrix, and prop interactions

import { Point2D, screenToWorld, worldToScreen, snapToGrid, isPointInTile } from '../engine/Isometric';
import { MMBNMapData, PropInstance, FloorTileType, exportMapToJson, importMapFromJson } from './MapData';
import { DEFAULT_MAP_FACTORIES, generateSkirtsForTiles } from './DefaultMaps';

export class CustomMap {
  public data: MMBNMapData;
  public readonly defaultMapId: string = 'acdc_square';

  constructor(initialData?: MMBNMapData) {
    this.data = initialData || this.loadSavedMap(this.defaultMapId);
  }

  /**
   * Loads map from localStorage or falls back to factory default
   */
  public loadSavedMap(mapId: string): MMBNMapData {
    const key = `mmbn3_map_${mapId}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return importMapFromJson(saved);
      }
    } catch (e) {
      console.warn('Could not load saved map from localStorage, using default:', e);
    }

    const factory = DEFAULT_MAP_FACTORIES[mapId] || DEFAULT_MAP_FACTORIES['acdc_square'];
    return factory();
  }

  /**
   * Saves the current map to localStorage
   */
  public saveCurrentMap(): void {
    try {
      const key = `mmbn3_map_${this.data.id}`;
      localStorage.setItem(key, exportMapToJson(this.data));
    } catch (e) {
      console.error('Failed to save map to localStorage:', e);
    }
  }

  /**
   * Resets the current map template to its pristine default
   */
  public resetToDefault(mapId: string = this.data.id): MMBNMapData {
    const factory = DEFAULT_MAP_FACTORIES[mapId] || DEFAULT_MAP_FACTORIES['acdc_square'];
    this.data = factory();
    try {
      localStorage.removeItem(`mmbn3_map_${mapId}`);
    } catch (e) {}
    return this.data;
  }

  /**
   * Switches to a different map template
   */
  public switchMap(mapId: string): MMBNMapData {
    this.saveCurrentMap();
    this.data = this.loadSavedMap(mapId);
    return this.data;
  }

  /**
   * Replaces current map data directly (e.g. from file import)
   */
  public setMapData(newData: MMBNMapData): void {
    this.data = newData;
    this.saveCurrentMap();
  }

  public get spawnPosition(): Point2D {
    return worldToScreen(this.data.spawn.gx, this.data.spawn.gy);
  }

  /**
   * Checks if screen coordinate (sx, sy) is on a walkable floor tile
   * and not blocked by solid props (shop counter, NPCs, etc.)
   */
  public isWalkable(sx: number, sy: number): boolean {
    const { gx, gy } = screenToWorld(sx, sy);
    const igx = Math.round(gx);
    const igy = Math.round(gy);

    // 1. Check if the floor tile exists and point is within its diamond bounds
    const tileKey = `${igx},${igy}`;
    const tileType = this.data.tiles[tileKey];
    if (!tileType) {
      return false;
    }

    if (!isPointInTile(sx, sy, igx, igy)) {
      return false;
    }

    // 2. Check collision with solid props
    for (const prop of this.data.props) {
      if (prop.config?.isSolid) {
        const propScreen = worldToScreen(prop.gx, prop.gy);
        // Props have varying collision footprints
        let solidRadius = 14;
        let offsetY = 0;

        if (prop.type === 'prop_shop') {
          solidRadius = 26;
          offsetY = -4;
        } else if (prop.type === 'prop_bbs') {
          solidRadius = 18;
          offsetY = -6;
        } else if (prop.type === 'prop_beacon') {
          solidRadius = 18;
          offsetY = -8;
        } else if (prop.type === 'prop_mr_prog') {
          solidRadius = 12;
        }

        const dist = Math.hypot(sx - propScreen.x, sy - (propScreen.y + offsetY));
        if (dist <= solidRadius) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Returns the floor tile type at continuous screen coordinates
   */
  public getTileAtScreen(sx: number, sy: number): FloorTileType | null {
    const { gx, gy } = snapToGrid(sx, sy);
    return this.data.tiles[`${gx},${gy}`] || null;
  }

  /**
   * Returns conveyor drift velocity (px/s) if standing on a conveyor tile
   */
  public getConveyorForce(sx: number, sy: number): Point2D | null {
    const tile = this.getTileAtScreen(sx, sy);
    if (!tile) return null;

    const speed = 120;
    const invSqrt5 = 1 / Math.sqrt(5);
    const speedX = speed * 2 * invSqrt5;
    const speedY = speed * 1 * invSqrt5;

    // Parallel to isometric diagonals:
    // conveyor_e: Down-Right (SE along +gx)
    if (tile === 'special_conveyor_e') return { x: speedX, y: speedY };
    // conveyor_w: Up-Left (NW along -gx)
    if (tile === 'special_conveyor_w') return { x: -speedX, y: -speedY };
    // conveyor_s: Down-Left (SW along +gy)
    if (tile === 'special_conveyor_s') return { x: -speedX, y: speedY };
    // conveyor_n: Up-Right (NE along -gy)
    if (tile === 'special_conveyor_n') return { x: speedX, y: -speedY };

    return null;
  }

  /**
   * Checks if standing on an ice tile
   */
  public isIceAt(sx: number, sy: number): boolean {
    const tile = this.getTileAtScreen(sx, sy);
    return tile === 'special_ice';
  }

  /**
   * Finds any interactive prop within range of (sx, sy)
   */
  public getNearbyInteractiveProp(sx: number, sy: number, maxDistance: number = 36): PropInstance | null {
    let closest: PropInstance | null = null;
    let closestDist = maxDistance;

    for (const prop of this.data.props) {
      const propScreen = worldToScreen(prop.gx, prop.gy);
      const dist = Math.hypot(sx - propScreen.x, sy - propScreen.y);
      if (dist <= closestDist) {
        closestDist = dist;
        closest = prop;
      }
    }

    return closest;
  }

  /**
   * BBS interaction compatibility
   */
  public isNearBBS(sx: number, sy: number): boolean {
    const bbs = this.data.props.find(p => p.type === 'prop_bbs');
    if (!bbs) return false;
    const pos = worldToScreen(bbs.gx, bbs.gy);
    return Math.hypot(sx - pos.x, sy - pos.y) <= 42;
  }

  public get bbsPosition(): Point2D {
    const bbs = this.data.props.find(p => p.type === 'prop_bbs');
    if (bbs) {
      return worldToScreen(bbs.gx, bbs.gy);
    }
    return { x: 575, y: 75 };
  }

  public getBBSStandPosition(): Point2D {
    const bbs = this.data.props.find(p => p.type === 'prop_bbs');
    if (bbs) {
      // Step 1 tile South of the BBS
      return worldToScreen(bbs.gx, bbs.gy + 1);
    }
    return { x: 575, y: 100 };
  }

  /**
   * Collects mystery data crystal if not already collected
   */
  public collectMysteryData(propId: string): { reward: any; name: string } | null {
    const propIndex = this.data.props.findIndex(p => p.id === propId);
    if (propIndex === -1) return null;

    const prop = this.data.props[propIndex];
    if (prop.config?.reward && !prop.config.reward.collected) {
      prop.config.reward.collected = true;
      const reward = prop.config.reward;
      const name = prop.config.name || 'Mystery Data';
      // Remove crystal from map after collection
      this.data.props.splice(propIndex, 1);
      this.saveCurrentMap();
      return { reward, name };
    }

    return null;
  }

  /**
   * Recalculates skirts for the map (called after editing)
   */
  public updateSkirts(): void {
    this.data.skirts = generateSkirtsForTiles(this.data.tiles, this.data.theme);
  }
}
