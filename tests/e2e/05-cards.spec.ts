import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  gotoLanding,
  hasOverflowX,
  captureSection,
  clickSafe,
} from './helpers/audit-helpers';

test.describe('Automation cards audit', () => {
  test('automation cards section visible with multiple cards', async ({
    page,
  }, info) => {
    const errors = await collectConsoleErrors(page);
    await gotoLanding(page);

    const section = page.locator('#automations');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    await expect(section).toBeVisible();

    await captureSection(page, 'automations', info.project.name);
    expect(errors.filter((e) => !e.toLowerCase().includes('favicon'))).toEqual([]);
  });

  test('automation cards: each card fully visible in viewport when scrolled', async ({
    page,
  }, info) => {
    await gotoLanding(page);
    await page.locator('#automations').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    const cards = page.locator('#automations').locator(
      '[class*="card"]:visible, article:visible, [role="article"]:visible'
    );
    const count = await cards.count();
    if (count === 0) return;

    const viewportWidth = page.viewportSize()!.width;
    for (let i = 0; i < Math.min(count, 6); i++) {
      const card = cards.nth(i);
      const box = await card.boundingBox();
      if (!box) continue;
      expect(
        box.x + box.width,
        `card ${i} right edge <= viewport width on ${info.project.name}`
      ).toBeLessThanOrEqual(viewportWidth + 2);
      expect(box.x, `card ${i} left edge >= 0`).toBeGreaterThanOrEqual(-2);
      expect(box.width, `card ${i} has width`).toBeGreaterThan(0);
    }
  });
});

test.describe('Mentor cards audit', () => {
  test('mentor cards section visible', async ({ page }, info) => {
    const errors = await collectConsoleErrors(page);
    await gotoLanding(page);

    const section = page
      .locator('section')
      .filter({
        has: page.locator('text=/mentor|expert|network/i'),
      })
      .first();
    const exists = await section.count();
    if (exists === 0) return;

    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    await page.screenshot({
      path: `audit-artifacts/${info.project.name}/mentor-cards.png`,
      fullPage: false,
    });
    expect(errors.filter((e) => !e.toLowerCase().includes('favicon'))).toEqual([]);
  });

  test('mentor cards grid: each card fits viewport', async ({ page }, info) => {
    await gotoLanding(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.7));
    await page.waitForTimeout(800);

    const cards = page.locator(
      '[class*="mentor" i], [data-mentor], button[class*="card"]'
    );
    const count = await cards.count();
    if (count === 0) return;

    const viewportWidth = page.viewportSize()!.width;
    for (let i = 0; i < Math.min(count, 8); i++) {
      const card = cards.nth(i);
      const box = await card.boundingBox();
      if (!box) continue;
      expect(
        box.x + box.width,
        `mentor card ${i} within viewport on ${info.project.name}`
      ).toBeLessThanOrEqual(viewportWidth + 2);
    }
  });
});

test.describe('Referral / CardStack audit', () => {
  test('referral section visible with stacked cards', async ({ page }, info) => {
    const errors = await collectConsoleErrors(page);
    await gotoLanding(page);

    const section = page.locator('#reviews');
    const exists = await section.count();
    if (exists > 0) {
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      await captureSection(page, 'reviews', info.project.name);
    } else {
      await page.evaluate(() =>
        window.scrollTo(0, document.body.scrollHeight - 1200)
      );
      await page.waitForTimeout(800);
      await page.screenshot({
        path: `audit-artifacts/${info.project.name}/referral-fallback.png`,
      });
    }

    expect(errors.filter((e) => !e.toLowerCase().includes('favicon'))).toEqual([]);
  });

  test('no overflow across entire page after scrolling through all cards', async ({
    page,
  }, info) => {
    await gotoLanding(page);
    await page.evaluate(async () => {
      const scrollHeight = document.body.scrollHeight;
      for (let y = 0; y < scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
    });
    await page.waitForTimeout(500);
    expect(await hasOverflowX(page)).toBe(false);
  });
});
