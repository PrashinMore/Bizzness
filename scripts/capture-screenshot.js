/**
 * Capture a hero screenshot for docs/images/screenshot.png
 *
 * Prerequisites:
 *   npx playwright install chromium
 *
 * Usage:
 *   node scripts/capture-screenshot.js
 *   BASE_URL=https://www.ezcommerse.com/ node scripts/capture-screenshot.js
 *   BASE_URL=http://localhost:3000 OUT=docs/images/screenshot.png node scripts/capture-screenshot.js
 *
 * By default this targets the live demo so you do not need a local stack.
 * For a local capture, start webFe (`npm run dev` in webFe/) first, then set BASE_URL.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  const baseUrl = process.env.BASE_URL || 'https://www.ezcommerse.com/';
  const outRel = process.env.OUT || 'docs/images/screenshot.png';
  const outPath = path.resolve(__dirname, '..', outRel);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  console.log(`Navigating to ${baseUrl}`);
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60_000 });
  // Give client-side hydration a beat on SPA-ish pages
  await page.waitForTimeout(1500);

  await page.screenshot({ path: outPath, fullPage: false });
  await browser.close();

  console.log(`Saved screenshot to ${outPath}`);
  console.log('If this is a login wall, sign in once locally and re-run with BASE_URL=http://localhost:3000 after navigating is adjusted, or capture manually.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
