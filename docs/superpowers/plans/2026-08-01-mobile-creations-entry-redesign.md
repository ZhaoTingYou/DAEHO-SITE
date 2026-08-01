# Mobile Creations Entry Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the repetitive mobile Creations landing experience with a compact masthead and three visually distinct, fully tappable editorial collection chapters while preserving all desktop and CMS behavior.

**Architecture:** Keep the existing server page and `SpecialtyCollectionGallery` data boundary. Change only the mobile masthead in the route and the `lg:hidden` collection-index branch; reuse resolved filter data, existing artwork fallbacks, Next.js images, and the current reduced-motion provider.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Framer Motion 12, Node test runner

## Global Constraints

- Scope is mobile `/[locale]/mastery/creations` entry page only.
- Do not change desktop presentation, category pages, product details, CMS structures, public APIs, routes, collection IDs, or SEO metadata.
- Use existing CMS artwork and the current `collectionStageArtwork` fallback mapping; add no image assets or CMS fields.
- Apply the redesign below the existing `lg` breakpoint only.
- Keep one semantic `h1`, sequential category `h2` headings, visible focus, WCAG AA text contrast, and touch targets at least 44 by 44 CSS pixels.
- Support Korean and English at 375px and 430px with natural wrapping and no horizontal overflow.
- Use transform and opacity only for motion, keep feedback within 200–300ms, and respect the existing reduced-motion preference.
- Do not add horizontal swiping, scroll snapping, parallax, nested scrolling, or gesture-only actions.
- Preserve media aspect-ratio reservation, prioritize only the first category artwork, and lazy-load later category media through Next.js defaults.
- Preserve unrelated dirty-worktree changes and stage only files named by the active task.

---

## File Map

- `app/[locale]/(site)/mastery/creations/page.tsx`: owns localized page data and the mobile/desktop masthead split; remove only the mobile aggregate hero treatment.
- `components/specialty/specialty-collection-gallery.tsx`: owns mobile collection chapters and the unchanged desktop stage panels.
- `mobile-public-site.test.mjs`: protects the compact masthead and prevents the aggregate mobile hero from returning.
- `components/specialty/specialty-collection-gallery.test.mjs`: protects full-card links, three art directions, stable media, touch affordances, reduced motion, and desktop isolation.

---

### Task 1: Compact Editorial Masthead

**Files:**
- Modify: `mobile-public-site.test.mjs:21,175-178`
- Modify: `app/[locale]/(site)/mastery/creations/page.tsx:1-3,36-89`

**Interfaces:**
- Consumes: `content.hero.title`, `content.hero.subtitle`, `content.gallery.title`, and resolved `filters` from the existing locale/CMS load.
- Produces: a `mobile-creations-masthead` region and leaves the existing `md:block` desktop masthead untouched.

- [ ] **Step 1: Write the failing masthead regression test**

Add this source slice next to the existing `creationsPageSource` constant in `mobile-public-site.test.mjs`:

```js
const creationsMobileMasthead = creationsPageSource.slice(
  creationsPageSource.indexOf('<div className="mobile-creations-masthead'),
  creationsPageSource.indexOf('<div className="mx-auto hidden max-w-[1220px]')
);
```

Replace the current Creations masthead test with:

```js
test('Creations mobile masthead is compact and introduces the three collection chapters once', () => {
  assert.match(creationsMobileMasthead, /mobile-display/);
  assert.match(creationsMobileMasthead, /mobile-creations-masthead lg:hidden/);
  assert.match(creationsMobileMasthead, /String\(filters\.length\)\.padStart\(2, '0'\)/);
  assert.match(creationsMobileMasthead, /\{content\.gallery\.title\}/);
  assert.doesNotMatch(creationsMobileMasthead, /<figure|specialty_collection_hero|<figcaption/);
  assert.doesNotMatch(creationsMobileMasthead, /whitespace-nowrap[^\n]+CREATIONS/);
  assert.match(creationsPageSource, /hidden max-w-\[1220px\][^\n]+lg:block/);
});
```

