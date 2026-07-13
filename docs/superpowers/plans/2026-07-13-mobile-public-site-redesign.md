# DAEHO Mobile Public Site Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign every public Korean and English page below 768px into a consistent, readable, thumb-friendly mobile experience while preserving desktop layouts and CMS contracts.

**Architecture:** Add a small mobile token and utility layer, then apply it through existing shared components and page-family components. Keep desktop rendering paths intact; Archive receives a dedicated compact timeline because its current desktop scroll stage is structurally unsuitable for phones.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Node test runner, Playwright browser verification.

## Global Constraints

- Scope is public KO/EN pages only; CMS admin and the internal style guide are excluded.
- Preserve the white, navy, burgundy, MaruBuri/Pretendard, and Cormorant Garamond/Inter visual system.
- Body copy is at least 16px on mobile and display text uses fixed breakpoint sizes, not viewport-width font scaling.
- Primary targets are 375px and 430px; no horizontal scrolling at 320px or wider.
- Core content stays available, but purely decorative desktop elements may be hidden or simplified.
- Do not change CMS schemas, public API shapes, route paths, SEO metadata, or desktop content order.
- Leave `output/`, `outputs/`, and `tmp/` untracked.

---

### Task 1: Mobile Tokens And Regression Harness

**Files:**
- Create: `styles/mobile.css`
- Create: `mobile-public-site.test.mjs`
- Modify: `app/globals.css`

**Interfaces:**
- Produces CSS custom properties `--mobile-page-gutter`, `--mobile-section-space`, and `--mobile-header-height`.
- Produces reusable classes `mobile-page-shell`, `mobile-section`, `mobile-display`, `mobile-copy`, `mobile-media-landscape`, `mobile-media-portrait`, and `mobile-tap-target`.

- [ ] **Step 1: Write the failing mobile token test**

```js
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const globals = readFileSync(new URL('./app/globals.css', import.meta.url), 'utf8');
const mobile = readFileSync(new URL('./styles/mobile.css', import.meta.url), 'utf8');

test('public mobile pages share fixed typography and spacing tokens', () => {
  assert.match(globals, /@import "\.\.\/styles\/mobile\.css"/);
  assert.match(mobile, /--mobile-page-gutter: 20px/);
  assert.match(mobile, /--mobile-section-space: 80px/);
  assert.match(mobile, /--mobile-header-height: 64px/);
  assert.match(mobile, /\.mobile-display[\s\S]+font-size: 44px/);
  assert.match(mobile, /\.mobile-copy[\s\S]+font-size: 16px/);
  assert.doesNotMatch(mobile, /font-size:[^;]*(vw|dvw)/);
});
```

- [ ] **Step 2: Run the test and verify the missing stylesheet failure**

Run: `node --test mobile-public-site.test.mjs`

Expected: FAIL because `styles/mobile.css` does not exist.

- [ ] **Step 3: Add the mobile stylesheet and import it**

Add after the Tailwind import in `app/globals.css`:

```css
@import "../styles/mobile.css";
```

Create `styles/mobile.css`:

```css
@media (max-width: 767px) {
  :root {
    --mobile-page-gutter: 20px;
    --mobile-section-space: 80px;
    --mobile-header-height: 64px;
  }

  .mobile-page-shell {
    overflow-x: clip;
  }

  .mobile-section {
    padding-block: var(--mobile-section-space);
    padding-inline: var(--mobile-page-gutter);
  }

  .mobile-display {
    max-width: 100%;
    overflow-wrap: anywhere;
    font-size: 44px;
    line-height: .98;
    letter-spacing: 0;
  }

  .mobile-copy {
    font-size: 16px;
    line-height: 1.75;
    letter-spacing: 0;
  }

  .mobile-media-landscape { aspect-ratio: 4 / 3; }
  .mobile-media-portrait { aspect-ratio: 4 / 5; }
  .mobile-tap-target { min-width: 44px; min-height: 44px; }
}

@media (max-width: 359px) {
  :root { --mobile-page-gutter: 16px; }
  .mobile-display { font-size: 40px; }
}
```

