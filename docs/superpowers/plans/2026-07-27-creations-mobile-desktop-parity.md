# Creations Mobile Desktop-Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Creations landing page’s mobile-only montage and white cards with a compact desktop-like introduction and three vertically stacked immersive category stages.

**Architecture:** Keep the server page responsible for CMS data and routes, but simplify only its mobile introduction markup. Keep `SpecialtyCollectionGallery` as the shared category-data boundary, replacing only `MobileCollectionIndex` and `MobileCollectionCard` with a mobile stage presentation while leaving `CollectionStagePanel`, category pages, detail pages, and CMS contracts unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Node test runner.

## Global Constraints

- Scope is only `/{locale}/mastery/creations`; category and detail routes must not change.
- Mobile stages use normal vertical document scrolling with no carousel, scroll hijacking, nested scroll region, or gesture-only navigation.
- Each mobile category stage uses `min-height: max(640px, 92svh)`.
- The stage is one semantic link with a visible action and at least a 44px touch target.
- Reuse existing CMS order, background, optional mobile background, product art, localized label, description, and route.
- Desktop introduction and `CollectionStagePanel` output must remain unchanged.
- No CMS fields, public data contracts, route paths, or dependencies may be added.
- Text must remain WCAG-AA readable through white foreground text and a dark gradient scrim.
- First stage images may be priority-loaded; the other two stages must remain non-priority.
- Production deployment requires a separate explicit instruction.

---

### Task 1: Align The Mobile Introduction With Desktop

**Files:**
- Modify: `app/[locale]/(site)/mastery/creations/page.tsx:1-95`
- Test: `components/specialty/specialty-collection-gallery.test.mjs`

**Interfaces:**
- Consumes: `content.hero.title: string`, `content.hero.subtitle: string`
- Produces: one mobile introduction block marked by `creations-mobile-intro`, while preserving the existing desktop `md:block` introduction and the single semantic `h1`

- [ ] **Step 1: Add a failing source regression test**

Append this focused behavior:

```js
test('creations mobile introduction mirrors the desktop title block without the montage', () => {
  assert.match(creationsPageSource, /creations-mobile-intro/);
  assert.doesNotMatch(creationsPageSource, /Curated Works/);
  assert.doesNotMatch(creationsPageSource, /specialty_collection_hero\.png/);
  assert.doesNotMatch(creationsPageSource, /<figcaption/);
  assert.match(creationsPageSource, /className="sr-only"[\s\S]*\{content\.hero\.title\}/);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
/opt/homebrew/Cellar/node@20/20.18.1/bin/node --test components/specialty/specialty-collection-gallery.test.mjs
```

Expected: FAIL because `creations-mobile-intro` is absent and the montage strings remain.

- [ ] **Step 3: Replace only the mobile introduction**

Remove the unused `next/image` import and replace the current `md:hidden` montage with:

```tsx
<div className="creations-mobile-intro mx-auto max-w-[520px] px-[var(--mobile-page-gutter)] pb-14 pt-12 text-center md:hidden">
  <ScrollText className="space-y-4">
    <p
      aria-hidden="true"
      className="[font-family:'Cormorant_Garamond',serif] text-[42px] font-bold uppercase leading-none tracking-[0.04em] text-accent"
    >
      {content.hero.title}
    </p>
    <p className="mx-auto max-w-[22rem] whitespace-pre-line font-heading text-[16px] font-semibold leading-[1.8] text-primary">
      {content.hero.subtitle}
    </p>
  </ScrollText>
</div>
```

Keep the `h1.sr-only` and the entire desktop `hidden ... md:block` block unchanged.

- [ ] **Step 4: Run focused test, lint, and typecheck**

Run:

```bash
/opt/homebrew/Cellar/node@20/20.18.1/bin/node --test components/specialty/specialty-collection-gallery.test.mjs
env PATH=/opt/homebrew/Cellar/node@20/20.18.1/bin:/usr/bin:/bin:/usr/sbin:/sbin ./node_modules/.bin/eslint 'app/[locale]/(site)/mastery/creations/page.tsx' components/specialty/specialty-collection-gallery.test.mjs
env PATH=/opt/homebrew/Cellar/node@20/20.18.1/bin:/usr/bin:/bin:/usr/sbin:/sbin ./node_modules/.bin/tsc --noEmit
```

Expected: all exit 0.

- [ ] **Step 5: Commit the introduction slice**

```bash
git add 'app/[locale]/(site)/mastery/creations/page.tsx' components/specialty/specialty-collection-gallery.test.mjs
git commit -m "fix: align creations mobile introduction"
```

---

