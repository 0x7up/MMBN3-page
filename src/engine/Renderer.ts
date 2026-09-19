// Main Canvas 2D render loop, isometric tilemap rendering, Y-depth sorting, and editor overlays

import { CustomMap } from '../world/CustomMap';
import { MegaMan } from '../entities/MegaMan';
import { Camera } from './Camera';
import { Pathfinder } from './Pathfinder';
import { BBSView } from '../bbs/BBSView';
import { AudioManager } from '../audio/AudioManager';
import { MapEditor } from '../editor/MapEditor';
import { EditorUI } from '../editor/EditorUI';
import { worldToScreen, inputToVector } from './Isometric';
import { PropInstance } from '../world/MapData';

interface ClickPulse {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  maxRadius: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private map: CustomMap;
  private megaman: MegaMan;
  private camera: Camera;
  private pathfinder: Pathfinder;
  private bbsView: BBSView;
  private audio: AudioManager;
  private editor: MapEditor;
  private editorUI: EditorUI;

  // Assets image cache
  private images: Map<string, HTMLImageElement> = new Map();
  private atlasImage: HTMLImageElement | null = null;
  private bgPattern: CanvasPattern | null = null;

  // Input states
  private keys: { [key: string]: boolean } = {};
  private clickPulses: ClickPulse[] = [];

  // Jack-in state
  private hasJackedIn: boolean = false;

  // Animation timing
  private lastTime: number = performance.now();
  private cyberStreamOffset: number = 0;
  private animTimer: number = 0;

  // Active interaction cooldown
  private interactCooldown: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    map: CustomMap,
    megaman: MegaMan,
    camera: Camera,
    pathfinder: Pathfinder,
    bbsView: BBSView,
    audio: AudioManager,
    editor: MapEditor,
    editorUI: EditorUI
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.map = map;
    this.megaman = megaman;
    this.camera = camera;
    this.pathfinder = pathfinder;
    this.bbsView = bbsView;
    this.audio = audio;
    this.editor = editor;
    this.editorUI = editorUI;

