import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = '/Users/subze/.gemini/antigravity/brain/f7a7e816-6bb2-4ff7-91f0-6ce62aace882';

async function runTests() {
  console.log('--- Starting MMBN3 Automated Browser Tests ---');

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required', '--window-size=1280,720']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

  console.log('Navigating to http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#game-canvas');
  await new Promise((r) => setTimeout(r, 1000));

  // 1. Initial State Screenshot (Prompt overlay visible)
  await page.waitForSelector('#jack-in-overlay');
  console.log('Dismissing Jack-in prompt...');
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 600));

  // Save clean background overworld screenshot
  const cleanBgPath = path.join(ARTIFACT_DIR, 'test_gameplay_clean_bg.png');
  await page.screenshot({ path: cleanBgPath });
  console.log('✓ Captured clean background screenshot at:', cleanBgPath);

  // 2. Test East Movement (Key D)
  console.log('Testing East movement (Key D)...');
  await page.keyboard.down('KeyD');
  await new Promise((r) => setTimeout(r, 600));
  const eastState = await page.evaluate(() => {
    const g = window.__game;
    return { x: g.megaman.x, y: g.megaman.y, dir: g.megaman.direction, state: g.megaman.state };
  });
  console.log('East state:', eastState);
  if (eastState.dir !== 'E') {
    throw new Error(`Expected direction 'E' but got '${eastState.dir}'`);
  }
  const eastPath = path.join(ARTIFACT_DIR, 'test_megaman_east.png');
  await page.screenshot({ path: eastPath });
  await page.keyboard.up('KeyD');
  await new Promise((r) => setTimeout(r, 200));

  // 3. Test West Movement (Key A)
  console.log('Testing West movement (Key A)...');
  await page.keyboard.down('KeyA');
  await new Promise((r) => setTimeout(r, 900));
  const westState = await page.evaluate(() => {
    const g = window.__game;
    return { x: g.megaman.x, y: g.megaman.y, dir: g.megaman.direction, state: g.megaman.state };
  });
  console.log('West state:', westState);
  if (westState.dir !== 'W') {
    throw new Error(`Expected direction 'W' but got '${westState.dir}'`);
  }
  const westPath = path.join(ARTIFACT_DIR, 'test_megaman_west.png');
  await page.screenshot({ path: westPath });
  await page.keyboard.up('KeyA');
  await new Promise((r) => setTimeout(r, 200));

  // 4. Test North Movement (Key W)
  console.log('Testing North movement (Key W)...');
  await page.keyboard.down('KeyW');
  await new Promise((r) => setTimeout(r, 500));
  const northState = await page.evaluate(() => {
    const g = window.__game;
    return { x: g.megaman.x, y: g.megaman.y, dir: g.megaman.direction, state: g.megaman.state };
  });
  console.log('North state:', northState);
  if (northState.dir !== 'N') {
    throw new Error(`Expected direction 'N' but got '${northState.dir}'`);
  }
  const northPath = path.join(ARTIFACT_DIR, 'test_megaman_north.png');
  await page.screenshot({ path: northPath });
  await page.keyboard.up('KeyW');
  await new Promise((r) => setTimeout(r, 200));

  // 5. Test South Movement (Key S)
  console.log('Testing South movement (Key S)...');
  await page.keyboard.down('KeyS');
  await new Promise((r) => setTimeout(r, 500));
  const southState = await page.evaluate(() => {
    const g = window.__game;
    return { x: g.megaman.x, y: g.megaman.y, dir: g.megaman.direction, state: g.megaman.state };
  });
  console.log('South state:', southState);
  if (southState.dir !== 'S') {
    throw new Error(`Expected direction 'S' but got '${southState.dir}'`);
  }
  const southPath = path.join(ARTIFACT_DIR, 'test_megaman_south.png');
  await page.screenshot({ path: southPath });
  await page.keyboard.up('KeyS');
  await new Promise((r) => setTimeout(r, 200));

  // 6. Test Shop Barrier Collision
  console.log('Testing Shop barrier collision...');
  // Move directly into shop counter (x: 180, y: 190)
  await page.evaluate(() => {
    const g = window.__game;
    // Set position right next to the shop counter
    g.megaman.x = 260;
    g.megaman.y = 190;
  });
  // Press left into counter
  await page.keyboard.down('KeyA');
  await new Promise((r) => setTimeout(r, 600));
  await page.keyboard.up('KeyA');
  const shopCollisionState = await page.evaluate(() => {
    const g = window.__game;
    const isCounterWalkable = g.map.isWalkable(190, 190);
    const isPurpleNaviWalkable = g.map.isWalkable(160, 175);
    const isGreenMerchantWalkable = g.map.isWalkable(185, 165);
    return {
      finalX: g.megaman.x,
      finalY: g.megaman.y,
      isCounterWalkable,
      isPurpleNaviWalkable,
      isGreenMerchantWalkable
    };
  });
  console.log('Shop barrier test results:', shopCollisionState);
  if (shopCollisionState.isCounterWalkable || shopCollisionState.isPurpleNaviWalkable || shopCollisionState.isGreenMerchantWalkable) {
    throw new Error('Shop counter / NPCs must NOT be walkable!');
  }
  if (shopCollisionState.finalX < 245) {
    throw new Error(`MegaMan clipped into shop counter! finalX: ${shopCollisionState.finalX}`);
  }
  const shopPath = path.join(ARTIFACT_DIR, 'test_barrier_shop.png');
  await page.screenshot({ path: shopPath });
  console.log('✓ Shop barrier successfully blocked MegaMan at:', shopCollisionState.finalX);

  // 7. Test Bridge & BBS Barrier
  console.log('Testing BBS barrier...');
  await page.evaluate(() => {
    const g = window.__game;
    g.megaman.x = 575;
    g.megaman.y = 95; // In front of BBS terminal
  });
  // Try walking up into the monitors
  await page.keyboard.down('KeyW');
  await new Promise((r) => setTimeout(r, 500));
  await page.keyboard.up('KeyW');
  const bbsBarrierState = await page.evaluate(() => {
    const g = window.__game;
    const isScreenWalkable = g.map.isWalkable(575, 70);
    const isVoidWalkable = g.map.isWalkable(575, 30);
    return {
      finalY: g.megaman.y,
      isScreenWalkable,
      isVoidWalkable
    };
  });
  console.log('BBS barrier test results:', bbsBarrierState);
  if (bbsBarrierState.isScreenWalkable || bbsBarrierState.isVoidWalkable) {
    throw new Error('BBS screen / top void must NOT be walkable!');
  }
  if (bbsBarrierState.finalY < 84) {
    throw new Error(`MegaMan clipped into BBS screens! finalY: ${bbsBarrierState.finalY}`);
  }
  const bbsPath = path.join(ARTIFACT_DIR, 'test_barrier_bbs.png');
  await page.screenshot({ path: bbsPath });
  console.log('✓ BBS barrier successfully blocked MegaMan at:', bbsBarrierState.finalY);

  // 8. Test Audio Engine
  console.log('Testing Audio engine parameters...');
  const audioState = await page.evaluate(() => {
    const g = window.__game;
    const audio = g.audio;
    return {
      isBgmPlaying: audio.isBgmPlaying,
      hasCompressor: !!audio.compressor,
      notesCount: audio.bgmData?.notes.length,
      allowedChannels: Array.from(new Set(audio.bgmData?.notes.map((n) => n.c) || []))
    };
  });
  console.log('Audio engine state:', audioState);
  if (!audioState.hasCompressor) {
    throw new Error('Audio must have a DynamicsCompressor connected!');
  }
  if (!audioState.isBgmPlaying) {
    throw new Error('BGM should be active!');
  }
  const invalidChannels = audioState.allowedChannels.filter((c) => ![0, 1, 2, 3, 9, 10].includes(c));
  if (invalidChannels.length > 0) {
    throw new Error(`Found unexpected clone channels: ${invalidChannels.join(', ')}`);
  }
  console.log('✓ Audio engine has active compressor, 0 duplicate clone channels, notes count:', audioState.notesCount);

  await browser.close();
  console.log('--- All automated tests passed successfully! ---');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
