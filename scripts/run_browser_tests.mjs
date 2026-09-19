import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = '/Users/subze/.gemini/antigravity/brain/f7a7e816-6bb2-4ff7-91f0-6ce62aace882';

async function runTests() {
  console.log('--- Starting MMBN3 Browser Tests (Shop Barrier & NPC Face) ---');

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

  await page.waitForSelector('#jack-in-overlay');
  console.log('Dismissing Jack-in prompt...');
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 600));

  // 1. Capture close-up of Shop NPCs (Merchant face fixed)
  console.log('Testing Shop NPC face rendering...');
  await page.evaluate(() => {
    const g = window.__game;
    // Pan camera directly to shop area
    g.megaman.x = 280;
    g.megaman.y = 195;
    g.megaman.direction = 'W';
    g.camera.follow({ x: 230, y: 180 }, true);
  });
  await new Promise((r) => setTimeout(r, 400));
  const shopNpcPath = path.join(ARTIFACT_DIR, 'test_shop_npc_face_fixed.png');
  await page.screenshot({ path: shopNpcPath });
  console.log('✓ Captured shop NPC screenshot at:', shopNpcPath);

  // 2. Test Invisible Barrier at Shop ONLY
  console.log('Testing Shop barrier collision...');
  await page.evaluate(() => {
    const g = window.__game;
    g.megaman.x = 260;
    g.megaman.y = 190;
  });
  await page.keyboard.down('KeyA');
  await new Promise((r) => setTimeout(r, 600));
  await page.keyboard.up('KeyA');
  const shopState = await page.evaluate(() => {
    const g = window.__game;
    return {
      finalX: g.megaman.x,
      isCounterWalkable: g.map.isWalkable(190, 190),
      isPurpleNaviWalkable: g.map.isWalkable(160, 175),
      isGreenMerchantWalkable: g.map.isWalkable(185, 165)
    };
  });
  console.log('Shop barrier test results:', shopState);
  if (shopState.isCounterWalkable || shopState.isPurpleNaviWalkable || shopState.isGreenMerchantWalkable) {
    throw new Error('Shop counter & NPCs must be blocked!');
  }
  if (shopState.finalX < 245) {
    throw new Error(`MegaMan clipped into shop counter! finalX: ${shopState.finalX}`);
  }
  const shopBarrierPath = path.join(ARTIFACT_DIR, 'test_barrier_shop_only.png');
  await page.screenshot({ path: shopBarrierPath });
  console.log('✓ Shop barrier blocked MegaMan at:', shopState.finalX);

  // 3. Test BBS Free Access (No barriers)
  console.log('Testing BBS access (no barriers)...');
  await page.evaluate(() => {
    const g = window.__game;
    g.megaman.x = 575;
    g.megaman.y = 90;
    g.camera.follow({ x: 575, y: 90 }, true);
  });
  await new Promise((r) => setTimeout(r, 300));
  const bbsFreeWalkable = await page.evaluate(() => {
    const g = window.__game;
    return g.map.isWalkable(575, 75);
  });
  console.log('BBS terminal walkable:', bbsFreeWalkable);
  if (!bbsFreeWalkable) {
    throw new Error('BBS platform should be freely walkable!');
  }
  const bbsFreePath = path.join(ARTIFACT_DIR, 'test_bbs_free_access.png');
  await page.screenshot({ path: bbsFreePath });
  console.log('✓ Captured BBS free access screenshot at:', bbsFreePath);

  // 4. Test Warp Platform Free Access (No barriers on beacon or pad)
  console.log('Testing Warp platform access (no barriers)...');
  await page.evaluate(() => {
    const g = window.__game;
    g.megaman.x = 95;
    g.megaman.y = 330;
    g.camera.follow({ x: 95, y: 330 }, true);
  });
  await new Promise((r) => setTimeout(r, 300));
  const warpPadWalkable = await page.evaluate(() => {
    const g = window.__game;
    return g.map.isWalkable(95, 330);
  });
  console.log('Warp pad walkable:', warpPadWalkable);
  if (!warpPadWalkable) {
    throw new Error('Warp platform should be freely walkable!');
  }
  const warpPath = path.join(ARTIFACT_DIR, 'test_warp_pad_free_access.png');
  await page.screenshot({ path: warpPath });
  console.log('✓ Captured Warp pad screenshot at:', warpPath);

  await browser.close();
  console.log('--- All tests passed successfully! ---');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
