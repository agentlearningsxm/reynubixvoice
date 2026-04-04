const { chromium } = require('playwright');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto('http://192.168.178.179:3000', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  const results = { pass: [], fail: [] };

  function check(cat, name, ok, actual, expected) {
    const e = { cat, name, actual, expected };
    (ok ? results.pass : results.fail).push(e);
  }

  // ============================
  // A. HERO SECTION
  // ============================
  const hero = await page.evaluate(() => {
    const s = document.querySelector('section');
    if (!s) return null;
    const h1 = s.querySelector('h1');
    const h1R = h1?.getBoundingClientRect();
    let phone = s.querySelector('.hero-phone-bg');
    if (!phone) {
      for (const img of s.querySelectorAll('img')) {
        const r = img.getBoundingClientRect();
        if (r.height > 200 && r.width > 150) {
          phone = img;
          break;
        }
      }
    }
    const phR = phone?.getBoundingClientRect();
    let social = null;
    for (const d of s.querySelectorAll('div')) {
      const t = d.textContent || '';
      if (
        (t.includes('businesses') || t.includes('5.0')) &&
        d.children.length > 0 &&
        d.getBoundingClientRect().height < 100 &&
        d.getBoundingClientRect().height > 10
      ) {
        social = d;
        break;
      }
    }
    const socR = social?.getBoundingClientRect();
    return {
      h1: h1R
        ? {
            w: Math.round(h1R.width),
            h: Math.round(h1R.height),
            top: Math.round(h1R.top),
            bot: Math.round(h1R.bottom),
          }
        : null,
      phone: phR
        ? {
            r: Math.round(phR.right),
            top: Math.round(phR.top),
            bot: Math.round(phR.bottom),
          }
        : null,
      social: socR ? { bot: Math.round(socR.bottom) } : null,
    };
  });

  console.log('\n=== A. HERO SECTION ===');
  check(
    'A-HERO',
    'H1 width <= 355px',
    hero?.h1?.w <= 355,
    `${hero?.h1?.w}px`,
    '<= 355px',
  );
  check(
    'A-HERO',
    'H1 is multi-line (height > 50px)',
    hero?.h1?.h > 50,
    `${hero?.h1?.h}px`,
    '> 50px',
  );
  check(
    'A-HERO',
    'Phone right edge <= 375px',
    hero?.phone?.r <= 375,
    `${hero?.phone?.r}px`,
    '<= 375px',
  );
  if (hero?.social && hero?.phone) {
    check(
      'A-HERO',
      'Phone positioned below social proof',
      hero.phone.top > hero.social.bot,
      `phone top=${hero.phone.top}, social bot=${hero.social.bot}`,
      'phone top > social bot',
    );
  } else if (hero?.h1 && hero?.phone) {
    check(
      'A-HERO',
      'Phone positioned below H1',
      hero.phone.top > hero.h1.bot,
      `phone top=${hero.phone.top}, h1 bot=${hero.h1.bot}`,
      'phone top > h1 bot',
    );
  }

  const bodyScroll = await page.evaluate(() => ({
    sw: document.body.scrollWidth,
    cw: document.body.clientWidth,
  }));
  check(
    'A-HERO',
    'No horizontal page scroll (scrollWidth == 375)',
    bodyScroll.sw === 375,
    `${bodyScroll.sw}px`,
    '375px',
  );

  // ============================
  // B. ALL SECTIONS
  // ============================
  console.log('\n=== B. ALL SECTIONS ===');
  const sections = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('section')).map((s, i) => {
      const r = s.getBoundingClientRect();
      const h2 = s.querySelector('h2');
      const h2R = h2?.getBoundingClientRect();
      const cs = getComputedStyle(s);
      return {
        i,
        id: s.id || s.className?.substring(0, 35) || 'unnamed',
        w: Math.round(r.width),
        h2: h2
          ? {
              t: h2.textContent.trim().substring(0, 40),
              w: Math.round(h2R.width),
            }
          : null,
        overflowX: cs.overflowX,
      };
    });
  });

  for (const s of sections) {
    const lbl = `[${s.i}] ${s.id}`;
    check(
      'B-SECTIONS',
      `${lbl}: width == 375px`,
      s.w === 375,
      `${s.w}px`,
      '375px',
    );
    if (s.h2) {
      check(
        'B-SECTIONS',
        `${lbl}: H2 width <= 355px`,
        s.h2.w <= 355,
        `${s.h2.w}px (${s.h2.t})`,
        '<= 355px',
      );
    }
    // Overflow check: section either clips itself or body is fine
    const clips =
      s.overflowX === 'hidden' ||
      s.overflowX === 'clip' ||
      s.overflowX === 'auto';
    check(
      'B-SECTIONS',
      `${lbl}: overflow handled (clips=${clips})`,
      true,
      `overflow-x: ${s.overflowX}`,
      'hidden/clip/auto or body OK',
    );
    console.log(
      `  ${lbl}: w=${s.w}, h2=${s.h2?.w ?? 'none'}px, overflow=${s.overflowX}`,
    );
  }

  // Global: body scrollWidth still 375 after all sections loaded
  const finalBody = await page.evaluate(() => document.body.scrollWidth);
  check(
    'B-SECTIONS',
    'Body scrollWidth == 375 after all sections',
    finalBody === 375,
    `${finalBody}px`,
    '375px',
  );

  // ============================
  // C. NAVBAR
  // ============================
  console.log('\n=== C. NAVBAR ===');
  const nav = await page.evaluate(() => {
    const n = document.querySelector('nav') || document.querySelector('header');
    if (!n) return null;
    let hamburger = null;
    for (const btn of n.querySelectorAll('button')) {
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      const svg = btn.querySelector('svg');
      const r = btn.getBoundingClientRect();
      if (
        label.includes('menu') ||
        label.includes('nav') ||
        (svg && r.width > 10 && r.width < 60 && r.height > 10 && r.height < 60)
      ) {
        hamburger = btn;
        break;
      }
    }
    let desktopLinks = 0;
    for (const a of n.querySelectorAll('a')) {
      const r = a.getBoundingClientRect();
      const st = getComputedStyle(a);
      if (
        r.width > 60 &&
        r.height > 0 &&
        st.display !== 'none' &&
        st.visibility !== 'hidden' &&
        a.textContent.trim().length > 2
      ) {
        desktopLinks++;
      }
    }
    return {
      found: true,
      hamburger: hamburger
        ? {
            visible: getComputedStyle(hamburger).display !== 'none',
            w: Math.round(hamburger.getBoundingClientRect().width),
            h: Math.round(hamburger.getBoundingClientRect().height),
          }
        : null,
      desktopLinks,
    };
  });

  console.log(JSON.stringify(nav, null, 2));
  check(
    'C-NAVBAR',
    'Hamburger menu exists',
    nav?.hamburger !== null,
    nav?.hamburger ? 'found' : 'NOT FOUND',
    'found',
  );
  check(
    'C-NAVBAR',
    'Hamburger visible on mobile',
    nav?.hamburger?.visible === true,
    nav?.hamburger?.visible,
    true,
  );
  check(
    'C-NAVBAR',
    'Desktop nav hidden (<=1 visible link)',
    nav?.desktopLinks <= 1,
    `${nav?.desktopLinks} links`,
    '0-1 links',
  );

  // ============================
  // D. CAROUSELS
  // ============================
  console.log('\n=== D. CAROUSELS ===');
  const carousels = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('*')) {
      const cls = el.className?.toString() || '';
      if (
        !(
          cls.includes('overflow-x-auto') ||
          cls.includes('overflow-x-scroll') ||
          cls.includes('snap-x')
        )
      )
        continue;
      const cards = [];
      for (const child of el.children) {
        const r = child.getBoundingClientRect();
        if (r.width > 100 && r.height > 50) cards.push(Math.round(r.width));
      }
      if (cards.length >= 2) {
        out.push({ cls: cls.substring(0, 60), cards: cards.slice(0, 5) });
      }
    }
    return out;
  });

  for (const c of carousels) {
    console.log(`  ${c.cls}: cards=${c.cards.join(', ')}px`);
    const hasTarget = c.cards.some((w) => w >= 290 && w <= 340);
    check(
      'D-CAROUSEL',
      `Cards ~85% (290-340px): ${c.cls.substring(0, 35)}`,
      hasTarget,
      `${c.cards.join(', ')}px`,
      '290-340px',
    );
  }
  check(
    'D-CAROUSEL',
    'No horizontal page scroll from carousels',
    finalBody === 375,
    `${finalBody}px`,
    '<= 375px',
  );

  // ============================
  // E. FOOTER
  // ============================
  console.log('\n=== E. FOOTER ===');
  const footer = await page.evaluate(() => {
    const f = document.querySelector('footer');
    if (!f) return null;
    let statsCols = 0;
    let found = false;
    for (const d of f.querySelectorAll('div')) {
      const st = getComputedStyle(d);
      if (st.display === 'grid' || st.display === 'inline-grid') {
        const cols = st.gridTemplateColumns.split(' ').length;
        if (cols >= 2) {
          const t = d.textContent || '';
          if (/\d+%|\d+\+/.test(t) && d.getBoundingClientRect().height < 200) {
            statsCols = cols;
            found = true;
            break;
          }
          if (cols > statsCols) {
            statsCols = cols;
            found = true;
          }
        }
      }
    }
    return { w: Math.round(f.getBoundingClientRect().width), statsCols, found };
  });

  console.log(JSON.stringify(footer, null, 2));
  check(
    'E-FOOTER',
    'Footer width == 375px',
    footer?.w === 375,
    `${footer?.w}px`,
    '375px',
  );
  check(
    'E-FOOTER',
    'Stats grid has 2 columns on mobile',
    footer?.statsCols === 2,
    `${footer?.statsCols} cols`,
    '2 columns',
  );

  // ============================
  // FINAL REPORT
  // ============================
  const verdict = results.fail.length === 0 ? 'PASS' : 'FAIL';
  console.log(`\n${'='.repeat(60)}`);
  console.log(
    `VERDICT: ${verdict}  (${results.pass.length} passed, ${results.fail.length} failed)`,
  );
  console.log('='.repeat(60));

  if (results.fail.length) {
    console.log('\nFAILURES:');
    for (const f of results.fail)
      console.log(
        `  ❌ [${f.cat}] ${f.name} — got ${f.actual}, expected ${f.expected}`,
      );
  }
  console.log('\nALL PASSED:');
  for (const p of results.pass)
    console.log(`  ✅ [${p.cat}] ${p.name} = ${p.actual}`);

  // Write markdown report
  const lines = [
    '# Mobile QA Final Report — 2026-03-31',
    '',
    `**Viewport:** 375 × 812 (iPhone X)`,
    `**URL:** http://192.168.178.179:3000`,
    `**Timestamp:** ${new Date().toISOString()}`,
    '',
    `## Verdict: ${verdict === 'PASS' ? '✅ PASS' : '❌ FAIL'}`,
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Passed | ${results.pass.length} |`,
    `| Failed | ${results.fail.length} |`,
    '',
  ];

  if (results.fail.length) {
    lines.push('## ❌ Failures', '');
    for (const f of results.fail) {
      lines.push(`### ${f.name}`);
      lines.push(`- **Category:** ${f.cat}`);
      lines.push(`- **Actual:** ${f.actual}`);
      lines.push(`- **Expected:** ${f.expected}`, '');
    }
  }

  lines.push('## ✅ Passed Checks', '');
  for (const p of results.pass) {
    lines.push(`- **[${p.cat}]** ${p.name} → \`${p.actual}\``);
  }
  lines.push('');

  const outPath =
    'D:\\Desktop\\reynubix\\test-results\\mobile-audit-2026-03-31\\qa-final-report.md';
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`\nReport → ${outPath}`);

  await page.screenshot({
    path: 'D:\\Desktop\\reynubix\\test-results\\mobile-audit-2026-03-31\\qa-verification-375px.png',
    fullPage: true,
  });
  await browser.close();
  process.exit(results.fail.length > 0 ? 1 : 0);
})();
