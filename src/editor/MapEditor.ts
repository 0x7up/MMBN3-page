// MMBN3 Map Editor State, Tools, Prefabs, and Brush Engine

import { snapToGrid } from '../engine/Isometric';
import { CustomMap } from '../world/CustomMap';
import { FloorTileType, PropType, PropInstance } from '../world/MapData';
import { Camera } from '../engine/Camera';

export type EditorTool = 'brush' | 'eraser' | 'bucket' | 'prefab' | 'prop';

export type PrefabType = 'plaza_7x7' | 'island_3x3' | 'bridge_h_4x1' | 'bridge_v_1x4' | 'warp_island' | 'conveyor_loop';

export interface PrefabDef {
  id: PrefabType;
  name: string;
  width: number;
  height: number;
  tiles: { dx: number; dy: number; tileType?: FloorTileType }[];
  props?: { dx: number; dy: number; propType: PropType; config?: any }[];
}

export const PREFABS: Record<PrefabType, PrefabDef> = {
  plaza_7x7: {
    id: 'plaza_7x7',
    name: '7x7 Plaza',
    width: 7,
    height: 7,
    tiles: (() => {
      const arr = [];
      for (let x = 0; x < 7; x++) {
        for (let y = 0; y < 7; y++) arr.push({ dx: x, dy: y });
      }
      return arr;
    })()
  },
  island_3x3: {
    id: 'island_3x3',
    name: '3x3 Island',
    width: 3,
    height: 3,
    tiles: (() => {
      const arr = [];
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) arr.push({ dx: x, dy: y });
      }
      return arr;
    })()
  },
  bridge_h_4x1: {
    id: 'bridge_h_4x1',
    name: '4x1 Bridge (H)',
    width: 4,
    height: 1,
    tiles: [
      { dx: 0, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 2, dy: 0 },
      { dx: 3, dy: 0 }
    ]
  },
  bridge_v_1x4: {
    id: 'bridge_v_1x4',
    name: '1x4 Bridge (V)',
    width: 1,
    height: 4,
    tiles: [
      { dx: 0, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: 2 },
      { dx: 0, dy: 3 }
    ]
  },
  warp_island: {
    id: 'warp_island',
    name: 'Warp Island (3x3)',
    width: 3,
    height: 3,
    tiles: (() => {
      const arr = [];
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) arr.push({ dx: x, dy: y });
      }
      return arr;
    })(),
    props: [{ dx: 1, dy: 1, propType: 'prop_warp_pad', config: { name: 'Warp Pad', isSolid: false } }]
  },
  conveyor_loop: {
    id: 'conveyor_loop',
    name: 'Conveyor Loop (3x3)',
    width: 3,
    height: 3,
    tiles: [
      { dx: 0, dy: 0, tileType: 'special_conveyor_e' },
      { dx: 1, dy: 0, tileType: 'special_conveyor_e' },
      { dx: 2, dy: 0, tileType: 'special_conveyor_s' },
      { dx: 2, dy: 1, tileType: 'special_conveyor_s' },
      { dx: 2, dy: 2, tileType: 'special_conveyor_w' },
      { dx: 1, dy: 2, tileType: 'special_conveyor_w' },
      { dx: 0, dy: 2, tileType: 'special_conveyor_n' },
      { dx: 0, dy: 1, tileType: 'special_conveyor_n' },
      { dx: 1, dy: 1 } // center floor
    ]
  }
};

export class MapEditor {
  public isEditMode: boolean = false;
  public activeTool: EditorTool = 'brush';
  public selectedFloor: FloorTileType = 'floor';
  public selectedPrefab: PrefabType = 'plaza_7x7';
  public selectedProp: PropType = 'prop_mr_prog';

  public hoverGrid: { gx: number; gy: number } | null = null;
  public isMouseDown: boolean = false;
  private lastPaintedCoord: string | null = null;

  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private maxHistory = 25;

  private map: CustomMap;
  private camera: Camera;

  // Callback to open prop inspector modal
  public onOpenPropInspector: ((prop: PropInstance) => void) | null = null;

  constructor(map: CustomMap, camera: Camera) {
    this.map = map;
    this.camera = camera;
  }

  public setMode(edit: boolean): void {
    this.isEditMode = edit;
    if (edit) {
      this.saveHistorySnapshot();
    }
  }

