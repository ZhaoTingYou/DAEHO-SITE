# Mobile Creations CMS Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one independently editable portrait image to each mobile Creations Act while preserving the existing opening, desktop artwork, and gradient fallback.

**Architecture:** Store an optional `mobileImage` alongside each fixed Creations category filter and expose the same value through the landing-page and category-page CMS editors. Resolve image availability on the server, render it as a decorative full-bleed layer in `MobileCollectionAct`, and remove it after a client-side load failure so the existing gradient and halo remain the visible fallback.

**Tech Stack:** Next.js App Router, React 19, TypeScript, next/image, JSON CMS page catalog, Node test runner, ESLint, Tailwind CSS.

## Global Constraints

- The top mobile Creations opening remains unchanged: beige background, localized `CREATIONS` title, subtitle, and `03 Creative worlds` cue.
- Champion, Appointment, and Bespoke each receive one optional `mobileImage` value.
- The CMS label is `移动端入口图片`; the recommended asset is 9:16 at 1440 × 2560 pixels.
- Mobile images use full-section `object-cover`; keep the subject centered and slightly above center.
- Existing `image`, `background`, and `product` fields remain unchanged and are not automatic mobile fallbacks.
- Empty, unresolved, or failed mobile images reveal the existing gradient and halo treatment.
- Desktop rendering and production CMS content are not changed automatically.
- Do not add a dependency or refactor unrelated gallery behavior.

---

### Task 1: Expose Dedicated Mobile Images In CMS

**Files:**
- Modify: `lib/cms/page-catalog.json:343-359,396-401,428-433,475-480`
- Modify: `lib/cms/image-guides.ts:1-170,200-218`
- Modify: `messages/ko.json:808-834`
- Modify: `messages/en.json` at `specialtyPages.collection.gallery.filters`
- Test: `components/specialty/specialty-collection-gallery.test.mjs:116-154`
- Test: `app/admin/_components/admin-fields.test.mjs:62-90`

**Interfaces:**
- Consumes: the existing fixed category objects at `specialtyPages.collection.gallery.filters`.
- Produces: optional `gallery.filters[n].mobileImage: string` values and a `mobileCollectionAct` image-guide key used by Task 2.

- [ ] **Step 1: Write the failing CMS catalog and guide assertions**

Replace the existing CMS artwork assertions in `components/specialty/specialty-collection-gallery.test.mjs` with assertions that keep the desktop fields and require the new mobile field:

```js
test('collection stage and mobile artwork are exposed through CMS content fields', () => {
  assert.ok(
    source.includes('filter.background ?? fallback.background') &&
      source.includes('filter.product ?? filter.image ?? fallback.product'),
    'desktop stage artwork should continue to prefer CMS background/product fields'
  );

  for (const messages of [koMessages, enMessages]) {
    const artwork = messages.specialtyPages.collection.gallery.filters.map(
      ({background, product, mobileImage}) => ({background, product, mobileImage})
    );

    assert.deepEqual(artwork, [
      {background: 'bg1.jpg', product: 'c1.png', mobileImage: ''},
      {background: 'bg3.jpg', product: 'c2.png', mobileImage: ''},
      {background: 'bg2.jpg', product: 'c3.png', mobileImage: ''}
    ]);
  }

  const creationsPage = pageCatalog.find((page) => page.pageKey === 'mastery-creations');
  const filtersField = creationsPage?.fields.find((field) => field.path === 'gallery.filters');
  assert.ok(filtersField?.itemFields.some((field) => field.path === 'mobileImage' && field.type === 'image'));

  const categoryPages = pageCatalog.filter((page) => page.pageKey.startsWith('mastery-creations-'));
  assert.equal(categoryPages.length, 3);
  for (const page of categoryPages) {
    const fieldPaths = page.fields.map((field) => field.path);
    assert.ok(fieldPaths.includes('background'));
    assert.ok(fieldPaths.includes('product'));
    assert.ok(fieldPaths.includes('mobileImage'), `${page.pageKey} should expose a mobile entrance image`);
  }

  assert.match(imageGuidesSource, /mobileCollectionAct: spec\('9:16', '1440 x 2560'/);
  assert.match(
    imageGuidesSource,
    /'mastery-creations\|main\|gallery\.filters\.\*\.mobileImage': 'mobileCollectionAct'/
  );
});
```

Add this source fixture near the other fixtures at the top of the test:

```js
const imageGuidesSource = readFileSync(new URL('../../lib/cms/image-guides.ts', import.meta.url), 'utf8');
```

- [ ] **Step 2: Run the focused tests and verify the red state**

Run:

```bash
node --test components/specialty/specialty-collection-gallery.test.mjs app/admin/_components/admin-fields.test.mjs
```

Expected: FAIL because `mobileImage`, `mobileCollectionAct`, and their guide mappings do not exist. The existing unrelated assertions remain green.

- [ ] **Step 3: Add the optional field to static locale defaults**

In all three filter objects in both `messages/ko.json` and `messages/en.json`, add an empty value after `product`:

```json
"product": "c1.png",
"mobileImage": ""
```

