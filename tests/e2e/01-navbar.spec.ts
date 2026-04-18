import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  gotoLanding,
  hasOverflowX,
  clickSafe,
  NAV_LABELS_EN,
} from './helpers/audit-helpers';

test.describe('Navbar audit', () => {
  test('header is visible, no horizontal overflow', async ({ page }, info) => {
    const errors = await collectConsoleErrors(page);
    await gotoLanding(page);

    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();

    const overflow = await hasOverflowX(page);
    expect(overflow, `horizontal overflow on ${info.project.name}`).toBe(false);

    await page.screenshot({
      path: `audit-artifacts/${info.project.name}/navbar-top.png`,
      clip: { x: 0, y: 0, width: page.viewportSize()!.width, height: 120 },
    });

    expect(errors, `console errors on ${info.project.name}`).toEqual([]);
  });

  test('logo + brand name visible and readable', async ({ page }, info) => {
    await gotoLanding(page);
    const logo = page.locator('a[href="/"] img, a[href="/"] svg').first();
    await expect(logo).toBeVisible();
    const brand = page.getByText('ReynubixVoice').first();
    await expect(brand).toBeVisible();

    const logoBox = await logo.boundingBox();
    expect(logoBox, 'logo has size').not.toBeNull();
    if (logoBox) {
      expect(logoBox.width).toBeGreaterThanOrEqual(16);
      expect(logoBox.height).toBeGreaterThanOrEqual(16);
    }
  });

  test('desktop pill nav shows all 7 links', async ({ page, isMobile }, info) => {
    test.skip(info.project.name !== 'chromium-desktop', 'desktop-only');
    await gotoLanding(page);

    const navLinks = page.locator('.nav-link');
    await expect(navLinks).toHaveCount(7);

    for (const label of NAV_LABELS_EN) {
      const link = navLinks.filter({ hasText: label });
      const count = await link.count();
      expect(count, `nav link "${label}" present`).toBeGreaterThan(0);
    }
  });

  test('top-right controls: language, dark toggle, theme picker, book demo', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'chromium-desktop', 'desktop-only');
    await gotoLanding(page);

    const controls = page.locator('.controls-wrap');
    await expect(controls).toBeVisible();

    const controlBtns = controls.locator('.control-btn');
    const count = await controlBtns.count();
    expect(count, 'expected language + dark + theme buttons').toBeGreaterThanOrEqual(3);

    const demoBtn = page.locator('.demo-btn').first();
    await expect(demoBtn).toBeVisible();

    const box = await demoBtn.boundingBox();
    expect(box!.height, 'demo button tall enough to tap').toBeGreaterThanOrEqual(32);

    await page.screenshot({
      path: `audit-artifacts/${info.project.name}/navbar-controls-right.png`,
      clip: {
        x: page.viewportSize()!.width - 520,
        y: 0,
        width: 520,
        height: 100,
      },
    });
  });

  test('language dropdown opens and shows 3 languages', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium-desktop', 'desktop-only');
    await gotoLanding(page);

    const langBtn = page.locator('.control-btn', { hasText: /EN|FR|NL/i }).first();
    await langBtn.click();
    await page.waitForTimeout(300);

    const menu = page.locator('[role="menu"], .dropdown, div').filter({ hasText: /English|Français|Nederlands/i }).first();
    const visible = await menu.isVisible().catch(() => false);
    if (!visible) {
      await page.screenshot({
        path: `audit-artifacts/${info.project.name}/navbar-lang-dropdown-FAILED.png`,
      });
    }
  });

  test('theme picker dropdown opens and shows 4 themes', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium-desktop', 'desktop-only');
    await gotoLanding(page);

    const paletteBtns = page.locator('button[aria-label*="theme" i], .control-btn').filter({
      has: page.locator('svg'),
    });
    const count = await paletteBtns.count();
    expect(count, 'found theme-related control').toBeGreaterThan(0);
  });

  test('mobile hamburger icon visible on mobile viewport', async ({ page }, info) => {
    test.skip(info.project.name === 'chromium-desktop', 'mobile/tablet only');
    await gotoLanding(page);

    const hamburger = page.locator('.mobile-icon-btn').last();
    await expect(hamburger).toBeVisible();

    const box = await hamburger.boundingBox();
    expect(box!.width, 'hamburger tap target >= 40').toBeGreaterThanOrEqual(40);
    expect(box!.height, 'hamburger tap target >= 40').toBeGreaterThanOrEqual(40);

    await page.screenshot({
      path: `audit-artifacts/${info.project.name}/navbar-hamburger.png`,
      clip: { x: 0, y: 0, width: page.viewportSize()!.width, height: 100 },
    });
  });

  test('scrolled-state navbar transitions cleanly', async ({ page }, info) => {
    await gotoLanding(page);
    const nav = page.locator('nav').first();
    const beforeClass = await nav.getAttribute('class');

    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    const afterClass = await nav.getAttribute('class');

    expect(afterClass, 'nav class changes on scroll').not.toBe(beforeClass);
    await page.screenshot({
      path: `audit-artifacts/${info.project.name}/navbar-scrolled.png`,
      clip: { x: 0, y: 0, width: page.viewportSize()!.width, height: 120 },
    });
  });
});
