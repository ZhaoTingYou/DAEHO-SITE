import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const globals = readFileSync(new URL('./app/globals.css', import.meta.url), 'utf8');
const mobile = readFileSync(new URL('./styles/mobile.css', import.meta.url), 'utf8');
const header = readFileSync(new URL('./components/site/site-header.tsx', import.meta.url), 'utf8');
const footer = readFileSync(new URL('./components/site/site-footer.tsx', import.meta.url), 'utf8');
const homeHero = readFileSync(new URL('./components/home/home-hero.tsx', import.meta.url), 'utf8');
const homeNews = readFileSync(new URL('./components/home/home-news-popups.tsx', import.meta.url), 'utf8');
const chronicle = readFileSync(new URL('./components/chronicle/chronicle-horizontal.tsx', import.meta.url), 'utf8');
const chronicleMobile = readFileSync(new URL('./components/chronicle/chronicle-mobile.tsx', import.meta.url), 'utf8');
const homePage = readFileSync(new URL('./app/[locale]/(site)/page.tsx', import.meta.url), 'utf8');
const heritageHero = readFileSync(new URL('./components/legacy/heritage-hero.tsx', import.meta.url), 'utf8');
const loyaltyPage = readFileSync(new URL('./components/legacy/loyalty-commitment-page.tsx', import.meta.url), 'utf8');
const credibilityPage = readFileSync(new URL('./components/legacy/credibility-compliance-page.tsx', import.meta.url), 'utf8');
const achievementPage = readFileSync(new URL('./components/legacy/achievement-records-page.tsx', import.meta.url), 'utf8');
const specialtyProcessSource = readFileSync(new URL('./components/specialty/specialty-process.tsx', import.meta.url), 'utf8');
const creationsPageSource = readFileSync(new URL('./app/[locale]/(site)/mastery/creations/page.tsx', import.meta.url), 'utf8');
const newsPageSource = readFileSync(new URL('./app/[locale]/(site)/news/page.tsx', import.meta.url), 'utf8');
const newsDetailSource = readFileSync(new URL('./app/[locale]/(site)/news/[slug]/page.tsx', import.meta.url), 'utf8');
const newsGridSource = readFileSync(new URL('./components/news/news-journal-grid.tsx', import.meta.url), 'utf8');

test('public mobile pages share fixed typography and spacing tokens', () => {
  assert.match(globals, /@import "\.\.\/styles\/mobile\.css"/);
  assert.match(mobile, /--mobile-page-gutter: 20px/);
  assert.match(mobile, /--mobile-section-space: 80px/);
  assert.match(mobile, /--mobile-header-height: 64px/);
  assert.match(mobile, /\.mobile-display[\s\S]+font-size: 44px/);
  assert.match(mobile, /\.mobile-copy[\s\S]+font-size: 16px/);
  assert.doesNotMatch(mobile, /font-size:[^;]*(vw|dvw)/);
});

test('public mobile shell uses a compact safe-area header and scrollable menu', () => {
  assert.match(header, /mobile-site-header/);
  assert.match(header, /mobile-menu-panel/);
  assert.match(header, /h-\[calc\(var\(--mobile-header-height\)\+env\(safe-area-inset-top\)\)\]/);
  assert.match(header, /top-\[calc\(var\(--mobile-header-height\)\+env\(safe-area-inset-top\)\)\]/);
  assert.match(header, /overflow-y-auto/);
  assert.match(footer, /mobile-site-footer/);
  assert.match(footer, /pt-16 pb-0 md:py-\[clamp\(56px,7vw,96px\)\]/);
  assert.doesNotMatch(footer, /px-container pt-16 pb-12/);
  assert.match(mobile, /\.mobile-site-footer \{[\s\S]*padding-bottom: calc\(32px \+ env\(safe-area-inset-bottom\)\);/);
  assert.doesNotMatch(mobile, /\.mobile-site-footer \{[\s\S]*padding-top:/);
});

test('Home mobile hero wraps copy and uses a controlled viewport height', () => {
  assert.match(homeHero, /min-h-\[80svh\]/);
  assert.doesNotMatch(homeHero, /className="block max-w-full overflow-visible whitespace-nowrap"/);
  assert.match(homeNews, /mobile-home-news-row/);
});

test('Archive uses a dedicated linear mobile timeline', () => {
  assert.match(chronicle, /<ChronicleMobile/);
});

test('Archive mobile chronology clears the safe-area header and preserves image fallback behavior', () => {
  assert.match(chronicleMobile, /pt-\[calc\(var\(--mobile-header-height\)\+env\(safe-area-inset-top\)\+24px\)\]/);
  assert.match(chronicleMobile, /top-\[calc\(var\(--mobile-header-height\)\+env\(safe-area-inset-top\)\)\]/);
  assert.match(chronicleMobile, /function ChronicleMobileSlideImage/);
  assert.match(chronicleMobile, /event\.currentTarget\.style\.visibility = 'hidden'/);
  assert.match(chronicleMobile, /setSource\(fallbackImage\)/);
  assert.match(chronicleMobile, /setFailed\(true\)/);
});

test('Archive viewport selection is SSR-safe and stops desktop scroll work on compact viewports', () => {
  assert.match(chronicle, /useSyncExternalStore/);
  assert.match(chronicle, /\(\) => true/);
  assert.match(chronicle, /if \(compactViewport\) \{\s+return;\s+\}\s+\s+const stage = stageRef\.current;/);
  assert.match(chronicle, /\}, \[compactViewport, introComplete, slides\.length\]\);/);
});

