// Application entrypoint for Mega Man Battle Network 3 "ACDC Square"

import './style.css';
import { ACDCSquareMap } from './world/ACDCSquareMap';
import { MegaMan } from './entities/MegaMan';
import { Camera } from './engine/Camera';
import { Pathfinder } from './engine/Pathfinder';
import { BBSManager } from './bbs/BBSManager';
import { BBSView } from './bbs/BBSView';
import { AudioManager } from './audio/AudioManager';
import { Renderer } from './engine/Renderer';

async function initGame() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('Canvas element not found');

  const audio = new AudioManager();
  const map = new ACDCSquareMap();
  const camera = new Camera();
  const pathfinder = new Pathfinder(map);
  const bbsManager = new BBSManager();

  const megaman = new MegaMan(map.spawnPosition, map, audio);

  const bbsView = new BBSView(bbsManager, audio, () => {
    // When BBS closes, MegaMan remains idle and controllable
    megaman.state = 'idle';
  });

  const renderer = new Renderer(
    canvas,
    map,
    megaman,
    camera,
    pathfinder,
    bbsView,
    audio
  );

  // Setup mute button toggle in HUD
  const muteBtn = document.getElementById('btn-mute-toggle');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const muted = audio.toggleMute();
      muteBtn.textContent = muted ? '🔇 SOUND: OFF' : '🔊 SOUND: ON';
      muteBtn.classList.toggle('muted', muted);
    });
  }

  // Load assets and start game loop
  await renderer.loadAssets();
  renderer.start();
}

window.addEventListener('DOMContentLoaded', () => {
  initGame().catch(console.error);
});
