# Mobile Creations Title Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the visible mobile Creations opening title use the same localized CMS title value as the existing desktop Creations heading.

**Architecture:** Keep the server-rendered Creations page and its existing `content.hero.title` data source. Replace only the separate mobile display statement with that shared value, then protect the mobile/desktop synchronization through focused source regression tests. Do not change the Three Acts gallery component, CMS model, routes, or desktop markup.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Node test runner.

## Global Constraints

- The visible mobile title must render `content.hero.title`, the same value used by the desktop Creations heading.
- Do not hard-code `CREATIONS`; CMS title changes must remain synchronized across mobile and desktop.
- Remove the retired visible statement `Three stories. One signature.` from the mobile opening.
- Keep exactly one semantic page `h1`.
- Preserve the mobile eyebrow, localized introduction, `03 Creative worlds` cue, Three Acts gallery, and closing signature.
- Preserve the current desktop `lg` masthead and `CollectionStagePanel` behavior.
- Do not change CMS schemas, localized message structures, routes, APIs, category pages, detail pages, dependencies, or fonts.

## File Structure

- Modify `app/[locale]/(site)/mastery/creations/page.tsx`: bind the visible mobile display title to the existing localized hero title.
- Modify `mobile-public-site.test.mjs`: protect the mobile title binding and removal of the retired display statement.
- Modify `mastery-technique-page.test.mjs`: replace the obsolete cross-page assertion with a shared-title-source contract.

---

### Task 1: Synchronize The Mobile Display Title

**Files:**
- Modify: `app/[locale]/(site)/mastery/creations/page.tsx:44-54`
- Test: `mobile-public-site.test.mjs:179-190`
- Test: `mastery-technique-page.test.mjs:94-102`

**Interfaces:**
- Consumes: `content.hero.title: string` from `messages.specialtyPages.collection.hero.title`.
- Produces: one visible mobile display title and the existing semantic/desktop title nodes, all sourced from `content.hero.title`.

- [ ] **Step 1: Write the failing title synchronization tests**

Update the Creations mobile opening test in `mobile-public-site.test.mjs`:

```js
test('Creations mobile opening shares the desktop CMS title without a catalogue hero', () => {
  assert.match(creationsMobileOpening, /mobile-creations-opening/);
  assert.match(
    creationsMobileOpening,
    /<p aria-hidden="true" className="[^"]*text-\[clamp\(44px,14vw,64px\)\][^"]*">\s*\{content\.hero\.title\}\s*<\/p>/
  );
  assert.doesNotMatch(creationsMobileOpening, /Three stories\.|One signature\./);
  assert.match(creationsMobileOpening, /String\(filters\.length\)\.padStart\(2, '0'\)/);
  assert.match(creationsPageSource, /min-h-\[68dvh\]/);
  assert.doesNotMatch(creationsMobileOpening, /<figure|specialty_collection_hero|<figcaption/);
  assert.doesNotMatch(creationsMobileOpening, /mobile-creations-masthead|Curated Works/);
  assert.doesNotMatch(creationsMobileOpening, /<ScrollText/, 'the above-the-fold mobile opening must be visible before scrolling');
  assert.match(creationsPageSource, /hidden max-w-\[1220px\][^\n]+lg:block/);
});
```

Replace the retired display-statement assertion in `mastery-technique-page.test.mjs` with:

```js
assert.equal(
  (creationsPageSource.match(/\{content\.hero\.title\}/g) ?? []).length,
  3,
  'the semantic h1 plus visible mobile and desktop titles should share one localized source'
);
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
node --test mobile-public-site.test.mjs mastery-technique-page.test.mjs
```

Expected: FAIL because the mobile opening still contains `Three stories.` and `One signature.`, and `content.hero.title` currently appears only in the semantic `h1` and desktop heading.

- [ ] **Step 3: Replace the separate mobile statement with the shared title value**

In `app/[locale]/(site)/mastery/creations/page.tsx`, replace the split mobile statement with:

```tsx
<p aria-hidden="true" className="mt-6 [font-family:'Cormorant_Garamond',serif] text-[clamp(44px,14vw,64px)] font-bold uppercase leading-[0.84] tracking-[-0.045em] text-primary">
  {content.hero.title}
</p>
```

Do not change the surrounding eyebrow, introduction, count cue, rule, or desktop block.

- [ ] **Step 4: Run focused tests to verify the change passes**

Run:

```bash
node --test mobile-public-site.test.mjs mastery-technique-page.test.mjs
```

Expected: all focused tests PASS.

- [ ] **Step 5: Run focused lint and TypeScript validation**

Run sequentially:

```bash
npx eslint --ignore-pattern '.worktrees/**' 'app/[locale]/(site)/mastery/creations/page.tsx' mobile-public-site.test.mjs mastery-technique-page.test.mjs
npx tsc --noEmit
```

Expected: both commands exit 0 with no errors.

- [ ] **Step 6: Commit the synchronized title**

```bash
git add 'app/[locale]/(site)/mastery/creations/page.tsx' mobile-public-site.test.mjs mastery-technique-page.test.mjs
git commit -m "fix: sync mobile creations title with desktop"
```

### Task 2: Verify The Completed Page

**Files:**
- Verify: `app/[locale]/(site)/mastery/creations/page.tsx`
- Verify: `components/specialty/specialty-collection-gallery.tsx`
- Verify: `mobile-public-site.test.mjs`
- Verify: `mastery-technique-page.test.mjs`

**Interfaces:**
- Consumes: the completed shared title binding and existing Three Acts renderer.
- Produces: fresh automated, build, and responsive-browser evidence for the final page.

- [ ] **Step 1: Run the complete source test suite**

Run:

```bash
rg --files -0 -g '*.test.mjs' -g '!.next/**' -g '!.worktrees/**' | xargs -0 node --test
```

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run a production build**

Run:

```bash
npm run build
```

Expected: Next.js compiles, validates TypeScript, generates routes, and exits 0.

- [ ] **Step 3: Verify the title in responsive browsers**

Start the local server with `npm run dev`, then inspect `/ko/mastery/creations` at 375 × 812, 430 × 932, and 1440 × 1000.

Confirm:

- Mobile visibly shows `CREATIONS`, not `Three stories. One signature.`.
- The localized introduction and `03 Creative worlds` cue remain present.
- Act 01 still begins directly after the opening with no horizontal overflow.
- Desktop still shows the existing localized Creations title and three desktop stage panels.
- The document contains exactly one semantic `h1`.

- [ ] **Step 4: Check the final repository state**

Run:

```bash
git diff --check
git status --short
git log --oneline -5
```

Expected: no whitespace errors; the title-sync files are committed; unrelated pre-existing main-worktree changes remain untouched.