### Task 2: Replace Mobile Cards With Immersive Category Stages

**Files:**
- Modify: `components/specialty/specialty-collection-gallery.tsx:90-310`
- Test: `components/specialty/specialty-collection-gallery.test.mjs`
- Test: `components/responsive-page-images.test.mjs`

**Interfaces:**
- Consumes: `categoryCards`, `getCollectionStageArtwork(category, index)`, `viewLabel`, `locale`, `prefersReducedMotion`
- Produces: `MobileCollectionStage` with props `{category, index, locale, viewLabel}`, one semantic route link, responsive background art, product art, readable copy, and mobile-only rendering below `lg`

- [ ] **Step 1: Replace the obsolete mobile-card assertion with a failing stage assertion**

First add a slice beside the existing `stagePanelSource` and `stageImageSource` constants:

```js
const mobileCollectionIndexSource = source.slice(
  source.indexOf('function MobileCollectionIndex('),
  source.indexOf('export function SpecialtyCollectionCategory(')
);
```

Then replace `collection mobile cards preserve stable product media and tap targets` with:

```js
test('collection mobile index renders immersive desktop-parity stages', () => {
  assert.match(mobileCollectionIndexSource, /mobile-collection-stage/);
  assert.match(mobileCollectionIndexSource, /min-h-\[max\(640px,92svh\)\]/);
  assert.match(mobileCollectionIndexSource, /mobileFilename=\{artwork\.mobileBackground\}/);
  assert.match(mobileCollectionIndexSource, /bg-gradient-to-t/);
  assert.match(mobileCollectionIndexSource, /from-black\/90/);
  assert.match(mobileCollectionIndexSource, /mobile-tap-target/);
  assert.match(mobileCollectionIndexSource, /motion-reduce:transition-none/);
  assert.doesNotMatch(mobileCollectionIndexSource, /aspect-\[4\/5\]/);
});
```

Keep the responsive-image assertion that requires `mobileFilename={artwork.mobileBackground}`.

- [ ] **Step 2: Run both focused test files and confirm RED**

Run:

```bash
/opt/homebrew/Cellar/node@20/20.18.1/bin/node --test components/specialty/specialty-collection-gallery.test.mjs components/responsive-page-images.test.mjs
```

Expected: FAIL because `mobile-collection-stage`, the viewport height, scrim, and reduced-motion classes are absent.

- [ ] **Step 3: Make the shared gallery entrance respect reduced motion**

Keep the existing `MobileCollectionIndex` call unchanged. Update only the shared gallery entrance:

```tsx
initial={prefersReducedMotion ? false : {opacity: 0}}
transition={{duration: prefersReducedMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1]}}
```

- [ ] **Step 4: Convert the mobile index to full-bleed stages**

Replace its padded white wrapper with:

```tsx
<div className="bg-black lg:hidden">
  {categories.map((category, index) => (
    <MobileCollectionStage
      key={category.id}
      category={category}
      index={index}
      locale={locale}
      viewLabel={viewLabel}
    />
  ))}
</div>
```

- [ ] **Step 5: Implement one semantic immersive stage**

Replace `MobileCollectionCard` with `MobileCollectionStage`. Its outer structure must be:

```tsx
<Link
  href={href}
  aria-label={`${category.label}: ${description}`}
  className="mobile-collection-stage group relative block min-h-[max(640px,92svh)] overflow-hidden bg-black text-on-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white"
>
  <ResponsiveCmsImage
    filename={artwork.background}
    mobileFilename={artwork.mobileBackground}
    alt=""
    sizes="100vw"
    className="object-cover object-center"
    priority={index === 0}
  />
  <div
    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/24 to-black/10"
    aria-hidden="true"
  />
  <div className="absolute inset-x-[-12%] top-[10%] flex h-[52%] items-center justify-center px-3">
    <Image
      src={imageSrc(artwork.product)}
      alt={`${category.label} ${description}`}
      width={artwork.productWidth}
      height={artwork.productHeight}
      sizes="112vw"
      priority={index === 0}
      className={`h-auto max-h-full w-full object-contain drop-shadow-[0_30px_54px_rgba(0,0,0,.52)] transition duration-300 ease-brand motion-reduce:transition-none ${getMobileCollectionProductClass(category.id)}`}
    />
  </div>
  <div className="absolute inset-x-0 bottom-0 z-10 px-[var(--mobile-page-gutter)] pb-[calc(48px+env(safe-area-inset-bottom))]">
    <p className="font-numeric text-[11px] font-semibold tracking-[0.18em] text-white/64">
      {String(index + 1).padStart(2, '0')}
    </p>
    <h2 className="mt-4 font-heading text-[38px] font-normal uppercase leading-none tracking-[0.04em] text-white">
      {category.label}
    </h2>
    <p className="mobile-copy mt-4 max-w-[20rem] whitespace-pre-line font-body text-white/82">
      {description}
    </p>
    <span className="mobile-tap-target mt-6 inline-flex min-h-11 items-center gap-3 border-b border-white/60 font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
      {viewLabel}
      <span aria-hidden="true">→</span>
    </span>
  </div>
</Link>
```