- [ ] **Step 2: Run the masthead test and verify it fails**

Run:

```bash
node --test --test-name-pattern="Creations mobile masthead" mobile-public-site.test.mjs
```

Expected: FAIL because `mobile-creations-masthead` and the localized category-count cue do not exist, and the old mobile figure still renders.

- [ ] **Step 3: Replace the mobile aggregate hero with the compact masthead**

Remove the now-unused `Image` import from `app/[locale]/(site)/mastery/creations/page.tsx`. Change the containing section's desktop modifiers from `md:bg-bg md:pt-28` to `lg:bg-bg lg:pt-28`, replace the current `<div className="md:hidden">...</div>` block with:

```tsx
<div className="mobile-creations-masthead lg:hidden">
  <div className="mx-auto max-w-[520px] px-[var(--mobile-page-gutter)] pb-12 pt-8">
    <ScrollText>
      <p className="font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
        Curated Works
      </p>
      <p
        aria-hidden="true"
        className="mobile-display mt-5 break-words [font-family:'Cormorant_Garamond',serif] font-bold uppercase text-primary"
      >
        {content.hero.title}
      </p>
      <p className="mt-7 max-w-[28rem] whitespace-pre-line font-heading text-[16px] font-semibold leading-[1.75] text-primary/82">
        {content.hero.subtitle}
      </p>
      <div className="mt-10 flex min-h-11 items-center justify-between gap-5 border-t border-primary/15 pt-4 font-body text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/55">
        <span className="font-numeric text-accent">
          {String(filters.length).padStart(2, '0')}
        </span>
        <span className="text-right">{content.gallery.title}</span>
      </div>
    </ScrollText>
  </div>
</div>
```

In the sibling desktop masthead block, change only its final visibility class from `md:block` to `lg:block`. This keeps the 1440px composition unchanged while giving the mobile masthead and mobile collection index the same breakpoint.

- [ ] **Step 4: Run the focused and shared mobile tests**

Run:

```bash
node --test --test-name-pattern="Creations mobile masthead" mobile-public-site.test.mjs
node --test mobile-public-site.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit the masthead change**

```bash
git add mobile-public-site.test.mjs 'app/[locale]/(site)/mastery/creations/page.tsx'
git commit -m "refactor: simplify mobile creations masthead"
```

---

### Task 2: Editorial Collection Chapters

**Files:**
- Modify: `components/specialty/specialty-collection-gallery.test.mjs:24-35,136-140`
- Modify: `components/specialty/specialty-collection-gallery.tsx:110-307`

**Interfaces:**
- Consumes: `SpecialtyCollectionFilter`, `getCollectionStageArtwork(filter, index)`, `imageSrc`, `locale`, `viewLabel`, and `usePrefersReducedMotion()`.
- Produces: `getMobileCollectionArtDirection(categoryId): MobileCollectionArtDirection`, `mobile-collection-chapter` links, and unchanged `CollectionStagePanel` calls under `hidden lg:grid`.

- [ ] **Step 1: Write failing chapter-composition tests**

Add these slices with the existing source slices in `components/specialty/specialty-collection-gallery.test.mjs`:

```js
const mobileCollectionSource = source.slice(
  source.indexOf('function MobileCollectionIndex('),
  source.indexOf('export function SpecialtyCollectionCategory(')
);
const galleryEntrySource = source.slice(
  source.indexOf('export function SpecialtyCollectionGallery('),
  source.indexOf('function MobileCollectionIndex(')
);
```

Replace `collection mobile cards preserve stable product media and tap targets` with:

```js
test('collection mobile index renders three editorial art directions as full-card links', () => {
  assert.match(mobileCollectionSource, /type MobileCollectionArtDirection/);
  assert.match(mobileCollectionSource, /function getMobileCollectionArtDirection/);
  assert.match(mobileCollectionSource, /champion:[\s\S]*aspect-\[4\/5\]/);
  assert.match(mobileCollectionSource, /appointment:[\s\S]*aspect-square/);
  assert.match(mobileCollectionSource, /bespoke:[\s\S]*aspect-\[5\/6\]/);
  assert.match(mobileCollectionSource, /mobile-collection-card mobile-collection-chapter/);
  assert.match(mobileCollectionSource, /aria-label=\{`\$\{category\.label\} · \$\{viewLabel\}`\}/);
  assert.match(mobileCollectionSource, /<h2[\s\S]*\{category\.label\}[\s\S]*<\/h2>/);
  assert.match(mobileCollectionSource, /mobile-tap-target/);
  assert.match(mobileCollectionSource, /<svg[\s\S]*viewBox="0 0 20 20"/);
  assert.doesNotMatch(mobileCollectionSource, /line-clamp-2/);
});

