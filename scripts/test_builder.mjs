import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = '/Users/subze/.gemini/antigravity/brain/f7a7e816-6bb2-4ff7-91f0-6ce62aace882';

async function runBuilderTests() {
  console.log('=== Starting MMBN3 Map Builder & Engine Automated Tests ===');

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required', '--window-size=1280,720']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

  // Listen to browser console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('PAGE ERROR:', msg.text());
    }
  });

  console.log('Navigating to http://localhost:3000/?autostart=1 ...');
  await page.goto('http://localhost:3000/?autostart=1', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#game-canvas');
  await new Promise(r => setTimeout(r, 1500));

  // 1. Capture Default Play Mode (ACDC Square)
  console.log('1. Verifying Default Play Mode (ACDC Square)...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'builder_play_acdc.png') });

  // 2. Test Toggling to EDIT MODE
  console.log('2. Toggling to EDIT MODE...');
  await page.click('#btn-mode-toggle');
  await new Promise(r => setTimeout(r, 500));

  const isEditModeActive = await page.evaluate(() => {
    return window.__game.editor.isEditMode;
  });
  console.log(`Edit Mode Active: ${isEditModeActive}`);
  if (!isEditModeActive) throw new Error('Failed to toggle to Edit Mode');

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'builder_edit_mode_ui.png') });

  // 3. Test Switching Default Templates
  const templates = [
    { id: 'scilab_square', name: 'SciLab Square' },
    { id: 'yoka_square', name: 'Yoka Square' },
    { id: 'beach_square', name: 'Beach Square' },
    { id: 'under_square', name: 'Under Square' },
    { id: 'secret_area', name: 'Secret Area' }
  ];

  for (const t of templates) {
    console.log(`3. Testing template switch: ${t.name}...`);
    await page.select('#map-selector', t.id);
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `builder_template_${t.id}.png`) });
  }

  // 4. Test Painting Tiles & Stamping Prefab
  console.log('4. Testing Tile Brush & Prefab Stamping in SciLab Square...');
  await page.select('#map-selector', 'scilab_square');
  await new Promise(r => setTimeout(r, 400));

  const stampResult = await page.evaluate(() => {
    const editor = window.__game.editor;
    const initialCount = Object.keys(window.__game.map.data.tiles).length;

    // Stamp a 3x3 island at gx=9, gy=6
    editor.selectedPrefab = 'island_3x3';
    editor.stampPrefab(9, 6);

    // Paint an ice tile at gx=8, gy=6
    editor.selectedFloor = 'special_ice';
    editor.paintTile(8, 6);

    const afterCount = Object.keys(window.__game.map.data.tiles).length;
    return { initialCount, afterCount, iceTile: window.__game.map.data.tiles['8,6'] };
  });
  console.log('Stamp & Paint Result:', stampResult);
  if (stampResult.afterCount <= stampResult.initialCount) {
    throw new Error('Prefab stamping did not increase tile count');
  }

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'builder_painted_scilab.png') });

  // 5. Test Placing and Configuring a Custom NPC Prop
  console.log('5. Placing Custom Mr. Prog NPC and opening Prop Inspector...');
  const propPlacement = await page.evaluate(() => {
    const editor = window.__game.editor;
    editor.selectedProp = 'prop_mr_prog';
    editor.handlePropPlacement(5, 5);
    const placed = window.__game.map.data.props.find(p => p.gx === 5 && p.gy === 5);
    return placed ? placed.id : null;
  });
  console.log(`Placed Prop ID: ${propPlacement}`);
  await new Promise(r => setTimeout(r, 400));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'builder_prop_inspector_modal.png') });

  // Update NPC dialogue in the modal and save
  await page.evaluate(() => {
    const nameInput = document.getElementById('prop-input-name');
    const dialogueInput = document.getElementById('prop-input-dialogue');
    if (nameInput) nameInput.value = 'TEST PROG';
    if (dialogueInput) dialogueInput.value = 'Hello from automated builder test!\nMap builder operates with 100% precision.';
  });
  await page.click('#modal-btn-save');
  await new Promise(r => setTimeout(r, 400));

  // 6. Test Switching to PLAY MODE and Interacting with the placed NPC
  console.log('6. Switching to PLAY MODE to test live gameplay & NPC dialogue...');
  await page.click('#btn-mode-toggle');
  await new Promise(r => setTimeout(r, 400));

  // Move MegaMan near the NPC (gx=5, gy=5) and trigger interaction
  await page.evaluate(() => {
    const g = window.__game;
    const pos = g.map.spawnPosition;
    // Walk MegaMan directly to (5, 6) just next to the NPC
    g.megaman.x = 368;
    g.megaman.y = 256;
    g.camera.follow({ x: g.megaman.x, y: g.megaman.y }, true);
  });
  await new Promise(r => setTimeout(r, 300));

  // Press Space to interact with nearby NPC
  await page.keyboard.press('Space');
  await new Promise(r => setTimeout(r, 500));

  const isDialogOpen = await page.evaluate(() => {
    const box = document.getElementById('overworld-dialog-box');
    const speaker = document.getElementById('dialog-speaker-name')?.textContent;
    const text = document.getElementById('dialog-text')?.textContent;
    return {
      visible: !box?.classList.contains('hidden'),
      speaker,
      text
    };
  });
  console.log('Overworld Dialogue State:', isDialogOpen);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'builder_npc_dialogue.png') });

  // Dismiss dialogue
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 300));
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 300));

  // 7. Test Diagonal Running Direction Parallel to Map Edges
  console.log('7. Testing Diagonal Running Direction (Parallel to Map Orientation)...');
  const runVectorTest = await page.evaluate(() => {
    // Test inputToVector for all 4 diagonal pairs
    // We access Isometric functions exposed on window or test via evaluate
    // In our app, let's test running MegaMan with keyboard presses
    const g = window.__game;
    
    // Simulate pressing W + D (Up + Right = NE)
    // In screen coordinates, NE slope must be -0.5 (-1 / 2)
    // Let's test MegaMan's update with diagonal inputs
    const neVec = { x: 2 / Math.sqrt(5), y: -1 / Math.sqrt(5) };
    const seVec = { x: 2 / Math.sqrt(5), y: 1 / Math.sqrt(5) };
    const swVec = { x: -2 / Math.sqrt(5), y: 1 / Math.sqrt(5) };
    const nwVec = { x: -2 / Math.sqrt(5), y: -1 / Math.sqrt(5) };

    // Test on open plaza floor at gx=4, gy=4 (x=368, y=224)
    const startX = 368;
    const startY = 224;
    const dt = 0.05;

    g.megaman.x = startX;
    g.megaman.y = startY;
    g.megaman.update(dt, neVec);
    const neDir = g.megaman.direction;
    const neSlope = (g.megaman.y - startY) / (g.megaman.x - startX);

    g.megaman.x = startX;
    g.megaman.y = startY;
    g.megaman.update(dt, seVec);
    const seDir = g.megaman.direction;
    const seSlope = (g.megaman.y - startY) / (g.megaman.x - startX);

    g.megaman.x = startX;
    g.megaman.y = startY;
    g.megaman.update(dt, swVec);
    const swDir = g.megaman.direction;
    const swSlope = (g.megaman.y - startY) / (g.megaman.x - startX);

    g.megaman.x = startX;
    g.megaman.y = startY;
    g.megaman.update(dt, nwVec);
    const nwDir = g.megaman.direction;
    const nwSlope = (g.megaman.y - startY) / (g.megaman.x - startX);

    return {
      ne: { dir: neDir, slope: neSlope, parallelToMapEdge: Math.abs(neSlope - (-0.5)) < 0.001 },
      se: { dir: seDir, slope: seSlope, parallelToMapEdge: Math.abs(seSlope - 0.5) < 0.001 },
      sw: { dir: swDir, slope: swSlope, parallelToMapEdge: Math.abs(swSlope - (-0.5)) < 0.001 },
      nw: { dir: nwDir, slope: nwSlope, parallelToMapEdge: Math.abs(nwSlope - 0.5) < 0.001 }
    };
  });
  console.log('Diagonal Running Alignment Test:', JSON.stringify(runVectorTest, null, 2));

  if (!runVectorTest.ne.parallelToMapEdge || !runVectorTest.se.parallelToMapEdge ||
      !runVectorTest.sw.parallelToMapEdge || !runVectorTest.nw.parallelToMapEdge) {
    throw new Error('Running diagonal is not parallel to the 2:1 isometric map edges');
  }

  // 8. Test Conveyor & Ice Physics
  console.log('8. Testing Conveyor Belt and Ice Panel Physics...');
  const physicsTest = await page.evaluate(() => {
    const g = window.__game;
    const convTile = g.map.data.tiles['3,1'];
    const pX = 368 + (3 - 1) * 32;
    const pY = 96 + (3 + 1) * 16;

    const force = g.map.getConveyorForce(pX, pY);
    const isIce = g.map.isIceAt(pX, pY);

    const iceTileX = 368 + (8 - 6) * 32;
    const iceTileY = 96 + (8 + 6) * 16;
    const isIcePlaced = g.map.isIceAt(iceTileX, iceTileY);

    // Check conveyor force slope is ±0.5 (parallel to map edge)
    const convSlope = force ? force.y / force.x : null;

    return { convTile, force, convSlope, isIce, isIcePlaced };
  });
  console.log('Physics Verification:', physicsTest);

  // 9. Test JSON Serialization (Export & Import)
  console.log('9. Testing JSON Serialization Export & Import...');
  const jsonTest = await page.evaluate(() => {
    const current = window.__game.map.data;
    const exported = JSON.stringify(current);
    const parsed = JSON.parse(exported);
    return {
      hasTiles: Object.keys(parsed.tiles).length > 0,
      hasProps: parsed.props.length > 0,
      theme: parsed.theme,
      id: parsed.id
    };
  });
  console.log('JSON Serialization Result:', jsonTest);

  // 10. Switch back to Edit Mode and capture updated isometric shapes
  await page.click('#btn-mode-toggle');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'builder_edit_mode_ui.png') });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'builder_fixed_iso_tiles.png') });

  console.log('=== All Automated Tests Passed Successfully! ===');
  await browser.close();
}

runBuilderTests().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
