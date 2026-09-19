// Main Canvas 2D render loop, animated cyber background, depth sorting, and input dispatcher

import { ACDCSquareMap } from '../world/ACDCSquareMap';
import { MegaMan } from '../entities/MegaMan';
import { Camera } from './Camera';
import { Pathfinder } from './Pathfinder';
import { BBSView } from '../bbs/BBSView';
import { AudioManager } from '../audio/AudioManager';
import { inputToVector } from './Isometric';

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

  private map: ACDCSquareMap;
  private megaman: MegaMan;
  private camera: Camera;
  private pathfinder: Pathfinder;
  private bbsView: BBSView;
  private audio: AudioManager;

  // Assets
  private mapImage: HTMLImageElement | null = null;
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

  constructor(
    canvas: HTMLCanvasElement,
    map: ACDCSquareMap,
    megaman: MegaMan,
    camera: Camera,
    pathfinder: Pathfinder,
    bbsView: BBSView,
    audio: AudioManager
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.map = map;
    this.megaman = megaman;
    this.camera = camera;
    this.pathfinder = pathfinder;
    this.bbsView = bbsView;
    this.audio = audio;

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

    try {
      const [mapImg, atlasImg, bgImg] = await Promise.all([
        loadImage('/assets/acdc_square_perfect.png'),
        loadImage('/assets/megaman_atlas.png'),
        loadImage('/assets/cyber_bg.png')
      ]);

      this.mapImage = mapImg;
      this.atlasImage = atlasImg;

      // Create repeating pattern for background
      this.bgPattern = this.ctx.createPattern(bgImg, 'repeat');
    } catch (e) {
      console.error('Error loading game assets:', e);
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
      // Audio initialize on first user gesture
      if (!this.hasJackedIn) {
        this.jackIn();
      }

      // If BBS dialog is open, skip overworld movement keys
      if (this.bbsView.isOpen()) return;

      this.keys[e.key.toLowerCase()] = true;

      // Space / Enter / E: Interact with BBS if near
      if (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'e') {
        if (this.map.isNearBBS(this.megaman.x, this.megaman.y)) {
          e.preventDefault();
          this.interactWithBBS();
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

    // Pointer / Mouse / Touch handlers
    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.hasJackedIn) {
        this.jackIn();
      }

      if (this.bbsView.isOpen()) return;

      const rect = this.canvas.getBoundingClientRect();
      const clickScreenX = e.clientX - rect.left;
      const clickScreenY = e.clientY - rect.top;

      const worldTarget = this.camera.canvasToWorld(clickScreenX, clickScreenY);

      // Check if clicked directly on BBS terminal
      const distToBBS = Math.hypot(worldTarget.x - this.map.bbsPosition.x, worldTarget.y - this.map.bbsPosition.y);
      if (distToBBS <= 36) {
        // If already near, open immediately; otherwise run to BBS
        if (this.map.isNearBBS(this.megaman.x, this.megaman.y)) {
          this.interactWithBBS();
          return;
        } else {
          const standPoint = this.map.getBBSStandPosition();
          const path = this.pathfinder.findPath({ x: this.megaman.x, y: this.megaman.y }, standPoint);
          this.megaman.setWaypoints(path);
          this.spawnClickPulse(standPoint.x, standPoint.y);
          return;
        }
      }

      // Click-to-move pathfinding on the platform
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
    this.megaman.direction = 'NE'; // face the BBS screen on the wall
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
    // Check if autostart query param is present
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
    // Cyber stream animation offset
    this.cyberStreamOffset = (this.cyberStreamOffset + dt * 18) % 160;

    // Check if BBS is open
    if (this.bbsView.isOpen()) {
      this.megaman.state = 'idle';
      return;
    }

    // Keyboard input vector
    const up = this.keys['w'] || this.keys['arrowup'];
    const down = this.keys['s'] || this.keys['arrowdown'];
    const left = this.keys['a'] || this.keys['arrowleft'];
    const right = this.keys['d'] || this.keys['arrowright'];
    const keyVec = inputToVector(up, down, left, right);

    this.megaman.update(dt, keyVec);
    this.camera.follow({ x: this.megaman.x, y: this.megaman.y });

    // Check if MegaMan reached BBS stand position from a click on BBS
    if (this.map.isNearBBS(this.megaman.x, this.megaman.y) && !this.megaman.hasWaypoints() && this.megaman.state === 'idle') {
      // Ready to interact
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

    // 1. Draw animated scrolling cyber void background
    ctx.save();
    ctx.fillStyle = '#202848'; // MMBN3 background base dark blue
    ctx.fillRect(0, 0, w, h);

    if (this.bgPattern) {
      // Continuous diagonal stream with subtle distant parallax
      const parallaxFactor = 0.2;
      const bgX = (((this.cyberStreamOffset * 1.5 - this.camera.x * parallaxFactor) % 240) + 240) % 240;
      const bgY = (((this.cyberStreamOffset * 0.75 - this.camera.y * parallaxFactor) % 160) + 160) % 160;
      ctx.translate(bgX, bgY);
      ctx.fillStyle = this.bgPattern;
      ctx.fillRect(-240, -160, w + 480, h + 320);
    }
    ctx.restore();

    // 2. Draw ACDC Square Platform
    if (this.mapImage) {
      const mapCanvasPos = this.camera.worldToCanvas(0, 0);
      const scaledW = Math.round(this.mapImage.width * this.camera.scale);
      const scaledH = Math.round(this.mapImage.height * this.camera.scale);

      ctx.drawImage(
        this.mapImage,
        0, 0, this.mapImage.width, this.mapImage.height,
        mapCanvasPos.x, mapCanvasPos.y, scaledW, scaledH
      );
    }

    // 3. Draw Click-to-Move Target Pulses
    for (const pulse of this.clickPulses) {
      const cp = this.camera.worldToCanvas(pulse.x, pulse.y);
      ctx.save();
      ctx.beginPath();
      // Draw 2:1 isometric diamond target reticle
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

    // 4. Render MegaMan Entity
    if (this.atlasImage) {
      ctx.save();
      // Translate to MegaMan's screen position with camera scale
      const mmPos = this.camera.worldToCanvas(this.megaman.x, this.megaman.y);
      ctx.translate(mmPos.x, mmPos.y);
      ctx.scale(this.camera.scale, this.camera.scale);

      // Render MegaMan with feet anchored at (0, 0)
      const fakePosMegaMan = { ...this.megaman, x: 0, y: 0 };
      this.megaman.render.call(fakePosMegaMan, ctx, this.atlasImage);
      ctx.restore();
    }

    // 5. Render Overhead BBS Prompt Indicator if near BBS
    const isNearBBS = this.map.isNearBBS(this.megaman.x, this.megaman.y);
    if (isNearBBS && !this.bbsView.isOpen()) {
      const mmPos = this.camera.worldToCanvas(this.megaman.x, this.megaman.y - 48);
      this.renderInteractionBubble(ctx, mmPos.x, mmPos.y);
    }
  }

  private renderInteractionBubble(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    const pulse = Math.sin(performance.now() / 150) * 3;
    const y = cy + pulse;

    ctx.save();
    // Exclamation badge
    const bw = 54;
    const bh = 20;
    const bx = Math.round(cx - bw / 2);
    const by = Math.round(y - bh);

    // Box shadow & border
    ctx.fillStyle = '#00e0a0';
    ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);

    ctx.fillStyle = '#102040';
    ctx.fillRect(bx, by, bw, bh);

    // Text
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('! BBS', cx, by + bh / 2 + 1);

    // Pointer notch
    ctx.beginPath();
    ctx.moveTo(cx - 4, by + bh);
    ctx.lineTo(cx + 4, by + bh);
    ctx.lineTo(cx, by + bh + 4);
    ctx.fillStyle = '#00e0a0';
    ctx.fill();
    ctx.restore();
  }
}