Use the matching existing `product` value for each category and keep `mobileImage` empty so deployment does not change production imagery.

- [ ] **Step 4: Expose the field on the landing-page and category-page CMS forms**

Add this item field after `product` in the `mastery-creations` `gallery.filters` definition:

```json
{"path": "mobileImage", "label": "移动端入口图片", "type": "image"}
```

Add this field after `product` in each of `mastery-creations-champion`, `mastery-creations-appointment`, and `mastery-creations-bespoke`:

```json
{"groupKey": "main", "path": "mobileImage", "label": "移动端入口图片", "type": "image"}
```

- [ ] **Step 5: Add the 9:16 CMS image guide and all four mappings**

Add this guide beside the existing Collection guides in `lib/cms/image-guides.ts`:

```ts
mobileCollectionAct: spec('9:16', '1440 x 2560', {
  zh: '移动端整屏入口图，object-cover 裁切；主体放在中央偏上，并为底部文字预留空间。',
  ko: '모바일 전체 화면 입구 이미지입니다. object-cover로 잘리므로 피사체를 중앙보다 약간 위에 두고 하단 문구 공간을 남겨 주세요.',
  en: 'Full-screen mobile entrance image. Keep the subject slightly above center and leave room for copy at the bottom.'
}),
```

Add these mappings:

```ts
'mastery-creations|main|gallery.filters.*.mobileImage': 'mobileCollectionAct',
'mastery-creations-champion|main|mobileImage': 'mobileCollectionAct',
'mastery-creations-appointment|main|mobileImage': 'mobileCollectionAct',
'mastery-creations-bespoke|main|mobileImage': 'mobileCollectionAct',
```

- [ ] **Step 6: Run CMS tests and verify green**

Run:

```bash
node --test components/specialty/specialty-collection-gallery.test.mjs app/admin/_components/admin-fields.test.mjs
```

Expected: PASS. The global image-guide coverage test reports no missing managed image field.

- [ ] **Step 7: Commit the CMS model**

```bash
git add lib/cms/page-catalog.json lib/cms/image-guides.ts messages/ko.json messages/en.json components/specialty/specialty-collection-gallery.test.mjs
git commit -m "feat: expose mobile creations images in CMS"
```

---

### Task 2: Render CMS Images In Mobile Acts With Safe Fallbacks

**Files:**
- Modify: `app/[locale]/(site)/mastery/creations/page.tsx:29-33`
- Modify: `components/specialty/specialty-collection-gallery.tsx:13-22,185-308`
- Test: `components/specialty/specialty-collection-gallery.test.mjs:142-178`
- Test: `mobile-public-site.test.mjs:179-191`

**Interfaces:**
- Consumes: `SpecialtyCollectionFilter.mobileImage?: string` from Task 1 and `imageExists(value: string): boolean` from `lib/image-exists.ts`.
- Produces: `SpecialtyCollectionFilter.hasMobileImage?: boolean` and a decorative full-bleed mobile image with client-side error fallback.

- [ ] **Step 1: Write failing mobile rendering and page-resolution tests**

Replace the retired standalone-art assertion with:

```js
test('collection mobile acts render CMS portrait artwork over the safe gradient fallback', () => {
  assert.match(mobileCollectionSource, /style=\{\{backgroundImage: direction\.backgroundImage\}\}/);
  assert.match(
    mobileCollectionSource,
    /category\.mobileImage &&[\s\S]*category\.hasMobileImage &&[\s\S]*failedMobileImage !== category\.mobileImage/
  );
  assert.match(mobileCollectionSource, /src=\{imageSrc\(category\.mobileImage\)\}/);
  assert.match(mobileCollectionSource, /fill[\s\S]*sizes="100vw"[\s\S]*object-cover object-center/);
  assert.match(
    mobileCollectionSource,
    /onError=\{\(\) => setFailedMobileImage\(category\.mobileImage \?\? null\)\}/
  );
  assert.match(mobileCollectionSource, /<article/);
  assert.doesNotMatch(mobileCollectionSource, /whileInView|initial=\{|viewport=\{\{/);
  assert.match(mobileCollectionSource, /motion-reduce:transition-none/);
  assert.match(mobileCollectionSource, /Made to be remembered\./);
  assert.match(galleryEntrySource, /<motion\.div\s+initial=\{false\}/);
  assert.match(galleryEntrySource, /className="hidden lg:grid"/);
});
```

In `mobile-public-site.test.mjs`, extend the existing Creations opening test with:

```js
assert.match(
  creationsPageSource,
  /hasMobileImage: Boolean\(filter\.mobileImage && imageExists\(filter\.mobileImage\)\)/
);
```

- [ ] **Step 2: Run the focused tests and verify the red state**

Run:

```bash
node --test components/specialty/specialty-collection-gallery.test.mjs mobile-public-site.test.mjs
```

Expected: FAIL because the page does not resolve `hasMobileImage` and `MobileCollectionAct` does not render `mobileImage`.

- [ ] **Step 3: Resolve mobile image availability on the server**

Extend the filter mapping in `app/[locale]/(site)/mastery/creations/page.tsx`:

