# TECHNIQUE Intro and CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a centered title-and-body introduction between the TECHNIQUE Hero and carousel, and expose the complete localized content in the existing CMS.

**Architecture:** Add `intro.title` and `intro.body` to the localized TECHNIQUE content contract and generic page catalog. Render them through a focused `TechniqueIntroSection`, while leaving the existing Hero and dedicated bilingual carousel editor isolated and unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, next-intl locale JSON, Tailwind CSS, Framer Motion, Node test runner, ESLint.

## Global Constraints

- The page order is Hero → introduction → carousel.
- The introduction contains only one main title and one body paragraph.
- Do not add an eyebrow, button, link, divider, or image to the introduction.
- Keep the existing Hero content structure and the existing carousel interaction/data structure.
- Use `intro.title` and `intro.body` as separately editable Korean and English CMS fields.
- Keep carousel images and order shared across Korean and English.
- Do not add a database migration; missing CMS fields must resolve through the existing static-content merge.
- Use the confirmed Korean and English default copy verbatim.
- The introduction must remain centered and wrap without horizontal overflow on desktop, tablet, and mobile.
- Existing reduced-motion behavior must disable the introduction reveal movement.

---

## File Map

- Modify `messages/ko.json`: add the confirmed Korean `intro` defaults.
- Modify `messages/en.json`: add the confirmed English `intro` defaults.
- Modify `lib/cms/page-catalog.json`: expose `intro.title` and `intro.body` in the TECHNIQUE CMS.
- Modify `lib/cms/page-catalog-i18n.ts`: replace obsolete TECHNIQUE CMS descriptions with Hero, introduction, carousel, and SEO wording.
- Modify `mastery-technique-page.test.mjs`: define the localized content contract, semantic component contract, and page ordering.
- Modify `app/admin/technique-records-editor.test.mjs`: verify the generic introduction fields coexist with the dedicated carousel editor.
- Create `components/specialty/technique-intro-section.tsx`: render the semantic centered introduction with the existing reduced-motion-aware reveal.
- Modify `app/[locale]/(site)/mastery/technique/page.tsx`: place the introduction between Hero and carousel and rebalance the Hero bottom spacing.

---

### Task 1: Localized introduction content and CMS contract

**Files:**

- Modify: `mastery-technique-page.test.mjs`
- Modify: `app/admin/technique-records-editor.test.mjs`
- Modify: `messages/ko.json`
- Modify: `messages/en.json`
- Modify: `lib/cms/page-catalog.json`
- Modify: `lib/cms/page-catalog-i18n.ts`

**Interfaces:**

- Produces: `specialtyPages.techniqueRecords.intro: {title: string; body: string}` for both locales.
- Produces: CMS field definitions for `intro.title` and `intro.body`.
- Preserves: `hero` and `records.items` without adding or removing fields.

- [ ] **Step 1: Write the failing localized-content and catalog tests**

Update the catalog assertion in `mastery-technique-page.test.mjs`:

```js
assert.deepEqual(
  techniqueDefinition.fields.map((field) => field.path),
  [
    'hero.eyebrow',
    'hero.title',
    'hero.body',
    'hero.image',
    'intro.title',
    'intro.body',
    'records.items'
  ]
);
```

Update the locale contract assertion in the same file:

```js
const expectedIntro = messages === koMessages
  ? {
      title: '기술은 디테일에서 완성됩니다.',
      body: '대호는 설계부터 세공과 마감에 이르기까지, 각 공정의 작은 차이를 오래 남는 완성도로 연결합니다.'
    }
  : {
      title: 'Technique is perfected in the details.',
      body: 'From design and craftsmanship to the final finish, DAEHO turns the smallest distinctions in every process into lasting refinement.'
    };

assert.deepEqual(Object.keys(content).sort(), ['hero', 'intro', 'records']);
assert.deepEqual(content.intro, expectedIntro);
```

Add this test to `app/admin/technique-records-editor.test.mjs`:

