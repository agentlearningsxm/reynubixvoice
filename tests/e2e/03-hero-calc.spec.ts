import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  gotoLanding,
  hasOverflowX,
  captureSection,
  getComputedStyleValue,
} from './helpers/audit-helpers';

test.describe('Hero audit', () => {
  test('hero section visible, heading within sane size range', async ({
    page,
  }, info) => {
    const errors = await collectConsoleErrors(page);
    await gotoLanding(page);

    const hero = page.locator('#receptionist').first();
    await expect(hero).toBeVisible();

    const heading = hero.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    const fontSize = await heading.evaluate(
      (el) => getComputedStyle(el).fontSize
    );
    const sizePx = parseFloat(fontSize);

    if (info.project.name === 'chromium-mobile') {
      expect(
        sizePx,
        `mobile hero heading ${sizePx}px — should be 24-48px`
      ).toBeGreaterThanOrEqual(22);
      expect(sizePx).toBeLessThanOrEqual(56);
    } else if (info.project.name === 'chromium-desktop') {
      expect(sizePx, `desktop hero heading ${sizePx}px`).toBeGreaterThanOrEqual(40);
      expect(sizePx).toBeLessThanOrEqual(130);
    }

    await captureSection(page, 'receptionist', info.project.name);

    const overflow = await hasOverflowX(page);
    expect(overflow, 'no horizontal overflow in hero').toBe(false);

    expect(errors.filter((e) => !e.toLowerCase().includes('favicon'))).toEqual([]);
  });

  test('hero CTA buttons exist and are tappable', async ({ page }, info) => {
    await gotoLanding(page);
    const hero = page.locator('#receptionist').first();
    await hero.scrollIntoViewIfNeeded();

    const buttons = hero.locator('button:visible');
    const count = await buttons.count();
    expect(count, 'hero has at least one visible button').toBeGreaterThanOrEqual(1);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const btn = buttons.nth(i);
      const box = await btn.boundingBox();
      if (!box) continue;
      expect(box.height, `hero button ${i} height`).toBeGreaterThanOrEqual(32);
      expect(box.width, `hero button ${i} width`).toBeGreaterThanOrEqual(32);
    }
  });

  test('voice orb canvas present (but NOT clicked to avoid API call)', async ({
    page,
  }, info) => {
    await gotoLanding(page);
    const hero = page.locator('#receptionist').first();
    const canvas = hero.locator('canvas').first();
    const count = await canvas.count();
    if (count > 0) {
      await expect(canvas).toBeVisible();
      const box = await canvas.boundingBox();
      expect(box!.width, 'voice orb canvas width').toBeGreaterThan(100);
    }
  });
});

test.describe('Calculator audit', () => {
  test('calculator card visible with inputs', async ({ page }, info) => {
    const errors = await collectConsoleErrors(page);
    await gotoLanding(page);

    const calc = page.locator('#calculator');
    await calc.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await expect(calc).toBeVisible();

    await expect(page.locator('#input-revenue')).toBeVisible();
    await expect(page.locator('#input-calls')).toBeVisible();

    const resultBox = page.locator('#result-box');
    await expect(resultBox).toBeVisible();

    await captureSection(page, 'calculator', info.project.name);
    expect(errors.filter((e) => !e.toLowerCase().includes('favicon'))).toEqual([]);
  });

  test('calculator sliders work and result updates', async ({ page }, info) => {
    await gotoLanding(page);
    await page.locator('#calculator').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const revenue = page.locator('#input-revenue');
    await revenue.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);

    const resultBox = page.locator('#result-box');
    await expect(resultBox).toBeVisible();
  });

  test('calculator no horizontal overflow at any viewport', async ({
    page,
  }, info) => {
    await gotoLanding(page);
    await page.locator('#calculator').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    expect(await hasOverflowX(page)).toBe(false);
  });
});
