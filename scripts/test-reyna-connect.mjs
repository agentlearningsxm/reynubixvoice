/**
 * test-reyna-connect.mjs
 * Playwright smoke test for the Reyna voice connection flow.
 * Run: node scripts/test-reyna-connect.mjs
 */
import { chromium } from 'playwright';

const URL = 'http://localhost:3000/';
const TIMEOUT_MS = 30_000;

async function run() {
  console.log('=== Reyna Connect Smoke Test ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--allow-http-screen-capture',
    ],
  });

  const context = await browser.newContext({
    permissions: ['microphone'],
  });

  const page = await context.newPage();

  // Capture all console messages
  const logs = [];
  page.on('console', (msg) => {
    const text = `[browser][${msg.type()}] ${msg.text()}`;
    logs.push(text);
    if (
      msg.type() === 'error' ||
      text.includes('[reyna-connect]') ||
      text.includes('reyna') ||
      text.includes('Gemini') ||
      text.includes('token') ||
      text.includes('voice') ||
      text.includes('AudioContext')
    ) {
      console.log(text);
    }
  });

  page.on('pageerror', (err) => {
    console.error('[page-error]', err.message);
  });

  // Monitor /api/ requests
  page.on('request', (req) => {
    if (req.url().includes('/api/')) {
      console.log(`[network] → ${req.method()} ${req.url().replace('http://localhost:3000', '')}`);
    }
  });
  page.on('response', async (res) => {
    if (res.url().includes('/api/')) {
      let body = '';
      try { body = await res.text(); } catch {}
      const preview = body.length > 150 ? body.slice(0, 150) + '...' : body;
      console.log(`[network] ← ${res.status()} ${res.url().replace('http://localhost:3000', '')} | ${preview}`);
    }
  });

  console.log('1. Navigating to', URL);
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch (e) {
    console.log('   (goto timed out on domcontentloaded, continuing)');
  }

  // Let the React app fully mount and animations settle
  await page.waitForTimeout(3000);
  console.log('2. Page settled.\n');

  // Dump ALL buttons so we can identify the right one
  const buttons = await page.$$eval('button', (els) =>
    els.map((b, i) => ({
      index: i,
      text: b.innerText?.trim().slice(0, 60),
      ariaLabel: b.getAttribute('aria-label'),
      className: b.className?.slice(0, 80),
      visible: b.offsetParent !== null,
    }))
  );
  console.log('All buttons on page:');
  buttons.forEach((b) => {
    if (b.visible) console.log(`  [${b.index}] "${b.text}" | aria="${b.ariaLabel}" | class="${b.className}"`);
  });
  console.log('');

  // Try to find the Reyna voice button
  // Most likely has "Talk to Reyna", "Start talking", mic icon, or similar
  const reynaSelectors = [
    'button:has-text("Talk to Reyna")',
    'button:has-text("Reyna")',
    '[aria-label*="Reyna" i]',
    '[aria-label*="voice" i]',
    '[aria-label*="call" i]',
    'button:has-text("Talk")',
    'button[data-testid*="reyna"]',
    'button[data-testid*="voice"]',
  ];

  let reynaButton = null;
  let matchedSelector = '';
  for (const sel of reynaSelectors) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) {
        reynaButton = el;
        matchedSelector = sel;
        console.log(`3. Found Reyna button: "${sel}"`);
        break;
      }
    } catch {}
  }

  if (!reynaButton) {
    console.error('❌ Could not find Reyna button with any known selector.');
    console.log('   Try scrolling — the widget may be below the fold.');

    // Try scrolling and looking again
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1000);
    for (const sel of reynaSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          reynaButton = el;
          matchedSelector = sel + ' (after scroll)';
          console.log(`   Found after scroll: "${sel}"`);
          break;
        }
      } catch {}
    }
  }

  if (!reynaButton) {
    console.error('Still not found. Full button dump above shows what is available.');
    await browser.close();
    process.exit(1);
  }

  // Scroll button into view and use page.evaluate to fire a trusted click
  // (React synthetic events require a trusted user-gesture — force:true bypasses
  //  animation checks but React still processes it; dispatchEvent is the safest path)
  // The Reyna button is always animated (pulsing) — Playwright's stability checks
  // reject it. Inject the click directly into the DOM, bypassing all checks.
  console.log('4. Injecting click directly into DOM (bypassing animation stability)...\n');

  // Also mock getUserMedia so headless Chrome doesn't fail on real mic access
  await page.evaluate(() => {
    // Patch getUserMedia to return a silent fake stream in headless context
    const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      try {
        return await origGetUserMedia(constraints);
      } catch {
        // Headless fallback: return a silent audio stream via AudioContext
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const dest = ctx.createMediaStreamDestination();
        oscillator.connect(dest);
        oscillator.start();
        return dest.stream;
      }
    };
  });

  const clicked = await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Start voice demo with Reyna"]');
    if (!el) return false;
    el.click();
    return true;
  });

  console.log(`   Button clicked via evaluate: ${clicked}`);

  // Wait and observe
  const deadline = Date.now() + TIMEOUT_MS;
  let connected = false;
  let failed = false;
  let lastStep = '';
  let failedMsg = '';

  while (Date.now() < deadline) {
    await page.waitForTimeout(500);

    for (const log of logs) {
      if (log.includes('step 6')) connected = true;
      if (log.includes('[reyna-connect]')) lastStep = log;
      if (log.includes('connectToGemini FAILED')) {
        failed = true;
        failedMsg = log;
      }
    }

    if (connected || failed) break;

    // Also check page UI for error text
    const errorText = await page.$eval('[class*="error"]', (el) => el.textContent?.trim()).catch(() => null);
    if (errorText) console.log('[ui-error]', errorText);
  }

  console.log('\n=== RESULT ===');
  console.log('Last [reyna-connect] log:', lastStep || '(none reached)');

  if (connected) {
    console.log('✅ SUCCESS: Reyna connected to Gemini (step 6 reached)');
  } else if (failed) {
    console.log('❌ FAILED:', failedMsg);
  } else {
    console.log('⏳ TIMEOUT after', TIMEOUT_MS / 1000, 's — stopped at:', lastStep || 'no step reached');
  }

  if (!connected) {
    console.log('\n--- All captured logs ---');
    logs.forEach((l) => console.log(l));
  }

  await browser.close();
  process.exit(connected ? 0 : 1);
}

run().catch((err) => {
  console.error('Test script crashed:', err.message);
  process.exit(1);
});