```js
test('Technique CMS exposes a centered bilingual introduction beside the dedicated carousel editor', () => {
  const technique = pageCatalog.find((page) => page.pageKey === 'mastery-technique');
  const introTitle = technique?.fields.find((field) => field.path === 'intro.title');
  const introBody = technique?.fields.find((field) => field.path === 'intro.body');

  assert.equal(introTitle?.editor?.align, 'center');
  assert.equal(introBody?.type, 'textarea');
  assert.equal(introBody?.rows, 4);
  assert.equal(introBody?.editor?.align, 'center');
  assert.match(pageSource, /excludedFieldPaths=\{techniqueEditor \? \['records\.items'\] : \[\]\}/);
});
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run:

```bash
node --test mastery-technique-page.test.mjs app/admin/technique-records-editor.test.mjs
```

Expected: FAIL because `intro` is absent from locale messages and the TECHNIQUE page catalog.

- [ ] **Step 3: Add the confirmed localized defaults**

Insert this object between `hero` and `records` in `messages/ko.json`:

```json
"intro": {
  "title": "기술은 디테일에서 완성됩니다.",
  "body": "대호는 설계부터 세공과 마감에 이르기까지, 각 공정의 작은 차이를 오래 남는 완성도로 연결합니다."
},
```

Insert this object between `hero` and `records` in `messages/en.json`:

```json
"intro": {
  "title": "Technique is perfected in the details.",
  "body": "From design and craftsmanship to the final finish, DAEHO turns the smallest distinctions in every process into lasting refinement."
},
```

- [ ] **Step 4: Add the generic CMS introduction fields**

Insert these fields between `hero.image` and `records.items` in the `mastery-technique` definition in `lib/cms/page-catalog.json`:

```json
{"path": "intro.title", "label": "中间引言标题", "editor": {"align": "center"}},
{"path": "intro.body", "label": "中间引言正文", "type": "textarea", "rows": 4, "editor": {"align": "center"}},
```

Update the same definition description to:

```json
"description": "管理 TECHNIQUE 页面的 Hero、中间引言、可拖拽工艺轮播与 SEO。"
```

In `lib/cms/page-catalog-i18n.ts`, replace the Korean and English `mastery-technique` descriptions with:

```ts
description: 'Technique 페이지의 Hero, 중간 도입 문구, 공예 캐러셀과 SEO를 관리합니다.'
```

```ts
description: 'Manage the Technique page Hero, introduction, craft carousel, and SEO.'
```

- [ ] **Step 5: Run the focused tests and confirm GREEN**

Run:

```bash
node --test mastery-technique-page.test.mjs app/admin/technique-records-editor.test.mjs
```

Expected: PASS, with the TECHNIQUE contract containing `hero`, `intro`, and `records`.

- [ ] **Step 6: Commit the content and CMS contract**

```bash
git add messages/ko.json messages/en.json lib/cms/page-catalog.json lib/cms/page-catalog-i18n.ts mastery-technique-page.test.mjs app/admin/technique-records-editor.test.mjs
git commit -m "Add Technique introduction CMS fields"
```

---

### Task 2: Semantic introduction component and page placement

**Files:**

- Create: `components/specialty/technique-intro-section.tsx`
- Modify: `app/[locale]/(site)/mastery/technique/page.tsx`
- Modify: `mastery-technique-page.test.mjs`

**Interfaces:**

- Consumes: `content.intro.title` and `content.intro.body` from Task 1.
- Produces: `TechniqueIntroSection({title, body}: {title: string; body: string})`.
- Preserves: `TechniqueCarouselSection` props, behavior, sizing, and CMS record contract.

- [ ] **Step 1: Write the failing component and ordering test**

Add the component path and source near the existing carousel fixtures in `mastery-technique-page.test.mjs`:

```js
const techniqueIntroPath = new URL('./components/specialty/technique-intro-section.tsx', import.meta.url);
const techniqueIntroSource = existsSync(techniqueIntroPath)
  ? readFileSync(techniqueIntroPath, 'utf8')
  : '';
```

Add this test:

```js
test('Technique introduction renders semantic localized copy between the Hero and carousel', () => {
  assert.equal(existsSync(techniqueIntroPath), true);
  assert.match(techniqueIntroSource, /export function TechniqueIntroSection/);
  assert.match(techniqueIntroSource, /<section/);
  assert.match(techniqueIntroSource, /<h2[^>]*id="technique-intro-title"/);
  assert.match(techniqueIntroSource, /<p/);
  assert.match(techniqueIntroSource, /<ScrollText/);
  assert.doesNotMatch(techniqueIntroSource, /<Link|href=|<button|<img|<Image/);

  const heroIndex = techniquePageSource.indexOf('<section className="relative z-10 pt-28">');
  const introIndex = techniquePageSource.indexOf('<TechniqueIntroSection');
  const carouselIndex = techniquePageSource.indexOf('<TechniqueCarouselSection');

  assert.ok(heroIndex >= 0);
  assert.ok(introIndex > heroIndex);
  assert.ok(carouselIndex > introIndex);
  assert.match(
    techniquePageSource,
    /<TechniqueIntroSection[\s\S]*?title=\{content\.intro\.title\}[\s\S]*?body=\{content\.intro\.body\}[\s\S]*?\/>/
  );
});
```

- [ ] **Step 2: Run the page test and confirm RED**

Run:

```bash
node --test mastery-technique-page.test.mjs
```

Expected: FAIL because `TechniqueIntroSection` and its page placement do not exist.

- [ ] **Step 3: Create the focused introduction component**

Create `components/specialty/technique-intro-section.tsx`:

```tsx
import {ScrollText} from '@/components/motion/scroll-text';