Set `description` to `category.description || getMobileCollectionCopy(locale, category.id)`. Do not add another nested link or button.

- [ ] **Step 6: Run focused tests and compile checks**

Run:

```bash
/opt/homebrew/Cellar/node@20/20.18.1/bin/node --test components/specialty/specialty-collection-gallery.test.mjs components/responsive-page-images.test.mjs
env PATH=/opt/homebrew/Cellar/node@20/20.18.1/bin:/usr/bin:/bin:/usr/sbin:/sbin ./node_modules/.bin/eslint components/specialty/specialty-collection-gallery.tsx components/specialty/specialty-collection-gallery.test.mjs components/responsive-page-images.test.mjs
env PATH=/opt/homebrew/Cellar/node@20/20.18.1/bin:/usr/bin:/bin:/usr/sbin:/sbin ./node_modules/.bin/tsc --noEmit
```

Expected: all exit 0.

- [ ] **Step 7: Commit the stage slice**

```bash
git add components/specialty/specialty-collection-gallery.tsx components/specialty/specialty-collection-gallery.test.mjs components/responsive-page-images.test.mjs
git commit -m "feat: add immersive creations mobile stages"
```

---

### Task 3: Verify Responsive Behavior And Regression Safety

**Files:**
- Verify: `app/[locale]/(site)/mastery/creations/page.tsx`
- Verify: `components/specialty/specialty-collection-gallery.tsx`
- Verify: `components/specialty/specialty-collection-gallery.test.mjs`

**Interfaces:**
- Consumes: the completed Creations landing route
- Produces: verified behavior at mobile, tablet, desktop, reduced motion, and all three category destinations

- [ ] **Step 1: Run the full source test suite**

```bash
rg --files -g '*.test.mjs' -g '!node_modules/**' -g '!.next/**' | xargs /opt/homebrew/Cellar/node@20/20.18.1/bin/node --test
```

Expected: 0 failures. Run outside the sandbox if the existing collection-detail E2E test requires a local listener.

- [ ] **Step 2: Run final static verification**

```bash
env PATH=/opt/homebrew/Cellar/node@20/20.18.1/bin:/usr/bin:/bin:/usr/sbin:/sbin ./node_modules/.bin/eslint 'app/[locale]/(site)/mastery/creations/page.tsx' components/specialty/specialty-collection-gallery.tsx components/specialty/specialty-collection-gallery.test.mjs components/responsive-page-images.test.mjs
env PATH=/opt/homebrew/Cellar/node@20/20.18.1/bin:/usr/bin:/bin:/usr/sbin:/sbin ./node_modules/.bin/tsc --noEmit
env PATH=/opt/homebrew/Cellar/node@20/20.18.1/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/Cellar/node@20/20.18.1/bin/node node_modules/next/dist/bin/next build
```

Expected: lint, typecheck, and production build exit 0.

- [ ] **Step 3: Browser-check the required viewports**

Start the local app and inspect `/ko/mastery/creations` at:

- 375×812: no horizontal overflow, header clearance, centered introduction, three readable stages
- 390×844: each stage is at least `max(640px, 92svh)` and its full link remains tappable
- 768×1024: mobile stage composition remains balanced without clipping
- 1440×900: existing desktop introduction and alternating desktop stage panels are unchanged

For every mobile viewport, confirm title/description contrast, product visibility, safe-area bottom padding, and visible focus styling.

- [ ] **Step 4: Smoke-test destinations and reduced motion**

Activate all three stage links and verify they still reach:

- `/ko/mastery/creations/champion`
- `/ko/mastery/creations/appointment`
- `/ko/mastery/creations/bespoke`

With reduced motion enabled, confirm the route is immediately readable, category stages have no long entrance transition, and the product transition is disabled.

- [ ] **Step 5: Review the final diff**

Review `git diff 1e319c6...HEAD` against:

- `docs/superpowers/specs/2026-07-27-creations-mobile-desktop-parity-design.md`
- repository conventions and accessibility constraints

Resolve every concrete standards or spec finding, rerun the affected checks, and leave the worktree clean. Do not deploy without a new explicit user instruction.
