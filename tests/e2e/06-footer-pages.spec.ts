import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  gotoLanding,
  hasOverflowX,
} from './helpers/audit-helpers';

test.describe('Footer audit', () => {
  test('footer visible at bottom of page with stats and links', async ({
    page,
  }, info) => {
    const errors = await collectConsoleErrors(page);
    await gotoLanding(page);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);

    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();

    await footer.screenshot({
      path: `audit-artifacts/${info.project.name}/footer.png`,
    });
    expect(errors.filter((e) => !e.toLowerCase().includes('favicon'))).toEqual([]);
  });

  test('footer has at least 3 links', async ({ page }, info) => {
    await gotoLanding(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);

    const footer = page.locator('footer').first();
    const links = footer.locator('a');
    const count = await links.count();
    expect(count, 'footer has links').toBeGreaterThanOrEqual(3);
  });

  test('scroll-to-top button works if present', async ({ page }, info) => {
    await gotoLanding(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);

    const scrollTop = page.locator(
      'button[aria-label*="scroll" i], button[aria-label*="top" i]'
    );
    const count = await scrollTop.count();
    if (count === 0) return;

    await scrollTop.first().click({ force: true });
    await page.waitForTimeout(800);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY, 'page scrolled back toward top').toBeLessThan(200);
  });
});

test.describe('Sub-pages audit', () => {
  for (const path of ['/contact', '/privacy', '/terms']) {
    test(`${path} — loads and renders main content`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(err.message));

      const resp = await page.goto(path, { waitUntil: 'networkidle' });
      expect(resp?.status(), `${path} status 200`).toBeLessThan(400);

      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      const main = page.locator('main, article, section').first();
      await expect(main, `${path} has main content`).toBeVisible();

      const overflow = await hasOverflowX(page);
      expect(overflow, `${path} no h-overflow on ${info.project.name}`).toBe(false);

      await page.screenshot({
        path: `audit-artifacts/${info.project.name}${path.replace(/\//g, '_')}.png`,
        fullPage: true,
      });

      expect(
        errors.filter(
          (e) =>
            !e.toLowerCase().includes('favicon') &&
            !e.toLowerCase().includes('sentry')
        ),
        `${path} console errors`
      ).toEqual([]);
    });
  }

  test('/contact form — has name, email, message fields', async ({
    page,
  }, info) => {
    await page.goto('/contact', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const inputs = page.locator('input, textarea');
    const count = await inputs.count();
    expect(count, 'contact form has inputs').toBeGreaterThanOrEqual(3);

    const submit = page.locator('button[type="submit"], button:has-text("Send")').first();
    await expect(submit).toBeVisible();
  });
});