test('collection mobile media is stable, responsive, and prioritizes only the first chapter', () => {
  assert.match(mobileCollectionSource, /priority=\{index === 0\}/);
  assert.match(mobileCollectionSource, /sizes="\(min-width: 768px\) 520px, calc\(100vw - 40px\)"/);
  assert.match(mobileCollectionSource, /motion-reduce:transition-none/);
  assert.match(mobileCollectionSource, /motion-reduce:transform-none/);
  assert.match(galleryEntrySource, /initial=\{prefersReducedMotion \? false : \{opacity: 0\}\}/);
  assert.match(galleryEntrySource, /className="hidden lg:grid"/);
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run:

```bash
node --test --test-name-pattern="collection mobile" components/specialty/specialty-collection-gallery.test.mjs
```

Expected: FAIL because the art-direction model, varied aspect ratios, accessible full-card label, SVG arrow, and reduced-motion guards are absent.

- [ ] **Step 3: Add explicit mobile art directions**

Add this type and mapping immediately before `MobileCollectionIndex` in `components/specialty/specialty-collection-gallery.tsx`:

```tsx
type MobileCollectionArtDirection = {
  chapterClassName: string;
  frameClassName: string;
  backgroundClassName: string;
  overlayClassName: string;
  productClassName: string;
  captionClassName: string;
};

const mobileCollectionArtDirections: Record<string, MobileCollectionArtDirection> = {
  champion: {
    chapterClassName: '',
    frameClassName: 'aspect-[4/5] bg-primary',
    backgroundClassName: 'opacity-95',
    overlayClassName: 'bg-primary/15',
    productClassName: 'w-[132%] max-w-none -translate-x-[4%]',
    captionClassName: 'pr-1'
  },
  appointment: {
    chapterClassName: 'px-5',
    frameClassName: 'aspect-square bg-bg',
    backgroundClassName: 'opacity-65 saturate-[.8]',
    overlayClassName: 'bg-white/25',
    productClassName: 'w-[108%] max-w-none',
    captionClassName: '-mx-5 pl-5'
  },
  bespoke: {
    chapterClassName: 'pr-8',
    frameClassName: 'aspect-[5/6] bg-accent/10',
    backgroundClassName: 'opacity-80 sepia-[.12]',
    overlayClassName: 'bg-accent/10 mix-blend-color',
    productClassName: 'w-[84%] max-w-[280px]',
    captionClassName: 'pr-2'
  }
};

function getMobileCollectionArtDirection(categoryId: string): MobileCollectionArtDirection {
  return mobileCollectionArtDirections[categoryId] ?? mobileCollectionArtDirections.champion;
}
```

This mapping is presentation-only. Continue to source background and product filenames from `getCollectionStageArtwork`.

- [ ] **Step 4: Replace the repeated mobile card template with linked chapters**

First make the gallery entry animation honor reduced motion:

```tsx
<motion.div
  initial={prefersReducedMotion ? false : {opacity: 0}}
  animate={{opacity: 1}}
  transition={prefersReducedMotion ? {duration: 0} : {duration: 0.3, ease: [0.16, 1, 0.3, 1]}}
>
```

Replace `MobileCollectionIndex` and `MobileCollectionCard` with:

```tsx
function MobileCollectionIndex({
  categories,
  locale,
  viewLabel
}: {
  categories: Array<
    SpecialtyCollectionFilter & {
      item?: CollectionImageSource;
      description: string;
    }
  >;
  locale: Locale;
  viewLabel: string;
}) {
  return (
    <div className="bg-white px-[var(--mobile-page-gutter)] pb-[calc(92px+env(safe-area-inset-bottom))] lg:hidden">
      <div className="mx-auto max-w-[520px]">
        {categories.map((category, index) => (
          <MobileCollectionCard
            key={category.id}
            category={category}
            index={index}
            locale={locale}
            viewLabel={viewLabel}
          />
        ))}
      </div>
    </div>
  );
}

function MobileCollectionCard({
  category,
  index,
  locale,
  viewLabel
}: {
  category: SpecialtyCollectionFilter & {
    item?: CollectionImageSource;
    description: string;
  };
  index: number;
  locale: Locale;
  viewLabel: string;
}) {
  const artwork = getCollectionStageArtwork(category, index);
  const direction = getMobileCollectionArtDirection(category.id);
  const href = category.href ?? `/${locale}/mastery/creations/${category.id}`;
  const copy = getMobileCollectionCopy(locale, category.id);

  return (
    <article className={`border-t border-primary/15 py-10 first:pt-3 ${direction.chapterClassName}`}>
      <Link
        href={href}
        aria-label={`${category.label} · ${viewLabel}`}
        className="mobile-collection-card mobile-collection-chapter group block touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        <div className="flex min-h-11 items-center justify-between gap-4 font-body text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/52">
          <span className="font-numeric text-accent">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="transition duration-200 ease-brand group-hover:text-accent group-focus-visible:text-accent motion-reduce:transition-none">
            {viewLabel}
          </span>
        </div>

        <figure className={`relative mt-3 overflow-hidden border border-primary/10 ${direction.frameClassName}`}>
          <Image
            src={imageSrc(artwork.background)}
            alt=""
            fill
            sizes="(min-width: 768px) 520px, calc(100vw - 40px)"
            className={`object-cover object-center transition duration-300 ease-brand group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none ${direction.backgroundClassName}`}
            priority={index === 0}
          />
          <div className={`absolute inset-0 ${direction.overlayClassName}`} aria-hidden="true" />
          <div className="absolute inset-x-7 bottom-7 h-12 bg-black/25 blur-2xl" aria-hidden="true" />
          <div className="absolute inset-0 flex items-center justify-center px-3 py-7">
            <Image
              src={imageSrc(artwork.product)}
              alt={`${category.label} ${copy}`}
              width={artwork.productWidth}
              height={artwork.productHeight}
              sizes="(min-width: 768px) 520px, calc(100vw - 40px)"
              className={`mobile-collection-product h-auto max-h-full object-contain drop-shadow-[0_24px_42px_rgba(0,0,0,.38)] transition duration-300 ease-brand group-hover:scale-[1.025] group-active:scale-[1.015] motion-reduce:transform-none motion-reduce:transition-none ${direction.productClassName}`}
              priority={index === 0}
            />
          </div>
        </figure>

        <div className={`mt-6 grid grid-cols-[minmax(0,1fr)_44px] items-end gap-5 ${direction.captionClassName}`}>
          <div className="space-y-3">
            <h2 className="break-words font-heading text-[34px] font-semibold leading-[1.05] text-primary">
              {category.label}
            </h2>
            <p className="mobile-copy max-w-[24rem] whitespace-pre-line font-body text-primary/68">
              {copy}
            </p>
          </div>
          <span className="mobile-tap-target grid h-11 w-11 place-items-center border border-primary/20 text-primary transition duration-200 ease-brand group-hover:border-accent group-hover:text-accent group-focus-visible:border-accent group-focus-visible:text-accent motion-reduce:transition-none" aria-hidden="true">
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
              <path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </Link>
    </article>
  );
}
```

Remove the obsolete `getMobileCollectionProductClass` helper after replacing its only call. Keep `getMobileCollectionCopy` unchanged.

- [ ] **Step 5: Run the collection and mobile regression suites**

Run:

```bash
node --test --test-name-pattern="collection mobile" components/specialty/specialty-collection-gallery.test.mjs
node --test components/specialty/specialty-collection-gallery.test.mjs mobile-public-site.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit the collection chapter redesign**

```bash
git add components/specialty/specialty-collection-gallery.tsx components/specialty/specialty-collection-gallery.test.mjs
git commit -m "feat: redesign mobile creations chapters"
```

---

### Task 3: Full Verification And Visual Review

**Files:**
- Verify: `app/[locale]/(site)/mastery/creations/page.tsx`
- Verify: `components/specialty/specialty-collection-gallery.tsx`
- Verify: `mobile-public-site.test.mjs`
- Verify: `components/specialty/specialty-collection-gallery.test.mjs`
- Capture locally only: `tmp/mobile-creations-entry-redesign/`

**Interfaces:**
- Consumes: completed masthead and mobile collection chapters from Tasks 1 and 2.
- Produces: test, type, build, responsive, reduced-motion, localization, and desktop-isolation evidence; no additional product behavior.

- [ ] **Step 1: Run all directly related automated tests**

```bash
node --test components/specialty/specialty-collection-gallery.test.mjs mobile-public-site.test.mjs lib/collection-category-seo.test.mjs
```

Expected: PASS with zero failures.

- [ ] **Step 2: Run static verification**

```bash
npx eslint 'app/[locale]/(site)/mastery/creations/page.tsx' components/specialty/specialty-collection-gallery.tsx mobile-public-site.test.mjs components/specialty/specialty-collection-gallery.test.mjs
npx tsc --noEmit
```

Expected: both commands exit 0.

- [ ] **Step 3: Run the production build**

```bash
npm run build
```

Expected: Next.js production build exits 0 without route, image, TypeScript, or lint errors.

- [ ] **Step 4: Start the local site for responsive inspection**

```bash
npm run dev
```

Expected: the site is available at `http://127.0.0.1:3000` or the next available port reported by Next.js.

- [ ] **Step 5: Capture four mobile references**

Open and capture the full page at these route/viewport pairs:

- `http://127.0.0.1:3000/ko/mastery/creations` at 375×812.
- `http://127.0.0.1:3000/ko/mastery/creations` at 430×932.
- `http://127.0.0.1:3000/en/mastery/creations` at 375×812.
- `http://127.0.0.1:3000/en/mastery/creations` at 430×932.

Save them under `tmp/mobile-creations-entry-redesign/`. Confirm the initial viewport reveals the start of Champion, all copy wraps without clipping, each category appears once, the three stages read as distinct compositions, and no content is hidden by the header or footer.

- [ ] **Step 6: Verify interaction and accessibility states**

At 375px, keyboard-focus each collection chapter and confirm the focus outline is visible around the complete link. Emulate reduced motion and confirm the entry transition is absent and image transitions do not animate. Check that each chapter exposes one descriptive linked name and its visible category heading.

- [ ] **Step 7: Capture the desktop isolation reference**

Open `http://127.0.0.1:3000/ko/mastery/creations` at 1440×1000 and capture the top plus the first category stage. Compare it with `tmp/mobile-redesign-final/desktop-creations-1440.png`; the centered desktop masthead and full-viewport stage composition must remain unchanged.

- [ ] **Step 8: Inspect the final diff and worktree scope**

```bash
git diff --check
git status --short
git diff HEAD~2 -- 'app/[locale]/(site)/mastery/creations/page.tsx' components/specialty/specialty-collection-gallery.tsx mobile-public-site.test.mjs components/specialty/specialty-collection-gallery.test.mjs
```

Expected: no whitespace errors; only the four planned source/test files differ across the two implementation commits; unrelated pre-existing worktree changes remain untouched.