  public toggleMode(): boolean {
    this.setMode(!this.isEditMode);
    return this.isEditMode;
  }

  public getResolvedFloorType(): FloorTileType {
    if (this.selectedFloor === 'floor') {
      return `${this.map.data.theme}_floor` as FloorTileType;
    }
    return this.selectedFloor;
  }

  private saveHistorySnapshot(): void {
    const json = JSON.stringify(this.map.data);
    if (this.undoStack.length === 0 || this.undoStack[this.undoStack.length - 1] !== json) {
      this.undoStack.push(json);
      if (this.undoStack.length > this.maxHistory) {
        this.undoStack.shift();
      }
      this.redoStack = [];
    }
  }

  public undo(): boolean {
    if (this.undoStack.length <= 1) return false;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    const prev = this.undoStack[this.undoStack.length - 1];
    this.map.data = JSON.parse(prev);
    this.map.updateSkirts();
    this.map.saveCurrentMap();
    return true;
  }

  public redo(): boolean {
    if (this.redoStack.length === 0) return false;
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    this.map.data = JSON.parse(next);
    this.map.updateSkirts();
    this.map.saveCurrentMap();
    return true;
  }

  public handlePointerMove(screenX: number, screenY: number): void {
    if (!this.isEditMode) return;

    const world = this.camera.canvasToWorld(screenX, screenY);
    const grid = snapToGrid(world.x, world.y);
    this.hoverGrid = grid;

    if (this.isMouseDown) {
      const coordKey = `${grid.gx},${grid.gy}`;
      if (coordKey !== this.lastPaintedCoord) {
        this.lastPaintedCoord = coordKey;
        if (this.activeTool === 'brush') {
          this.paintTile(grid.gx, grid.gy);
        } else if (this.activeTool === 'eraser') {
          this.eraseTile(grid.gx, grid.gy);
        }
      }
    }
  }

  public handlePointerDown(screenX: number, screenY: number): void {
    if (!this.isEditMode) return;

    this.isMouseDown = true;
    const world = this.camera.canvasToWorld(screenX, screenY);
    const grid = snapToGrid(world.x, world.y);
    this.hoverGrid = grid;
    this.lastPaintedCoord = `${grid.gx},${grid.gy}`;

    this.saveHistorySnapshot();

    switch (this.activeTool) {
      case 'brush':
        this.paintTile(grid.gx, grid.gy);
        break;
      case 'eraser':
        this.eraseTile(grid.gx, grid.gy);
        break;
      case 'bucket':
        this.bucketFill(grid.gx, grid.gy);
        break;
      case 'prefab':
        this.stampPrefab(grid.gx, grid.gy);
        break;
      case 'prop':
        this.handlePropPlacement(grid.gx, grid.gy);
        break;
    }
  }

  public handlePointerUp(): void {
    if (!this.isEditMode) return;
    this.isMouseDown = false;
    this.lastPaintedCoord = null;
    this.map.updateSkirts();
    this.map.saveCurrentMap();
  }

  public paintTile(gx: number, gy: number): void {
    const tileType = this.getResolvedFloorType();
    this.map.data.tiles[`${gx},${gy}`] = tileType;
  }

  public eraseTile(gx: number, gy: number): void {
    const key = `${gx},${gy}`;
    delete this.map.data.tiles[key];
    // Remove any prop that was on this tile
    this.map.data.props = this.map.data.props.filter(p => !(p.gx === gx && p.gy === gy));
  }