    this.setupCanvas();
    this.setupInputs();
  }

  public async loadAssets(): Promise<void> {
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = src;
      });
    };

    const assetList: { key: string; url: string }[] = [
      { key: 'atlas', url: '/assets/megaman_atlas.png' },
      { key: 'bg', url: '/assets/cyber_bg.png' },
      // Floors
      { key: 'acdc_floor', url: '/assets/tilesets/acdc_floor.png' },
      { key: 'scilab_floor', url: '/assets/tilesets/scilab_floor.png' },
      { key: 'yoka_floor', url: '/assets/tilesets/yoka_floor.png' },
      { key: 'beach_floor', url: '/assets/tilesets/beach_floor.png' },
      { key: 'undernet_floor', url: '/assets/tilesets/undernet_floor.png' },
      { key: 'secret_floor', url: '/assets/tilesets/secret_floor.png' },
      // Specials
      { key: 'special_ice', url: '/assets/tilesets/special_ice.png' },
      { key: 'special_cracked', url: '/assets/tilesets/special_cracked.png' },
      { key: 'special_conveyor_e', url: '/assets/tilesets/special_conveyor_e.png' },
      { key: 'special_conveyor_w', url: '/assets/tilesets/special_conveyor_w.png' },
      { key: 'special_conveyor_s', url: '/assets/tilesets/special_conveyor_s.png' },
      { key: 'special_conveyor_n', url: '/assets/tilesets/special_conveyor_n.png' },
      // Skirts
      { key: 'acdc_skirt_sw', url: '/assets/tilesets/acdc_skirt_sw.png' },
      { key: 'acdc_skirt_se', url: '/assets/tilesets/acdc_skirt_se.png' },
      { key: 'scilab_skirt_sw', url: '/assets/tilesets/scilab_skirt_sw.png' },
      { key: 'scilab_skirt_se', url: '/assets/tilesets/scilab_skirt_se.png' },
      { key: 'yoka_skirt_sw', url: '/assets/tilesets/yoka_skirt_sw.png' },
      { key: 'yoka_skirt_se', url: '/assets/tilesets/yoka_skirt_se.png' },
      { key: 'beach_skirt_sw', url: '/assets/tilesets/beach_skirt_sw.png' },
      { key: 'beach_skirt_se', url: '/assets/tilesets/beach_skirt_se.png' },
      { key: 'undernet_skirt_sw', url: '/assets/tilesets/undernet_skirt_sw.png' },
      { key: 'undernet_skirt_se', url: '/assets/tilesets/undernet_skirt_se.png' },
      { key: 'secret_skirt_sw', url: '/assets/tilesets/secret_skirt_sw.png' },
      { key: 'secret_skirt_se', url: '/assets/tilesets/secret_skirt_se.png' },
      // Props
      { key: 'prop_bbs', url: '/assets/tilesets/prop_bbs.png' },
      { key: 'prop_shop', url: '/assets/tilesets/prop_shop.png' },
      { key: 'prop_warp_pad', url: '/assets/tilesets/prop_warp_pad.png' },
      { key: 'prop_beacon', url: '/assets/tilesets/prop_beacon.png' },
      { key: 'prop_mr_prog', url: '/assets/tilesets/prop_mr_prog.png' },
      { key: 'prop_mystery_green', url: '/assets/tilesets/prop_mystery_green.png' },
      { key: 'prop_mystery_blue', url: '/assets/tilesets/prop_mystery_blue.png' },
      { key: 'prop_mystery_purple', url: '/assets/tilesets/prop_mystery_purple.png' }
    ];

    try {
      await Promise.all(
        assetList.map(async item => {
          const img = await loadImage(item.url);
          this.images.set(item.key, img);
        })
      );

      this.atlasImage = this.images.get('atlas') || null;
      const bgImg = this.images.get('bg');
      if (bgImg) {
        this.bgPattern = this.ctx.createPattern(bgImg, 'repeat');
      }
    } catch (e) {
      console.error('Error loading tileset assets:', e);
    }
  }

  private setupCanvas(): void {
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.canvas.style.width = `${window.innerWidth}px`;
      this.canvas.style.height = `${window.innerHeight}px`;

      this.ctx.scale(dpr, dpr);
      this.ctx.imageSmoothingEnabled = false;

      this.camera.resize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', resize);
    resize();
  }

  private setupInputs(): void {
    // Keyboard handlers
    window.addEventListener('keydown', (e) => {
      if (!this.hasJackedIn) {
        this.jackIn();
      }

      if (this.bbsView.isOpen()) return;

      // When inspector modal is visible, don't capture game movement
      if (document.querySelector('.editor-modal.visible')) return;

      // Mode shortcut: Tab or Backquote toggles edit mode
      if (e.key === '`' || e.key === 'Tab') {
        e.preventDefault();
        this.editor.toggleMode();
        this.editorUI.updateActiveUIState();
        return;
      }

      this.keys[e.key.toLowerCase()] = true;

      // Interaction in Play Mode (Space, Enter, E)
      if (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'e') {
        if (!this.editor.isEditMode) {
          e.preventDefault();
          this.checkPlayModeInteractions();
        }
      }

      // Mute toggle
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        this.audio.toggleMute();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Pointer Move
    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (this.editor.isEditMode) {
        this.editor.handlePointerMove(sx, sy);
      }
    });

    // Pointer Down
    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.hasJackedIn) {
        this.jackIn();
      }

      if (this.bbsView.isOpen()) return;

      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (this.editor.isEditMode) {
        this.editor.handlePointerDown(sx, sy);
        return;
      }

      // Play Mode: Click-to-move / interact
      const worldTarget = this.camera.canvasToWorld(sx, sy);

      // Check click directly on nearby interactive prop
      const prop = this.map.getNearbyInteractiveProp(worldTarget.x, worldTarget.y, 28);
      if (prop) {
        const standPos = worldToScreen(prop.gx, prop.gy + 1);
        const path = this.pathfinder.findPath({ x: this.megaman.x, y: this.megaman.y }, standPos);
        if (path.length > 0) {
          this.megaman.setWaypoints(path);
          this.spawnClickPulse(standPos.x, standPos.y);
        } else {
          this.interactWithProp(prop);
        }
        return;
      }

      // Standard click-to-move
      if (this.map.isWalkable(worldTarget.x, worldTarget.y)) {
        const path = this.pathfinder.findPath(
          { x: this.megaman.x, y: this.megaman.y },
          { x: worldTarget.x, y: worldTarget.y }
        );
        if (path.length > 0) {
          this.megaman.setWaypoints(path);
          this.spawnClickPulse(worldTarget.x, worldTarget.y);
        }
      }
    });

    // Pointer Up
    window.addEventListener('pointerup', () => {
      if (this.editor.isEditMode) {
        this.editor.handlePointerUp();
      }
    });
  }

  private checkPlayModeInteractions(): void {
    if (this.interactCooldown > 0) return;

    // Check BBS first
    if (this.map.isNearBBS(this.megaman.x, this.megaman.y)) {
      this.interactWithBBS();
      return;
    }

    // Check other nearby props (Mr Prog, Mystery Data, Shop)
    const prop = this.map.getNearbyInteractiveProp(this.megaman.x, this.megaman.y, 44);
    if (prop) {
      this.interactWithProp(prop);
    }
  }

  private interactWithProp(prop: PropInstance): void {
    this.interactCooldown = 0.5;

    if (prop.type === 'prop_bbs') {
      this.interactWithBBS();
    } else if (prop.type === 'prop_mr_prog') {
      this.megaman.clearWaypoints();
      this.megaman.state = 'idle';
      const speaker = prop.config?.name || 'Mr. Prog';
      const lines = prop.config?.dialogue || ['Beep boop! Everything is operating normally.'];
      this.editorUI.showNPCDialog(speaker, lines);
    } else if (prop.type.startsWith('prop_mystery_')) {
      const collected = this.map.collectMysteryData(prop.id);
      if (collected) {
        this.audio.playDecision();
        const rName = collected.reward?.name || 'Item';
        this.editorUI.showToastNotification(`DECRYPTED [${collected.name.toUpperCase()}]: Acquired ${rName}!`);
      }
    } else if (prop.type === 'prop_shop') {
      this.editorUI.showToastNotification('NetMerchant: "Welcome! BattleChips and SubChips in stock soon!"');
      this.audio.playSelect();
    }
  }

  private jackIn(): void {
    this.hasJackedIn = true;
    this.audio.init();
    const prompt = document.getElementById('jack-in-overlay');
    if (prompt) {
      prompt.classList.add('dismissed');
      setTimeout(() => prompt.remove(), 400);
    }
  }

  private interactWithBBS(): void {
    this.megaman.clearWaypoints();
    this.megaman.state = 'idle';
    this.megaman.direction = 'NE';
    this.bbsView.open();
  }

  private spawnClickPulse(wx: number, wy: number): void {
    this.clickPulses.push({
      x: wx,
      y: wy,
      radius: 3,
      alpha: 1.0,
      maxRadius: 16
    });
  }

  public start(): void {
    if (window.location.search.includes('autostart')) {
      this.jackIn();
    }
    if (window.location.search.includes('openbbs')) {
      this.jackIn();
      this.interactWithBBS();
    }

    this.lastTime = performance.now();
    this.camera.follow({ x: this.megaman.x, y: this.megaman.y }, true);

    const loop = (currentTime: number) => {
      const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000.0);
      this.lastTime = currentTime;

      this.update(dt);
      this.render();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  private update(dt: number): void {
    this.cyberStreamOffset = (this.cyberStreamOffset + dt * 18) % 160;
    this.animTimer += dt;
    if (this.interactCooldown > 0) this.interactCooldown -= dt;

    if (this.bbsView.isOpen()) {
      this.megaman.state = 'idle';
      return;
    }

    // MegaMan movement in Play Mode
    if (!this.editor.isEditMode) {
      const up = this.keys['w'] || this.keys['arrowup'];
      const down = this.keys['s'] || this.keys['arrowdown'];
      const left = this.keys['a'] || this.keys['arrowleft'];
      const right = this.keys['d'] || this.keys['arrowright'];
      const keyVec = inputToVector(up, down, left, right);

      this.megaman.update(dt, keyVec);
      this.camera.follow({ x: this.megaman.x, y: this.megaman.y });

      // Auto-pickup mystery data if walking over it
      const nearMystery = this.map.data.props.find(
        p => p.type.startsWith('prop_mystery_') && Math.hypot(this.megaman.x - worldToScreen(p.gx, p.gy).x, this.megaman.y - worldToScreen(p.gx, p.gy).y) <= 18
      );
      if (nearMystery) {
        this.interactWithProp(nearMystery);
      }
    }

    // Update click pulses
    for (let i = this.clickPulses.length - 1; i >= 0; i--) {
      const p = this.clickPulses[i];
      p.radius += dt * 35;
      p.alpha -= dt * 2.2;
      if (p.alpha <= 0 || p.radius >= p.maxRadius) {
        this.clickPulses.splice(i, 1);
      }
    }
  }

  private render(): void {
    const { ctx } = this;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw animated cyber void background
    ctx.save();
    const bgTone = this.getBackgroundTone();
    ctx.fillStyle = bgTone;
    ctx.fillRect(0, 0, w, h);

    if (this.bgPattern) {
      const parallaxFactor = 0.2;
      const bgX = (((this.cyberStreamOffset * 1.5 - this.camera.x * parallaxFactor) % 240) + 240) % 240;
      const bgY = (((this.cyberStreamOffset * 0.75 - this.camera.y * parallaxFactor) % 160) + 160) % 160;
      ctx.translate(bgX, bgY);
      ctx.fillStyle = this.bgPattern;
      ctx.fillRect(-240, -160, w + 480, h + 320);
    }
    ctx.restore();

    // 2. Draw Floor Tiles and Skirts
    this.renderTilesAndSkirts();

    // 3. Draw Click-to-Move Target Pulses
    for (const pulse of this.clickPulses) {
      const cp = this.camera.worldToCanvas(pulse.x, pulse.y);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cp.x, cp.y, pulse.radius * this.camera.scale, (pulse.radius / 2) * this.camera.scale, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 248, 216, ${pulse.alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 2 * this.camera.scale, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${pulse.alpha})`;
      ctx.fill();
      ctx.restore();
    }

    // 4. Render Y-Depth Sorted Entities (MegaMan, Mr. Prog, BBS, Shop, Beacon, Mystery Data)
    this.renderYSortedEntities();

    // 5. Render Edit Mode Grid & Placement Preview
    if (this.editor.isEditMode) {
      this.renderEditModeOverlay();
    } else {
      // Play Mode Overhead Interaction Indicators
      this.renderPlayModeIndicators();
    }
  }

  private getBackgroundTone(): string {
    const theme = this.map.data.theme || 'acdc';
    switch (theme) {
      case 'scilab': return '#081830';
      case 'yoka': return '#0a2818';
      case 'beach': return '#28200a';
      case 'undernet': return '#180828';
      case 'secret': return '#04100c';
      default: return '#202848';
    }
  }

  private renderTilesAndSkirts(): void {
    const { ctx } = this;
    const tileKeys = Object.keys(this.map.data.tiles);

    // Sort tiles by gx + gy ascending for natural isometric painter order
    tileKeys.sort((a, b) => {
      const [ax, ay] = a.split(',').map(Number);
      const [bx, by] = b.split(',').map(Number);
      return (ax + ay) - (bx + by);
    });

    const defaultFloorImg = this.images.get(`${this.map.data.theme}_floor`) || this.images.get('acdc_floor');

    for (const key of tileKeys) {
      const [gx, gy] = key.split(',').map(Number);
      const tileType = this.map.data.tiles[key];
      const worldPos = worldToScreen(gx, gy);
      const canvasPos = this.camera.worldToCanvas(worldPos.x, worldPos.y);

      // Floor tile image
      let tileImg = this.images.get(tileType);
      if (!tileImg) {
        tileImg = defaultFloorImg;
      }

      if (tileImg) {
        ctx.drawImage(
          tileImg,
          0, 0, 64, 32,
          canvasPos.x - 32 * this.camera.scale,
          canvasPos.y - 16 * this.camera.scale,
          64 * this.camera.scale,
          32 * this.camera.scale
        );
      }

      // Check and render South-West skirt
      const swKey = `${gx},${gy}_sw`;
      const swType = this.map.data.skirts[swKey];
      if (swType) {
        const swImg = this.images.get(swType) || this.images.get(`${this.map.data.theme}_skirt_sw`);
        if (swImg) {
          ctx.drawImage(
            swImg,
            0, 0, 64, 48,
            canvasPos.x - 32 * this.camera.scale,
            canvasPos.y - 16 * this.camera.scale,
            64 * this.camera.scale,
            48 * this.camera.scale
          );
        }
      }

      // Check and render South-East skirt
      const seKey = `${gx},${gy}_se`;
      const seType = this.map.data.skirts[seKey];
      if (seType) {
        const seImg = this.images.get(seType) || this.images.get(`${this.map.data.theme}_skirt_se`);
        if (seImg) {
          ctx.drawImage(
            seImg,
            0, 0, 64, 48,
            canvasPos.x - 32 * this.camera.scale,
            canvasPos.y - 16 * this.camera.scale,
            64 * this.camera.scale,
            48 * this.camera.scale
          );
        }
      }
    }
  }

  private renderYSortedEntities(): void {
    const { ctx } = this;

    interface RenderEntity {
      y: number;
      draw: () => void;
    }

    const entityList: RenderEntity[] = [];

    // 1. MegaMan entity
    if (this.atlasImage) {
      entityList.push({
        y: this.megaman.y,
        draw: () => {
          ctx.save();
          const mmPos = this.camera.worldToCanvas(this.megaman.x, this.megaman.y);
          ctx.translate(mmPos.x, mmPos.y);
          ctx.scale(this.camera.scale, this.camera.scale);
          const fakePosMegaMan = { ...this.megaman, x: 0, y: 0 };
          this.megaman.render.call(fakePosMegaMan, ctx, this.atlasImage!);
          ctx.restore();
        }
      });
    }

    // 2. Props
    for (const prop of this.map.data.props) {
      const propPos = worldToScreen(prop.gx, prop.gy);
      const propImg = this.images.get(prop.type);
      if (!propImg) continue;

      entityList.push({
        y: propPos.y,
        draw: () => {
          const cp = this.camera.worldToCanvas(propPos.x, propPos.y);
          ctx.save();
          ctx.translate(cp.x, cp.y);
          ctx.scale(this.camera.scale, this.camera.scale);

          if (prop.type === 'prop_mr_prog') {
            // Draw Mr Prog with gentle bob
            const bob = Math.sin(this.animTimer * 4) * 1.5;
            ctx.drawImage(propImg, -12, -33 + bob);
          } else if (prop.type.startsWith('prop_mystery_')) {
            // Floating diamond crystal
            const floatOffset = Math.sin(this.animTimer * 3 + prop.gx) * 3;
            ctx.drawImage(propImg, -12, -33 + floatOffset);
          } else if (prop.type === 'prop_bbs') {
            ctx.drawImage(propImg, -57, -70);
          } else if (prop.type === 'prop_shop') {
            ctx.drawImage(propImg, -50, -78);
          } else if (prop.type === 'prop_warp_pad') {
            ctx.drawImage(propImg, -60, -50);
          } else if (prop.type === 'prop_beacon') {
            ctx.drawImage(propImg, -30, -42);
          } else {
            ctx.drawImage(propImg, -propImg.width / 2, -propImg.height / 2);
          }

          ctx.restore();
        }
      });
    }

    // Sort ascending by anchor Y
    entityList.sort((a, b) => a.y - b.y);

    for (const entity of entityList) {
      entity.draw();
    }
  }

  private renderEditModeOverlay(): void {
    const { ctx } = this;
    const hg = this.editor.hoverGrid;
    if (!hg) return;

    const hp = worldToScreen(hg.gx, hg.gy);
    const cp = this.camera.worldToCanvas(hp.x, hp.y);

    ctx.save();

    // 1. Draw diamond outline around hovered grid tile
    ctx.beginPath();
    ctx.moveTo(cp.x, cp.y - 16 * this.camera.scale);
    ctx.lineTo(cp.x + 32 * this.camera.scale, cp.y);
    ctx.lineTo(cp.x, cp.y + 16 * this.camera.scale);
    ctx.lineTo(cp.x - 32 * this.camera.scale, cp.y);
    ctx.closePath();

    if (this.editor.activeTool === 'eraser') {
      ctx.strokeStyle = '#e83848';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(232, 56, 72, 0.35)';
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#00f0d0';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(0, 240, 208, 0.25)';
      ctx.fill();
      ctx.stroke();
    }

    // 2. Draw placement preview if brush/prop/prefab
    if (this.editor.activeTool === 'brush') {
      const tileType = this.editor.getResolvedFloorType();
      const previewImg = this.images.get(tileType);
      if (previewImg) {
        ctx.globalAlpha = 0.6;
        ctx.drawImage(
          previewImg,
          0, 0, 64, 32,
          cp.x - 32 * this.camera.scale,
          cp.y - 16 * this.camera.scale,
          64 * this.camera.scale,
          32 * this.camera.scale
        );
      }
    } else if (this.editor.activeTool === 'prop') {
      const propImg = this.images.get(this.editor.selectedProp);
      if (propImg) {
        ctx.globalAlpha = 0.7;
        const propType = this.editor.selectedProp;
        let ox = -propImg.width / 2;
        let oy = -propImg.height / 2;
        if (propType === 'prop_mr_prog' || propType.startsWith('prop_mystery_')) {
          ox = -12; oy = -33;
        } else if (propType === 'prop_bbs') {
          ox = -57; oy = -70;
        } else if (propType === 'prop_shop') {
          ox = -50; oy = -78;
        }
        ctx.drawImage(
          propImg,
          cp.x + ox * this.camera.scale,
          cp.y + oy * this.camera.scale,
          propImg.width * this.camera.scale,
          propImg.height * this.camera.scale
        );
      }
    }

    // 3. Coordinate label
    ctx.globalAlpha = 1.0;
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`(${hg.gx}, ${hg.gy})`, cp.x, cp.y - 20 * this.camera.scale);

    ctx.restore();
  }

  private renderPlayModeIndicators(): void {
    const { ctx } = this;

    // BBS Indicator
    if (this.map.isNearBBS(this.megaman.x, this.megaman.y) && !this.bbsView.isOpen()) {
      const mmPos = this.camera.worldToCanvas(this.megaman.x, this.megaman.y - 48);
      this.renderInteractionBubble(ctx, mmPos.x, mmPos.y, '! BBS');
      return;
    }

    // NPC or Mystery Data Indicator
    const prop = this.map.getNearbyInteractiveProp(this.megaman.x, this.megaman.y, 42);
    if (prop) {
      const mmPos = this.camera.worldToCanvas(this.megaman.x, this.megaman.y - 48);
      if (prop.type === 'prop_mr_prog') {
        this.renderInteractionBubble(ctx, mmPos.x, mmPos.y, '! TALK');
      } else if (prop.type.startsWith('prop_mystery_')) {
        this.renderInteractionBubble(ctx, mmPos.x, mmPos.y, '! GET');
      } else if (prop.type === 'prop_shop') {
        this.renderInteractionBubble(ctx, mmPos.x, mmPos.y, '! SHOP');
      }
    }
  }

  private renderInteractionBubble(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string): void {
    const pulse = Math.sin(performance.now() / 150) * 3;
    const y = cy + pulse;

    ctx.save();
    const bw = 60;
    const bh = 20;
    const bx = Math.round(cx - bw / 2);
    const by = Math.round(y - bh);

    ctx.fillStyle = '#00e0a0';
    ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);

    ctx.fillStyle = '#102040';
    ctx.fillRect(bx, by, bw, bh);

    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, by + bh / 2 + 1);

    ctx.beginPath();
    ctx.moveTo(cx - 4, by + bh);
    ctx.lineTo(cx + 4, by + bh);
    ctx.lineTo(cx, by + bh + 4);
    ctx.fillStyle = '#00e0a0';
    ctx.fill();
    ctx.restore();
  }
}
