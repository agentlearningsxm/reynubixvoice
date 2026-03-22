import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = 'https://reynubixvoice-landing-page.vercel.app/';
const SCREENSHOT_DIR = './test-screenshots';

const viewports = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

const sections = [
  'receptionist',
  'calculator',
  'solutions',
  'comparison',
  'automations',
  'reviews',
  'referral-section',
];

mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ── PHASE 1: Full-page screenshots at each viewport ──
  console.log('\n=== PHASE 1: Full-page screenshots ===');
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    // Collect console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ viewport: vp.name, text: msg.text() });
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push({
        viewport: vp.name,
        text: `PAGE ERROR: ${err.message}`,
      });
    });

    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000); // Let animations settle

    const path = `${SCREENSHOT_DIR}/fullpage-${vp.name}.png`;
    await page.screenshot({ path, fullPage: true });
    console.log(`  [OK] ${path}`);

    await context.close();
  }

  // ── PHASE 2: Section screenshots (desktop) ──
  console.log('\n=== PHASE 2: Section screenshots (desktop) ===');
  const ctx2 = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page2 = await ctx2.newPage();
  page2.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ viewport: 'desktop-sections', text: msg.text() });
    }
  });
  page2.on('pageerror', (err) => {
    consoleErrors.push({
      viewport: 'desktop-sections',
      text: `PAGE ERROR: ${err.message}`,
    });
  });

  await page2.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page2.waitForTimeout(3000);

  for (const section of sections) {
    try {
      // Try scrolling to the section by ID
      const el = page2.locator(`#${section}`);
      const exists = await el.count();
      if (exists > 0) {
        await el.scrollIntoViewIfNeeded();
        await page2.waitForTimeout(1000);
        const path = `${SCREENSHOT_DIR}/section-${section}.png`;
        await page2.screenshot({ path });
        console.log(`  [OK] section: ${section}`);
      } else {
        // Try by data-section or class
        const altEl = page2.locator(
          `[data-section="${section}"], .${section}, section.${section}`,
        );
        const altExists = await altEl.count();
        if (altExists > 0) {
          await altEl.first().scrollIntoViewIfNeeded();
          await page2.waitForTimeout(1000);
          const path = `${SCREENSHOT_DIR}/section-${section}.png`;
          await page2.screenshot({ path });
          console.log(`  [OK] section (alt): ${section}`);
        } else {
          console.log(`  [MISS] section not found: ${section}`);
        }
      }
    } catch (e) {
      console.log(`  [ERR] section ${section}: ${e.message}`);
    }
  }

  // ── PHASE 2b: Section screenshots (mobile) ──
  console.log('\n=== PHASE 2b: Section screenshots (mobile) ===');
  const ctx2b = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const page2b = await ctx2b.newPage();
  await page2b.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page2b.waitForTimeout(3000);

  for (const section of sections) {
    try {
      const el = page2b.locator(`#${section}`);
      const exists = await el.count();
      if (exists > 0) {
        await el.scrollIntoViewIfNeeded();
        await page2b.waitForTimeout(1000);
        const path = `${SCREENSHOT_DIR}/section-mobile-${section}.png`;
        await page2b.screenshot({ path });
        console.log(`  [OK] mobile section: ${section}`);
      } else {
        const altEl = page2b.locator(
          `[data-section="${section}"], .${section}`,
        );
        const altExists = await altEl.count();
        if (altExists > 0) {
          await altEl.first().scrollIntoViewIfNeeded();
          await page2b.waitForTimeout(1000);
          const path = `${SCREENSHOT_DIR}/section-mobile-${section}.png`;
          await page2b.screenshot({ path });
          console.log(`  [OK] mobile section (alt): ${section}`);
        } else {
          console.log(`  [MISS] mobile section not found: ${section}`);
        }
      }
    } catch (e) {
      console.log(`  [ERR] mobile section ${section}: ${e.message}`);
    }
  }
  await ctx2b.close();

  // ── PHASE 3: Interactions ──
  console.log('\n=== PHASE 3: Interaction tests ===');

  // 3a: 3D Comparison carousel
  console.log('  -- Carousel test --');
  try {
    const carouselSection = page2.locator('#comparison');
    if ((await carouselSection.count()) > 0) {
      await carouselSection.scrollIntoViewIfNeeded();
      await page2.waitForTimeout(1000);
      await page2.screenshot({
        path: `${SCREENSHOT_DIR}/interaction-carousel-before.png`,
      });

      // Try next button
      const nextBtn = page2.locator(
        '#comparison button >> text=/next|→|chevron/i, #comparison [aria-label*="next"], #comparison button:has(svg):last-of-type',
      );
      if ((await nextBtn.count()) > 0) {
        await nextBtn.first().click();
        await page2.waitForTimeout(1500);
        await page2.screenshot({
          path: `${SCREENSHOT_DIR}/interaction-carousel-after-next.png`,
        });
        console.log('  [OK] Carousel next clicked');
      } else {
        // Try any button in comparison section
        const btns = page2.locator('#comparison button');
        const btnCount = await btns.count();
        console.log(`  [INFO] Found ${btnCount} buttons in comparison section`);
        if (btnCount >= 2) {
          await btns.last().click();
          await page2.waitForTimeout(1500);
          await page2.screenshot({
            path: `${SCREENSHOT_DIR}/interaction-carousel-after-click.png`,
          });
          console.log('  [OK] Clicked last button in carousel');
        }
      }
    } else {
      console.log('  [MISS] comparison section not found for carousel');
    }
  } catch (e) {
    console.log(`  [ERR] Carousel: ${e.message}`);
  }

  // 3b: Industry slider
  console.log('  -- Industry slider test --');
  try {
    const slider = page2.locator(
      'input[type="range"], [role="slider"], .slider',
    );
    if ((await slider.count()) > 0) {
      await slider.first().scrollIntoViewIfNeeded();
      await page2.waitForTimeout(500);
      await page2.screenshot({
        path: `${SCREENSHOT_DIR}/interaction-slider-before.png`,
      });
      // Drag it
      const box = await slider.first().boundingBox();
      if (box) {
        await page2.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
        await page2.mouse.down();
        await page2.mouse.move(
          box.x + box.width * 0.8,
          box.y + box.height / 2,
          { steps: 10 },
        );
        await page2.mouse.up();
        await page2.waitForTimeout(1000);
        await page2.screenshot({
          path: `${SCREENSHOT_DIR}/interaction-slider-after.png`,
        });
        console.log('  [OK] Slider dragged');
      }
    } else {
      console.log('  [MISS] No slider found');
    }
  } catch (e) {
    console.log(`  [ERR] Slider: ${e.message}`);
  }

  // 3c: Navbar scroll behavior
  console.log('  -- Navbar scroll test --');
  try {
    await page2.evaluate(() => window.scrollTo(0, 0));
    await page2.waitForTimeout(500);
    await page2.screenshot({
      path: `${SCREENSHOT_DIR}/interaction-navbar-top.png`,
    });

    await page2.evaluate(() => window.scrollTo(0, 800));
    await page2.waitForTimeout(1000);
    await page2.screenshot({
      path: `${SCREENSHOT_DIR}/interaction-navbar-scrolled.png`,
    });
    console.log('  [OK] Navbar scroll test done');
  } catch (e) {
    console.log(`  [ERR] Navbar: ${e.message}`);
  }

  // 3d: Theme toggle
  console.log('  -- Theme toggle test --');
  try {
    await page2.evaluate(() => window.scrollTo(0, 0));
    await page2.waitForTimeout(500);

    const themeBtn = page2.locator(
      'button:has(svg[class*="moon"]), button:has(svg[class*="sun"]), [aria-label*="theme"], [aria-label*="dark"], [aria-label*="light"], button:has(.lucide-moon), button:has(.lucide-sun)',
    );
    if ((await themeBtn.count()) > 0) {
      await page2.screenshot({
        path: `${SCREENSHOT_DIR}/interaction-theme-before.png`,
      });
      await themeBtn.first().click();
      await page2.waitForTimeout(1500);
      await page2.screenshot({
        path: `${SCREENSHOT_DIR}/interaction-theme-after.png`,
      });
      console.log('  [OK] Theme toggled');
    } else {
      // Try broader search
      const allBtns = page2.locator('nav button, header button');
      const count = await allBtns.count();
      console.log(`  [INFO] Found ${count} nav/header buttons, trying each...`);
      for (let i = 0; i < Math.min(count, 5); i++) {
        const txt = await allBtns.nth(i).textContent();
        const ariaLabel = await allBtns.nth(i).getAttribute('aria-label');
        console.log(
          `    Button ${i}: text="${txt?.trim()}" aria-label="${ariaLabel}"`,
        );
      }
    }
  } catch (e) {
    console.log(`  [ERR] Theme: ${e.message}`);
  }

  // 3e: Language switcher
  console.log('  -- Language switcher test --');
  try {
    const langBtn = page2.locator(
      '[aria-label*="language"], [aria-label*="lang"], button:has-text("EN"), button:has-text("NL"), select[name*="lang"], .language-switcher',
    );
    if ((await langBtn.count()) > 0) {
      await page2.screenshot({
        path: `${SCREENSHOT_DIR}/interaction-lang-before.png`,
      });
      await langBtn.first().click();
      await page2.waitForTimeout(1500);
      await page2.screenshot({
        path: `${SCREENSHOT_DIR}/interaction-lang-after.png`,
      });
      console.log('  [OK] Language switcher clicked');
    } else {
      console.log('  [MISS] Language switcher not found');
      // Try looking for any element with lang text
      const enEl = page2.locator('text=/^EN$|^NL$|^DE$/');
      if ((await enEl.count()) > 0) {
        console.log(
          `  [INFO] Found ${await enEl.count()} lang-like text elements`,
        );
        await enEl.first().click();
        await page2.waitForTimeout(1500);
        await page2.screenshot({
          path: `${SCREENSHOT_DIR}/interaction-lang-after.png`,
        });
        console.log('  [OK] Clicked lang text element');
      }
    }
  } catch (e) {
    console.log(`  [ERR] Language: ${e.message}`);
  }

  await ctx2.close();

  // ── PHASE 4: Console errors summary ──
  console.log('\n=== PHASE 4: Console errors ===');
  if (consoleErrors.length === 0) {
    console.log('  No console errors detected!');
  } else {
    console.log(`  ${consoleErrors.length} console errors found:`);
    for (const err of consoleErrors) {
      console.log(`  [${err.viewport}] ${err.text.substring(0, 200)}`);
    }
  }

  // ── PHASE 5: Performance ──
  console.log('\n=== PHASE 5: Performance check ===');
  const perfCtx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const perfPage = await perfCtx.newPage();

  const startTime = Date.now();
  await perfPage.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  const loadTime = Date.now() - startTime;
  console.log(`  Page load time (networkidle): ${loadTime}ms`);

  // Check performance metrics
  const perfMetrics = await perfPage.evaluate(() => {
    const entries = performance.getEntriesByType('navigation');
    const nav = entries[0];
    if (nav) {
      return {
        domContentLoaded: Math.round(
          nav.domContentLoadedEventEnd - nav.startTime,
        ),
        loadComplete: Math.round(nav.loadEventEnd - nav.startTime),
        transferSize: Math.round(nav.transferSize / 1024),
      };
    }
    return null;
  });
  if (perfMetrics) {
    console.log(`  DOM Content Loaded: ${perfMetrics.domContentLoaded}ms`);
    console.log(`  Load Complete: ${perfMetrics.loadComplete}ms`);
    console.log(`  Transfer Size: ${perfMetrics.transferSize}KB`);
  }

  // Check for layout shifts
  const cls = await perfPage.evaluate(async () => {
    return new Promise((resolve) => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) clsValue += entry.value;
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(clsValue);
      }, 2000);
    });
  });
  console.log(`  Cumulative Layout Shift (CLS): ${cls.toFixed(4)}`);

  await perfCtx.close();
  await browser.close();

  console.log('\n=== DONE ===');
  console.log(`All screenshots saved to ${SCREENSHOT_DIR}/`);
}

run().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
