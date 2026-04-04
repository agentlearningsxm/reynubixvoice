/**
 * Mobile Responsiveness Audit — Phase 6
 * Uses Playwright (already installed) to check horizontal overflow, touch targets, text overflow
 * Run: node audit-mobile-phase6.cjs
 */
const { chromium } = require('playwright');

const VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'iPhone Plus', width: 414, height: 896 },
  { name: 'iPad Mini', width: 768, height: 1024 },
];

async function audit() {
  const url = process.env.AUDIT_URL || 'http://localhost:3000';
  console.log(`Auditing: ${url}\n`);

  const browser = await chromium.launch();
  const results = {
    horizontalOverflow: [],
    touchTargets: [],
    textOverflow: [],
    screenshots: [],
  };

  for (const vp of VIEWPORTS) {
    console.log(`\n━━━ ${vp.name} (${vp.width}x${vp.height}) ━━━`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // 1. Horizontal overflow check
      const overflow = await page.evaluate(() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const clientWidth = document.documentElement.clientWidth;
        return { scrollWidth, clientWidth, overflow: scrollWidth - clientWidth };
      });

      if (overflow.overflow > 2) {
        results.horizontalOverflow.push({ viewport: vp.name, ...overflow });
        console.log(`  ❌ Horizontal overflow: ${overflow.overflow}px`);
      } else {
        console.log(`  ✓ No horizontal overflow`);
      }

      // 2. Touch target check
      const smallTargets = await page.evaluate(() => {
        const interactive = document.querySelectorAll('button, a, input[type="range"], input[type="submit"], [role="button"], [role="tab"]');
        const small = [];
        interactive.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            if (rect.width < 44 || rect.height < 44) {
              const style = window.getComputedStyle(el);
              if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                small.push({
                  tag: el.tagName.toLowerCase(),
                  text: (el.textContent || '').trim().slice(0, 40),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                });
              }
            }
          }
        });
        return small.slice(0, 15);
      });

      if (smallTargets.length > 0) {
        results.touchTargets.push({ viewport: vp.name, count: smallTargets.length, items: smallTargets });
        console.log(`  ⚠ ${smallTargets.length} touch targets below 44x44px`);
        smallTargets.slice(0, 3).forEach(t => {
          console.log(`    - <${t.tag}> "${t.text}" (${t.width}x${t.height}px)`);
        });
      } else {
        console.log(`  ✓ All touch targets ≥ 44x44px`);
      }

      // 3. Text overflow check
      const textOverflows = await page.evaluate(() => {
        const allElements = document.querySelectorAll('h1, h2, h3, h4, p, span, label');
        const overflows = [];
        allElements.forEach(el => {
          if (el.scrollWidth > el.clientWidth + 2) {
            const style = window.getComputedStyle(el);
            if (style.overflow !== 'hidden' && style.textOverflow !== 'ellipsis' && !style.webkitLineClamp) {
              overflows.push({
                tag: el.tagName,
                text: el.textContent.slice(0, 60),
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth,
              });
            }
          }
        });
        return overflows.slice(0, 10);
      });

      if (textOverflows.length > 0) {
        results.textOverflow.push({ viewport: vp.name, count: textOverflows.length });
        console.log(`  ⚠ ${textOverflows.length} text elements overflowing`);
      } else {
        console.log(`  ✓ No text overflow`);
      }

      // 4. Screenshot
      const screenshotPath = `test-results/audit-${vp.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      results.screenshots.push({ viewport: vp.name, path: screenshotPath });
      console.log(`  📸 Screenshot: ${screenshotPath}`);

    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }

    await context.close();
  }

  await browser.close();

  // Summary
  console.log('\n═══════════════════════════════════════════');
  console.log('AUDIT SUMMARY');
  console.log('═══════════════════════════════════════════');
  console.log(`Horizontal overflow issues: ${results.horizontalOverflow.length}/${VIEWPORTS.length}`);
  console.log(`Touch target issues: ${results.touchTargets.length}/${VIEWPORTS.length}`);
  console.log(`Text overflow issues: ${results.textOverflow.length}/${VIEWPORTS.length}`);
  console.log(`Screenshots saved: ${results.screenshots.length}`);

  const fs = require('fs');
  fs.writeFileSync('test-results/audit-mobile-phase6.json', JSON.stringify(results, null, 2));
  console.log('\nFull report: test-results/audit-mobile-phase6.json');

  const hasErrors = results.horizontalOverflow.length > 0 || results.textOverflow.length > 0;
  process.exit(hasErrors ? 1 : 0);
}

audit().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