```ts
const filters = content.gallery.filters.map((filter) => ({
  ...filter,
  href: resolveCmsHref(locale, filter.href, `/mastery/creations/${filter.id}`),
  hasImage: Boolean(filter.image && imageExists(filter.image)),
  hasMobileImage: Boolean(filter.mobileImage && imageExists(filter.mobileImage))
}));
```

- [ ] **Step 4: Extend the filter contract and error state**

Add to `SpecialtyCollectionFilter`:

```ts
mobileImage?: string;
hasMobileImage?: boolean;
```

Inside `MobileCollectionAct`, remember the exact image value that failed:

```ts
const [failedMobileImage, setFailedMobileImage] = useState<string | null>(null);
```

Comparing the failed value with the current `category.mobileImage` automatically retries when CMS content changes, without a state-setting effect. The component already imports `useState`; do not add a dependency.

- [ ] **Step 5: Render the portrait image between fallback art and readability overlay**

Keep the gradient and halo DOM first. Insert this immediately after the halo and before `direction.overlayClassName`:

```tsx
{category.mobileImage &&
category.hasMobileImage &&
failedMobileImage !== category.mobileImage ? (
  <Image
    src={imageSrc(category.mobileImage)}
    alt=""
    fill
    sizes="100vw"
    priority={index === 0}
    className="object-cover object-center"
    onError={() => setFailedMobileImage(category.mobileImage ?? null)}
  />
) : null}
```

Because the image sits above the gradient and halo, uploaded artwork becomes the visible scene. If it is absent or removed after `onError`, the existing gradient and halo are revealed. The existing overlay and text remain above both states.

- [ ] **Step 6: Run focused tests, ESLint, and TypeScript**

Run sequentially:

```bash
node --test components/specialty/specialty-collection-gallery.test.mjs mobile-public-site.test.mjs app/admin/_components/admin-fields.test.mjs
npx eslint --ignore-pattern '.worktrees/**' 'app/[locale]/(site)/mastery/creations/page.tsx' components/specialty/specialty-collection-gallery.tsx components/specialty/specialty-collection-gallery.test.mjs mobile-public-site.test.mjs lib/cms/image-guides.ts
npx tsc --noEmit
```

Expected: all tests pass; ESLint and TypeScript exit 0.

- [ ] **Step 7: Commit mobile rendering**

```bash
git add 'app/[locale]/(site)/mastery/creations/page.tsx' components/specialty/specialty-collection-gallery.tsx components/specialty/specialty-collection-gallery.test.mjs mobile-public-site.test.mjs
git commit -m "feat: render CMS images in mobile creations acts"
```

---

### Task 3: Full Verification And Production Release

**Files:**
- Verify only; no source changes expected.

**Interfaces:**
- Consumes: the CMS model and mobile rendering commits from Tasks 1 and 2.
- Produces: a verified release commit on `main` and a production deployment without changing CMS content.

- [ ] **Step 1: Run the complete source test suite**

Run:

```bash
rg --files -0 -g '*.test.mjs' -g '!.next/**' -g '!.worktrees/**' | xargs -0 node --test
```

Expected: all source tests pass with zero failures.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: Next.js completes the production build, TypeScript check, and all route generation including `/[locale]/mastery/creations`.

- [ ] **Step 3: Browser-check the empty-field fallback**

Run the app from the isolated worktree and inspect `/ko/mastery/creations` at 375 × 812, 430 × 932, and 1440 × 1000.

Verify:

- the top mobile opening remains unchanged;
- all three mobile Acts remain visible with gradient and halo because defaults are empty;
- each Act remains one full-section link with its existing copy;
- there is one semantic H1;
- there is no horizontal overflow;
- desktop retains its three existing background/product compositions and does not show mobile Act DOM.

- [ ] **Step 4: Verify the CMS editor structure**

Open the local CMS page editor for `Mastery / Creations` and the Champion, Appointment, and Bespoke page entries. Confirm `移动端入口图片` appears in all four surfaces and shows the 9:16, 1440 × 2560 guide.

Do not upload or save production content during this check.

- [ ] **Step 5: Inspect the release diff**

Run:

```bash
git diff --check
git status --short
git log --oneline -6
```

Expected: no whitespace errors, no uncommitted implementation files, and both feature commits are present.

- [ ] **Step 6: Integrate and deploy after user approval**

Use `superpowers:finishing-a-development-branch` to offer the integration options. If the user chooses local merge and deployment, fast-forward `main`, rerun the full source tests and production build on the merged tree, push `main`, and deploy the verified commit with the existing AWS Lightsail workflow:

```bash
ssh -i /Users/tingyouzhao/.ssh/LightsailDefaultKey-ap-northeast-2.pem -o BatchMode=yes ubuntu@15.164.62.44 'cd /home/ubuntu/daeho-site && git fetch origin main && git checkout main && git reset --hard origin/main && sudo docker compose -p daeho-prod up -d --build next nginx && sudo docker compose -p daeho-prod ps'
```

Verify the production commit hash, container status, HTTP 200 for `/ko/mastery/creations`, mobile fallback rendering, desktop rendering, and zero new browser console errors. Do not modify production CMS content automatically.