test('Home mobile body and action copy use a 16px floor', () => {
  assert.match(homePage, /home-feature-link inline-flex \[font-family:'Pretendard',sans-serif\] text-\[16px\].*md:text-\[15px\]/);
  assert.match(homePage, /max-w-\[360px\] whitespace-pre-line font-body text-\[16px\].*md:text-\[15px\]/);
});

test('Home Signature title wraps on mobile and stays unwrapped on desktop', () => {
  assert.match(homePage, /<h2 className="font-body text-\[16px\] font-normal leading-\[1\.75\] text-primary md:text-\[15px\] md:whitespace-nowrap">/);
});

test('Heritage pages share compact mobile layout hooks', () => {
  for (const source of [loyaltyPage, credibilityPage, achievementPage]) {
    assert.match(source, /mobile-page-shell/);
    assert.match(source, /mobile-copy/);
  }
  assert.match(heritageHero, /min-h-\[78svh\]/);
  assert.match(heritageHero, /pt-\[calc\(var\(--mobile-header-height\)\+env\(safe-area-inset-top\)\+80px\)\]/);
});

test('Achievement market sections render one mobile body after their image', () => {
  assert.match(achievementPage, /<MarketText item=\{item\} locale=\{locale\} className=\{`order-1[\s\S]*?<MarketImage[\s\S]*?<MarketText item=\{item\} locale=\{locale\} className="order-3 md:hidden" bodyOnly/);
  assert.match(achievementPage, /\{!bodyOnly \? \([\s\S]*?\{item\.accent\}[\s\S]*?\) : null\}/);
  assert.match(achievementPage, /\$\{bodyOnly \? '' : 'hidden md:block'\}/);
});

test('Loyalty mobile carousel keeps copy and controls in reachable document flow', () => {
  const loyaltyCarousel = readFileSync(new URL('./components/legacy/loyalty-feature-carousel.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(loyaltyCarousel, /min-h-\[600px\]/);
  assert.match(loyaltyCarousel, /relative aspect-\[4\/3\] w-full md:hidden/);
  assert.match(loyaltyCarousel, /relative z-10 flex w-full flex-col bg-white/);
  assert.match(loyaltyCarousel, /relative z-20 flex justify-center gap-3 bg-white/);
  assert.match(loyaltyCarousel, /mobile-tap-target grid h-11 w-11/);
});

test('Making mobile process uses readable fixed body copy and 4:3 media', () => {
  assert.match(specialtyProcessSource, /mobile-making-step/);
  assert.match(specialtyProcessSource, /mobile-copy/);
  assert.match(specialtyProcessSource, /max-md:aspect-\[4\/3\]/);
});

test('Creations mobile masthead cannot clip the display title', () => {
  assert.match(creationsPageSource, /mobile-display/);
  assert.doesNotMatch(creationsPageSource, /whitespace-nowrap[^\n]+CREATIONS/);
});

test('News mobile list uses compact landscape cards and fixed display type', () => {
  assert.match(newsPageSource, /mobile-display/);
  assert.match(newsGridSource, /max-md:aspect-\[4\/3\]/);
  assert.match(newsGridSource, /mobile-copy/);
});

test('News detail keeps adjacent navigation reachable on phones', () => {
  assert.match(newsDetailSource, /mobile-news-adjacent/);
  assert.match(newsDetailSource, /min-h-11/);
});