type TechniqueIntroSectionProps = {
  title: string;
  body: string;
};

export function TechniqueIntroSection({title, body}: TechniqueIntroSectionProps) {
  if (!title && !body) {
    return null;
  }

  return (
    <section
      aria-labelledby="technique-intro-title"
      className="relative z-10 px-container pb-[clamp(36px,3vw,56px)]"
    >
      <ScrollText className="mx-auto max-w-[780px] text-center">
        <h2
          id="technique-intro-title"
          className="break-words font-heading text-[clamp(38px,4vw,52px)] font-semibold leading-[1.24] tracking-[-0.025em] text-primary"
        >
          {title}
        </h2>
        <p className="mobile-copy mx-auto mt-6 max-w-[680px] break-words whitespace-pre-line font-body text-[16px] leading-8 text-text/76 md:text-[17px]">
          {body}
        </p>
      </ScrollText>
    </section>
  );
}
```

- [ ] **Step 4: Place the introduction between Hero and carousel**

Add this import to `app/[locale]/(site)/mastery/technique/page.tsx`:

```tsx
import {TechniqueIntroSection} from '@/components/specialty/technique-intro-section';
```

Change the Hero content wrapper bottom spacing from:

```tsx
pb-[clamp(72px,8vw,124px)]
```

to:

```tsx
pb-[clamp(36px,3vw,56px)]
```

Render this immediately after the closing Hero `</section>` and before `TechniqueCarouselSection`:

```tsx
<TechniqueIntroSection
  title={content.intro.title}
  body={content.intro.body}
/>
```

- [ ] **Step 5: Run the focused page and CMS tests**

Run:

```bash
node --test mastery-technique-page.test.mjs app/admin/technique-records-editor.test.mjs
```

Expected: PASS. The ordering assertion must report Hero before introduction before carousel.

- [ ] **Step 6: Commit the component and page integration**

```bash
git add components/specialty/technique-intro-section.tsx 'app/[locale]/(site)/mastery/technique/page.tsx' mastery-technique-page.test.mjs
git commit -m "Render Technique introduction between sections"
```

---

### Task 3: Regression suite and responsive browser verification

**Files:**

- Verify: `components/specialty/technique-intro-section.tsx`
- Verify: `app/[locale]/(site)/mastery/technique/page.tsx`
- Verify: `lib/cms/page-catalog.json`
- Verify: `messages/ko.json`
- Verify: `messages/en.json`

**Interfaces:**

- Verifies: public Korean and English TECHNIQUE routes.
- Verifies: the CMS catalog exposes Hero, introduction, carousel, and SEO without altering carousel normalization.
- Produces: build-ready local code; AWS deployment is not included until the user explicitly requests it.

- [ ] **Step 1: Run all Node regression tests**

Run:

```bash
rg --files -g '*.test.mjs' -0 | xargs -0 node --test
```

Expected: all tests PASS, including TECHNIQUE carousel dragging, loop spacing, CMS editing, and the new introduction contract.

- [ ] **Step 2: Run static analysis**

Run:

```bash
npm run lint
```

Expected: exit code 0 with no ESLint errors.

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected: Next.js production build succeeds and includes `/[locale]/mastery/technique`.

- [ ] **Step 4: Verify the Korean desktop layout**

Start the built app locally:

```bash
npm start -- --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000/ko/mastery/technique` at `1536×900` and verify:

- The Hero image ends above the introduction.
- `기술은 디테일에서 완성됩니다.` appears before the carousel.
- The paragraph is centered and no wider than 680px.
- The introduction contains no button, link, eyebrow, divider, or image.
- The carousel still has equal 24px desktop gaps at the loop boundary.

- [ ] **Step 5: Verify English and mobile behavior**

At `390×844`, verify both:

- `http://127.0.0.1:3000/ko/mastery/technique`
- `http://127.0.0.1:3000/en/mastery/technique`

Confirm:

- The title and paragraph wrap without horizontal overflow.
- The text remains centered.
- The introduction remains between Hero and carousel.
- The carousel remains draggable and its arrows and dots remain usable.
- The page document width does not exceed the viewport width.

- [ ] **Step 6: Inspect the final diff**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors. Only intended implementation files or unrelated pre-existing user changes may remain; do not stage unrelated files.