  public bucketFill(startX: number, startY: number): void {
    const startKey = `${startX},${startY}`;
    const targetType = this.map.data.tiles[startKey] || null;
    const fillType = this.getResolvedFloorType();

    if (targetType === fillType) return;

    const queue: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();
    visited.add(startKey);

    let filledCount = 0;
    const maxFill = 200; // safety ceiling

    while (queue.length > 0 && filledCount < maxFill) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;
      const current = this.map.data.tiles[key] || null;

      if (current === targetType) {
        this.map.data.tiles[key] = fillType;
        filledCount++;

        const neighbors: [number, number][] = [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1]
        ];

        for (const [nx, ny] of neighbors) {
          const nKey = `${nx},${ny}`;
          if (!visited.has(nKey)) {
            visited.add(nKey);
            // Only fill existing adjacent tiles if target was a tile, or empty if target was null
            if ((targetType && this.map.data.tiles[nKey] === targetType) || (!targetType && !this.map.data.tiles[nKey] && Math.abs(nx - startX) <= 5 && Math.abs(ny - startY) <= 5)) {
              queue.push([nx, ny]);
            }
          }
        }
      }
    }

    this.map.updateSkirts();
    this.map.saveCurrentMap();
  }

  public stampPrefab(originX: number, originY: number): void {
    const prefab = PREFABS[this.selectedPrefab];
    if (!prefab) return;

    const defaultTile = this.getResolvedFloorType();

    for (const t of prefab.tiles) {
      const gx = originX + t.dx;
      const gy = originY + t.dy;
      this.map.data.tiles[`${gx},${gy}`] = t.tileType || defaultTile;
    }

    if (prefab.props) {
      for (const p of prefab.props) {
        const gx = originX + p.dx;
        const gy = originY + p.dy;
        const newProp: PropInstance = {
          id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: p.propType,
          gx,
          gy,
          config: p.config ? JSON.parse(JSON.stringify(p.config)) : {}
        };
        this.map.data.props.push(newProp);
      }
    }

    this.map.updateSkirts();
    this.map.saveCurrentMap();
  }

  public handlePropPlacement(gx: number, gy: number): void {
    // Check if clicking on an existing prop to inspect/configure it
    const existing = this.map.data.props.find(p => p.gx === gx && p.gy === gy);
    if (existing) {
      if (this.onOpenPropInspector) {
        this.onOpenPropInspector(existing);
      }
      return;
    }

    // Otherwise place a new prop
    const newProp: PropInstance = {
      id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: this.selectedProp,
      gx,
      gy,
      config: this.getDefaultConfigForProp(this.selectedProp)
    };

    // Ensure floor tile exists beneath placed prop
    if (!this.map.data.tiles[`${gx},${gy}`]) {
      this.map.data.tiles[`${gx},${gy}`] = this.getResolvedFloorType();
    }

    this.map.data.props.push(newProp);
    this.map.updateSkirts();
    this.map.saveCurrentMap();

    if (this.onOpenPropInspector) {
      this.onOpenPropInspector(newProp);
    }
  }

  public getDefaultConfigForProp(type: PropType): any {
    switch (type) {
      case 'prop_bbs':
        return {
          name: 'Cyber BBS',
          bbsTitle: `${this.map.data.name.toUpperCase()} BULLETIN BOARD`,
          isSolid: true
        };
      case 'prop_shop':
        return {
          name: 'NetMerchant Shop',
          isSolid: true
        };
      case 'prop_warp_pad':
        return {
          name: 'Warp Portal',
          isSolid: false
        };
      case 'prop_beacon':
        return {
          name: 'Area Core Monolith',
          isSolid: true
        };
      case 'prop_mr_prog':
        return {
          name: 'Mr. Prog',
          dialogue: [
            'Beep boop! Everything is running smoothly in this cyber sector.',
            'Have fun exploring and customizing the Net!'
          ],
          isSolid: true
        };
      case 'prop_mystery_green':
        return {
          name: 'Green Mystery Data',
          reward: { type: 'zenny', amount: 1000, name: '1,000 Zennys' },
          isSolid: false
        };
      case 'prop_mystery_blue':
        return {
          name: 'Blue Mystery Data',
          reward: { type: 'chip', chipName: 'Sword S', name: 'BattleChip: Sword S' },
          isSolid: false
        };
      case 'prop_mystery_purple':
        return {
          name: 'Purple Mystery Data',
          reward: { type: 'chip', chipName: 'HeroSwrd H', name: 'GigaChip: HeroSwrd H' },
          isSolid: false
        };
    }
  }

  public deleteProp(propId: string): void {
    this.saveHistorySnapshot();
    this.map.data.props = this.map.data.props.filter(p => p.id !== propId);
    this.map.saveCurrentMap();
  }

  public clearAllTiles(): void {
    this.saveHistorySnapshot();
    this.map.data.tiles = {};
    this.map.data.skirts = {};
    this.map.data.props = [];
    this.map.saveCurrentMap();
  }
}
