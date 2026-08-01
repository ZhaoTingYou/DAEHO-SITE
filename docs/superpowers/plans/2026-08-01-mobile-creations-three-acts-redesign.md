# Mobile Creations “Three Acts” Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile Creations catalogue-card entry page with the approved text-only opening and three cinematic, near-full-screen category acts while preserving the desktop experience and all existing content/data contracts.

**Architecture:** Keep the server page responsible for localized content and resolved links. Replace only the mobile opening markup in the route and the mobile-only entry renderer inside `SpecialtyCollectionGallery`; retain the current `lg` desktop path, category/detail components, and CMS model. Each act uses a stable ID-based visual mapping, a complete CSS atmospheric fallback, and the existing optional category image as a future full-bleed artwork layer.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Framer Motion 12, Next Image, Node test runner.

## Global Constraints

- Apply the redesign below the existing `lg` breakpoint only; keep the current desktop masthead and `CollectionStagePanel` behavior unchanged.
- Keep exactly one semantic page `h1` and one sequential `h2` per category act.
- Use normal document scrolling; do not add scroll snap, nested scrolling, horizontal swiping, gesture-only navigation, or parallax.
- Opening target height is approximately `68dvh`; act target height is `84–88dvh` with a `560px` short-viewport floor.
- Continue using existing localized category labels, descriptions, links, and image availability; do not change CMS schemas, routes, APIs, category pages, or detail pages.
- Render a complete CSS atmosphere when a category image is absent; do not render empty image frames, broken images, or loading skeletons after load.
- Render future artwork as one decorative, full-bleed image per act with no image-embedded text; prioritize only Act 01.
- Keep all touch targets at least 44 × 44 CSS pixels, preserve visible focus, and respect the existing reduced-motion provider.
- Use only opacity and transform for motion, with 150–300ms feedback; keep all copy in normal document flow on short landscape viewports.
- Do not add dependencies or new font files.

## File Structure

- Modify `app/[locale]/(site)/mastery/creations/page.tsx`: mobile-only text opening and preserved desktop masthead.
- Modify `mobile-public-site.test.mjs`: source regression contract for the approved opening and desktop boundary.
- Modify `components/specialty/specialty-collection-gallery.tsx`: Three Acts visual mapping, full-act links, artwork fallback, closing signature, and mobile motion.
- Modify `components/specialty/specialty-collection-gallery.test.mjs`: source regression contracts for act structure, image behavior, accessibility, reduced motion, and desktop preservation.

---

### Task 1: Replace The Mobile Catalogue Masthead With The Text-Only Opening

**Files:**
- Modify: `app/[locale]/(site)/mastery/creations/page.tsx:35-75`
- Test: `mobile-public-site.test.mjs:21-25,179-187`

**Interfaces:**
- Consumes: `content.hero.title`, `content.hero.subtitle`, `filters.length`, existing `ScrollText`, and the existing mobile header height/safe-area CSS variables.
- Produces: `.mobile-creations-opening`, the visible decorative display statement, and the unchanged desktop `lg:block` masthead consumed by the final regression checks.

- [ ] **Step 1: Replace the old masthead source test with a failing Three Acts opening contract**

Update the source slice near the top of `mobile-public-site.test.mjs`:

```js
const creationsMobileOpening = creationsPageSource.slice(
  creationsPageSource.indexOf('<div className="mobile-creations-opening'),
  creationsPageSource.indexOf('<div className="mx-auto hidden max-w-[1220px]')
);
```

Replace the previous Creations masthead test with:

```js
test('Creations mobile opening establishes Three Acts without a catalogue hero', () => {
  assert.match(creationsMobileOpening, /mobile-creations-opening/);
  assert.match(creationsMobileOpening, /Three stories\./);
  assert.match(creationsMobileOpening, /One signature\./);
  assert.match(creationsMobileOpening, /String\(filters\.length\)\.padStart\(2, '0'\)/);
  assert.match(creationsPageSource, /min-h-\[68dvh\]/);
  assert.doesNotMatch(creationsMobileOpening, /<figure|specialty_collection_hero|<figcaption/);
  assert.doesNotMatch(creationsMobileOpening, /mobile-creations-masthead|Curated Works/);
  assert.match(creationsPageSource, /hidden max-w-\[1220px\][^\n]+lg:block/);
});
```

- [ ] **Step 2: Run the focused test and verify the new contract fails**

Run:

```bash
node --test mobile-public-site.test.mjs
```

Expected: FAIL in `Creations mobile opening establishes Three Acts without a catalogue hero` because `.mobile-creations-opening`, `Three stories.`, and `min-h-[68dvh]` are absent.

- [ ] **Step 3: Implement the approved mobile opening and leave the desktop block intact**

In `app/[locale]/(site)/mastery/creations/page.tsx`, keep the shared `sr-only` `h1`, replace only the current `mobile-creations-masthead` block, and make the outer section own the mobile height:

```tsx
<section className="relative flex min-h-[68dvh] flex-col overflow-hidden bg-[#EFE8DC] pt-[calc(var(--mobile-header-height)+env(safe-area-inset-top)+24px)] lg:block lg:min-h-0 lg:bg-bg lg:pt-28">
  <h1 className="sr-only">
    {content.hero.title}
  </h1>
  <div className="mobile-creations-opening flex flex-1 items-end lg:hidden">
    <ScrollText className="w-full px-[var(--mobile-page-gutter)] pb-12 pt-10">
      <p aria-hidden="true" className="font-body text-[10px] font-bold uppercase tracking-[0.28em] text-accent">
        Objects of distinction
      </p>
      <p aria-hidden="true" className="mt-6 [font-family:'Cormorant_Garamond',serif] text-[clamp(44px,14vw,64px)] font-bold uppercase leading-[0.84] tracking-[-0.045em] text-primary">
        Three stories.
        <span className="ml-[10vw] mt-2 block font-normal italic text-accent">
          One signature.
        </span>
      </p>
      <p className="ml-auto mt-8 max-w-[21rem] whitespace-pre-line font-heading text-[16px] font-semibold leading-[1.75] text-primary/75">
        {content.hero.subtitle}
      </p>
      <div aria-hidden="true" className="mt-10 flex items-end justify-end gap-3 font-body uppercase tracking-[0.2em] text-primary/55">
        <span className="font-numeric text-[22px] italic text-accent">
          {String(filters.length).padStart(2, '0')}
        </span>
        <span className="pb-1 text-[9px] font-semibold">Creative worlds</span>
      </div>
      <div aria-hidden="true" className="mt-5 h-14 w-px bg-primary/25" />
    </ScrollText>
  </div>

  {/* Keep the existing desktop-only max-w-[1220px] block here unchanged. */}
</section>
```

Do not change the `SpecialtyCollectionGallery` props, metadata, resolved category links, or desktop markup in this task.

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
node --test mobile-public-site.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 5: Commit the opening scene**

```bash
git add 'app/[locale]/(site)/mastery/creations/page.tsx' mobile-public-site.test.mjs
git commit -m "refactor: introduce three acts mobile opening"
```

---

### Task 2: Replace Mobile Collection Cards With Three Full-Scene Acts

**Files:**
- Modify: `components/specialty/specialty-collection-gallery.tsx:110-175,177-336`
- Test: `components/specialty/specialty-collection-gallery.test.mjs:36-43,144-165`

**Interfaces:**
- Consumes: `categoryCards` entries shaped as `SpecialtyCollectionFilter & {item?: CollectionImageSource; description: string}`, `locale: Locale`, `viewLabel: string`, and `reducedMotion: boolean` from `usePrefersReducedMotion()`.
- Produces: `MobileCollectionActDirection`, `mobileCollectionActDirections`, `getMobileCollectionActDirection(categoryId)`, `MobileCollectionActs`, and `MobileCollectionAct`; the existing desktop `CollectionStagePanel` call continues consuming `getCollectionStageArtwork(category, index)` unchanged.

- [ ] **Step 1: Rewrite the mobile gallery source tests to describe Three Acts**

Change the mobile source slice to begin at the new type:

```js
const mobileCollectionSource = source.slice(
  source.indexOf('type MobileCollectionActDirection'),
  source.indexOf('export function SpecialtyCollectionCategory(')
);
```

Change `galleryEntrySource` to end before the new renderer:

```js
const galleryEntrySource = source.slice(
  source.indexOf('export function SpecialtyCollectionGallery('),
  source.indexOf('function MobileCollectionActs(')
);
```

Replace the two previous mobile collection tests with:

