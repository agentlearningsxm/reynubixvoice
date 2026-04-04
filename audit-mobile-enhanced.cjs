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
    if (condition) {
      results.pass.push(entry);
    } else {
      results.fail.push(entry);
    }
  }

  // ========== A. HERO SECTION ==========
  const heroData = await page.evaluate(() => {
    const section = document.querySelector('section');
    if (!section) return null;
    const h1 = section.querySelector('h1');
    const h1Rect = h1?.getBoundingClientRect();

    // Find phone element — try multiple selectors
    let phone = section.querySelector('.hero-phone-bg');
    if (!phone) phone = section.querySelector('[class*="hero-phone"]');
    if (!phone) phone = section.querySelector('img[alt*="phone" i]');
    if (!phone) phone = section.querySelector('.phone-mockup');
    // Try finding the phone by looking for large images in the hero
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

    // Social proof — find avatars or star ratings
    let socialProof = null;
    // Try by class patterns
    const allDivs = section.querySelectorAll('div');
    for (const d of allDivs) {
      const cls = d.className || '';
      if (
        cls.includes('mt-8') &&
        (d.querySelector('svg') ||
          d.textContent.includes('★') ||
          d.textContent.includes('star'))
      ) {
        socialProof = d;
        break;
      }
    }
    // Fallback: find div containing "businesses" or rating text
    if (!socialProof) {
      for (const d of allDivs) {
        const text = d.textContent || '';
        if (
          (text.includes('businesses') ||
            text.includes('5.0') ||
            text.includes('rating')) &&
          d.children.length > 0 &&
          d.getBoundingClientRect().height < 100
        ) {
          socialProof = d;
          break;
        }
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
      phoneSelector: phone
        ? `${phone.tagName}.${(phone.className || '').substring(0, 50)}`
        : 'NOT FOUND',
    };
  });

  console.log('\n=== A. HERO SECTION ===');
  if (heroData) {
    console.log('H1:', JSON.stringify(heroData.h1));
    console.log('Phone:', JSON.stringify(heroData.phone));
    console.log('Phone selector:', heroData.phoneSelector);
    console.log('Social proof:', JSON.stringify(heroData.social));

    // A1: H1 width <= 355px
    check(
      'HERO',
      'H1 width <= 355px',
      heroData.h1 && heroData.h1.width <= 355,
      `${heroData.h1?.width}px`,
      '<= 355px',
    );

    // A2: H1 wrapping (height > 50px for multi-line)
    check(
      'HERO',
      'H1 wrapping (height > 50px)',
      heroData.h1 && heroData.h1.height > 50,
      `${heroData.h1?.height}px`,
      '> 50px',
    );

    // A3: Phone not overflowing viewport (right edge <= 375)
    if (heroData.phone) {
      check(
        'HERO',
        'Phone right edge <= 375px',
        heroData.phone.right <= 375,
        `${heroData.phone.right}px`,
        '<= 375px',
      );
    } else {
      results.fail.push({
        category: 'HERO',
        name: 'Phone element found',
        actual: 'NOT FOUND',
        expected: 'found',
      });
    }

    // A4: Phone below social proof
    if (heroData.social && heroData.phone) {
      check(
        'HERO',
        'Phone below social proof',
        heroData.phone.top > heroData.social.bottom,
        `phone top=${heroData.phone.top}, social bottom=${heroData.social.bottom}`,
        'phone top > social bottom',
      );
    } else if (heroData.phone && heroData.h1) {
      // Fallback: phone should be below H1
      check(
        'HERO',
        'Phone below H1',
        heroData.phone.top > heroData.h1.bottom,
        `phone top=${heroData.phone.top}, h1 bottom=${heroData.h1.bottom}`,
        'phone top > h1 bottom',
      );
    }
  } else {
    results.fail.push({
      category: 'HERO',
      name: 'Hero section exists',
      actual: 'null',
      expected: 'section found',
    });
  }

  // A5: No horizontal page scroll
  const scrollData = await page.evaluate(() => {
    return {
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.body.clientWidth,
    };
  });
  console.log('\nBody scroll:', JSON.stringify(scrollData));
  check(
    'HERO',
    'No horizontal scroll (scrollWidth == 375)',
    scrollData.scrollWidth <= 375,
    `${scrollData.scrollWidth}px`,
    '<= 375px',
  );

  // ========== B. ALL SECTIONS ==========
  console.log('\n=== B. ALL SECTIONS ===');
  const allSections = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('section')).map((s, i) => {
      const r = s.getBoundingClientRect();
      const h2 = s.querySelector('h2');
      const h2r = h2?.getBoundingClientRect();

      // Find rightmost child element
      let maxRight = 0;
      const walker = document.createTreeWalker(s, NodeFilter.SHOW_ELEMENT);
      while (walker.nextNode()) {
        const cr = walker.currentNode.getBoundingClientRect();
        if (cr.right > maxRight) maxRight = cr.right;
      }

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
        maxChildRight: Math.round(maxRight),
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
    check(
      'SECTIONS',
      `${sectionLabel} no child past x=375`,
      s.maxChildRight <= 376,
      `${s.maxChildRight}px`,
      '<= 375px',
    );
    console.log(
      `  [${s.index}] ${s.id}: width=${s.width}, h2=${s.h2 ? `${s.h2.width}px` : 'none'}, maxRight=${s.maxChildRight}`,
    );
  }

  // ========== C. NAVBAR ==========
  console.log('\n=== C. NAVBAR ===');
  const navData = await page.evaluate(() => {
    const nav =
      document.querySelector('nav') || document.querySelector('header');
    if (!nav) return { found: false };

    // Look for hamburger button (common patterns)
    const buttons = nav.querySelectorAll('button');
    let hamburger = null;
    for (const btn of buttons) {
      const svg = btn.querySelector('svg');
      const ariaLabel = btn.getAttribute('aria-label') || '';
      const text = btn.textContent || '';
      if (
        ariaLabel.toLowerCase().includes('menu') ||
        ariaLabel.toLowerCase().includes('nav') ||
        text.toLowerCase().includes('menu') ||
        (svg && btn.getBoundingClientRect().width < 60)
      ) {
        hamburger = btn;
        break;
      }
    }
    // Also check for common hamburger patterns (3 lines SVG)
    if (!hamburger) {
      for (const btn of buttons) {
        const rect = btn.getBoundingClientRect();
        if (rect.width < 60 && rect.height < 60 && rect.width > 20) {
          const svgs = btn.querySelectorAll('svg path');
          if (svgs.length >= 3) {
            hamburger = btn;
            break;
          }
        }
      }
    }

    // Check for desktop nav links that should be hidden
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
        // Desktop nav links are typically wider text links
        if (rect.width > 60 && link.textContent.trim().length > 2) {
          visibleDesktopLinks++;
        }
      }
    }

    return {
      found: true,
      hamburger: hamburger
        ? {
            visible: getComputedStyle(hamburger).display !== 'none',
            width: Math.round(hamburger.getBoundingClientRect().width),
            height: Math.round(hamburger.getBoundingClientRect().height),
          }
        : null,
      visibleDesktopLinks,
      navRect: nav
        ? { width: Math.round(nav.getBoundingClientRect().width) }
        : null,
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
  } else {
    results.fail.push({
      category: 'NAVBAR',
      name: 'Nav/header element exists',
      actual: 'NOT FOUND',
      expected: 'found',
    });
  }

  // ========== D. CAROUSELS ==========
  console.log('\n=== D. CAROUSELS ===');
  const carouselData = await page.evaluate(() => {
    const results = [];

    // Find carousel-like containers (overflow-x: auto/scroll, or swiper, or slider classes)
    const allEls = document.querySelectorAll('*');
    const carousels = [];
    for (const el of allEls) {
      const style = getComputedStyle(el);
      const cls = el.className || '';
      if (
        (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
        (cls.includes('slider') ||
          cls.includes('carousel') ||
          cls.includes('swiper') ||
          cls.includes('scroll') ||
          cls.includes('snap'))
      ) {
        carousels.push(el);
      }
    }

    // Also look for specific component names
    const specificSelectors = [
      '[class*="IndustrySlider"]',
      '[class*="industry"]',
      '[class*="comparison"]',
      '[class*="Comparison"]',
      '[class*="AutomationCard"]',
      '[class*="automation"]',
      '[class*="scroll-snap"]',
      '[class*="snap-x"]',
      '[data-testid*="carousel"]',
      '[class*="overflow-x"]',
    ];

    for (const sel of specificSelectors) {
      const els = document.querySelectorAll(sel);
      els.forEach((el) => {
        if (!carousels.includes(el)) carousels.push(el);
      });
    }

    // Get card info from each carousel
    for (const c of carousels.slice(0, 10)) {
      const cards = c.querySelectorAll(
        ':scope > div, :scope > article, :scope > li',
      );
      const cardWidths = [];
      for (const card of cards) {
        const r = card.getBoundingClientRect();
        if (r.width > 100) cardWidths.push(Math.round(r.width));
      }
      results.push({
        class: (c.className || '').substring(0, 60),
        scrollWidth: c.scrollWidth,
        clientWidth: c.clientWidth,
        cardCount: cardWidths.length,
        cardWidths: cardWidths.slice(0, 5),
      });
    }

    return results;
  });

  console.log('Carousels found:', carouselData.length);
  for (const c of carouselData) {
    console.log(`  Class: ${c.class}`);
    console.log(`  Cards: ${c.cardCount}, widths: ${c.cardWidths.join(', ')}`);
    const has85Cards = c.cardWidths.some((w) => w >= 290 && w <= 340);
    if (c.cardCount > 0) {
      check(
        'CAROUSEL',
        `Card width ~85% (290-340px) in ${c.class.substring(0, 30)}`,
        has85Cards,
        `${c.cardWidths.join(', ')}px`,
        '290-340px',
      );
    }
  }

  // Check no horizontal scroll (already checked above, but re-verify after full load)
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

    // Find grids in footer
    const grids = footer.querySelectorAll('[class*="grid"], div');
    let statsGrid = null;
    let statsColumns = 0;

    for (const g of grids) {
      const style = getComputedStyle(g);
      if (style.display === 'grid' || style.display === 'inline-grid') {
        const cols = style.gridTemplateColumns;
        const colCount = cols.split(' ').length;
        // Look for the stats grid (typically has 4 items with numbers)
        const children = g.children;
        if (colCount >= 2 && children.length >= 2) {
          // Check if children contain numbers/stats
          let hasStats = false;
          for (const child of children) {
            const text = child.textContent || '';
            if (
              /\d+/.test(text) &&
              (text.includes('%') || text.includes('+') || text.length < 30)
            ) {
              hasStats = true;
              break;
            }
          }
          if (hasStats && colCount >= 2) {
            statsGrid = g;
            statsColumns = colCount;
          }
        }
      }
    }

    // Fallback: find grid with most columns
    if (!statsGrid) {
      let maxCols = 0;
      for (const g of grids) {
        const style = getComputedStyle(g);
        if (style.display === 'grid') {
          const colCount = style.gridTemplateColumns.split(' ').length;
          if (colCount > maxCols) {
            maxCols = colCount;
            statsGrid = g;
            statsColumns = colCount;
          }
        }
      }
    }

    // Check footer content layout
    const _footerChildren = footer.querySelector('div')?.children?.length || 0;

    return {
      found: true,
      statsColumns,
      statsGridFound: statsGrid !== null,
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
    } else {
      results.fail.push({
        category: 'FOOTER',
        name: 'Stats grid found',
        actual: 'NOT FOUND',
        expected: 'grid found',
      });
    }
  } else {
    results.fail.push({
      category: 'FOOTER',
      name: 'Footer exists',
      actual: 'NOT FOUND',
      expected: 'found',
    });
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

  if (results.pass.length > 0) {
    console.log('\n--- PASSED ---');
    for (const p of results.pass) {
      console.log(`  [OK] [${p.category}] ${p.name} = ${p.actual}`);
    }
  }

  // Write report
  const report = [];
  report.push('# Mobile QA Final Report — 2026-03-31');
  report.push('');
  report.push(`**Viewport:** 375x812 (iPhone X)`);
  report.push(`**URL:** http://192.168.178.179:3000`);
  report.push(
    `**Result:** ${results.fail.length === 0 ? '✅ PASS' : '❌ FAIL'}`,
  );
  report.push('');
  report.push(`## Summary`);
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

  // Write to file
  const fs = require('node:fs');
  const outDir = 'D:\\Desktop\\reynubix\\test-results\\mobile-audit-2026-03-31';
  fs.writeFileSync(`${outDir}\\qa-final-report.md`, report.join('\n'));
  console.log(`\nReport written to ${outDir}\\qa-final-report.md`);

  // Take screenshot
  await page.screenshot({
    path: `${outDir}\\qa-verification-375px.png`,
    fullPage: true,
  });
  console.log('Screenshot saved.');

  await browser.close();

  // Exit code
  process.exit(results.fail.length > 0 ? 1 : 0);
})();
