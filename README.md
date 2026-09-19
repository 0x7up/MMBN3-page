# Mega Man Battle Network 3 — ACDC Square

A faithful, pixel-perfect web recreation of the **ACDC Square** cyber area from *Mega Man Battle Network 3 Blue*.

## Features

- **Authentic 2:1 Isometric View**: Pixel-perfect GBA isometric projection with smooth camera tracking.
- **8-Directional Controllable MegaMan**: Full 8-way movement via `WASD` / `Arrow Keys` and click-to-move with A* pathfinding and line-of-sight raycasting.
- **ACDC Square BBS**: Interacting with the BBS terminal on the upper wall opens a game-accurate retro modal dialog pre-seeded with authentic MMBN3 Blue threads (Dex, SciLab, Rank #3 challenge), typewriter text animation with sound blips, and custom message posting saved to `localStorage`.
- **GBA Web Audio Synthesis**: Synthesizes the iconic *"Network is Spreading"* theme and authentic sound effects (menu beeps, confirm chimes, cancel whooshes, text blips, footsteps).

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Controls

- **Movement**: `W`, `A`, `S`, `D` or `Arrow Keys`
- **Click-to-Move**: Click or tap anywhere on the platform
- **BBS Interaction**: Walk up to the BBS monitor on the upper platform and press `Space` / `Enter` / `E`, or click directly on the monitor
- **Mute / Unmute**: Press `M` or click the sound button in the HUD
