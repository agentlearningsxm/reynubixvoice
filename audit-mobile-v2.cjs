const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto('http://192.168.178.179:3000', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  const results = { pass: [], fail: [] };

  function check(category, name, condition, actual, expected) {
    const entry = { category, name, actual, expected };
    if (condition) results.pass.push(entry);
    else results.fail.push(entry);
  }

  // ========== A. HERO SECTION ==========
  const heroData = await page.evaluate(() => {
    const section = document.querySelector('section');
    if (!section) return null;
    const h1 = section.querySelector('h1');
    const h1Rect = h1?.getBoundingClientRect();

    let phone = section.querySelector('.hero-phone-bg');
    if (!phone) {
      const imgs = section.querySelectorAll('img');
      for (const img of imgs) {
        const r = img.getBoundingClientRect();
        if (r.height > 200 && r.width > 150) {
          phone = img;
          break;
        }
      }
    }
    const phoneRect = phone?.getBoundingClientRect();

    let socialProof = null;
    const allDivs = section.querySelectorAll('div');
    for (const d of allDivs) {
      const text = d.textContent || '';
      if (
        (text.includes('businesses') ||
          text.includes('5.0') ||
          text.includes('rating')) &&
        d.children.length > 0 &&
        d.getBoundingClientRect().height < 100 &&
        d.getBoundingClientRect().height > 10
      ) {
        socialProof = d;
        break;
      }
    }
    const socialRect = socialProof?.getBoundingClientRect();

    return {
      h1: h1Rect
        ? {
            top: Math.round(h1Rect.top),
            bottom: Math.round(h1Rect.bottom),
            height: Math.round(h1Rect.height),
            width: Math.round(h1Rect.width),
            left: Math.round(h1Rect.left),
            right: Math.round(h1Rect.right),
          }
        : null,
      phone: phoneRect
        ? {
            top: Math.round(phoneRect.top),
            bottom: Math.round(phoneRect.bottom),
            height: Math.round(phoneRect.height),
            width: Math.round(phoneRect.width),
            left: Math.round(phoneRect.left),
            right: Math.round(phoneRect.right),
          }
        : null,
      social: socialRect
        ? {
            top: Math.round(socialRect.top),
            bottom: Math.round(socialRect.bottom),
          }
        : null,
    };
  });

  console.log('\n=== A. HERO SECTION ===');
  if (heroData) {
    check(
      'HERO',
      'H1 width <= 355px',
      heroData.h1 && heroData.h1.width <= 355,
      `${heroData.h1?.width}px`,
      '<= 355px',
    );
    check(
      'HERO',
      'H1 wrapping (height > 50px)',
      heroData.h1 && heroData.h1.height > 50,
      `${heroData.h1?.height}px`,
      '> 50px',
    );
    if (heroData.phone) {
      check(
        'HERO',
        'Phone right edge <= 375px',
        heroData.phone.right <= 375,
        `${heroData.phone.right}px`,
        '<= 375px',
      );
      if (heroData.social) {
        check(
          'HERO',
          'Phone below social proof',
          heroData.phone.top > heroData.social.bottom,
          `phone top=${heroData.phone.top}, social bottom=${heroData.social.bottom}`,
          'phone top > social bottom',
        );
      } else if (heroData.h1) {
        check(
          'HERO',
          'Phone below H1',
          heroData.phone.top > heroData.h1.bottom,
          `phone top=${heroData.phone.top}, h1 bottom=${heroData.h1.bottom}`,
          'phone top > h1 bottom',
        );
      }
    }
  }

  // A5: No horizontal page scroll
  const scrollData = await page.evaluate(() => ({
    scrollWidth: document.body.scrollWidth,
    clientWidth: document.body.clientWidth,
    overflow: document.body.scrollWidth > document.body.clientWidth,
  }));
  check(
    'HERO',
    'No horizontal page scroll',
    scrollData.scrollWidth <= 375,
    `${scrollData.scrollWidth}px`,
    '<= 375px',
  );

  // ========== B. ALL SECTIONS (refined: VISIBLE children only) ==========
  console.log('\n=== B. ALL SECTIONS ===');
  const allSections = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('section')).map((s, i) => {
      const r = s.getBoundingClientRect();
      const h2 = s.querySelector('h2');
      const h2r = h2?.getBoundingClientRect();

      // Find rightmost VISIBLE child that isn't clipped by overflow:hidden ancestor
      let maxVisibleRight = 0;
      const els = s.querySelectorAll('*');
      for (const el of els) {
        const style = getComputedStyle(el);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0'
        )
          continue;
        const cr = el.getBoundingClientRect();
        if (cr.width === 0 || cr.height === 0) continue;
        // Skip elements with transform that translates them off-screen (carousel items)
        if (style.transform && style.transform !== 'none') continue;
        if (cr.right > maxVisibleRight) maxVisibleRight = cr.right;
      }

      // Check if section clips overflow
      const sectionStyle = getComputedStyle(s);
      const clipsOverflow =
        sectionStyle.overflowX === 'hidden' ||
        sectionStyle.overflowX === 'clip';

      return {
        index: i,
        id: s.id || s.className?.substring(0, 40) || 'unnamed',
        width: Math.round(r.width),
        h2: h2
          ? {
              text: h2.textContent.trim().substring(0, 40),
              width: Math.round(h2r.width),
            }
          : null,
        clipsOverflow,
        maxVisibleRight: Math.round(maxVisibleRight),
      };
    });
  });

  for (const s of allSections) {
    const sectionLabel = `[${s.index}] ${s.id}`;
    check(
      'SECTIONS',
      `${sectionLabel} width == 375px`,
      s.width === 375,
      `${s.width}px`,
      '375px',
    );
    if (s.h2) {
      check(
        'SECTIONS',
        `${sectionLabel} H2 width <= 355px`,
        s.h2.width <= 355,
        `${s.h2.width}px (${s.h2.text})`,
        '<= 355px',
      );
    }
    // Overflow check: either clips overflow OR no child past 376
    const overflowOk = s.clipsOverflow || s.maxVisibleRight <= 376;
    check(
      'SECTIONS',
      `${sectionLabel} no visible overflow${s.clipsOverflow ? ' (clipped)' : ''}`,
      overflowOk,
      `${s.maxVisibleRight}px${s.clipsOverflow ? ' [clipped]' : ''}`,
      '<= 375px',
    );
    console.log(
      `  [${s.index}] ${s.id}: width=${s.width}, h2=${s.h2 ? `${s.h2.width}px` : 'none'}, maxRight=${s.maxVisibleRight}, clipped=${s.clipsOverflow}`,
    );
  }

  // ========== C. NAVBAR ==========
  console.log('\n=== C. NAVBAR ===');
  const navData = await page.evaluate(() => {
    const nav =
      document.querySelector('nav') || document.querySelector('header');
    if (!nav) return { found: false };

    const buttons = nav.querySelectorAll('button');
    let hamburger = null;
    for (const btn of buttons) {
      const svg = btn.querySelector('svg');
      const ariaLabel = btn.getAttribute('aria-label') || '';
      if (
        ariaLabel.toLowerCase().includes('menu') ||
        ariaLabel.toLowerCase().includes('nav') ||
        (svg &&
          btn.getBoundingClientRect().width < 60 &&
          btn.getBoundingClientRect().width > 10)
      ) {
        hamburger = btn;
        break;
      }
    }

    // Count visible desktop links (wide text links that should be hidden on mobile)
    const links = nav.querySelectorAll('a');
    let visibleDesktopLinks = 0;
    for (const link of links) {
      const rect = link.getBoundingClientRect();
      const style = getComputedStyle(link);
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden'
      ) {
        if (rect.width > 60 && link.textContent.trim().length > 2) {
          visibleDesktopLinks++;
        }
      }
    }

    return {
      found: true,
      hamburger: hamburger
        ? {
            visible:
              getComputedStyle(hamburger).display !== 'none' &&
              getComputedStyle(hamburger).visibility !== 'hidden',
            width: Math.round(hamburger.getBoundingClientRect().width),
            height: Math.round(hamburger.getBoundingClientRect().height),
          }
        : null,
      visibleDesktopLinks,
      navRect: { width: Math.round(nav.getBoundingClientRect().width) },
    };
  });

  console.log('Nav:', JSON.stringify(navData, null, 2));
  if (navData.found) {
    check(
      'NAVBAR',
      'Hamburger menu exists',
      navData.hamburger !== null,
      navData.hamburger ? 'found' : 'NOT FOUND',
      'found',
    );
    if (navData.hamburger) {
      check(
        'NAVBAR',
        'Hamburger visible',
        navData.hamburger.visible,
        navData.hamburger.visible,
        true,
      );
    }
    check(
      'NAVBAR',
      'Desktop nav hidden (<=1 visible desktop link)',
      navData.visibleDesktopLinks <= 1,
      `${navData.visibleDesktopLinks} links`,
      '0-1 links',
    );
  }

  // ========== D. CAROUSELS ==========
  console.log('\n=== D. CAROUSELS ===');
  const carouselData = await page.evaluate(() => {
    const results = [];

    // Look for scroll-snap containers (actual carousels)
    const allEls = document.querySelectorAll('*');
    const carousels = [];
    for (const el of allEls) {
      const _style = getComputedStyle(el);
      const cls = el.className || '';
      if (
        typeof cls === 'string' &&
        (cls.includes('snap-x') ||
          cls.includes('scroll-snap') ||
          cls.includes('overflow-x-auto') ||
          cls.includes('overflow-x-scroll'))
      ) {
        // Only include if it has direct children that look like cards
        const children = el.children;
        if (children.length >= 2) {
          let hasCards = false;
          for (const child of children) {
            const cr = child.getBoundingClientRect();
            if (cr.width > 100 && cr.width < 400 && cr.height > 100) {
              hasCards = true;
              break;
            }
          }
          if (hasCards) carousels.push(el);
        }
      }
    }

    for (const c of carousels.slice(0, 10)) {
      const cards = [];
      for (const child of c.children) {
        const r = child.getBoundingClientRect();
        if (r.width > 100 && r.width < 400) cards.push(Math.round(r.width));
      }
      results.push({
        class: (c.className || '').substring(0, 60),
        scrollWidth: c.scrollWidth,
        clientWidth: c.clientWidth,
        cardCount: cards.length,
        cardWidths: cards.slice(0, 5),
      });
    }

    return results;
  });

  console.log('Carousels found:', carouselData.length);
  for (const c of carouselData) {
    console.log(`  Class: ${c.class}`);
    console.log(`  Cards: ${c.cardCount}, widths: ${c.cardWidths.join(', ')}`);
    if (c.cardCount > 0) {
      const has85Cards = c.cardWidths.some((w) => w >= 290 && w <= 340);
      check(
        'CAROUSEL',
        `Card width ~85% (290-340px): ${c.class.substring(0, 30)}`,
        has85Cards,
        `${c.cardWidths.join(', ')}px`,
        '290-340px',
      );
    }
  }

  // No horizontal page scroll from carousels
  const finalScroll = await page.evaluate(() => document.body.scrollWidth);
  check(
    'CAROUSEL',
    'No horizontal page scroll from carousels',
    finalScroll <= 375,
    `${finalScroll}px`,
    '<= 375px',
  );

  // ========== E. FOOTER ==========
  console.log('\n=== E. FOOTER ===');
  const footerData = await page.evaluate(() => {
    const footer = document.querySelector('footer');
    if (!footer) return { found: false };

    const grids = footer.querySelectorAll('div');
    let statsColumns = 0;
    let statsGridFound = false;

    for (const g of grids) {
      const style = getComputedStyle(g);
      if (style.display === 'grid' || style.display === 'inline-grid') {
        const cols = style.gridTemplateColumns.split(' ').length;
        if (cols >= 2) {
          // Check if it looks like a stats grid
          const text = g.textContent || '';
          if (
            /\d+%|\d+\+/.test(text) &&
            g.getBoundingClientRect().height < 200
          ) {
            statsGridFound = true;
            statsColumns = cols;
            break;
          }
          // Track max cols as fallback
          if (cols > statsColumns) {
            statsColumns = cols;
            statsGridFound = true;
          }
        }
      }
    }

    return {
      found: true,
      statsColumns,
      statsGridFound,
      footerWidth: Math.round(footer.getBoundingClientRect().width),
    };
  });

  console.log('Footer:', JSON.stringify(footerData, null, 2));
  if (footerData.found) {
    check(
      'FOOTER',
      'Footer width == 375px',
      footerData.footerWidth === 375,
      `${footerData.footerWidth}px`,
      '375px',
    );
    if (footerData.statsGridFound) {
      check(
        'FOOTER',
        'Stats grid has 2 columns on mobile',
        footerData.statsColumns === 2,
        `${footerData.statsColumns} columns`,
        '2 columns',
      );
    }
  }

  // ========== FINAL REPORT ==========
  console.log(`\n${'='.repeat(60)}`);
  console.log('FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(`PASS: ${results.pass.length}`);
  console.log(`FAIL: ${results.fail.length}`);

  if (results.fail.length > 0) {
    console.log('\n--- FAILURES ---');
    for (const f of results.fail) {
      console.log(`  [${f.category}] ${f.name}`);
      console.log(`    Actual: ${f.actual}`);
      console.log(`    Expected: ${f.expected}`);
    }
  }

  console.log('\n--- ALL PASSED ---');
  for (const p of results.pass) {
    console.log(`  [OK] [${p.category}] ${p.name} = ${p.actual}`);
  }

  // Write report
  const report = [];
  report.push('# Mobile QA Final Report — 2026-03-31');
  report.push('');
  report.push('**Viewport:** 375x812 (iPhone X)');
  report.push('**URL:** http://192.168.178.179:3000');
  report.push(`**Test Time:** ${new Date().toISOString()}`);
  report.push('');
  report.push(
    `## Result: ${results.fail.length === 0 ? '✅ PASS' : '❌ FAIL'}`,
  );
  report.push('');
  report.push('## Summary');
  report.push(`- **Passed:** ${results.pass.length}`);
  report.push(`- **Failed:** ${results.fail.length}`);
  report.push('');

  if (results.fail.length > 0) {
    report.push('## ❌ Failures');
    report.push('');
    for (const f of results.fail) {
      report.push(`### [${f.category}] ${f.name}`);
      report.push(`- **Actual:** ${f.actual}`);
      report.push(`- **Expected:** ${f.expected}`);
      report.push('');
    }
  }

  report.push('## ✅ Passed Checks');
  report.push('');
  for (const p of results.pass) {
    report.push(`- [${p.category}] ${p.name} = \`${p.actual}\``);
  }
  report.push('');

  const fs = require('node:fs');
  const outDir = 'D:\\Desktop\\reynubix\\test-results\\mobile-audit-2026-03-31';
  fs.writeFileSync(`${outDir}\\qa-final-report.md`, report.join('\n'));
  console.log(`\nReport written to ${outDir}\\qa-final-report.md`);

  await page.screenshot({
    path: `${outDir}\\qa-verification-375px.png`,
    fullPage: true,
  });
  console.log('Screenshot saved.');

  await browser.close();
  process.exit(results.fail.length > 0 ? 1 : 0);
})();
