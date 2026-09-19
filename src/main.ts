// Application entrypoint for Mega Man Battle Network 3 Isometric Engine & Map Builder

import './style.css';
import { CustomMap } from './world/CustomMap';
import { MegaMan } from './entities/MegaMan';
import { Camera } from './engine/Camera';
import { Pathfinder } from './engine/Pathfinder';
import { BBSManager } from './bbs/BBSManager';
import { BBSView } from './bbs/BBSView';
import { AudioManager } from './audio/AudioManager';
import { Renderer } from './engine/Renderer';
import { MapEditor } from './editor/MapEditor';
import { EditorUI } from './editor/EditorUI';

async function initGame() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('Canvas element not found');

  const audio = new AudioManager();
  const map = new CustomMap();
  const camera = new Camera();
  const pathfinder = new Pathfinder(map);
  const bbsManager = new BBSManager();

  const megaman = new MegaMan(map.spawnPosition, map, audio);

  const bbsView = new BBSView(bbsManager, audio, () => {
    megaman.state = 'idle';
  });

  const editor = new MapEditor(map, camera);
  const editorUI = new EditorUI(editor, map, audio);

  // Re-center and reset MegaMan whenever map changes
  editorUI.setOnMapChanged(() => {
    pathfinder.setMap(map);
    megaman.setMap(map);
    megaman.setPosition(map.spawnPosition.x, map.spawnPosition.y);
    camera.follow(map.spawnPosition, true);
  });

  editorUI.setOnModeChanged((isEdit) => {
    if (isEdit) {
      megaman.state = 'idle';
      megaman.clearWaypoints();
    }
  });

  const renderer = new Renderer(
    canvas,
    map,
    megaman,
    camera,
    pathfinder,
    bbsView,
    audio,
    editor,
    editorUI
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

  // Load assets and start loop
  await renderer.loadAssets();
  renderer.start();

  // Expose on window for diagnostics, automated testing, and console commands
  (window as any).__game = { audio, map, camera, megaman, renderer, editor, editorUI };
}

window.addEventListener('DOMContentLoaded', () => {
  initGame().catch(console.error);
});
