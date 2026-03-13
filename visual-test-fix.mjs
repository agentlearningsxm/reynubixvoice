import { chromium } from 'playwright';

const URL = 'https://reynubixvoice.vercel.app/';
const DIR = './test-screenshots';

async function run() {
  const browser = await chromium.launch({ headless: true });

  // ── Fix 1: Find referral section ──
  console.log('\n=== Finding referral section ===');
  const ctx1 = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page1 = await ctx1.newPage();
  await page1.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page1.waitForTimeout(3000);

  // List all section IDs
  const sectionIds = await page1.evaluate(() => {
    const sections = document.querySelectorAll('section, [id]');
    return Array.from(sections)
      .map((el) => ({
        tag: el.tagName,
        id: el.id,
        className: el.className?.toString()?.substring(0, 80),
      }))
      .filter((s) => s.id);
  });
  console.log('  All IDs found:');
  for (const s of sectionIds) {
    console.log(`    ${s.tag} #${s.id} class="${s.className}"`);
  }

  // Try referral variants
  for (const sel of [
    '#referral-section',
    '#referral',
    '#refer',
    '[class*="referral"]',
    '[id*="referral"]',
    '[id*="refer"]',
  ]) {
    const count = await page1.locator(sel).count();
    if (count > 0) {
      await page1.locator(sel).first().scrollIntoViewIfNeeded();
      await page1.waitForTimeout(500);
      await page1.screenshot({ path: `${DIR}/section-referral.png` });
      console.log(`  [OK] referral found via: ${sel}`);
      break;
    }
  }

  // ── Fix 2: Carousel buttons ──
  console.log('\n=== Carousel buttons test ===');
  const comparison = page1.locator('#comparison');
  if ((await comparison.count()) > 0) {
    await comparison.scrollIntoViewIfNeeded();
    await page1.waitForTimeout(1000);

    // List all buttons
    const btns = page1.locator('#comparison button');
    const btnCount = await btns.count();
    console.log(`  Found ${btnCount} buttons in #comparison`);

    for (let i = 0; i < btnCount; i++) {
      const html = await btns
        .nth(i)
        .evaluate((el) => el.outerHTML.substring(0, 200));
      console.log(`    Button ${i}: ${html}`);
    }

    await page1.screenshot({ path: `${DIR}/interaction-carousel-before.png` });

    if (btnCount >= 1) {
      // Click all navigation-like buttons
      for (let i = 0; i < btnCount; i++) {
        try {
          const visible = await btns.nth(i).isVisible();
          if (visible) {
            await btns.nth(i).click();
            await page1.waitForTimeout(1000);
            await page1.screenshot({
              path: `${DIR}/interaction-carousel-click-${i}.png`,
            });
            console.log(`  [OK] Clicked button ${i}`);
          }
        } catch (e) {
          console.log(`  [SKIP] Button ${i}: ${e.message.substring(0, 100)}`);
        }
      }
    }
  }

  // ── Fix 3: Theme toggle (find the correct button) ──
  console.log('\n=== Theme toggle test ===');
  await page1.evaluate(() => window.scrollTo(0, 0));
  await page1.waitForTimeout(500);

  // List all nav buttons
  const navBtns = page1.locator('nav button, header button');
  const navBtnCount = await navBtns.count();
  console.log(`  Found ${navBtnCount} nav/header buttons`);

  for (let i = 0; i < navBtnCount; i++) {
    try {
      const html = await navBtns.nth(i).evaluate((el) => ({
        html: el.outerHTML.substring(0, 300),
        visible: el.offsetParent !== null,
        rect: el.getBoundingClientRect(),
      }));
      console.log(
        `    Button ${i}: visible=${html.visible} pos=(${Math.round(html.rect.x)},${Math.round(html.rect.y)}) ${html.html.substring(0, 150)}`,
      );
    } catch (_e) {}
  }

  // Try to find visible theme toggle
  const visibleThemeBtns = page1.locator(
    'nav button:visible, header button:visible',
  );
  const visCount = await visibleThemeBtns.count();
  console.log(`  Visible nav buttons: ${visCount}`);

  // Try clicking theme-related visible buttons
  for (let i = 0; i < visCount; i++) {
    const html = await visibleThemeBtns.nth(i).evaluate((el) => el.innerHTML);
    if (
      html.includes('moon') ||
      html.includes('sun') ||
      html.includes('Moon') ||
      html.includes('Sun')
    ) {
      await page1.screenshot({ path: `${DIR}/interaction-theme-before.png` });
      await visibleThemeBtns.nth(i).click();
      await page1.waitForTimeout(1500);
      await page1.screenshot({ path: `${DIR}/interaction-theme-after.png` });
      console.log(`  [OK] Theme toggled via button ${i}`);
      break;
    }
  }

  // ── Fix 4: Language switcher details ──
  console.log('\n=== Language switcher detail ===');
  await page1.evaluate(() => window.scrollTo(0, 0));
  await page1.waitForTimeout(500);

  const langEls = page1.locator('text=/^EN$|^NL$|^DE$|^ES$/');
  const langCount = await langEls.count();
  console.log(`  Lang elements: ${langCount}`);

  if (langCount > 0) {
    await page1.screenshot({ path: `${DIR}/interaction-lang-before.png` });
    await langEls.first().click();
    await page1.waitForTimeout(1500);
    await page1.screenshot({ path: `${DIR}/interaction-lang-dropdown.png` });

    // Try clicking a different lang
    const nlEl = page1.locator('text=/^NL$/');
    if ((await nlEl.count()) > 0) {
      await nlEl.first().click();
      await page1.waitForTimeout(2000);
      await page1.screenshot({
        path: `${DIR}/interaction-lang-switched-nl.png`,
      });
      console.log('  [OK] Switched to NL');
    }
  }

  await ctx1.close();
  await browser.close();
  console.log('\n=== Fix tests done ===');
}

run().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