```js
test('collection mobile entry renders three cinematic acts as full-section links', () => {
  assert.match(mobileCollectionSource, /type MobileCollectionActDirection/);
  assert.match(mobileCollectionSource, /function getMobileCollectionActDirection/);
  assert.match(mobileCollectionSource, /champion:[\s\S]*Victory · Legacy/);
  assert.match(mobileCollectionSource, /appointment:[\s\S]*Memory · Honor/);
  assert.match(mobileCollectionSource, /bespoke:[\s\S]*Story · Craft/);
  assert.match(mobileCollectionSource, /min-h-\[max\(84dvh,560px\)\]/);
  assert.match(mobileCollectionSource, /aria-label=\{`\$\{category\.label\} · \$\{viewLabel\}`\}/);
  assert.match(mobileCollectionSource, /<h2[\s\S]*\{category\.label\}[\s\S]*<\/h2>/);
  assert.match(mobileCollectionSource, /\{category\.description\}/);
  assert.match(mobileCollectionSource, /mobile-tap-target/);
  assert.match(mobileCollectionSource, /viewBox="0 0 20 20"/);
  assert.doesNotMatch(mobileCollectionSource, /MobileCollectionCard|mobile-collection-card|frameClassName/);
  assert.doesNotMatch(mobileCollectionSource, /line-clamp/);
});

test('collection mobile acts keep CSS fallbacks, responsive artwork, and reduced motion', () => {
  assert.match(mobileCollectionSource, /style=\{\{backgroundImage: direction\.backgroundImage\}\}/);
  assert.match(mobileCollectionSource, /category\.item \?/);
  assert.match(mobileCollectionSource, /alt=""/);
  assert.match(mobileCollectionSource, /priority=\{index === 0\}/);
  assert.match(mobileCollectionSource, /sizes="\(min-width: 1024px\) 0px, 100vw"/);
  assert.match(mobileCollectionSource, /initial=\{reducedMotion \? false : \{opacity: 0, y: 24\}\}/);
  assert.match(mobileCollectionSource, /viewport=\{\{once: true, amount: 0\.18\}\}/);
  assert.match(mobileCollectionSource, /motion-reduce:transition-none/);
  assert.match(mobileCollectionSource, /Made to be remembered\./);
  assert.match(galleryEntrySource, /className="hidden lg:grid"/);
});
```

- [ ] **Step 2: Run the collection test and verify it fails for the old card renderer**

Run:

```bash
node --test components/specialty/specialty-collection-gallery.test.mjs
```

Expected: FAIL because `MobileCollectionActDirection`, `MobileCollectionActs`, full-scene sizing, and the three theme pairs do not exist.

- [ ] **Step 3: Add the act art-direction type and the stable ID mapping**

Replace `MobileCollectionArtDirection`, `mobileCollectionArtDirections`, and `getMobileCollectionArtDirection` with:

```tsx
type MobileCollectionActDirection = {
  themeLabel: string;
  sceneClassName: string;
  backgroundImage: string;
  overlayClassName: string;
  haloClassName: string;
};

const mobileCollectionActDirections: Record<string, MobileCollectionActDirection> = {
  champion: {
    themeLabel: 'Victory · Legacy',
    sceneClassName: 'bg-[#07182D] text-white',
    backgroundImage: 'radial-gradient(circle at 64% 34%, #667884 0%, #26435D 18%, #0A2038 54%, #061426 100%)',
    overlayClassName: 'bg-gradient-to-b from-transparent via-transparent to-[#061426]/90',
    haloClassName: 'border-[#C4A474]'
  },
  appointment: {
    themeLabel: 'Memory · Honor',
    sceneClassName: 'bg-[#EFE8DC] text-primary',
    backgroundImage: 'radial-gradient(circle at 34% 30%, #FFFFFF 0%, #E3D8C7 28%, #B0A595 78%, #93887B 100%)',
    overlayClassName: 'bg-gradient-to-b from-white/5 via-transparent to-[#EFE8DC]/95',
    haloClassName: 'border-[#B49463]'
  },
  bespoke: {
    themeLabel: 'Story · Craft',
    sceneClassName: 'bg-[#1C0E16] text-white',
    backgroundImage: 'radial-gradient(circle at 68% 34%, #B5827C 0%, #722B3D 27%, #371925 65%, #1C0E16 100%)',
    overlayClassName: 'bg-gradient-to-b from-transparent via-transparent to-[#1C0E16]/90',
    haloClassName: 'rounded-[12px_50%_50%_12px] border-[#D2B895]'
  }
};

function getMobileCollectionActDirection(categoryId: string): MobileCollectionActDirection {
  return mobileCollectionActDirections[categoryId] ?? mobileCollectionActDirections.champion;
}
```