- [ ] **Step 4: Run the focused test**

Run: `node --test mobile-public-site.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the shared foundation**

```bash
git add app/globals.css styles/mobile.css mobile-public-site.test.mjs
git commit -m "Add public mobile design foundation"
```

---

### Task 2: Shared Header, Menu, Footer, And Safe Areas

**Files:**
- Modify: `components/site/site-header.tsx`
- Modify: `components/site/site-footer.tsx`
- Modify: `styles/mobile.css`
- Modify: `mobile-public-site.test.mjs`

**Interfaces:**
- Consumes the Task 1 mobile tokens.
- Produces class hooks `mobile-site-header`, `mobile-menu-panel`, and `mobile-site-footer` used on every public page.

- [ ] **Step 1: Add failing shared-shell assertions**

```js
const header = readFileSync(new URL('./components/site/site-header.tsx', import.meta.url), 'utf8');
const footer = readFileSync(new URL('./components/site/site-footer.tsx', import.meta.url), 'utf8');

test('public mobile shell uses a compact safe-area header and scrollable menu', () => {
  assert.match(header, /mobile-site-header/);
  assert.match(header, /mobile-menu-panel/);
  assert.match(header, /h-16/);
  assert.match(header, /overflow-y-auto/);
  assert.match(footer, /mobile-site-footer/);
});
```

- [ ] **Step 2: Verify the shell test fails**

Run: `node --test mobile-public-site.test.mjs`

Expected: FAIL because the class hooks and 64px mobile bar are absent.

- [ ] **Step 3: Implement the compact header and full-height menu**

Use these exact mobile class outcomes in `site-header.tsx` while leaving the `lg:block` desktop header unchanged:

```tsx
<div className="mobile-site-header mx-auto flex h-16 max-w-[1440px] items-center justify-between px-[var(--mobile-page-gutter)] pt-[env(safe-area-inset-top)] lg:hidden">
```

```tsx
<motion.div className="mobile-menu-panel fixed inset-x-0 bottom-0 top-[calc(var(--mobile-header-height)+env(safe-area-inset-top))] overflow-y-auto overscroll-contain bg-bg px-[var(--mobile-page-gutter)] pb-[calc(28px+env(safe-area-inset-bottom))] text-primary lg:hidden">
```

Use 44px controls, an 18px DAEHO wordmark, visible active states, and close the menu after every route selection.

- [ ] **Step 4: Compact the footer without removing business information**

Add `mobile-site-footer` to the footer root. In `styles/mobile.css`, set the mobile footer to 64px top padding, a two-column navigation grid, 16px body copy for business information, and `overflow-wrap:anywhere` for addresses and email values.

```css
.mobile-site-footer {
  padding-top: 64px;
  padding-bottom: calc(32px + env(safe-area-inset-bottom));
}
.mobile-site-footer nav { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.mobile-site-footer dd { overflow-wrap: anywhere; font-size: 16px; line-height: 1.65; }
```

- [ ] **Step 5: Run shared tests and commit**

Run: `node --test mobile-public-site.test.mjs components/site/site-header-spacing.test.mjs components/site/site-footer-cms.test.mjs`

Expected: PASS.

```bash
git add components/site/site-header.tsx components/site/site-footer.tsx styles/mobile.css mobile-public-site.test.mjs
git commit -m "Redesign shared public mobile shell"
```

---

### Task 3: Home And Archive Mobile Narratives

**Files:**
- Modify: `app/[locale]/(site)/page.tsx`
- Modify: `components/home/home-hero.tsx`
- Modify: `components/home/home-news-popups.tsx`
- Modify: `components/home/home-stat-band.tsx`
- Create: `components/chronicle/chronicle-mobile.tsx`
- Modify: `components/chronicle/chronicle-horizontal.tsx`
- Modify: `styles/mobile.css`
- Modify: `mobile-public-site.test.mjs`

**Interfaces:**
- `ChronicleMobile` consumes the existing `ChronicleHorizontalSlide[]`, `yearNavAriaLabel`, and `endNav` props.
- Home keeps the existing CMS content and popup behavior.

- [ ] **Step 1: Add failing Home and Archive source tests**

```js
const homeHero = readFileSync(new URL('./components/home/home-hero.tsx', import.meta.url), 'utf8');
const homeNews = readFileSync(new URL('./components/home/home-news-popups.tsx', import.meta.url), 'utf8');
const chronicle = readFileSync(new URL('./components/chronicle/chronicle-horizontal.tsx', import.meta.url), 'utf8');

test('Home mobile hero wraps copy and uses a controlled viewport height', () => {
  assert.match(homeHero, /min-h-\[80svh\]/);
  assert.doesNotMatch(homeHero, /className="block max-w-full overflow-visible whitespace-nowrap"/);
  assert.match(homeNews, /mobile-home-news-row/);
});

test('Archive uses a dedicated linear mobile timeline', () => {
  assert.match(chronicle, /<ChronicleMobile/);
});
```

- [ ] **Step 2: Verify the page-family tests fail**

Run: `node --test mobile-public-site.test.mjs`

Expected: FAIL on the current 100vh hero, no compact news row, and no `ChronicleMobile`.

- [ ] **Step 3: Redesign Home mobile flow**

Use `min-h-[80svh] md:min-h-screen` in the hero, wrap title lines below 768px, set mobile title sizes to 32px Korean and 42px English, and set the subtitle to 16px. Convert the two feature bands to image-first vertical sections with 4:3 media and 80px section spacing. Render Home news cards as compact 4:3 image-and-copy rows below 768px while retaining the desktop grid and modal.

```tsx
<span className="block max-w-full whitespace-normal md:whitespace-nowrap">{line}</span>
```

```tsx
className="mobile-home-news-row group grid grid-cols-[112px_minmax(0,1fr)] gap-4 border-t border-primary/15 py-5 text-left md:grid-cols-none"
```

- [ ] **Step 4: Add the linear Archive component**

Create `ChronicleMobile` as a semantic list. Each item renders year, image in `aspect-[4/3]`, kicker, title, and 16px body in that order. Render it from `ChronicleHorizontal` when `compactViewport` is true; keep the current scroll-driven stage for desktop.

```tsx
type ChronicleMobileProps = {
  slides: ChronicleHorizontalSlide[];
  yearNavAriaLabel: string;
  endNav: {label: string; title: string; href: string};
};

export function ChronicleMobile({slides, yearNavAriaLabel, endNav}: ChronicleMobileProps) {
  return (
    <main className="mobile-page-shell bg-bg pt-[calc(var(--mobile-header-height)+24px)]">
      <nav aria-label={yearNavAriaLabel} className="sticky top-[var(--mobile-header-height)] z-20 flex gap-5 overflow-x-auto border-y border-primary/15 bg-bg/95 px-[var(--mobile-page-gutter)] py-4 backdrop-blur">
        {slides.map((slide) => <a key={slide.year} href={`#year-${slide.year}`} className="mobile-tap-target shrink-0">{slide.year}</a>)}
      </nav>
      <ol className="space-y-20 px-[var(--mobile-page-gutter)] py-16">
        {slides.map((slide) => (
          <li id={`year-${slide.year}`} key={slide.year} className="scroll-mt-32 border-t border-primary/15 pt-8">
            <p className="font-numeric text-[18px] text-accent">{slide.year}</p>
            <div className="relative mt-5 aspect-[4/3] overflow-hidden bg-muted">
              <Image src={slide.image} alt={slide.title} fill sizes="100vw" className="object-cover" />
            </div>
            <p className="mt-6 font-body text-[12px] font-semibold uppercase text-accent">{slide.label}</p>
            <h2 className="mt-3 font-heading text-[32px] font-semibold leading-[1.15] text-primary">{slide.title}</h2>
            <p className="mobile-copy mt-4 whitespace-pre-line text-text">{slide.desc}</p>
          </li>
        ))}
      </ol>
      <Link href={endNav.href} className="mobile-tap-target mx-[var(--mobile-page-gutter)] mb-20 block border-y border-primary/15 py-6">
        <span className="block text-[12px] uppercase text-accent">{endNav.label}</span>
        <span className="mt-2 block font-heading text-[28px] text-primary">{endNav.title}</span>
      </Link>
    </main>
  );
}
```

- [ ] **Step 5: Run tests and commit**

Run: `node --test mobile-public-site.test.mjs lib/cms/home-news-source.test.mjs archive-image-fallback.test.mjs`

Expected: PASS.

```bash
git add 'app/[locale]/(site)/page.tsx' components/home components/chronicle styles/mobile.css mobile-public-site.test.mjs
git commit -m "Redesign Home and Archive for mobile"
```

---

### Task 4: Heritage Mobile Page Family

**Files:**
- Modify: `components/legacy/heritage-hero.tsx`
- Modify: `components/legacy/loyalty-commitment-page.tsx`
- Modify: `components/legacy/loyalty-feature-carousel.tsx`
- Modify: `components/legacy/credibility-compliance-page.tsx`
- Modify: `components/legacy/achievement-records-page.tsx`
- Modify: `components/legacy/achievement-pentagon-stats.tsx`
- Modify: `styles/mobile.css`
- Modify: `mobile-public-site.test.mjs`

**Interfaces:**
- Keeps all current Heritage props and CMS content shapes unchanged.
- Reuses `mobile-display`, `mobile-copy`, and mobile media classes.

- [ ] **Step 1: Add failing Heritage assertions**

```js
for (const file of [loyaltySource, credibilitySource, achievementSource]) {
  assert.match(file, /mobile-page-shell/);
  assert.match(file, /mobile-copy/);
}
assert.match(heritageHeroSource, /min-h-\[78svh\]/);
```

- [ ] **Step 2: Verify the Heritage test fails**

Run: `node --test mobile-public-site.test.mjs components/legacy/heritage-hero.test.mjs`

Expected: FAIL because the shared mobile hooks are absent.

- [ ] **Step 3: Apply the shared Heritage hero and reading order**

Set Heritage mobile heroes to `min-h-[78svh]`, use 20px gutters, 44px display titles, 16px body copy, and remove desktop text-card framing below 768px. Reorder every paired section to title, image, and body using `order-* md:order-none`. Keep carousel controls at least 44px and always visible on touch.

- [ ] **Step 4: Simplify dense mobile diagrams**

Hide the decorative pentagon and large background metrics below 768px, retain the accessible metric list, and make each record a border-separated vertical section instead of a card. Use 4:3 process images and 80px section spacing.

- [ ] **Step 5: Run Heritage tests and commit**

Run: `node --test components/legacy/*.test.mjs mobile-public-site.test.mjs`

Expected: PASS.

```bash
git add components/legacy styles/mobile.css mobile-public-site.test.mjs
git commit -m "Redesign Heritage pages for mobile"
```

---

### Task 5: Technique And Making Mobile Records

**Files:**
- Modify: `app/[locale]/(site)/mastery/technique/page.tsx`
- Modify: `components/specialty/technique-records-section.tsx`
- Modify: `app/[locale]/(site)/mastery/making/page.tsx`
- Modify: `components/specialty/specialty-process.tsx`
- Modify: `mastery-technique-page.test.mjs`
- Modify: `mobile-public-site.test.mjs`

**Interfaces:**
- Technique continues to consume `TechniqueRecordItem[]` without data migration.
- Making continues to consume the existing seven `SpecialtyProcessStep` items.

- [ ] **Step 1: Add failing mobile record tests**

```js
test('Technique mobile records use metadata, image, and copy reading order', () => {
  assert.match(techniqueRecordsSource, /mobile-technique-record/);
  assert.match(techniqueRecordsSource, /order-1[\s\S]+order-2[\s\S]+order-3/);
});

test('Making mobile process uses readable fixed body copy and 4:3 media', () => {
  assert.match(specialtyProcessSource, /mobile-making-step/);
  assert.match(specialtyProcessSource, /mobile-copy/);
  assert.match(specialtyProcessSource, /max-md:aspect-\[4\/3\]/);
});
```

- [ ] **Step 2: Verify the mobile record tests fail**

Run: `node --test mastery-technique-page.test.mjs mobile-public-site.test.mjs`

Expected: FAIL on missing mobile hooks.

- [ ] **Step 3: Redesign Technique records**

Use a 72px mobile section rhythm. Each record renders number and optional status, then 4:3 image, scope, title, and 16px body. Remove alternating columns, dossier lines, and sticky desktop labels below 768px. Standards become four border-top text rows; Evidence becomes stacked definition rows instead of a wide matrix.

- [ ] **Step 4: Redesign Making steps**

Render all seven steps as a continuous vertical sequence with 4:3 images, visible step numbers, 32px titles, and 16px body copy. Disable mobile parallax by passing a zero transform under 768px; keep desktop motion intact.

- [ ] **Step 5: Run tests and commit**

Run: `node --test mastery-technique-page.test.mjs mobile-public-site.test.mjs`

Expected: PASS.

```bash
git add 'app/[locale]/(site)/mastery/technique/page.tsx' 'app/[locale]/(site)/mastery/making/page.tsx' components/specialty/technique-records-section.tsx components/specialty/specialty-process.tsx mastery-technique-page.test.mjs mobile-public-site.test.mjs
git commit -m "Redesign Technique and Making for mobile"
```

---

### Task 6: Creations, Categories, And Product Detail

**Files:**
- Modify: `app/[locale]/(site)/mastery/creations/page.tsx`
- Modify: `app/[locale]/(site)/mastery/creations/_category-page.tsx`
- Modify: `app/[locale]/(site)/mastery/creations/[slug]/page.tsx`
- Modify: `components/specialty/specialty-collection-gallery.tsx`
- Modify: `components/specialty/collection-detail-gallery.tsx`
- Modify: `components/specialty/specialty-detail-triplet.tsx`
- Modify: `components/product-grid.tsx`
- Modify: `components/specialty/specialty-collection-gallery.test.mjs`
- Modify: `mobile-public-site.test.mjs`

**Interfaces:**
- Keeps collection routes, item IDs, CMS gallery arrays, category filters, and inquiry links unchanged.
- Changes only the existing mobile collection rendering path in `MobileCollectionIndex` and `MobileCollectionCard`.

- [ ] **Step 1: Add failing Creations mobile tests**

```js
test('Creations mobile masthead cannot clip the display title', () => {
  assert.match(creationsPageSource, /mobile-display/);
  assert.doesNotMatch(creationsPageSource, /whitespace-nowrap[^\n]+CREATIONS/);
});

test('collection mobile cards preserve stable product media and tap targets', () => {
  assert.match(collectionGallerySource, /mobile-collection-card/);
  assert.match(collectionGallerySource, /mobile-tap-target/);
  assert.match(collectionGallerySource, /aspect-\[4\/5\]/);
});
```

- [ ] **Step 2: Verify the Creations tests fail**

Run: `node --test components/specialty/specialty-collection-gallery.test.mjs mobile-public-site.test.mjs`

Expected: FAIL on missing mobile display and card hooks.

- [ ] **Step 3: Redesign the Creations index and category pages**

Allow `CREATIONS` to wrap or scale to the fixed 40px compact title at 375px. Keep category navigation horizontally scrollable with 44px targets. Render each category as a 4:5 product image, title, two-line description, and icon CTA; remove viewport-filling dark panels from the mobile path.

- [ ] **Step 4: Redesign product and appointment detail pages**

Use title, primary gallery, metadata, body, detail strip, and inquiry action in that order. Remove mobile sticky sidebars, set gallery controls to 44px, use 4:5 main media and 4:3 detail media, and make every form field full width. Preserve the desktop sticky detail layout under `lg:`.

- [ ] **Step 5: Run collection tests and commit**

Run: `node --test components/specialty/*.test.mjs mobile-public-site.test.mjs lib/collection-category-seo.test.mjs`

Expected: PASS.

```bash
git add 'app/[locale]/(site)/mastery/creations' components/specialty components/product-grid.tsx mobile-public-site.test.mjs
git commit -m "Redesign Creations and product pages for mobile"
```

---

### Task 7: News List, Popups, And Article Detail

**Files:**
- Modify: `app/[locale]/(site)/news/page.tsx`
- Modify: `app/[locale]/(site)/news/[slug]/page.tsx`
- Modify: `components/news/news-journal-grid.tsx`
- Modify: `components/news/news-reading-progress.tsx`
- Modify: `components/home/home-news-popups.tsx`
- Modify: `mobile-public-site.test.mjs`

**Interfaces:**
- Keeps News CMS block order, category filters, article IDs, and previous/next relationships unchanged.

- [ ] **Step 1: Add failing News assertions**

```js
test('News mobile list uses compact landscape cards and fixed display type', () => {
  assert.match(newsPageSource, /mobile-display/);
  assert.match(newsGridSource, /max-md:aspect-\[4\/3\]/);
  assert.match(newsGridSource, /mobile-copy/);
});

test('News detail keeps adjacent navigation reachable on phones', () => {
  assert.match(newsDetailSource, /mobile-news-adjacent/);
  assert.match(newsDetailSource, /min-h-11/);
});
```

- [ ] **Step 2: Verify the News tests fail**

Run: `node --test mobile-public-site.test.mjs lib/cms/home-news-source.test.mjs`

Expected: FAIL because cards remain 3:4 and article mobile hooks are absent.

- [ ] **Step 3: Redesign News list and Home popup**

Use a 44px NEWS masthead, 4:3 featured media, sticky horizontal filters below the mobile header, and 4:3 article card media. Use 16px metadata and titles at least 24px. Change the Home popup to a bottom sheet below 768px with `max-height: calc(100dvh - 16px)`, 16px padding, a 44px close control, and image above title.

- [ ] **Step 4: Redesign article detail**

Reduce the empty hero gap, use a 34px article title, 16px/1.8 body copy, 4:3 default block media, and stacked image/text blocks. Render previous and next links as two border-separated 44px rows in document order.

- [ ] **Step 5: Run News tests and commit**

Run: `node --test mobile-public-site.test.mjs lib/cms/home-news-source.test.mjs lib/cms/public-newline-rendering.test.mjs`

Expected: PASS.

```bash
git add 'app/[locale]/(site)/news' components/news components/home/home-news-popups.tsx mobile-public-site.test.mjs
git commit -m "Redesign News experiences for mobile"
```

---

### Task 8: Contact, Golf, Legal, Loading, And Error States

**Files:**
- Modify: `app/[locale]/(site)/contact/page.tsx`
- Modify: `app/[locale]/(site)/golf/page.tsx`
- Modify: `app/[locale]/(site)/golf/inquiry/page.tsx`
- Modify: `components/forms/contact-form.tsx`
- Modify: `components/forms/golf-inquiry-form.tsx`
- Modify: `components/golf/golf-configurator.tsx`
- Modify: `components/site/legal-document.tsx`
- Modify: `app/[locale]/(site)/loading.tsx`
- Modify: `app/[locale]/(site)/not-found.tsx`
- Modify: `mobile-public-site.test.mjs`

**Interfaces:**
- Keeps inquiry API payloads, spam protection, Golf feature-flag behavior, and legal content arrays unchanged.

- [ ] **Step 1: Add failing utility-page assertions**

```js
test('mobile forms and legal pages use readable controls and copy', () => {
  assert.match(contactFormSource, /mobile-form/);
  assert.match(golfFormSource, /mobile-form/);
  assert.match(legalSource, /mobile-copy/);
  assert.match(legalSource, /overflow-wrap-anywhere/);
});
```

- [ ] **Step 2: Verify the utility-page tests fail**

Run: `node --test mobile-public-site.test.mjs lib/golf-visibility.test.mjs`

Expected: FAIL on missing mobile form and legal hooks.

- [ ] **Step 3: Redesign forms and Golf controls**

Use one column, 16px input text, 52px minimum controls, labels above fields, full-width submit buttons, and inline validation/status areas. Add bottom safe-area padding so external fixed widgets cannot cover submission actions. Keep Golf disabled routes returning the current not-found state.

- [ ] **Step 4: Redesign legal, loading, and error states**

Use 40px legal titles, 16px/1.8 body copy, 80px section spacing, `overflow-wrap:anywhere`, and scrollable wrappers for any table-like content. Keep loading and not-found content within 80svh and use 44px navigation targets.

- [ ] **Step 5: Run utility tests and commit**

Run: `node --test mobile-public-site.test.mjs lib/golf-visibility.test.mjs lib/cms/legal-terms-source.test.mjs`

Expected: PASS.

```bash
git add 'app/[locale]/(site)/contact/page.tsx' 'app/[locale]/(site)/golf' 'app/[locale]/(site)/loading.tsx' 'app/[locale]/(site)/not-found.tsx' components/forms components/golf components/site/legal-document.tsx mobile-public-site.test.mjs
git commit -m "Redesign forms and utility pages for mobile"
```

---

### Task 9: Full Mobile Route Audit, Desktop Regression, And Deployment

**Files:**
- Modify only files required by failures discovered during verification.
- Do not add generated screenshots to Git.

**Interfaces:**
- Consumes every completed page-family task.
- Produces the deployed KO/EN mobile redesign.

- [ ] **Step 1: Run complete source verification**

Run:

```bash
node --test $(rg --files -g '*.test.mjs')
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 2: Rebuild the local application**

Run: `HTTP_PORT=18180 docker compose -p daeho-local up -d --build next nginx`

Expected: `next` and `nginx` are running and `http://localhost:18180/ko` returns 200.

- [ ] **Step 3: Audit every page family at 375px and 430px**

Use Playwright to visit KO and EN Home, Archive, all Heritage pages, Technique, Making, Creations, category pages, one product detail, News, one News detail, Contact, Privacy, Terms, and enabled Golf routes. For each route assert:

```js
document.documentElement.scrollWidth === document.documentElement.clientWidth
```

Also verify one semantic H1, no text or control overlap, all controls at least 44px, images are nonblank, and fixed elements do not cover the final 96px of document content.

- [ ] **Step 4: Capture representative screenshots**

Capture 375px and 430px screenshots for Home, Archive, one Heritage page, Technique, Making, Creations, one product detail, News, one article, Contact, and Terms. Scroll each page before capture so lazy media and reveal states are rendered. Keep screenshots under `tmp/mobile-redesign-final/`.

- [ ] **Step 5: Check desktop regressions**

At 1440px verify Home, Archive, Heritage, Technique, Making, Creations, News, and Contact retain their current desktop composition. Confirm navigation mega menus, hover states, and desktop carousels still work.

- [ ] **Step 6: Commit verification fixes and push**

```bash
git add -u
git commit -m "Complete public mobile site redesign"
git push origin codex/spring-boot-cms-migration
```

- [ ] **Step 7: Deploy to AWS and smoke-test production**

Deploy `next` and `nginx` from `codex/spring-boot-cms-migration`, then verify the production commit, container states, KO/EN Home, Archive, Technique, Creations, News, Contact, and Admin login response. Do not modify production CMS content and do not print secrets.
