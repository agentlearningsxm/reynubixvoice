/**
 * Deep Mobile UI/UX Audit — FINAL QA (Post-Fix Verification)
 * Target: http://192.168.178.179:3000 (Docker production build — all fixes applied)
 * Viewports: 320, 375, 390, 412 × 812
 *
 * Run: node audit-final.cjs
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const TARGET_URL = 'http://192.168.178.179:3000';
const VIEWPORTS = [
  { width: 320, height: 812 },
  { width: 375, height: 812 },
  { width: 390, height: 812 },
  { width: 412, height: 812 },
];
const OUTPUT_DIR = path.join(
  __dirname,
  '..',
  'test-results',
  'mobile-audit-final',
);
const TOUCH_MIN = 44;
const GAP_MAX = 120;
const H2_MARGIN = 20;
const CARD_MIN = 70;
const CARD_MAX = 90;
const MASK_MAX = 10;

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function runAudit(cfg) {
  var TOUCH_MIN = cfg.TOUCH_MIN;
  var GAP_MAX = cfg.GAP_MAX;
  var H2_MARGIN = cfg.H2_MARGIN;
  var CARD_MIN = cfg.CARD_MIN;
  var CARD_MAX = cfg.CARD_MAX;
  var MASK_MAX = cfg.MASK_MAX;

  var results = { pass: [], fail: [], data: {} };

  function report(cat, name, ok, actual, expected, details) {
    var entry = {
      cat: cat,
      name: name,
      actual: String(actual),
      expected: String(expected),
      details: details || '',
    };
    (ok ? results.pass : results.fail).push(entry);
    return ok;
  }

  // 1. Horizontal scroll
  var vw = window.innerWidth;
  var bsw = document.body.scrollWidth;
  report(
    'horizontal-scroll',
    'No horizontal overflow',
    bsw <= vw,
    `${bsw}px`,
    `<= ${vw}px`,
  );

  // 2. Sections
  var sections = Array.from(document.querySelectorAll('section'));
  var sectionData = sections.map((s, i) => {
    var r = s.getBoundingClientRect();
    var h2 = s.querySelector('h2');
    var h2R = h2 ? h2.getBoundingClientRect() : null;
    var cs = getComputedStyle(s);
    return {
      index: i,
      id: s.id || (s.className ? s.className.substring(0, 40) : `section-${i}`),
      top: Math.round(r.top + window.scrollY),
      bottom: Math.round(r.bottom + window.scrollY),
      height: Math.round(r.height),
      width: Math.round(r.width),
      h2Text: h2 ? h2.textContent.trim().substring(0, 60) : null,
      h2Width: h2R ? Math.round(h2R.width) : null,
      overflowX: cs.overflowX,
      maskImage: cs.webkitMaskImage || cs.maskImage || 'none',
    };
  });
  results.data.sections = sectionData;

  // 3. Touch targets
  var touchTargets = [];
  var clickables = document.querySelectorAll(
    'button, a, [role="button"], [onclick], input[type="checkbox"], input[type="range"]',
  );
  for (var ci = 0; ci < clickables.length; ci++) {
    var el = clickables[ci];
    var elcs = getComputedStyle(el);
    if (
      elcs.display === 'none' ||
      elcs.visibility === 'hidden' ||
      elcs.opacity === '0'
    )
      continue;
    var r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    var text = (
      el.textContent ||
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      ''
    )
      .trim()
      .substring(0, 60);
    var sel = el.id ? `#${el.id}` : el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      var clsParts = el.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (clsParts) sel += `.${clsParts}`;
    }
    touchTargets.push({
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      text: text,
      width: Math.round(r.width),
      height: Math.round(r.height),
      ok: r.width >= TOUCH_MIN && r.height >= TOUCH_MIN,
      selector: sel,
    });
  }
  results.data.touchTargets = touchTargets;
  var violations = touchTargets.filter((t) => !t.ok);
  report(
    'touch-targets',
    'All clickable >= 44x44px (WCAG 2.2)',
    violations.length === 0,
    `${violations.length} violations`,
    '0 violations',
    violations.map((v) => `${v.selector} (${v.width}x${v.height})`).join('; '),
  );

  // 4. Section spacing
  var spacingIssues = [];
  for (var i = 1; i < sectionData.length; i++) {
    var gap = sectionData[i].top - sectionData[i - 1].bottom;
    var lbl = `Section ${i - 1} -> ${i}`;
    if (gap < 0) {
      spacingIssues.push({ label: lbl, gap: gap, issue: 'OVERLAP' });
      report(
        'section-spacing',
        `${lbl}: no overlap`,
        false,
        `${gap}px (overlap)`,
        '>= 0px',
      );
    } else if (gap > GAP_MAX) {
      spacingIssues.push({ label: lbl, gap: gap, issue: 'TOO_MUCH_GAP' });
      report(
        'section-spacing',
        `${lbl}: gap <= ${GAP_MAX}px`,
        false,
        `${gap}px`,
        `<= ${GAP_MAX}px`,
      );
    } else {
      report(
        'section-spacing',
        `${lbl}: gap OK`,
        true,
        `${gap}px`,
        `0-${GAP_MAX}px`,
      );
    }
  }
  results.data.spacingIssues = spacingIssues;

  // 5. H2 overflow
  for (var si = 0; si < sectionData.length; si++) {
    var s = sectionData[si];
    if (s.h2Width !== null) {
      var maxW = vw - H2_MARGIN;
      report(
        'h2-overflow',
        `[${s.index}] H2 "${(s.h2Text || '').substring(0, 40)}"`,
        s.h2Width <= maxW,
        `${s.h2Width}px`,
        `<= ${maxW}px`,
      );
    }
  }

  // 6. Carousel cards
  var carouselCards = [];
  var allEls = document.querySelectorAll('*');
  for (var ei = 0; ei < allEls.length; ei++) {
    var fel = allEls[ei];
    var fcls =
      fel.className && typeof fel.className === 'string' ? fel.className : '';
    var fmatch = fcls.match(/flex-\[0_0_(\d+)%/);
    if (fmatch) {
      var pct = parseInt(fmatch[1], 10);
      var fr = fel.getBoundingClientRect();
      if (fr.width > 100 && fr.height > 50) {
        carouselCards.push({ pct: pct, actualWidth: Math.round(fr.width) });
        var inRange = pct >= CARD_MIN && pct <= CARD_MAX;
        report(
          'carousel-cards',
          `Card ${pct}% (${Math.round(fr.width)}px)`,
          inRange,
          `${pct}%`,
          `${CARD_MIN}-${CARD_MAX}%`,
        );
      }
    }
  }
  results.data.carouselCards = carouselCards;

  // 7. Carousel arrows overlap
  var arrowIssues = [];
  for (var ai = 0; ai < sections.length; ai++) {
    var sec = sections[ai];
    var prevBtn = sec.querySelector(
      '[aria-label*="revious"], [aria-label*="prev"]',
    );
    var nextBtn = sec.querySelector(
      '[aria-label*="ext"], [aria-label*="Next"]',
    );
    if (!prevBtn && !nextBtn) continue;
    var cardEl = null;
    var allDivs = sec.querySelectorAll('div');
    for (var di = 0; di < allDivs.length; di++) {
      var dc = allDivs[di].className || '';
      if (typeof dc === 'string' && dc.indexOf('flex-[0_0_') !== -1) {
        cardEl = allDivs[di];
        break;
      }
    }
    if (!cardEl) {
      var flexContainer = sec.querySelector('.flex');
      if (flexContainer && flexContainer.children.length >= 2) {
        cardEl = flexContainer.children[0];
      }
    }
    if (!cardEl) continue;
    var cardR = cardEl.getBoundingClientRect();
    if (prevBtn) {
      var pbr = prevBtn.getBoundingClientRect();
      var d1 = Math.min(
        Math.abs(pbr.right - cardR.left),
        Math.abs(pbr.left - cardR.right),
      );
      var ov1 = d1 < 10;
      if (ov1) arrowIssues.push({ btn: 'prev', section: sec.id || 'sec' });
      report(
        'carousel-arrows',
        `Prev arrow [${sec.id || 'sec'}]`,
        !ov1,
        `dist=${Math.round(d1)}px`,
        '>= 10px',
      );
    }
    if (nextBtn) {
      var nbr = nextBtn.getBoundingClientRect();
      var d2 = Math.min(
        Math.abs(nbr.right - cardR.left),
        Math.abs(nbr.left - cardR.right),
      );
      var ov2 = d2 < 10;
      if (ov2) arrowIssues.push({ btn: 'next', section: sec.id || 'sec' });
      report(
        'carousel-arrows',
        `Next arrow [${sec.id || 'sec'}]`,
        !ov2,
        `dist=${Math.round(d2)}px`,
        '>= 10px',
      );
    }
  }
  results.data.arrowIssues = arrowIssues;

  // 8. Calculator big number
  var calcSection = document.getElementById('calculator');
  if (calcSection) {
    var bigNum = calcSection.querySelector('[aria-live="polite"] h3');
    if (!bigNum) {
      var h3s = calcSection.querySelectorAll('h3');
      for (var hi = 0; hi < h3s.length; hi++) {
        var hf = parseFloat(getComputedStyle(h3s[hi]).fontSize);
        if (hf >= 36) {
          bigNum = h3s[hi];
          break;
        }
      }
    }
    if (bigNum) {
      var numR = bigNum.getBoundingClientRect();
      var numParent =
        bigNum.closest('[aria-live="polite"]') || bigNum.parentElement;
      var parentR = numParent ? numParent.getBoundingClientRect() : null;
      var overflows = parentR ? numR.width > parentR.width : false;
      report(
        'calculator-number',
        'Big number no container overflow',
        !overflows,
        'num=' +
          Math.round(numR.width) +
          'px parent=' +
          (parentR ? `${Math.round(parentR.width)}px` : 'N/A'),
        'num <= parent',
      );
      report(
        'calculator-number',
        'Big number fits viewport',
        numR.right <= vw,
        `right=${Math.round(numR.right)}px`,
        `<= ${vw}px`,
      );
    } else {
      report(
        'calculator-number',
        'Calculator big number found',
        false,
        'NOT FOUND',
        'found',
      );
    }
  }

  // 9. Hero phone mockup
  var heroSection = sections[0];
  if (heroSection) {
    var phone = heroSection.querySelector('.hero-phone-bg');
    if (!phone) {
      var heroDivs = heroSection.querySelectorAll('div');
      for (var hdi = 0; hdi < heroDivs.length; hdi++) {
        var hdr = heroDivs[hdi].getBoundingClientRect();
        if (
          hdr.width > 180 &&
          hdr.width < 320 &&
          hdr.height > 350 &&
          hdr.height < 650
        ) {
          phone = heroDivs[hdi];
          break;
        }
      }
    }
    if (phone) {
      var phoneR = phone.getBoundingClientRect();
      report(
        'hero-phone',
        'Phone right edge <= viewport',
        phoneR.right <= vw + 5,
        `${Math.round(phoneR.right)}px`,
        `<= ${vw + 5}px`,
      );
    } else {
      report(
        'hero-phone',
        'Hero phone element found',
        false,
        'NOT FOUND',
        'found',
      );
    }
  }

  // 10. Hero CTA
  if (heroSection) {
    var ctaBtn =
      heroSection.querySelector('[data-cal-link]') ||
      heroSection.querySelector('button');
    if (ctaBtn) {
      var ctaR = ctaBtn.getBoundingClientRect();
      var ctaPct = Math.round((ctaR.width / vw) * 100);
      report(
        'hero-cta',
        'CTA button > 70% viewport',
        ctaPct > 70,
        `${ctaPct}% (${Math.round(ctaR.width)}px)`,
        '> 70%',
      );
    }
  }

  // 11. Footer bottom bar
  var footer = document.querySelector('footer');
  if (footer) {
    var copyP = footer.querySelector('p');
    var backToTop = footer.querySelector(
      '[aria-label*="top"], [aria-label*="Top"]',
    );
    if (copyP && backToTop) {
      var cR = copyP.getBoundingClientRect();
      var bR = backToTop.getBoundingClientRect();
      var vertOverlap = !(cR.bottom < bR.top || bR.bottom < cR.top);
      var horizOverlap = !(cR.right < bR.left || bR.right < cR.left);
      report(
        'footer-bottom',
        'Copyright and back-to-top no overlap',
        !vertOverlap || horizOverlap,
        `copyR=${Math.round(cR.right)} topL=${Math.round(bR.left)}`,
        'no overlap',
      );
    }
    var fR = footer.getBoundingClientRect();
    report(
      'footer-bottom',
      'Footer width <= viewport',
      fR.width <= vw + 2,
      `${Math.round(fR.width)}px`,
      `<= ${vw}px`,
    );
  }

  // 12. Section mask-image depth
  for (var mi = 0; mi < sectionData.length; mi++) {
    var ms = sectionData[mi];
    if (ms.maskImage && ms.maskImage !== 'none' && ms.maskImage !== '') {
      var maskStr = ms.maskImage;
      var pcts = [];
      var mre = /(\d+(?:\.\d+)?)%/g;
      var mmatch;
      while ((mmatch = mre.exec(maskStr)) !== null) {
        pcts.push(parseFloat(mmatch[1]));
      }
      if (pcts.length >= 2) {
        var fadeTop = 0;
        for (var pi = 0; pi < pcts.length; pi++) {
          if (pcts[pi] > 0 && pcts[pi] < 15) {
            fadeTop = pcts[pi];
            break;
          }
        }
        var fadeBottom = pcts.length > 2 ? 100 - pcts[pcts.length - 2] : 0;
        var totalLoss = fadeTop + fadeBottom;
        report(
          'mask-depth',
          `[${ms.index}] ${ms.id} mask loss <= ${MASK_MAX}%`,
          totalLoss <= MASK_MAX,
          `${totalLoss}% (top=${fadeTop}% bot=${fadeBottom}%)`,
          `<= ${MASK_MAX}%`,
        );
      }
    }
  }

  return results;
}

// ─── Main ───────────────────────────────────────────────────────────
(async () => {
  var allResults = {};
  var browser = await chromium.launch({ headless: true });

  console.log('============================================================');
  console.log('  DEEP MOBILE UI/UX AUDIT — FINAL QA (Post-Fix)');
  console.log('============================================================');
  console.log(`Target: ${TARGET_URL}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log('');

  for (var vi = 0; vi < VIEWPORTS.length; vi++) {
    var vp = VIEWPORTS[vi];
    var label = `${vp.width}px`;
    console.log('');
    console.log('--------------------------------------------------');
    console.log(`  VIEWPORT: ${label} x ${vp.height}`);
    console.log('--------------------------------------------------');

    var context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    var page = await context.newPage();

    try {
      await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Full-page screenshot
      var fullPath = path.join(OUTPUT_DIR, `final-${label}-full.png`);
      await page.screenshot({ path: fullPath, fullPage: true });
      console.log(`  [OK] Full-page screenshot -> ${path.basename(fullPath)}`);

      // Per-section screenshots
      var sectionHandles = await page.$$('section');
      for (var si = 0; si < sectionHandles.length; si++) {
        var sId = await sectionHandles[si].evaluate(
          (el, idx) =>
            el.id ||
            (el.className ? el.className.substring(0, 30) : `section-${idx}`),
          si,
        );
        var cleanId = sId.replace(/[^a-zA-Z0-9-]/g, '_').substring(0, 30);
        var secPath = path.join(
          OUTPUT_DIR,
          `final-${label}-section-${si}-${cleanId}.png`,
        );
        await sectionHandles[si].scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await page.screenshot({ path: secPath });
        console.log(
          '  [OK] Section ' +
            si +
            ' (' +
            cleanId +
            ') -> ' +
            path.basename(secPath),
        );
      }

      // Run checks
      var results = await page.evaluate(runAudit, {
        TOUCH_MIN: TOUCH_MIN,
        GAP_MAX: GAP_MAX,
        H2_MARGIN: H2_MARGIN,
        CARD_MIN: CARD_MIN,
        CARD_MAX: CARD_MAX,
        MASK_MAX: MASK_MAX,
      });
      allResults[label] = results;

      var passCount = results.pass.length;
      var failCount = results.fail.length;
      console.log('');
      console.log(`  Results: ${passCount} PASS, ${failCount} FAIL`);

      if (results.fail.length > 0) {
        console.log('  FAILURES:');
        for (var fi = 0; fi < results.fail.length; fi++) {
          var f = results.fail[fi];
          console.log(`    [${f.cat}] ${f.name}`);
          console.log(`      actual: ${f.actual}  expected: ${f.expected}`);
          if (f.details)
            console.log(`      details: ${f.details.substring(0, 120)}`);
        }
      }

      if (results.data.touchTargets) {
        var tvs = results.data.touchTargets.filter((t) => !t.ok);
        if (tvs.length > 0) {
          console.log('');
          console.log(`  Touch target violations (${tvs.length}):`);
          for (var tvi = 0; tvi < Math.min(tvs.length, 10); tvi++) {
            var v = tvs[tvi];
            console.log(
              '    ' +
                v.selector +
                ' "' +
                v.text.substring(0, 30) +
                '" -> ' +
                v.width +
                'x' +
                v.height +
                'px',
            );
          }
          if (tvs.length > 10)
            console.log(`    ... and ${tvs.length - 10} more`);
        }
      }
    } catch (err) {
      console.error(`  ERROR at ${label}: ${err.message}`);
      allResults[label] = {
        pass: [],
        fail: [
          {
            cat: 'load',
            name: 'Page load',
            actual: err.message,
            expected: 'success',
            details: '',
          },
        ],
        data: {},
      };
    }

    await context.close();
  }

  await browser.close();

  // ─── Consolidated Report ──────────────────────────────────────────
  console.log('');
  console.log('============================================================');
  console.log('  GENERATING CONSOLIDATED REPORT');
  console.log('============================================================');
  console.log('');

  var reportLines = [];
  reportLines.push('# Mobile Deep Audit — FINAL QA Report (Post-Fix)');
  reportLines.push('');
  reportLines.push(`**URL:** ${TARGET_URL}`);
  reportLines.push(`**Timestamp:** ${new Date().toISOString()}`);
  reportLines.push('**Standard:** WCAG 2.2 touch targets (>= 44x44px)');
  reportLines.push(
    `**Playwright:** ${require('playwright/package.json').version}`,
  );
  reportLines.push('');

  // Summary table
  reportLines.push('## Summary');
  reportLines.push('');
  reportLines.push('| Viewport | Pass | Fail | Status |');
  reportLines.push('|----------|------|------|--------|');
  var totalPass = 0;
  var totalFail = 0;
  for (var ri = 0; ri < VIEWPORTS.length; ri++) {
    var vp2 = VIEWPORTS[ri];
    var lbl2 = `${vp2.width}px`;
    var r2 = allResults[lbl2];
    var p = r2?.pass ? r2.pass.length : 0;
    var fl = r2?.fail ? r2.fail.length : 0;
    totalPass += p;
    totalFail += fl;
    var status = fl === 0 ? 'PASS' : 'FAIL';
    reportLines.push(`| ${lbl2} x 812 | ${p} | ${fl} | ${status} |`);
  }
  reportLines.push(
    '| **TOTAL** | **' +
      totalPass +
      '** | **' +
      totalFail +
      '** | ' +
      (totalFail === 0 ? 'PASS' : 'FAIL') +
      ' |',
  );
  reportLines.push('');

  // Touch target count per viewport
  reportLines.push('## Touch Target Analysis');
  reportLines.push('');
  reportLines.push(
    '| Viewport | Total Clickable | Violations (< 44px) | Pass Rate |',
  );
  reportLines.push(
    '|----------|----------------|--------------------|-----------|',
  );
  for (var tta = 0; tta < VIEWPORTS.length; tta++) {
    var vpTT = VIEWPORTS[tta];
    var lblTT = `${vpTT.width}px`;
    var rTT = allResults[lblTT];
    if (!rTT || !rTT.data || !rTT.data.touchTargets) continue;
    var totalTT = rTT.data.touchTargets.length;
    var violTT = rTT.data.touchTargets.filter((t) => !t.ok).length;
    var passRate =
      totalTT > 0 ? Math.round(((totalTT - violTT) / totalTT) * 100) : 100;
    reportLines.push(
      '| ' +
        lblTT +
        ' | ' +
        totalTT +
        ' | ' +
        violTT +
        ' | ' +
        passRate +
        '% |',
    );
  }
  reportLines.push('');

  // Failures grouped by category
  var allFails = [];
  for (var fi2 = 0; fi2 < VIEWPORTS.length; fi2++) {
    var vp3 = VIEWPORTS[fi2];
    var lbl3 = `${vp3.width}px`;
    var r3 = allResults[lbl3];
    if (r3?.fail) {
      for (var ffi = 0; ffi < r3.fail.length; ffi++) {
        var failEntry = Object.assign({}, r3.fail[ffi]);
        failEntry.viewport = lbl3;
        allFails.push(failEntry);
      }
    }
  }

  if (allFails.length > 0) {
    var byCat = {};
    for (var ci2 = 0; ci2 < allFails.length; ci2++) {
      var af = allFails[ci2];
      if (!byCat[af.cat]) byCat[af.cat] = [];
      byCat[af.cat].push(af);
    }

    reportLines.push('## Failures by Category');
    reportLines.push('');
    var catKeys = Object.keys(byCat);
    for (var ki = 0; ki < catKeys.length; ki++) {
      var cat = catKeys[ki];
      var catFails = byCat[cat];
      reportLines.push(`### ${cat} (${catFails.length} failures)`);
      reportLines.push('');
      for (var cfi = 0; cfi < catFails.length; cfi++) {
        var cf = catFails[cfi];
        reportLines.push(`- **[${cf.viewport}]** ${cf.name}`);
        reportLines.push(`  - Actual: \`${cf.actual}\``);
        reportLines.push(`  - Expected: \`${cf.expected}\``);
        if (cf.details)
          reportLines.push(`  - Details: ${cf.details.substring(0, 200)}`);
      }
      reportLines.push('');
    }
  }

  // Touch target violations table
  reportLines.push('## Touch Target Violations');
  reportLines.push('');
  reportLines.push(
    '| Viewport | Element | Text | Actual Size | Expected >= 44px |',
  );
  reportLines.push(
    '|----------|---------|------|-------------|-----------------|',
  );
  var anyTouchViolations = false;
  for (var tti = 0; tti < VIEWPORTS.length; tti++) {
    var vp4 = VIEWPORTS[tti];
    var lbl4 = `${vp4.width}px`;
    var r4 = allResults[lbl4];
    if (!r4 || !r4.data || !r4.data.touchTargets) continue;
    var tvis = r4.data.touchTargets.filter((t) => !t.ok);
    for (var tvii = 0; tvii < tvis.length; tvii++) {
      anyTouchViolations = true;
      var tv = tvis[tvii];
      var textClean = (tv.text || '').replace(/\|/g, '/').substring(0, 40);
      reportLines.push(
        '| ' +
          lbl4 +
          ' | `' +
          tv.selector.substring(0, 40) +
          '` | ' +
          textClean +
          ' | ' +
          tv.width +
          'x' +
          tv.height +
          'px | >= 44x44px |',
      );
    }
  }
  if (!anyTouchViolations) {
    reportLines.push('| - | No violations | - | - | - |');
  }
  reportLines.push('');

  // Section spacing
  reportLines.push('## Section Spacing');
  reportLines.push('');
  for (var spi = 0; spi < VIEWPORTS.length; spi++) {
    var vp5 = VIEWPORTS[spi];
    var lbl5 = `${vp5.width}px`;
    var r5 = allResults[lbl5];
    if (!r5 || !r5.data || !r5.data.sections) continue;
    var secs = r5.data.sections;
    reportLines.push(`### ${lbl5}`);
    reportLines.push('');
    reportLines.push('| # | ID | Height | Gap to Next |');
    reportLines.push('|---|-----|--------|-------------|');
    for (var sdi = 0; sdi < secs.length; sdi++) {
      var gap =
        sdi < secs.length - 1
          ? `${secs[sdi + 1].top - secs[sdi].bottom}px`
          : '-';
      var id = secs[sdi].id.substring(0, 30);
      reportLines.push(
        '| ' +
          sdi +
          ' | ' +
          id +
          ' | ' +
          secs[sdi].height +
          'px | ' +
          gap +
          ' |',
      );
    }
    reportLines.push('');
  }

  // Carousel analysis
  reportLines.push('## Carousel Card Widths');
  reportLines.push('');
  reportLines.push('| Viewport | Card % | Actual Width | Status |');
  reportLines.push('|----------|--------|-------------|--------|');
  for (var cai = 0; cai < VIEWPORTS.length; cai++) {
    var vp6 = VIEWPORTS[cai];
    var lbl6 = `${vp6.width}px`;
    var r6 = allResults[lbl6];
    if (!r6 || !r6.data || !r6.data.carouselCards) continue;
    for (var cdi = 0; cdi < r6.data.carouselCards.length; cdi++) {
      var card = r6.data.carouselCards[cdi];
      var cardOk = card.pct >= CARD_MIN && card.pct <= CARD_MAX;
      reportLines.push(
        '| ' +
          lbl6 +
          ' | ' +
          card.pct +
          '% | ' +
          card.actualWidth +
          'px | ' +
          (cardOk ? 'OK' : 'FAIL') +
          ' |',
      );
    }
  }
  reportLines.push('');

  // Recommendations
  reportLines.push('## Recommendations');
  reportLines.push('');
  var recSet = {};
  for (var reci = 0; reci < allFails.length; reci++) {
    var rf = allFails[reci];
    if (rf.cat === 'touch-targets')
      recSet.touch =
        '- **Touch targets:** Increase all clickable elements to >= 44x44px.';
    if (rf.cat === 'horizontal-scroll')
      recSet.hscroll =
        '- **Horizontal overflow:** Add overflow-x: hidden to offending sections.';
    if (rf.cat === 'h2-overflow')
      recSet.h2 =
        '- **H2 overflow:** Use text-wrap: balance or reduce font-size on mobile.';
    if (rf.cat === 'carousel-cards')
      recSet.cards =
        '- **Carousel cards:** Adjust flex basis to 70-90% of viewport.';
    if (rf.cat === 'carousel-arrows')
      recSet.arrows =
        '- **Carousel arrows:** Add margin to prevent arrow overlap with cards.';
    if (rf.cat === 'calculator-number')
      recSet.calc =
        '- **Calculator number:** Use responsive font sizing (clamp()).';
    if (rf.cat === 'hero-phone')
      recSet.phone =
        '- **Hero phone mockup:** Scale down phone element for small screens.';
    if (rf.cat === 'hero-cta')
      recSet.cta = '- **Hero CTA:** Ensure full-width on mobile.';
    if (rf.cat === 'footer-bottom')
      recSet.footer =
        '- **Footer bottom bar:** Stack vertically or use justify-between.';
    if (rf.cat === 'mask-depth')
      recSet.mask = '- **Mask depth:** Reduce mask gradient extent to <= 10%.';
    if (rf.cat === 'section-spacing')
      recSet.spacing =
        '- **Section spacing:** Fix overlaps or reduce excessive gaps.';
  }
  var recKeys = Object.keys(recSet);
  if (recKeys.length === 0) {
    reportLines.push(
      'No critical issues found. Site passes all checks across tested viewports.',
    );
  } else {
    for (var rki = 0; rki < recKeys.length; rki++) {
      reportLines.push(recSet[recKeys[rki]]);
    }
  }
  reportLines.push('');

  // Write report
  var reportPath = path.join(OUTPUT_DIR, 'final-report.md');
  fs.writeFileSync(reportPath, reportLines.join('\n'));
  console.log(`Report -> ${reportPath}`);

  // Write raw JSON data
  var jsonPath = path.join(OUTPUT_DIR, 'final-raw-data.json');
  fs.writeFileSync(jsonPath, JSON.stringify(allResults, null, 2));
  console.log(`Raw data -> ${jsonPath}`);

  // Final summary
  console.log('');
  console.log('============================================================');
  console.log(`  TOTAL: ${totalPass} passed, ${totalFail} failed`);
  if (totalFail === 0) {
    console.log('  ALL CHECKS PASSED');
  } else {
    console.log(`  ${totalFail} ISSUES FOUND - see ${reportPath}`);
  }
  console.log('============================================================');
  console.log('');

  process.exit(totalFail > 0 ? 1 : 0);
})();