Keep the mapping beside the mobile renderer so all custom art-direction values remain centralized.

- [ ] **Step 4: Replace the mobile index/card renderer with `MobileCollectionActs` and `MobileCollectionAct`**

Change the mobile call in `SpecialtyCollectionGallery`:

```tsx
<MobileCollectionActs
  categories={categoryCards}
  locale={locale}
  viewLabel={viewLabel}
  reducedMotion={prefersReducedMotion}
/>
```

Replace `MobileCollectionIndex`, `MobileCollectionCard`, and `getMobileCollectionCopy` with:

```tsx
function MobileCollectionActs({
  categories,
  locale,
  viewLabel,
  reducedMotion
}: {
  categories: Array<
    SpecialtyCollectionFilter & {
      item?: CollectionImageSource;
      description: string;
    }
  >;
  locale: Locale;
  viewLabel: string;
  reducedMotion: boolean;
}) {
  return (
    <div className="mobile-creations-acts lg:hidden">
      {categories.map((category, index) => (
        <MobileCollectionAct
          key={category.id}
          category={category}
          index={index}
          locale={locale}
          viewLabel={viewLabel}
          reducedMotion={reducedMotion}
        />
      ))}
      <div className="grid min-h-40 place-items-center bg-primary px-[var(--mobile-page-gutter)] py-10 text-center text-white">
        <div>
          <p className="[font-family:'Cormorant_Garamond',serif] text-[24px] italic text-[#C4A474]">
            Made to be remembered.
          </p>
          <p className="mt-3 font-body text-[9px] font-semibold uppercase tracking-[0.24em] text-white/55">
            DAEHO · Seoul
          </p>
        </div>
      </div>
    </div>
  );
}

function MobileCollectionAct({
  category,
  index,
  locale,
  viewLabel,
  reducedMotion
}: {
  category: SpecialtyCollectionFilter & {
    item?: CollectionImageSource;
    description: string;
  };
  index: number;
  locale: Locale;
  viewLabel: string;
  reducedMotion: boolean;
}) {
  const direction = getMobileCollectionActDirection(category.id);
  const href = category.href ?? `/${locale}/mastery/creations/${category.id}`;

  return (
    <motion.article
      initial={reducedMotion ? false : {opacity: 0, y: 24}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true, amount: 0.18}}
      transition={reducedMotion ? {duration: 0} : {duration: 0.3, ease: [0.16, 1, 0.3, 1]}}
      className={`relative overflow-hidden ${direction.sceneClassName}`}
    >
      <Link
        href={href}
        aria-label={`${category.label} · ${viewLabel}`}
        className="group relative flex min-h-[max(84dvh,560px)] touch-manipulation items-end overflow-hidden focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-current focus-visible:outline-offset-[-5px]"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{backgroundImage: direction.backgroundImage}}
        />
        <div
          aria-hidden="true"
          className={`absolute left-1/2 top-[34%] aspect-[1.8/1] w-[58%] -translate-x-1/2 -translate-y-1/2 -rotate-[14deg] rounded-[50%] border-[clamp(12px,4vw,22px)] opacity-90 shadow-[0_24px_42px_rgba(0,0,0,.32)] ${direction.haloClassName}`}
        />
        {category.item ? (
          <Image
            src={imageSrc(category.item.image)}
            alt=""
            fill
            sizes="(min-width: 1024px) 0px, 100vw"
            className="object-cover object-center transition duration-300 ease-brand group-hover:scale-[1.015] group-active:scale-[1.01] motion-reduce:transform-none motion-reduce:transition-none"
            priority={index === 0}
          />
        ) : null}
        <div aria-hidden="true" className={`absolute inset-0 ${direction.overlayClassName}`} />

        <div className="relative z-10 w-full px-[var(--mobile-page-gutter)] pb-[max(32px,env(safe-area-inset-bottom))] pt-28">
          <div aria-hidden="true" className="flex items-center justify-between border-b border-current/45 pb-3 font-body text-[9px] font-semibold uppercase tracking-[0.2em] opacity-70">
            <span>Act {String(index + 1).padStart(2, '0')}</span>
            <span>{direction.themeLabel}</span>
          </div>
          <div className="relative mt-4 pr-14">
            <h2 className="break-words [font-family:'Cormorant_Garamond',serif] text-[clamp(40px,12vw,56px)] font-semibold leading-[0.95] tracking-[-0.03em]">
              {category.label}
            </h2>
            <p className="mt-4 max-w-[19rem] whitespace-pre-line font-body text-[16px] font-medium leading-[1.65] opacity-[.78]">
              {category.description}
            </p>
            <span aria-hidden="true" className="mobile-tap-target absolute bottom-0 right-0 grid h-11 w-11 place-items-center rounded-full border border-current/55 transition duration-200 ease-brand group-hover:border-[#C4A474] group-hover:text-[#C4A474] group-focus-visible:border-[#C4A474] group-focus-visible:text-[#C4A474] motion-reduce:transition-none">
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
                <path d="M5 15 15 5M8 5h7v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
```

