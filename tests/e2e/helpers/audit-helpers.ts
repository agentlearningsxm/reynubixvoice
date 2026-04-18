import { expect, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const SECTION_IDS = [
  'receptionist',
  'calculator',
  'solutions',
  'comparison',
  'automations',
  'reviews',
] as const;

export const NAV_LABELS_EN = [
  'Receptionist',
  'Calculator',
  'Solutions',
  'Comparison',
  'Automations',
  'Our Network',
  'Contact',
];

// Filter patterns for dev-mode console noise (API routes return HTML without vercel dev)
export const CONSOLE_IGNORE_PATTERNS = [
  'favicon',
  'sentry',
  "unexpected token '<'",
  'failed to fetch',
];

export function filterConsoleErrors(errors: string[]): string[] {
  return errors.filter((e) => {
    const lower = e.toLowerCase();
    return !CONSOLE_IGNORE_PATTERNS.some((p) => lower.includes(p));
  });
}

export interface AuditFinding {
  severity: 'critical' | 'major' | 'minor';
  category:
    | 'layout'
    | 'typography'
    | 'spacing'
    | 'color'
    | 'copy'
    | 'a11y'
    | 'animation'
    | 'interaction';
  viewport: string;
  location: string;
  description: string;
}

export async function collectConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

export async function gotoLanding(page: Page) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForLoadState('domcontentloaded');
}

export async function runAxe(page: Page, tag?: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .disableRules(['color-contrast'])
    .analyze();
  return {
    violations: results.violations,
    critical: results.violations.filter((v) => v.impact === 'critical'),
    serious: results.violations.filter((v) => v.impact === 'serious'),
  };
}

export async function clickSafe(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) return { clicked: false, reason: 'no bounding box' };
  if (box.width < 8 || box.height < 8)
    return { clicked: false, reason: `too small (${box.width}x${box.height})` };
  try {
    await locator.click({ trial: true, timeout: 2000 });
    return { clicked: true };
  } catch (e) {
    return { clicked: false, reason: String(e).slice(0, 120) };
  }
}

export async function hasOverflowX(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const viewportWidth = window.innerWidth;
    return docWidth > viewportWidth + 2;
  });
}

export async function captureSection(
  page: Page,
  sectionId: string,
  viewport: string
) {
  const sectionLocator = page.locator(`#${sectionId}`).first();
  const exists = await sectionLocator.count();
  if (exists === 0) return null;
  await sectionLocator.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(300);
  return await sectionLocator.screenshot({
    path: `audit-artifacts/${viewport}/${sectionId}.png`,
  });
}

export async function getComputedStyleValue(
  page: Page,
  selector: string,
  prop: string
): Promise<string> {
  return await page
    .locator(selector)
    .first()
    .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
}
