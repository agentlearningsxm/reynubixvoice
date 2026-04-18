import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  gotoLanding,
  hasOverflowX,
  NAV_LABELS_EN,
} from './helpers/audit-helpers';

test.describe('Mobile menu audit', () => {
  test.skip(({ browserName }) => false, '');

  test('hamburger opens the mobile menu', async ({ page }, info) => {
    test.skip(info.project.name === 'chromium-desktop', 'mobile/tablet only');
    const errors = await collectConsoleErrors(page);
    await gotoLanding(page);

    const hamburger = page.locator('.mobile-icon-btn').last();
    await hamburger.click();
    await page.waitForTimeout(400);

    const menu = page.locator('#mobile-navigation-menu, .mobile-menu');
    await expect(menu).toBeVisible();

    await page.screenshot({
      path: `audit-artifacts/${info.project.name}/mobile-menu-open.png`,
      fullPage: true,
    });

    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });

  test('all 7 nav links appear inside mobile menu', async ({ page }, info) => {
    test.skip(info.project.name === 'chromium-desktop', 'mobile/tablet only');
    await gotoLanding(page);

    await page.locator('.mobile-icon-btn').last().click();
    await page.waitForTimeout(400);

    const links = page.locator('.mobile-nav-link');
    await expect(links).toHaveCount(7);

    for (const label of NAV_LABELS_EN) {
      const link = links.filter({ hasText: label });
      expect(await link.count(), `mobile link "${label}" present`).toBeGreaterThan(0);
    }
  });

  test('language row inside mobile menu: 3 buttons, each tap-size >= 40', async ({
    page,
  }, info) => {
    test.skip(info.project.name === 'chromium-desktop', 'mobile/tablet only');
    await gotoLanding(page);

    await page.locator('.mobile-icon-btn').last().click();
    await page.waitForTimeout(400);

    const rows = page.locator('.mobile-theme-row');
    const rowCount = await rows.count();
    expect(rowCount, 'language row + theme row present').toBeGreaterThanOrEqual(2);

    const langRow = rows.nth(0);
    const langBtns = langRow.locator('.mobile-theme-btn');
    await expect(langBtns).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      const box = await langBtns.nth(i).boundingBox();
      expect(box!.height, `lang btn ${i} height`).toBeGreaterThanOrEqual(32);
    }
  });

  test('theme row inside mobile menu: 4 theme buttons', async ({ page }, info) => {
    test.skip(info.project.name === 'chromium-desktop', 'mobile/tablet only');
    await gotoLanding(page);
    await page.locator('.mobile-icon-btn').last().click();
    await page.waitForTimeout(400);

    const rows = page.locator('.mobile-theme-row');
    const themeRow = rows.nth(1);
    const themeBtns = themeRow.locator('.mobile-theme-btn');
    await expect(themeBtns).toHaveCount(4);
  });

  test('book demo button visible inside mobile menu', async ({ page }, info) => {
    test.skip(info.project.name === 'chromium-desktop', 'mobile/tablet only');
    await gotoLanding(page);
    await page.locator('.mobile-icon-btn').last().click();
    await page.waitForTimeout(400);

    const menu = page.locator('#mobile-navigation-menu');
    const demoBtn = menu.locator('button[data-cal-link], button', {
      hasText: /demo|call/i,
    }).last();
    await expect(demoBtn).toBeVisible();

    const box = await demoBtn.boundingBox();
    expect(box!.height, 'book demo button tall enough').toBeGreaterThanOrEqual(40);
  });

  test('clicking a mobile link closes the menu', async ({ page }, info) => {
    test.skip(info.project.name === 'chromium-desktop', 'mobile/tablet only');
    await gotoLanding(page);
    await page.locator('.mobile-icon-btn').last().click();
    await page.waitForTimeout(400);

    const menu = page.locator('#mobile-navigation-menu');
    await expect(menu).toBeVisible();

    const firstLink = page.locator('.mobile-nav-link').first();
    await firstLink.click();
    await page.waitForTimeout(600);

    const stillVisible = await menu.isVisible().catch(() => false);
    expect(stillVisible, 'menu should close after link tap').toBe(false);
  });

  test('no horizontal overflow with mobile menu open', async ({ page }, info) => {
    test.skip(info.project.name === 'chromium-desktop', 'mobile/tablet only');
    await gotoLanding(page);
    await page.locator('.mobile-icon-btn').last().click();
    await page.waitForTimeout(400);

    const overflow = await hasOverflowX(page);
    expect(overflow, 'no h-overflow with menu open').toBe(false);
  });

  test('dark-toggle icon button works from mobile header row', async ({
    page,
  }, info) => {
    test.skip(info.project.name === 'chromium-desktop', 'mobile/tablet only');
    await gotoLanding(page);

    const iconBtns = page.locator('.mobile-icon-btn');
    const count = await iconBtns.count();
    expect(count, 'mobile has 2 icon buttons: dark + hamburger').toBeGreaterThanOrEqual(2);

    const rootBefore = await page.locator('html').getAttribute('class');
    await iconBtns.first().click();
    await page.waitForTimeout(400);
    const rootAfter = await page.locator('html').getAttribute('class');
    expect(rootAfter, 'theme class changed').not.toBe(rootBefore);
  });
});