Do not modify `collectionStageArtwork`, `getCollectionStageArtwork`, `CollectionStagePanel`, or any category/detail renderer. The desktop map continues to call those functions exactly as before.

- [ ] **Step 5: Run the focused mobile and collection tests**

Run:

```bash
node --test components/specialty/specialty-collection-gallery.test.mjs mobile-public-site.test.mjs lib/collection-category-seo.test.mjs mastery-technique-page.test.mjs
```

Expected: all tests PASS, including the existing desktop artwork, CMS field, SEO, heading, and Mastery spacing contracts.

- [ ] **Step 6: Commit the Three Acts renderer**

```bash
git add components/specialty/specialty-collection-gallery.tsx components/specialty/specialty-collection-gallery.test.mjs
git commit -m "feat: redesign mobile creations as three acts"
```

---

### Task 3: Verify The Complete Mobile Experience And Desktop Regression Boundary

**Files:**
- Verify: `app/[locale]/(site)/mastery/creations/page.tsx`
- Verify: `components/specialty/specialty-collection-gallery.tsx`
- Verify: `mobile-public-site.test.mjs`
- Verify: `components/specialty/specialty-collection-gallery.test.mjs`

**Interfaces:**
- Consumes: the completed route opening, `MobileCollectionActs`, existing desktop `CollectionStagePanel`, and existing locale/CMS data.
- Produces: fresh automated, build, and browser evidence that the merged page meets the approved spec without requiring new artwork.

- [ ] **Step 1: Run the complete source test suite without scanning build artifacts or nested worktrees**

Run:

```bash
rg --files -0 -g '*.test.mjs' -g '!.next/**' -g '!.worktrees/**' | xargs -0 node --test
```

Expected: zero failures.

- [ ] **Step 2: Run code quality and production checks sequentially**

Run:

```bash
npx eslint --ignore-pattern '.worktrees/**' 'app/[locale]/(site)/mastery/creations/page.tsx' components/specialty/specialty-collection-gallery.tsx mobile-public-site.test.mjs components/specialty/specialty-collection-gallery.test.mjs
npx tsc --noEmit
npm run build
```

Expected: ESLint exits 0, TypeScript exits 0, and Next.js completes the production build including `/[locale]/mastery/creations` and all category routes.

- [ ] **Step 3: Start the application and verify Korean mobile viewports**

Run:

```bash
npm run dev
```

Open `http://127.0.0.1:3000/ko/mastery/creations` and verify:

- At 375 × 812, the text-only opening clears the fixed header, does not overflow, and leads naturally into Act 01.
- At 430 × 932, the opening remains balanced and all three acts use distinct palettes and complete text.
- At 812 × 375 landscape, each act expands to the `560px` floor so heading, description, and arrow remain reachable by normal scrolling.
- Each full act navigates to its localized Champion, Appointment, or Bespoke route.
- With category images unavailable, all three CSS atmospheres remain complete and show no empty/broken media frame.
- With reduced motion enabled, act content is immediately readable and no vertical entrance transform runs.
- `document.documentElement.scrollWidth === document.documentElement.clientWidth` at all three mobile viewports.

- [ ] **Step 4: Verify the desktop boundary and record the final repository state**

At 1440 × 1000, verify:

- `.mobile-creations-opening` and `.mobile-creations-acts` are hidden.
- The existing centered desktop masthead is visible.
- The existing three `CollectionStagePanel` sections render with their prior alternating layout.
- There is one semantic page `h1` and no horizontal overflow.

Then run:

```bash
git diff --check
git status --short
git log --oneline -5
```

Expected: `git diff --check` exits 0; only user-owned pre-existing changes remain unstaged; the two implementation commits are visible at the branch tip.
