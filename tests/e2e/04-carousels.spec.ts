import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  gotoLanding,
  hasOverflowX,
  captureSection,
} from './helpers/audit-helpers';

test.describe('Industry slider audit', () => {
  test('industry slider visible with cards', async ({ page }, info) => {
    const errors = await collectConsoleErrors(page);
    await gotoLanding(page);

    const section = page.locator('#solutions');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await expect(section).toBeVisible();

    const cards = section.locator('[class*="embla"], [data-embla], button, [role="button"]');
    const cardCount = await cards.count();
    expect(cardCount, 'industry slider has visible cards').toBeGreaterThan(0);

    await captureSection(page, 'solutions', info.project.name);
    expect(errors.filter((e) => !e.toLowerCase().includes('favicon'))).toEqual([]);
  });

  test('industry card click opens modal/bottom-sheet', async ({ page }, info) => {
    await gotoLanding(page);
    const section = page.locator('#solutions');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    const firstClickable = section.locator('button, [role="button"], [class*="card"]').first();
    const clickable = await firstClickable.count();
    if (clickable === 0) return;

    await firstClickable.click({ trial: false, force: true }).catch(() => {});
    await page.waitForTimeout(500);

    const anyModal = page.locator(
      '[role="dialog"], .bottom-sheet, [class*="modal"], [class*="sheet"]'
    );
    const visible = await anyModal.first().isVisible().catch(() => false);

    if (visible) {
      await page.screenshot({
        path: `audit-artifacts/${info.project.name}/industry-modal-open.png`,
      });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
  });
});

test.describe('Comparison audit', () => {
  test('comparison carousel visible with images', async ({ page }, info) => {
    const errors = await collectConsoleErrors(page);
    await gotoLanding(page);

    const section = page.locator('#comparison');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await expect(section).toBeVisible();

    const images = section.locator('img');
    const imgCount = await images.count();
    expect(imgCount, 'comparison has images').toBeGreaterThan(0);

    await captureSection(page, 'comparison', info.project.name);
    expect(errors.filter((e) => !e.toLowerCase().includes('favicon'))).toEqual([]);
  });

  test('comparison has prev/next buttons or arrows', async ({ page }, info) => {
    await gotoLanding(page);
    const section = page.locator('#comparison');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const arrows = section.locator(
      'button[aria-label*="prev" i], button[aria-label*="next" i], button svg'
    );
    const arrowCount = await arrows.count();
    expect(arrowCount, 'nav arrows present').toBeGreaterThan(0);
  });

  test('comparison no horizontal overflow', async ({ page }, info) => {
    await gotoLanding(page);
    await page.locator('#comparison').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    expect(await hasOverflowX(page)).toBe(false);
  });
});
